/* eslint-disable @typescript-eslint/no-explicit-any -- CORE 泛型/第三方库约束 */
/**
 * 元镜 Entity Scanner — 扫描所有 .entity.ts 文件
 *
 * 提取：类名、表名、字段列表、关系、索引、描述
 */

import { Injectable, Logger, Inject, forwardRef, Optional } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import type { EntityInfo, EntityFieldInfo, EntityRelationInfo, SemanticTag } from '../types'
import type { DtoScanner, DtoInfo, DtoFieldConstraint } from './dto.scanner'

@Injectable()
export class EntityScanner {
  private readonly logger = new Logger(EntityScanner.name)

  /** V2.0: DTO 扫描器（可选注入 — 避免循环依赖） */
  @Optional()
  @Inject(forwardRef(() => require('./dto.scanner').DtoScanner))
  private dtoScanner?: DtoScanner

  /** V2.0: DTO 缓存 */
  private dtoCache: DtoInfo[] | null = null

  /**
   * 扫描所有 .entity.ts 文件
   */
  scan(srcDir: string): EntityInfo[] {
    const entities: EntityInfo[] = []
    const entityFiles = this.findEntityFiles(srcDir)

    // V2.0: 预扫描 DTO（一次性，缓存）
    if (this.dtoScanner && !this.dtoCache) {
      this.dtoCache = this.dtoScanner.scan(srcDir)
    }

    for (const filePath of entityFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const entity = this.parseEntity(filePath, content, srcDir)
        if (entity) {
          // V2.0: 增强 — 注入 DTO 约束 + 语义标签
          this.enhanceEntity(entity)
          entities.push(entity)
        }
      } catch (e: unknown) {
        this.logger.warn(`扫描失败: ${path.basename(filePath)} — ${(e as Error).message}`)
      }
    }

