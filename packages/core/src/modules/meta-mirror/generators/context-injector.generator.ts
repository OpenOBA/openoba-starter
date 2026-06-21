/**
 * 元镜 ContextInjector — 根据 mirror_refs 组装精准 System Prompt 上下文
 *
 * @file context-injector.generator.ts
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-26
 *
 * 输入: mirror_refs + 元镜知识库
 * 输出: 200-500 tokens 的精准 System Prompt 上下文块
 */

import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import type { MirrorRefs, InjectedContext, EntityInfo } from '../types'
import type { EnhancedRuleInfo } from '../scanners/rule.scanner'

/** Entity field metadata parsed from knowledge markdown */
interface EntityFieldMeta {
  name: string
  columnName: string
  type: string
  isNullable: boolean
  isUnique: boolean
  isPrimary: boolean
  isEnum: boolean
  semanticTag?: string
  dbPrecision?: { precision: number; scale: number }
  validations?: { min?: number; max?: number; isEnum?: boolean }
  enumValues?: string[]
}

/** Entity relation metadata */
interface EntityRelationMeta {
  name: string
  type: string
  targetEntity: string
}

@Injectable()
export class ContextInjector {
  private readonly logger = new Logger(ContextInjector.name)
  private readonly knowledgeDir: string

  constructor() {
    this.knowledgeDir = path.join(process.cwd(), 'knowledge')
  }

  /**
   * 主入口：根据 mirror_refs 组装 System Prompt 上下文
   */
  inject(mirrorRefs: MirrorRefs): InjectedContext | null {
    if (!mirrorRefs || Object.keys(mirrorRefs).every(k => !((mirrorRefs as Record<string, unknown>)[k] as unknown[])?.length)) {
      return {
        systemPromptBlock: '',
        stats: { entitiesInjected: 0, apisInjected: 0, rulesInjected: 0, conventionsInjected: 0, estimatedTokens: 0 },
      }
    }

    const blocks: string[] = []
    let totalTokens = 0
    let entitiesInjected = 0
    let apisInjected = 0
    let rulesInjected = 0
    let conventionsInjected = 0

    // ── 1. 实体 ──
    if (mirrorRefs.entities && mirrorRefs.entities.length > 0) {
      const entityBlock = this.injectEntities(mirrorRefs.entities)
      if (entityBlock) {
        blocks.push(entityBlock)
        totalTokens += Math.ceil(entityBlock.length / 3)
        entitiesInjected = mirrorRefs.entities.length
      }
    }

    // ── 2. API ──
    if (mirrorRefs.apis && mirrorRefs.apis.length > 0) {
      const apiBlock = this.injectApis(mirrorRefs.apis)
      if (apiBlock) {
        blocks.push(apiBlock)
        totalTokens += Math.ceil(apiBlock.length / 3)
        apisInjected = mirrorRefs.apis.length
      }
    }

    // ── 3. 规则 ──
    if (mirrorRefs.rules && mirrorRefs.rules.length > 0) {
      const ruleBlock = this.injectRules(mirrorRefs.rules)
      if (ruleBlock) {
        blocks.push(ruleBlock)
        totalTokens += Math.ceil(ruleBlock.length / 3)
        rulesInjected = mirrorRefs.rules.length
      }
    }

    // ── 4. 约定 ──
    if (mirrorRefs.conventions && mirrorRefs.conventions.length > 0) {
      const convBlock = this.injectConventions(mirrorRefs.conventions)
      if (convBlock) {
        blocks.push(convBlock)
        totalTokens += Math.ceil(convBlock.length / 3)
        conventionsInjected = mirrorRefs.conventions.length
      }
    }

    const systemPromptBlock = blocks.join('\n\n')

    this.logger.log(
      `ContextInjector: ${entitiesInjected}实体 ${apisInjected}API ` +
      `${rulesInjected}规则 ${conventionsInjected}约定 → ~${totalTokens} tokens`,
    )

    return {
      systemPromptBlock,
      stats: { entitiesInjected, apisInjected, rulesInjected, conventionsInjected, estimatedTokens: totalTokens },
    }
  }

