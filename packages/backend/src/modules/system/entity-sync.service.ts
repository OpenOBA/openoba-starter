/**
 * Entity-Schema 同步服务 — 检测 entity 文件改动，自动生成 migration SQL
 *
 * @author 唐浩然（AI 联合创始人）
 * @since 2026-05-24
 *
 * 核心逻辑：
 * 1. 扫描 entity 文件中的 @Column 装饰器
 * 2. 查询数据库实际列
 * 3. diff → 生成 ALTER TABLE ADD COLUMN / DROP COLUMN SQL
 *
 * 限制：
 * - 仅生成 ADD COLUMN（新增字段），不做 DROP（危险操作需人工确认）
 * - 不做 ALTER COLUMN（类型/长度变更需人工判断）
 */

import { Injectable, Logger, OnModuleInit, Inject, Optional } from '@nestjs/common'
import { DataSource } from 'typeorm'
import * as fs from 'fs'
import * as path from 'path'

interface EntityColumn {
  name: string       // @Column({ name: 'xxx' })
  type: string       // @Column({ type: 'varchar' })
  length?: string    // @Column({ length: 64 })
  nullable?: boolean // @Column({ nullable: true })
  default?: string   // @Column({ default: 'xxx' })
  comment?: string   // @Column({ comment: 'xxx' })
  propertyName: string // entity 属性名
}

interface DbColumn {
  Field: string
  Type: string
  Null: string
  Key: string
  Default: string | null
  Extra: string
}

@Injectable()
export class EntitySyncService implements OnModuleInit {
  private readonly logger = new Logger(EntitySyncService.name)
  private projectRoot: string

  constructor(
    @Optional() @Inject(DataSource) private readonly dataSource?: DataSource,
  ) {
    this.projectRoot = path.resolve(process.cwd(), '..')
  }

  onModuleInit() {
    this.logger.log('EntitySyncService 就绪')
  }

  /**
   * 对比 entity 文件和数据库表，生成 ADD COLUMN migration SQL
   *
   * @param entityFilePath entity 文件路径（相对项目根）
   * @returns migration SQL 字符串，如果没有差异则返回 null
   */
  async generateMigration(entityFilePath: string): Promise<string | null> {
    if (!this.dataSource) {
      this.logger.warn('DataSource 不可用，跳过 migration 生成')
      return null
    }

    // 1. 解析 entity 文件中的 @Column 定义
    const fullPath = path.resolve(this.projectRoot, entityFilePath)
    if (!fs.existsSync(fullPath)) {
      this.logger.warn(`entity 文件不存在: ${fullPath}`)
      return null
    }

    const content = fs.readFileSync(fullPath, 'utf-8')
    const entityColumns = this.parseEntityColumns(content)
    if (entityColumns.length === 0) {
      return null // 没解析到 @Column（可能不是 entity 文件）
    }

    // 2. 从文件名推断表名（product-sku.entity.ts → product_sku）
    const tableName = this.inferTableName(entityFilePath)
    if (!tableName) return null

    // 3. 读取数据库实际列
    let dbColumns: DbColumn[] = []
    try {
      const rows = await this.dataSource.query(`SHOW COLUMNS FROM \`${tableName}\``)
      dbColumns = rows as DbColumn[]
    } catch (e: any) {
      this.logger.warn(`读取表 ${tableName} 列失败: ${e.message}`)
      return null
    }

    // 4. Diff：entity 中有但 DB 中没有的 → ADD COLUMN
    const dbColumnNames = new Set(dbColumns.map(c => c.Field))
    const missingColumns = entityColumns.filter(c => !dbColumnNames.has(c.name))

    if (missingColumns.length === 0) {
      return null
    }

    // 5. 生成 SQL
    const sqlLines: string[] = [
      `-- 自动生成 Migration · ${tableName}`,
      `-- 时间: ${new Date().toISOString()}`,
      `-- 源文件: ${entityFilePath}`,
      '',
    ]

    for (const col of missingColumns) {
      let sql = `ALTER TABLE \`${tableName}\` ADD COLUMN \`${col.name}\` ${col.type.toUpperCase()}`
      if (col.length) sql += `(${col.length})`
      if (col.nullable === true) sql += ' NULL'
      else sql += ' NOT NULL'
      if (col.default !== undefined) {
        if (col.default === 'CURRENT_TIMESTAMP') sql += ` DEFAULT ${col.default}`
        else sql += ` DEFAULT '${col.default}'`
      }
      if (col.comment) sql += ` COMMENT '${col.comment}'`
      sql += ';'
      sqlLines.push(sql)
    }

    sqlLines.push('')
    return sqlLines.join('\n')
  }

