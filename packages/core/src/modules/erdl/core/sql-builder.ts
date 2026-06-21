/**
 * 秒镜科技 · ERDL V1.3 — SQL Builder
 *
 * @file ERDL SQL 构建器：将 Entity 映射 + 语义参数翻译为参数化 SQL
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-06-21
 * @license BSL-1.1
 */

import { BadRequestException } from '@nestjs/common'

/** Entity 属性定义（从 ERDL properties 中提取） */
interface FieldDefinition {
  fieldName: string       // ERDL 语义字段名
  dbColumn: string        // 数据库物理列名
  type: string            // 字段类型
  required: boolean
  isEnum: boolean
  enumValues: string[]
  maxLength?: number
  isJSON: boolean
}

/** 字段映射缓存 */
interface EntityMapping {
  table: string
  primaryKey: string
  fields: Map<string /* semanticName */, FieldDefinition>
  dbToSemantic: Map<string /* dbColumn */, string /* semanticName */>
}

/** resolveAlias 函数签名（从 registry 注入） */
type ResolveAliasFn = (namespace: string, entity: string, key: string) => string

// ============================================
// SQL Builder
// ============================================

export class SqlBuilder {
  constructor(
    private readonly resolveAlias: ResolveAliasFn,
  ) {}

  /**
   * 将值转换为数据库可用形式（JSON 序列化等）
   */
  toDbValue(def: FieldDefinition, val: unknown): unknown {
    if (def.isJSON && val !== null && val !== undefined) {
      if (typeof val === 'string') {
        try { JSON.parse(val) } catch {
          return JSON.stringify(val)
        }
        return val
      }
      return JSON.stringify(val)
    }
    return val
  }

  /**
   * 构建 SELECT 语句
   */
  buildSelect(params: {
    mapping: EntityMapping
    namespace: string
    entity: string
    select?: string[]
    where?: Record<string, unknown>
    limit?: number
    offset?: number
  }): { sql: string; values: unknown[] } {
    const { mapping } = params

    // 构建 SELECT 列
    let columns = '*'
    if (params.select && params.select.length > 0) {
      const dbCols: string[] = []
      for (const s of params.select) {
        const resolved = this.resolveAlias(params.namespace, params.entity, s)
        const def = mapping.fields.get(resolved)
        if (def) dbCols.push(`\`${def.dbColumn}\``)
      }
      if (dbCols.length > 0) columns = dbCols.join(', ')
    }

    // 构建 WHERE
    const whereParts: string[] = []
    const values: unknown[] = []
    if (params.where) {
      for (const [key, val] of Object.entries(params.where)) {
        const resolved = this.resolveAlias(params.namespace, params.entity, key)
        const def = mapping.fields.get(resolved)
        if (def) {
          whereParts.push(`\`${def.dbColumn}\` = ?`)
          values.push(val)
        } else {
          throw new BadRequestException(
            `WHERE key "${key}" 不在 ${params.entity} 的已知字段中（语义名: ${resolved || 'unknown'}）`
          )
        }
      }
    }

    // 运行时强校验 limit/offset，防止SQL注入
    const safeLimit = typeof params.limit === 'number' && Number.isFinite(params.limit) && params.limit > 0
      ? Math.min(Math.floor(params.limit), 1000)
      : 100
    const safeOffset = typeof params.offset === 'number' && Number.isFinite(params.offset) && params.offset >= 0
      ? Math.floor(params.offset)
      : 0

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : ''
    const limitClause = `LIMIT ${safeLimit}`
    const offsetClause = safeOffset > 0 ? `OFFSET ${safeOffset}` : ''

    const sql = `SELECT ${columns} FROM \`${mapping.table}\` ${whereClause} ${limitClause} ${offsetClause}`
    return { sql, values }
  }

  /**
   * 构建 INSERT 语句
   */
  buildInsert(params: {
    mapping: EntityMapping
    namespace: string
    entity: string
    data: Record<string, unknown>
  }): { sql: string; values: unknown[] } {
    const { mapping } = params

    const cols: string[] = []
    const phs: string[] = []
    const values: unknown[] = []

    // 自动生成 UUID 主键（如果未提供）
    const dataWithId = { ...params.data }
    const pkField = mapping.fields.get(mapping.primaryKey)
    if (pkField && !dataWithId[mapping.primaryKey] && !dataWithId[pkField.fieldName]) {
      const uuid = require('crypto').randomUUID().replace(/-/g, '')
      dataWithId[pkField.fieldName] = uuid
    }

    for (const [key, val] of Object.entries(dataWithId)) {
      const resolved = this.resolveAlias(params.namespace, params.entity, key)
      const def = mapping.fields.get(resolved)

      // 字段名校验
      if (!def) {
        const available = Array.from(mapping.fields.keys()).slice(0, 10).join(', ')
        throw new Error(`未知字段: "${key}"。${params.entity} 可用字段: ${available}`)
      }

      cols.push(`\`${def.dbColumn}\``)
      phs.push('?')
      values.push(this.toDbValue(def, val))
    }

    const sql = `INSERT INTO \`${mapping.table}\` (${cols.join(', ')}) VALUES (${phs.join(', ')})`
    return { sql, values }
  }

  /**
   * 构建 UPDATE 语句
   */
  buildUpdate(params: {
    mapping: EntityMapping
    namespace: string
    entity: string
    data: Record<string, unknown>
    where: Record<string, unknown>
  }): { sql: string; values: unknown[] } {
    const { mapping } = params

    const values: unknown[] = []
    const setParts: string[] = []

    for (const [key, val] of Object.entries(params.data)) {
      const resolved = this.resolveAlias(params.namespace, params.entity, key)
      const def = mapping.fields.get(resolved)
      if (!def) {
        const available = Array.from(mapping.fields.keys()).slice(0, 10).join(', ')
        throw new Error(`未知字段: "${key}"。${params.entity} 可用字段: ${available}`)
      }
      setParts.push(`\`${def.dbColumn}\` = ?`)
      values.push(this.toDbValue(def, val))
    }

    const whereParts: string[] = []
    for (const [key, val] of Object.entries(params.where)) {
      const resolved = this.resolveAlias(params.namespace, params.entity, key)
      const def = mapping.fields.get(resolved)
      if (!def) {
        throw new BadRequestException(
          `UPDATE WHERE key "${key}" 不在 ${params.entity} 的已知字段中`
        )
      }
      whereParts.push(`\`${def.dbColumn}\` = ?`)
      values.push(val)
    }

    const sql = `UPDATE \`${mapping.table}\` SET ${setParts.join(', ')} WHERE ${whereParts.join(' AND ')} LIMIT 100`
    return { sql, values }
  }

  /**
   * 构建 SOFT DELETE 语句
   */
  buildDelete(params: {
    mapping: EntityMapping
    namespace: string
    entity: string
    where: Record<string, unknown>
  }): { sql: string; values: unknown[] } {
    const { mapping } = params

    const whereParts: string[] = []
    const values: unknown[] = []

    for (const [key, val] of Object.entries(params.where)) {
      const resolved = this.resolveAlias(params.namespace, params.entity, key)
      const def = mapping.fields.get(resolved)
      if (!def) {
        throw new BadRequestException(
          `DELETE WHERE key "${key}" 不在 ${params.entity} 的已知字段中`
        )
      }
      whereParts.push(`\`${def.dbColumn}\` = ?`)
      values.push(val)
    }

    const sql = `UPDATE \`${mapping.table}\` SET is_deleted = 1, deleted_at = NOW() WHERE ${whereParts.join(' AND ')} AND is_deleted = 0 LIMIT 100`
    return { sql, values }
  }
}