  // ═══════════════════════════════════════════
  // 各类型注入器
  // ═══════════════════════════════════════════

  private injectEntities(entityNames: string[]): string {
    const lines: string[] = []
    lines.push('📦 相关实体：')

    for (const name of entityNames) {
      // 从 L1 知识文件读取实体详情
      const info = this.readEntityFromKnowledge(name)
      if (!info) {
        lines.push(`- ❓ ${name}（知识库中未找到）`)
        continue
      }

      let line = '- **' + name + '** (' + '`' + info.table + '`' + ')'
      
      // 提取关键字段（优先价格/标识/状态/枚举）
      const keyFields = this.selectKeyFields(info.fields as EntityFieldMeta[], 8)
      if (keyFields.length > 0) {
        line += `: ${keyFields.join(', ')}`
      }

      // 重要约束
      const constraints: string[] = []
      for (const f of (info.fields as EntityFieldMeta[])) {
        if (f.isUnique && !f.isPrimary) constraints.push(`⚠️ ${f.name}: 唯一`)
        if (f.isPrimary) constraints.push(`${f.name}: 主键`)
        if (f.validations?.isEnum) constraints.push(`⚠️ ${f.name}: 枚举`)
        if (f.validations?.min !== undefined) constraints.push(`${f.name}: Min(${f.validations.min})`)
        if (f.dbPrecision?.precision) constraints.push(`${f.name}: decimal(${f.dbPrecision.precision},${f.dbPrecision.scale})`)
      }
      lines.push(line)
      for (const c of constraints.slice(0, 3)) {
        lines.push(`  ${c}`)
      }

      // 关联关系
      if (info.relations && info.relations.length > 0) {
        const rels = info.relations
          .filter((r: EntityRelationMeta) => entityNames.includes(r.targetEntity))
          .map((r: EntityRelationMeta) => `🔗 ${r.name} → ${r.targetEntity} (${r.type})`)
        for (const r of rels) lines.push(`  ${r}`)
      }
    }

    return lines.join('\n')
  }

  private injectApis(apiPaths: string[]): string {
    const lines: string[] = []
    lines.push('🔌 相关 API：')

    for (const apiPath of apiPaths) {
      lines.push(`- ${apiPath}`)
    }

    return lines.join('\n')
  }

