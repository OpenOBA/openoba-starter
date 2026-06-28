/**
 * MirrorKnowledgeReader — 从元镜知识文件读取上下文
 *
 * V1.6.0: SoulService L2 层接入元镜，不再返回占位符。
 * 从 knowledge/ 目录（元镜自动生成）动态读取实体/API/规则/约定。
 *
 * @file mirror-knowledge-reader.ts
 * @author 唐浩然（OpenOBA AI 联合创始人）
 * @since 2026-06-28
 */

import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'

/** 摘要版本的实体信息（从 _index.md 解析） */
export interface MirrorEntitySummary {
  name: string
  tableName: string
  module: string
  fieldCount: number
  keyFields: string[]
}

/** 摘要版本的 API 信息 */
export interface MirrorApiSummary {
  method: string
  fullPath: string
  summary: string
}

/** 知识文件读取器输出 */
export interface MirrorKnowledge {
  available: boolean
  /** 实体索引（轻量，~200 tokens） */
  entityIndex: string
  /** 代码路径地图（~150 tokens） */
  codePath: string
  /** Entity 详情（按需，~300-500 tokens） */
  entityDetail: (entityName: string) => string
  /** 业务规则摘要（~200 tokens） */
  rulesSummary: string
  /** API 概览（~200 tokens） */
  apiOverview: string
}

@Injectable()
export class MirrorKnowledgeReader {
  private readonly logger = new Logger(MirrorKnowledgeReader.name)
  private readonly knowledgeDir: string
  private _cache: { entities: MirrorEntitySummary[]; apis: MirrorApiSummary[]; rulesCount: number; timestamp: number } | null = null
  private readonly CACHE_TTL_MS = 60_000

  constructor() {
    this.knowledgeDir = path.join(process.cwd(), 'knowledge')
  }

  /** 检查元镜知识是否可用 */
  isAvailable(): boolean {
    return fs.existsSync(path.join(this.knowledgeDir, 'entities', '_index.md'))
  }

  /** 获取完整知识快照 */
  read(): MirrorKnowledge {
    const available = this.isAvailable()
    return {
      available,
      entityIndex: available ? this.buildEntityIndex() : this.entityIndexFallback(),
      codePath: available ? this.buildCodePath() : this.codePathFallback(),
      entityDetail: (entityName: string) => available ? this.readEntityDetail(entityName) : '',
      rulesSummary: available ? this.readRulesSummary() : '',
      apiOverview: available ? this.readApiOverview() : '',
    }
  }

  // ═══════════════════════════════════════════
  // 实体索引
  // ═══════════════════════════════════════════

  private buildEntityIndex(): string {
    const entities = this.getCachedEntities()
    if (entities.length === 0) return ''

    const byModule = new Map<string, MirrorEntitySummary[]>()
    for (const e of entities) {
      const arr = byModule.get(e.module) || []
      arr.push(e)
      byModule.set(e.module, arr)
    }

    const lines: string[] = [
      '【可用 Entity】（元镜扫描 · 自动注入）',
      '',
    ]
    for (const [mod, ents] of byModule) {
      const entList = ents.map(e => {
        const fields = e.keyFields.length > 0 ? ` [${e.keyFields.join(', ')}]` : ''
        return `${e.name}(\`${e.tableName}\`${fields})`
      }).join(', ')
      lines.push(`📦 ${mod}: ${entList}`)
    }
    lines.push('', '💡 用 erdl_crud read {Entity名} 查看完整字段。')
    return lines.join('\n')
  }

  private entityIndexFallback(): string {
    return '【可用 Entity】元镜知识尚未生成。启动后将自动扫描。暂用 erdl_crud read 查看字段。'
  }

  // ═══════════════════════════════════════════
  // 代码路径地图
  // ═══════════════════════════════════════════

