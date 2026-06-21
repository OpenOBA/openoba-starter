/**
 * OpenOBA · Agent Tool Implementations
 *
 * @file Agent 工具实现集 — 所有 execute*() 方法的独立容器
 * @author 唐浩然（OpenOBA AI 联合创始人）
 * @since 2026-06-21
 * @license BSL-1.1
 *
 * 从 agent-executor.service.ts（组C）拆分而来
 * 分三批搬迁。第一批：executeErpQuery + executeErdlCrud + executeKnowledgeQuery
 */

import { Injectable, Logger } from '@nestjs/common'
import type { Repository } from 'typeorm'
import type { ERDLRegistry } from '../../erdl/core/erdl-registry'
import type { EntityProxyService } from '../../erdl/core/entity-proxy.service'
import type { KnowledgeService } from './knowledge.service'
import type { InventoryService } from '../../inventory/inventory.service'
import type { AgentTask } from './agent-task.entity'

type DbRow = Record<string, string>

@Injectable()
export class AgentToolImplementations {
  private readonly logger = new Logger(AgentToolImplementations.name)

  // 安全红线常量表（从 Executor 搬迁）
  private readonly FORBIDDEN_TABLES = new Set<string>(
    ['sys_model_key', 'sys_user_credentials', 'sys_config_secret'],
  )
  private readonly READONLY_FIELDS = new Set<string>(
    ['id', 'createdAt', 'updatedAt', 'deletedAt', 'isDeleted', 'version'],
  )

  constructor(
    private readonly taskRepo: Repository<AgentTask>,
    private readonly registry: ERDLRegistry,
    private readonly proxy: EntityProxyService,
    private readonly knowledgeService: KnowledgeService,
    private readonly inventoryService: InventoryService,
  ) {}

  // ═══════════════════════════════════════════
  // executeErpQuery — 查询 ERP 数据
  // ═══════════════════════════════════════════