    this.logger.log(`EntityScanner: ${entities.length} 个实体`)
    return entities
  }

  // ═══════════════════════════════════════════
  // V2.0 增强：DTO 约束 + 语义标签
  // ═══════════════════════════════════════════

  private enhanceEntity(entity: EntityInfo): void {
    if (!this.dtoCache) return

    const relatedDto = this.dtoCache.find(
      d => d.relatedEntity === entity.name || d.relatedEntity === entity.name.replace('Product', '')
    )
    if (!relatedDto) return

    for (const field of entity.fields) {
      // 1. 注入 DTO 校验约束
      const dtoConstraint = relatedDto.fields.find(
        df => df.fieldName === field.name || 
             this.toCamelCase(df.fieldName) === field.name
      )
      if (dtoConstraint) {
        field.validations = {
          min: dtoConstraint.min,
          max: dtoConstraint.max,
          minLength: dtoConstraint.minLength,
          maxLength: dtoConstraint.maxLength,
          pattern: dtoConstraint.matches,
          isEnum: dtoConstraint.isEnum,
          isEmail: dtoConstraint.isEmail,
          isUrl: dtoConstraint.isUrl,
        }
      }

      // 2. 注入业务语义标签
      field.semanticTag = this.inferSemanticTag(field)
    }
  }

  /** 推断字段的业务语义标签 */
  private inferSemanticTag(field: EntityFieldInfo): SemanticTag | undefined {
    const name = field.name.toLowerCase()
    const comment = field.comment.toLowerCase()
    const combined = name + ' ' + comment

    // 价格/金额
    if (/price|amount|cost|fee|total/i.test(name) || /金额|价格|成本/i.test(combined)) return 'price'
    
    // 唯一标识符
    if (/(code|no|id|barcode|ean)/i.test(name) || /编码|编号|条码|标识/i.test(combined)) return 'identifier'
    
    // 展示名
    if (/(name|title|label|display)/i.test(name) || /名称|标题|展示/i.test(combined)) return 'display_name'
    
    // 状态
    if (/status|state/i.test(name) || /状态/i.test(combined)) return 'status'
    
    // 图片
    if (/image|photo|avatar|picture|img|url/i.test(name) || /图片|照片/i.test(combined)) return 'image'
    
    // 时间戳
    if (/(at|time|date)/i.test(name) && field.type.includes('timestamp')) return 'timestamp'
    
    // 外键引用
    if (/id$/i.test(name) && field.isIndexed && !field.isPrimary) return 'reference'
    
    // 数量/库存
    if (/quantity|qty|stock|count|num/i.test(name) || /数量|库存/i.test(combined)) return 'quantity'
    
    // 枚举
    if (field.enumValues && field.enumValues.length > 0) return 'enumeration'

    return undefined
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
  }

  /** 查找所有 .entity.ts 文件 */
  private findEntityFiles(srcDir: string): string[] {
    const results: string[] = []
    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const e of entries) {
        if (e.isDirectory()) {
          if (e.name === 'node_modules' || e.name === 'dist') continue
          walk(path.join(dir, e.name))
        } else if (e.isFile() && e.name.endsWith('.entity.ts')) {
          results.push(path.join(dir, e.name))
        }
      }
    }
    walk(srcDir)
    return results
  }

  /** 解析单个 entity 文件 */
  private parseEntity(filePath: string, content: string, _srcDir: string): EntityInfo | null {
    // 提取类名
    const classMatch = content.match(/export\s+class\s+(\w+)\s*(?:\{|extends)/)
    if (!classMatch) return null
    const name = classMatch[1]

    // 提取 @Entity 装饰器 → 表名
    const entityMatch = content.match(/@Entity\(\s*(?:\{[^}]*name\s*:\s*['"]([^'"]+)['"][^}]*\}|'([^']+)'|"([^"]+)")\s*\)/s)
    const tableName = entityMatch?.[1] || entityMatch?.[2] || entityMatch?.[3] || this.toSnakeCase(name)

    // 提取模块名（从文件路径）
    const module = this.extractModule(filePath)

    // 提取类注释
    const description = this.extractClassComment(content)

    // 提取字段
    const fields = this.extractFields(content)

    // 提取关系
    const relations = this.extractRelations(content)

    // 提取索引
    const indexes = this.extractIndexes(content)

    return { name, tableName, module, filePath, fields, relations, description, indexes }
  }

  /** PascalCase → snake_case */
  private toSnakeCase(name: string): string {
    return name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
  }

  /** 从文件路径提取模块名 */
  private extractModule(filePath: string): string {
    const match = filePath.match(/modules[\/\\]([^\/\\]+)[\/\\]/)
    if (!match) return 'unknown'
    // 处理嵌套模块如 eros/chat → "eros-chat"
    // 跳过 entity/entities/dto 等子目录
    const after = filePath.substring(filePath.indexOf(match[1]) + match[1].length)
    const nextMatch = after.match(/[\/](?!entity|entities|dto)([^\/]+)[\/]/)
    return nextMatch ? `${match[1]}-${nextMatch[1]}` : match[1]
  }

  /** 提取类级别的 JSDoc 注释 */
  private extractClassComment(content: string): string {
    const match = content.match(/\/\*\*[\s\S]*?\*\/\s*(?=@Entity|export\s+class)/)
    if (!match) return ''
    return match[0]
      .replace(/\/\*\*|\*\/|\*\s?/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /** 提取 @Column 字段 */
  private extractFields(content: string): EntityFieldInfo[] {
    const fields: EntityFieldInfo[] = []
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // 匹配 @Column(...) 下面一行的属性声明
      if (line.trim().startsWith('@Column')) {
        // 收集 @Column 装饰器的完整参数（可能跨多行）
        let colParams = line
        while (!colParams.includes(')') && i + 1 < lines.length) {
          i++
          colParams += ' ' + lines[i]
        }

        // 提取 @Column 参数中的 name
        const nameMatch = colParams.match(/name\s*:\s*['"]([^'"]+)['"]/)
        const columnName = nameMatch?.[1] || ''

        // 从 @Column 所在行之后，找第一个属性声明行（跳过装饰器和空行）
        // 匹配: fieldName!: type | fieldName?: type | fieldName: type
        // 支持类型: string, number, boolean, Date, any, Record<string, any>, string[], number[]
        const propMatch = this.findNextProperty(lines, i)
        if (!propMatch) continue

        const fieldName = propMatch.fieldName

        // 类型归一化：TS 自定义类型（enum 类型名等）→ string，基础类型保持不变
        const rawType = propMatch.type.toLowerCase()
        const knownTypes = ['string', 'number', 'boolean', 'date', 'any', 'record']
        const normalizedType = knownTypes.includes(rawType) || rawType.startsWith('record')
          ? rawType + (propMatch.isArray ? '[]' : '')
          : (propMatch.isArray ? 'string[]' : 'string')
        const type = normalizedType

        // 跳过 isDeleted / deletedAt 等软删除字段
        if (fieldName === 'isDeleted' || fieldName === 'deletedAt') continue

        // 提取注释（优先 @Column comment → inline // 注释 → 行前注释）
        const colCommentMatch = colParams.match(/comment\s*:\s*['"]([^'"]+)['"]/)
        const inlineComment = propMatch.inlineComment
        const comment = colCommentMatch?.[1] || inlineComment || this.extractFieldComment(lines, i)

        // 检查索引（紧邻前一行 @Index()）
        const isIndexed = (lines[i - 2] || '').includes('@Index()') || (lines[i - 1] || '').includes('@Index()')

        // 检查 Unique
        const isUnique = colParams.includes('unique')

        // 检查 Primary（紧邻的前一行是否有 @PrimaryColumn/@PrimaryGeneratedColumn，排除其他字段）
        const prevLine = (lines[i - 1] || '').trim()
        const isPrimary = prevLine.startsWith('@PrimaryColumn') || prevLine.startsWith('@PrimaryGeneratedColumn')

        // 检查 Nullable（属性声明带 ? 或 @Column 参数有 nullable: true）
        const isNullable = propMatch.isOptional || colParams.includes('nullable')

        // enum 值
        let enumValues: string[] | undefined
        const enumMatch = colParams.match(/enum\s*:\s*\[([^\]]+)\]/)
        if (enumMatch) {
          enumValues = enumMatch[1]
            .split(',')
            .map(s => s.trim().replace(/['"]/g, ''))
            .filter(Boolean)
        }

        fields.push({
          name: fieldName,
          columnName: columnName || this.toSnakeCase(fieldName),
          type,
          isPrimary,
          isNullable,
          isIndexed,
          isUnique,
          comment,
          enumValues,
        })
      }
    }

    return fields
  }

  /**
   * 从 @Column 装饰器后向后查找第一个属性声明
   * 跳过空行、注释行、其他装饰器
   * 返回 { fieldName, type, isArray } | null
   */
  private findNextProperty(
    lines: string[],
    colEndIdx: number,
  ): { fieldName: string; type: string; isArray: boolean; isOptional: boolean; inlineComment?: string } | null {
    const propRegex = /^\s*(\w+)([?!])?\s*:\s*(\w+)(\[\])?\s*[;=]?\s*(?:\/\/\s*(.*))?/
    const complexTypeRegex = /^\s*(\w+)([?!])?\s*:\s*([Rr]ecord<[\s\S]+?>|[\w]+\[\])\s*[;=]?/

    for (let j = colEndIdx + 1; j < lines.length && j <= colEndIdx + 5; j++) {
      const candidate = lines[j].trim()

      // 跳过空行和注释行
      if (!candidate || candidate.startsWith('//') || candidate.startsWith('/**') || candidate.startsWith('*')) {
        continue
      }

      // 跳过装饰器行
      if (candidate.startsWith('@')) continue

      // 尝试匹配 Record<string, any> 等复杂类型
      const complexMatch = candidate.match(complexTypeRegex)
      if (complexMatch) {
        const inlineComment = (complexMatch[5] || '').trim()
        return {
          fieldName: complexMatch[1],
          type: complexMatch[3].replace(/\s/g, ''),
          isArray: false,
          isOptional: complexMatch[2] === '?',
          inlineComment: inlineComment || undefined,
        }
      }

      // 尝试匹配基础类型
      const match = candidate.match(propRegex)
      if (match) {
        const inlineComment = (match[5] || '').trim()
        return {
          fieldName: match[1],
          type: match[3],
          isArray: !!match[4],
          isOptional: match[2] === '?',
          inlineComment: inlineComment || undefined,
        }
      }

      // 如果匹配不到属性声明，说明这不是属性行，继续找
    }
    return null
  }

  /** 提取字段注释 */
  private extractFieldComment(lines: string[], idx: number): string {
    for (let j = idx - 1; j >= Math.max(0, idx - 3); j--) {
      const line = lines[j].trim()
      if (line.startsWith('/**') || line.startsWith('*') || line.startsWith('//')) {
        return line.replace(/\/\*\*?|\*\/?|\/\/\s?/g, '').trim()
      }
    }
    return ''
  }

  /** 提取实体关系 */
  private extractRelations(content: string): EntityRelationInfo[] {
    const relations: EntityRelationInfo[] = []
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // @ManyToOne / @OneToMany / @ManyToMany
      const relMatch = line.match(/@(ManyToOne|OneToMany|ManyToMany)\s*\(\s*\(\)\s*=>\s*(\w+)/)
      if (!relMatch) continue

      const type = relMatch[1]
      const target = relMatch[2]

      // 下一行取属性名
      const nextLine = lines[i + 2] || ''
      const propMatch = nextLine.match(/(\w+)[!?]?\s*:/)
      if (!propMatch) continue

      relations.push({
        name: propMatch[1],
        type,
        targetEntity: target,
      })
    }

    return relations
  }

  /** 提取 @Index 字段 */
  private extractIndexes(content: string): string[] {
    const indexes: string[] = []
    const regex = /@Index\([^)]*\)[\s\S]*?(\w+)[!?]?\s*:/g
    let m
    while ((m = regex.exec(content)) !== null) {
      indexes.push(m[1])
    }
    return [...new Set(indexes)]
  }
}