  private injectRules(ruleNames: string[]): string {
    // 从 rules.md 提取对应规则
    const rulesMd = this.readFile('rules.md')
    if (!rulesMd) return ''

    const lines: string[] = []
    lines.push('📐 业务规则：')

    // 精确匹配规则名
    for (const name of ruleNames) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`\\| ${escaped} \\|`, 'i')
      const match = rulesMd.match(regex)
      if (match) {
        const ruleLine = rulesMd.split('\n').find(l => l.includes(name))
        if (ruleLine) {
          lines.push(`- ⛔ ${name}: ${ruleLine.split('|').slice(3).join('|').trim()}`)
        }
      } else {
        lines.push(`- ⛔ ${name}（参见 ERDL 规则文件）`)
      }
    }

    return lines.join('\n')
  }

  private injectConventions(convNames: string[]): string {
    const convMd = this.readFile('conventions.md')
    if (!convMd) return ''

    const lines: string[] = []
    lines.push('📋 命名约定：')

    for (const name of convNames) {
      if (name === 'naming' || name === 'spu_naming') {
        lines.push('- SPU 编码: S-{6位数字}（如 S-005366）')
        lines.push('- SKU 展示名: {效果词}·{色号}·{系列}·{款式}')
      }
    }

    return lines.join('\n')
  }

  // ═══════════════════════════════════════════
  // 辅助
  // ═══════════════════════════════════════════

  /**
   * 从 knowledge/entities/{module}.md 读取实体信息
   * 由于 Markdown 是生成的，这里用简化读取
   */
  private readEntityFromKnowledge(entityName: string): { table: string; fields: EntityFieldMeta[]; relations: EntityRelationMeta[] } | null {
    try {
      // 查找 entities/ 下所有 md 文件中匹配的实体
      const entitiesDir = path.join(this.knowledgeDir, 'entities')
      if (!fs.existsSync(entitiesDir)) return null

      const files = fs.readdirSync(entitiesDir).filter(f => f.endsWith('.md'))
      for (const file of files) {
        const content = fs.readFileSync(path.join(entitiesDir, file), 'utf-8')
        if (!content.includes(`## ${entityName}`)) continue

        // 提取表名
        const tableMatch = content.match(new RegExp(`${entityName}\\\\s*\\\\(\\\\\\\\\\\`([^\\\`]+)\\\\\\\\\\\`\\\\)`))
        const table = tableMatch?.[1] || ''

        // 提取字段（从 Markdown 表格）
        const fields: EntityFieldMeta[] = []
        const tableRegex = /\| (\w+) \| `(\w+)` \| (\S+) \| ([✅❌]) \| ([^|]*) \| (\S*) \| ([^|]*)\|/g
        let fm
        while ((fm = tableRegex.exec(content)) !== null) {
          if (fm[1] === '字段') continue // 表头
          const constraints = fm[5].trim()
          fields.push({
            name: fm[1],
            columnName: fm[2],
            type: fm[3],
            isNullable: fm[4] === '❌',
            isUnique: constraints.includes('唯一'),
            isPrimary: constraints.includes('主键'),
            isEnum: constraints.includes('枚举'),
            semanticTag: fm[6] !== '—' ? fm[6] : undefined,
            dbPrecision: constraints.match(/精度\((\d+),(\d+)\)/) 
              ? { precision: Number(RegExp.$1), scale: Number(RegExp.$2) } 
              : undefined,
            validations: {
              min: constraints.match(/Min\((\d+)\)/) ? Number(RegExp.$1) : undefined,
              max: constraints.match(/Max\((\d+)\)/) ? Number(RegExp.$1) : undefined,
            },
          })
        }

        // 提取关系
        const relations: EntityRelationMeta[] = []
        const relRegex = /\| (\w+) \| (\w+) \| (\w+) \|/g
        const relSection = content.indexOf('### 关系')
        if (relSection >= 0) {
          const relLines = content.substring(relSection).split('\n')
          for (const line of relLines) {
            const rm = line.match(/\| (\w+) \| (ManyToOne|OneToMany|ManyToMany) \| (\w+) \|/)
            if (rm) {
              relations.push({ name: rm[1], type: rm[2], targetEntity: rm[3] })
            }
          }
        }

        return { table, fields, relations }
      }
    } catch (e: unknown) {
      this.logger.debug(`entity 解析失败: ${(e as Error).message}`)
    }
    return null
  }

  /**
   * 选择关键字段展示（优先价格>标识>展示名>状态>枚举>主键）
   */
  private selectKeyFields(fields: EntityFieldMeta[], max: number): string[] {
    const sorted = [...fields].sort((a, b) => {
      const score = (f: EntityFieldMeta) => {
        if (f.semanticTag === 'price') return 100
        if (f.semanticTag === 'identifier' || f.isPrimary) return 90
        if (f.semanticTag === 'display_name') return 80
        if (f.semanticTag === 'status') return 70
        if (f.semanticTag === 'enumeration' || f.enumValues?.length) return 60
        if (f.semanticTag === 'quantity') return 50
        if (f.isUnique) return 40
        return 0
      }
      return score(b) - score(a)
    })

    return sorted.slice(0, max).map(f => {
      let s = f.name
      if (f.validations?.min !== undefined) s += `≥${f.validations.min}`
      if (f.enumValues) s += `(${f.enumValues.join('/')})`
      return s
    })
  }

  private readFile(filename: string): string | null {
    try {
      const fp = path.join(this.knowledgeDir, filename)
      if (fs.existsSync(fp)) return fs.readFileSync(fp, 'utf-8')
    } catch (e: unknown) { this.logger.debug(`知识文件读取失败: ${(e as Error).message}`) }
    return null
  }
}