  /**
   * 检测 delta_files 中是否包含 entity 文件，批量生成 migration
   */
  async generateMigrationForFiles(files: string[]): Promise<{
    migrations: Array<{ table: string; file: string; sql: string }>
    allSql: string
  }> {
    const migrations: Array<{ table: string; file: string; sql: string }> = []
    const entityPattern = /entity[\/\\].*\.entity\.ts$/

    for (const file of files) {
      if (!entityPattern.test(file) && !file.includes('.entity.ts')) continue
      const sql = await this.generateMigration(file)
      if (sql) {
        migrations.push({
          table: this.inferTableName(file) || 'unknown',
          file,
          sql,
        })
      }
    }

    const allSql = migrations.map(m => m.sql).join('\n\n')
    return { migrations, allSql }
  }

  // ══════ 解析 ══════

  /** 从 entity 源码中解析 @Column 定义 */
  private parseEntityColumns(content: string): EntityColumn[] {
    const columns: EntityColumn[] = []
    // 匹配 @Column({...}) 后紧跟的属性声明
    const patterns = [
      // 多行 @Column
      /@Column\(\{([\s\S]*?)\}\)\s*\n\s*(\w+)\??\s*:\s*\w+/g,
      // 单行 @Column
      /@Column\(\{([^}]+)\}\)\s*\n?\s*(\w+)\??\s*:\s*\w+/g,
    ]

    for (const regex of patterns) {
      let match: RegExpExecArray | null
      while ((match = regex.exec(content)) !== null) {
        const configStr = match[1]
        const propertyName = match[2]

        // 解析 name
        const nameMatch = configStr.match(/name\s*:\s*['"]([^'"]+)['"]/)
        if (!nameMatch) continue // 必须有 name（数据库列名）

        const col: EntityColumn = {
          name: nameMatch[1],
          propertyName,
          type: 'varchar', // 默认
        }

        // type
        const typeMatch = configStr.match(/type\s*:\s*['"]([^'"]+)['"]/)
        if (typeMatch) col.type = typeMatch[1]

        // length
        const lenMatch = configStr.match(/length\s*:\s*(\d+)/)
        if (lenMatch) col.length = lenMatch[1]

        // nullable
        const nullMatch = configStr.match(/nullable\s*:\s*(true|false)/)
        if (nullMatch) col.nullable = nullMatch[1] === 'true'

        // default
        const defMatch = configStr.match(/default\s*:\s*['"]([^'"]*)['"]/)
        if (defMatch) col.default = defMatch[1]

        // comment
        const commMatch = configStr.match(/comment\s*:\s*['"]([^'"]*)['"]/)
        if (commMatch) col.comment = commMatch[1]

        columns.push(col)
      }
    }

    // 去重（按 propertyName）
    const seen = new Set<string>()
    return columns.filter(c => {
      if (seen.has(c.propertyName)) return false
      seen.add(c.propertyName)
      return true
    })
  }

  /** 从文件路径推断表名 */
  private inferTableName(filePath: string): string | null {
    const basename = path.basename(filePath, '.entity.ts')
    // product-sku → product_sku
    const tableName = basename.replace(/-/g, '_')
    if (!tableName) return null

    // 常见映射修正
    const knownMappings: Record<string, string> = {
      'product_spu': 'product_spu',
      'product_sku': 'product_sku',
      'product_set': 'product_set',
      'product_category': 'product_category',
      'customer': 'customer',
      'order': 'order',
      'inventory': 'inventory',
    }

    return knownMappings[tableName] || tableName
  }
}