  async executeErpQuery(dataType: string): Promise<string> {
    const lines: string[] = []

    const queries: Record<string, () => Promise<void>> = {
      spu: async () => {
        try {
          const rows = await this.taskRepo.manager.query('SELECT spu_code, spu_name, structure_standard_code, series_code, gender, status FROM product_spu WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT 10')
          lines.push('## 现有 SPU')
          if (rows.length === 0) lines.push('（无数据）')
          else rows.forEach((r: DbRow) => lines.push(`- ${r.spu_code}: ${r.spu_name} | 结构标准:${r.structure_standard_code||'—'} | 系列:${r.series_code||'—'} | 性别:${r.gender||'—'} | ${r.status}`))
          lines.push('')
        } catch (e) { lines.push('## 现有 SPU\n（查询失败）\n') }
      },
      sku: async () => {
        try {
          const rows = await this.taskRepo.manager.query('SELECT sku_code, sku_name, color_code, skin_tone_effect, face_shape_effect, status FROM product_sku WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT 20')
          lines.push('## 现有 SKU')
          if (rows.length === 0) lines.push('（无数据）')
          else rows.forEach((r: DbRow) => lines.push(`- ${r.sku_code}: ${r.sku_name||'—'} | 色号:${r.color_code||'—'} | 肤色效果:${r.skin_tone_effect||'—'} | 脸型效果:${r.face_shape_effect||'—'} | ${r.status}`))
          lines.push('')
        } catch (e) { lines.push('## 现有 SKU\n（查询失败: '+String(e).substring(0,80)+'）\n') }
      },
      shapes: async () => {
        try {
          const rows = await this.taskRepo.manager.query('SELECT shape_code, shape_name FROM structure_shape WHERE is_active=1 ORDER BY sort_order')
          lines.push('## 可用框型'); rows.forEach((r: DbRow) => lines.push(`- ${r.shape_code}: ${r.shape_name}`)); lines.push('')
        } catch (e) { lines.push('## 可用框型\n（查询失败）\n') }
      },
      colors: async () => {
        try {
          const rows = await this.taskRepo.manager.query('SELECT color_code, color_name, color_name_en FROM dict_sku_color WHERE is_active=1 LIMIT 20')
          lines.push('## 可用色彩'); rows.forEach((r: DbRow) => lines.push(`- ${r.color_code}: ${r.color_name} (${r.color_name_en||''})`)); lines.push('')
        } catch (e) { lines.push('## 可用色彩\n（查询失败）\n') }
      },
      materials: async () => {
        try { lines.push('## 可用材质\n（字典表未配置）\n') } catch (e) { lines.push('## 可用材质\n（查询失败）\n') }
      },
      effects: async () => {
        try {
          const rows = await this.taskRepo.manager.query('SELECT effect_code, effect_type, effect_name FROM dict_effect_tag WHERE is_active=1 LIMIT 30')
          lines.push('## 效果词库')
          const skin = rows.filter((r: DbRow) => r.effect_type==='skin_tone')
          const face = rows.filter((r: DbRow) => r.effect_type==='face_shape')
          if (skin.length) lines.push(`肤色: ${skin.map((r: DbRow)=>r.effect_name).join('、')}`)
          if (face.length) lines.push(`脸型: ${face.map((r: DbRow)=>r.effect_name).join('、')}`)
          lines.push('')
        } catch (e) { lines.push('## 效果词库\n（查询失败）\n') }
      },
      series: async () => {
        try {
          const rows = await this.taskRepo.manager.query('SELECT series_code, series_name FROM structure_series WHERE is_active=1 ORDER BY sort_order')
          lines.push('## 可用系列'); rows.forEach((r: DbRow) => lines.push(`- ${r.series_code}: ${r.series_name}`)); lines.push('')
        } catch (e) { lines.push('## 可用系列\n（查询失败）\n') }
      },
      rules: async () => {
        const allRules = this.registry.getRulesByTrigger('Product.price.calculate')
        const pricing = allRules.filter(r => r.tier==='policy')
        lines.push('## 生效定价规则')
        if (pricing.length===0) lines.push('（无特殊规则，按默认定价）')
        else pricing.forEach(r => lines.push(`- ${r.name}: priority=${r.priority} tier=${r.tier}`))
        lines.push('')
      },
      all: async () => {
        for (const key of ['spu','sku','shapes','colors','materials','effects','series','rules']) {
          await queries[key]?.()
        }
      },
    }

    const fn = queries[dataType]
    if (fn) { await fn() } else { lines.push('未知数据类型: ' + dataType) }

    return lines.join('\n')
  }

  // ═══════════════════════════════════════════
  // executeKnowledgeQuery — 查询知识库
  // ═══════════════════════════════════════════

  async executeKnowledgeQuery(keyword: string): Promise<string> {
    const tags = keyword.split(/[,，]/).map(t => t.trim()).filter(Boolean)
    const { publicEntries, privateEntries } = await this.knowledgeService.searchForAgent({
      tags: tags.length > 0 ? tags : [keyword],
      topk: 5,
    })
    const lines: string[] = []
    if (publicEntries.length > 0) {
      lines.push(`## 知识库: "${keyword}" (${publicEntries.length} 条)`)
      for (const e of publicEntries) {
        lines.push(`- [${e.id}] ${e.title}`)
        lines.push(`  ${(e as any).content?.substring(0, 150) || ''}...`)
      }
    }
    if (privateEntries.length > 0) {
      lines.push(`## 私有知识 (${privateEntries.length} 条)`)
      for (const e of privateEntries) {
        lines.push(`- [${e.id}] ${e.title}`)
        lines.push(`  ${(e as any).content?.substring(0, 150) || ''}...`)
      }
    }
    if (publicEntries.length + privateEntries.length === 0) {
      lines.push(`未找到与"${keyword}"相关的知识条目`)
    }
    return lines.join('\n')
  }

  // ═══════════════════════════════════════════
  // executeErdlCrud — ERDL 实体代理 CRUD
  // ═══════════════════════════════════════════