  private buildCodePath(): string {
    const archPath = path.join(this.knowledgeDir, 'architecture.md')
    if (!fs.existsSync(archPath)) return this.codePathFallback()

    try {
      const content = fs.readFileSync(archPath, 'utf-8')
      const modSection = (content.split('## 模块清单')[1] || '').split('\n## ')[0] || ''
      if (!modSection) return this.codePathFallback()

      const entities = this.getCachedEntities()
      const modEntMap = new Map<string, string[]>()
      for (const e of entities) {
        const arr = modEntMap.get(e.module) || []
        arr.push(e.name)
        modEntMap.set(e.module, arr)
      }

      const lines: string[] = [
        '【系统地图】（元镜自省 · 自动注入）',
        '',
        '后端引擎模块: backend/src/modules/',
      ]
      for (const [mod, entNames] of modEntMap) {
        const show = entNames.slice(0, 4).join('/')
        const more = entNames.length > 4 ? ` +${entNames.length - 4}` : ''
        lines.push(`├── ${mod}/ (${show}${more})`)
      }
      lines.push('', '知识库: backend/knowledge/ (元镜自动生成)')
      return lines.join('\n')
    } catch {
      return this.codePathFallback()
    }
  }

  private codePathFallback(): string {
    return `【系统地图】\n后端引擎: backend/src/modules/{erdl,eros,meta-mirror,soul,system,tool-registry,auth,health}`
  }

  // ═══════════════════════════════════════════
  // Entity 详情（按需）
  // ═══════════════════════════════════════════

  private readEntityDetail(entityName: string): string {
    const entitiesDir = path.join(this.knowledgeDir, 'entities')
    if (!fs.existsSync(entitiesDir)) return ''

    try {
      const files = fs.readdirSync(entitiesDir).filter(f => f.endsWith('.md') && f !== '_index.md')
      for (const file of files) {
        const content = fs.readFileSync(path.join(entitiesDir, file), 'utf-8')
        if (!content.includes(`## ${entityName}`)) continue

        const sections = content.split(`## ${entityName}`)
        if (sections.length < 2) continue
        const entityContent = (sections[1].split('\n## ')[0] || sections[1]).trim()

        return `【${entityName} 字段详情】（元镜注入）\n\n${entityContent.substring(0, 1500)}`
      }
    } catch {
      // 读取失败，静默
    }
    return ''
  }

  // ═══════════════════════════════════════════
  // 业务规则摘要
  // ═══════════════════════════════════════════

  private readRulesSummary(): string {
    const rulesPath = path.join(this.knowledgeDir, 'rules.md')
    if (!fs.existsSync(rulesPath)) return ''

    try {
      const content = fs.readFileSync(rulesPath, 'utf-8')
      const ruleLines = content.split('\n').filter(l =>
        l.startsWith('| ') && !l.includes('---') && !l.includes('规则 |')
      )
      if (ruleLines.length === 0) return ''

      const summary = ruleLines.slice(0, 10).map(l => {
        const parts = l.split('|').map(p => p.trim()).filter(Boolean)
        return `- ⛔ ${parts[0] || ''}: ${parts.slice(3).join(' ')}`
      })

      const tail = ruleLines.length > 10 ? `\n... 共 ${ruleLines.length} 条规则` : ''
      return `【业务规则】（元镜注入）\n${summary.join('\n')}${tail}`
    } catch {
      return ''
    }
  }

  // ═══════════════════════════════════════════
  // API 概览
  // ═══════════════════════════════════════════

  private readApiOverview(): string {
    const apisPath = path.join(this.knowledgeDir, 'apis.md')
    if (!fs.existsSync(apisPath)) return ''

    try {
      const content = fs.readFileSync(apisPath, 'utf-8')
      const epLines = content.split('\n').filter(l =>
        l.startsWith('| ') && l.includes('`') &&
        !l.includes('---') && !l.includes('方法 |')
      )
      if (epLines.length === 0) return ''

      const summary = epLines.slice(0, 15).map(l => {
        const parts = l.split('|').map(p => p.trim()).filter(Boolean)
        return `- ${parts[0] || ''} \`${parts[2] || parts[1] || ''}\`: ${parts[3] || ''}`
      })

      const tail = epLines.length > 15 ? `\n... 共 ${epLines.length} 个端点` : ''
      return `【API 索引】（元镜注入）\n${summary.join('\n')}${tail}`
    } catch {
      return ''
    }
  }

  // ═══════════════════════════════════════════
  // 缓存 + 解析
  // ═══════════════════════════════════════════

  private getCachedEntities(): MirrorEntitySummary[] {
    const now = Date.now()
    if (this._cache && now - this._cache.timestamp < this.CACHE_TTL_MS) {
      return this._cache.entities
    }
    const entities = this.parseEntityIndex()
    const rulesCount = this.countRules()
    this._cache = { entities, apis: [], rulesCount, timestamp: now }
    return entities
  }

  /** 从 knowledge/entities/_index.md 解析实体列表 */
  private parseEntityIndex(): MirrorEntitySummary[] {
    const indexPath = path.join(this.knowledgeDir, 'entities', '_index.md')
    if (!fs.existsSync(indexPath)) return []

    try {
      const content = fs.readFileSync(indexPath, 'utf-8')
      const entities: MirrorEntitySummary[] = []
      const lines = content.split('\n')
      let inTable = false
      for (const line of lines) {
        if (line.startsWith('| 模块 |')) { inTable = true; continue }
        if (line.startsWith('|------')) continue
        if (!inTable) continue
        if (!line.startsWith('|')) break

        const parts = line.split('|').map(p => p.trim()).filter(Boolean)
        if (parts.length < 3) continue
        entities.push({
          module: parts[0] || 'unknown',
          name: parts[1] || '',
          tableName: (parts[2] || '').replace(/`/g, ''),
          fieldCount: parseInt(parts[3] || '0', 10) || 0,
          keyFields: [],
        })
      }

      // 浅读详情提取关键字段
      for (const e of entities.slice(0, 20)) {
        const fields = this.readEntityKeyFields(e.name)
        if (fields.length > 0) e.keyFields = fields
      }
      return entities
    } catch {
      return []
    }
  }

  /** 从实体详情文件中提取标识字段 */
  private readEntityKeyFields(entityName: string): string[] {
    const entitiesDir = path.join(this.knowledgeDir, 'entities')
    if (!fs.existsSync(entitiesDir)) return []

    try {
      const files = fs.readdirSync(entitiesDir).filter(f => f.endsWith('.md') && f !== '_index.md')
      for (const file of files) {
        const content = fs.readFileSync(path.join(entitiesDir, file), 'utf-8')
        if (!content.includes(`## ${entityName}`)) continue

        const fieldLines = content.split('\n').filter(l =>
          l.startsWith('| ') && !l.includes('---') &&
          !l.includes('字段 |') && !l.includes('名称 |')
        )

        const keys = new Set<string>()
        const priority = ['主键', '唯一', '编码', 'code', 'name', '名称', '价格', 'price', '状态', 'status']
        for (const fl of fieldLines) {
          const parts = fl.split('|').map(p => p.trim()).filter(Boolean)
          if (parts.length < 2) continue
          const fn = parts[0]
          const rest = parts.slice(4).join('')
          if (priority.some(p => rest.includes(p) || fn.toLowerCase().includes(p.toLowerCase()))) {
            keys.add(fn)
          }
        }
        return Array.from(keys).slice(0, 6)
      }
    } catch {
      // ignore
    }
    return []
  }

  private countRules(): number {
    const rulesPath = path.join(this.knowledgeDir, 'rules.md')
    if (!fs.existsSync(rulesPath)) return 0
    try {
      const content = fs.readFileSync(rulesPath, 'utf-8')
      return content.split('\n').filter(l => l.startsWith('| ') && !l.includes('---') && !l.includes('规则 |')).length
    } catch {
      return 0
    }
  }

  /** 强制刷新缓存 */
  refreshCache(): void {
    this._cache = null
  }
}