  async executeErdlCrud(args: {
    action: string
    entity: string
    values?: Record<string, unknown>
    where?: Record<string, unknown>
    data?: Record<string, unknown>
  }): Promise<string> {
    const { action: rawAction, entity } = args
    const action = rawAction === 'query' ? 'read' : rawAction
    const values = args.values || args.data
    const where = args.where
    const select = (args as any).select
    const ns = 'industry.eyewear'

    // 安全红线：禁止系统表
    const mapping = (this.proxy as any).getMapping?.(ns, entity)
    if (mapping && this.FORBIDDEN_TABLES.has(mapping.table)) {
      return `❌ 禁止操作: ${mapping.table} 是系统安全表`
    }

    // 安全红线：禁止写系统字段
    if (values) {
      for (const key of Object.keys(values)) {
        if (this.READONLY_FIELDS.has(key)) return `❌ 禁止写系统字段: ${key}`
      }
    }

    try {
      switch (action) {
        case 'create': {
          if (!values || Object.keys(values).length === 0) return '❌ create 需要 values'

          if (entity === 'InventoryDocument' && this.proxy.getDataSource()) {
            try {
              return await this.proxy.withTransaction(async () => {
                const r = await this.proxy.insert({ namespace: ns, entity, data: values })
                if (!r.success) throw new Error(r.error || '创建失败')

                const docNo = values['docNo'] as string
                if (docNo) {
                  const docs = await this.inventoryService.findDocuments({ status: 'pending' })
                  const doc = docs.items.find((d: any) => d.docNo === docNo)
                  if (doc) {
                    await this.inventoryService.confirmDocument(doc.id, 'agent')
                    return `✅ 入库单 ${docNo} 已创建并执行！| ${entity} | 库存已更新（事务保护）`
                  }
                }
                return `✅ create ${entity} 成功（事务保护）| 影响 ${r.affectedRows || 1} 行`
              })
            } catch (e: unknown) {
              this.logger.error(`InventoryDocument 事务创建失败: ${(e as Error).message}`)
              return `❌ 操作失败（已回滚）: ${(e as Error).message}`
            }
          }

          const r = await this.proxy.insert({ namespace: ns, entity, data: values })
          if (!r.success) return `❌ 创建失败: ${r.error}`
          return `✅ create ${entity} 成功 | 影响 ${r.affectedRows || 1} 行`
        }

        case 'update': {
          if (!where) return '❌ update 需要 where 条件'
          if (!values || Object.keys(values).length === 0) return '❌ update 需要 values'
          const r = await this.proxy.update({ namespace: ns, entity, data: values, where })
          if (!r.success) return `❌ 更新失败: ${r.error}`
          return `✅ update ${entity} 成功 | 影响 ${r.affectedRows || 0} 行`
        }

        case 'delete': {
          if (!where) return '❌ delete 需要 where 条件'
          // 软删除
          const r = await this.proxy.update({ namespace: ns, entity, data: { isDeleted: true }, where })
          if (!r.success) return `❌ 删除失败: ${r.error}`
          return `✅ delete ${entity} 成功（软删除）| 影响 ${r.affectedRows || 0} 行`
        }

        case 'read': {
          const result = await this.proxy.query({
            namespace: ns,
            entity,
            where,
            limit: (args as any).limit || 30,
            offset: (args as any).offset || 0,
          } as any)
          if (!result.success) return `❌ 查询失败: ${result.error}`
          const rows = result.rows || []
          if (rows.length === 0) return `📭 ${entity}: 无匹配数据`
          const cols = select || (rows.length > 0 ? Object.keys(rows[0]).filter(k => k !== 'id') : ['*'])
          let table = `## ${entity} (${rows.length} 条)\n\n`
          table += '| ' + cols.join(' | ') + ' |\n'
          table += '|' + cols.map(() => '---').join('|') + '|\n'
          for (const row of rows) {
            table += '| ' + cols.map((c: string) => String(row[c] ?? '')).join(' | ') + ' |\n'
          }
          return table
        }

        default:
          return `❌ 不支持的操作: ${action}。支持: create/update/delete/read`
      }
    } catch (e: unknown) {
      this.logger.error(`ERDL CRUD 异常: ${(e as Error).message}`)
      return `❌ 操作异常: ${(e as Error).message}`
    }
  }
}
