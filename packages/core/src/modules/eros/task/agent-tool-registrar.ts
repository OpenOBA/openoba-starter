/**
 * OpenOBA · Agent Tool Registrar
 *
 * @file Agent 工具注册器 — 负责所有工具定义的注册
 * @author 唐浩然（OpenOBA AI 联合创始人）
 * @since 2026-06-21
 * @license BSL-1.1
 *
 * 从 agent-executor.service.ts（组B / onModuleInit）拆分而来
 * 把注册逻辑从 Executor 中移出，保持 Executor 专注于编排
 */

import { Injectable, Logger } from '@nestjs/common'
import type { ERDLRegistry, EntityRegistration } from '../../erdl/core/erdl-registry'
import type { AgentToolRegistry } from './agent-tool-registry'
import type { DraftService } from '../../draft-pool/draft.service'
import type { DraftPoolService } from '../../draft-pool/draft-pool.service'

// ============================================
// 工具注册所需的回调（避免循环依赖）
// ============================================

/** 草稿创建参数 */
export interface DraftCreateArgs {
  spuName: string
  gender: string
  shapeCode: string
  seriesCode: string
  structureStandardCode: string
  spuDescription?: string
  skus?: Array<{ colorCode: string; colorName?: string; skinToneEffect?: string; faceShapeEffect?: string; displayName?: string; retailPrice?: number }>
}

/** 美学校验参数 */
export interface AestheticsCheckArgs {
  shapeCode: string
  colorCode: string
  seriesCode?: string
  gender?: string
  skinToneEffect?: string
  faceShapeEffect?: string
}

/** 草稿列表参数 */
export interface DraftListArgs {
  status?: string
  gender?: string
  source?: string
  pageSize?: number
}

/** 文件编辑参数 */
export interface FileEditArgs {
  operation: string
  filePath: string
  oldStr?: string
  newStr?: string
  content?: string
  limit?: number
  offset?: number
}

export interface ToolRegisterCallbacks {
  executeErpQuery: (dataType: string) => Promise<string>
  executeKnowledgeQuery: (keyword: string) => Promise<string>
  executeErdlCrud: (args: { action: string; entity: string; values?: Record<string, unknown>; where?: Record<string, unknown> }) => Promise<string>
  executeDraftCreate: (args: DraftCreateArgs) => Promise<string>
  executeDraftAddSku: (args: { spuId: string; skus: Array<{ colorCode: string; colorName?: string; skinToneEffect?: string; faceShapeEffect?: string; displayName?: string; retailPrice?: number }> }) => Promise<string>
  executeAestheticsCheck: (args: AestheticsCheckArgs) => Promise<string>
  executeDraftList: (args: DraftListArgs) => Promise<string>
  executeCsvExport: (entity: string, format: string, data: Record<string, unknown>[], filename: string) => Promise<string>
  executeWebFetch: (url: string, mode: string, maxChars?: number) => Promise<string>
  executeDataAnalyze: (op: string, data: Record<string, unknown>[], field: string, topN?: number, fField?: string, fVal?: string) => string
  executeImportAnalyze: (filePath: string) => Promise<string>
  executeImportMap: (columns: string[], entityName: string) => string
  executeImportExecute: (entityName: string, data: Record<string, unknown>[]) => Promise<string>
  executeFileEdit: (args: FileEditArgs) => string
  executeTscCheck: (project: string) => string
  executeGitDiff: (mode: string, filePath?: string) => string
}

export interface ToolRegisterArgs {
  toolRegistry: AgentToolRegistry
  registry: ERDLRegistry
  draftService: DraftService
  draftPoolService: DraftPoolService
  callbacks: ToolRegisterCallbacks
}

@Injectable()
export class AgentToolRegistrar {
  private readonly logger = new Logger(AgentToolRegistrar.name)

  /** 注册所有 Agent 工具（从 Executor.onModuleInit 搬迁而来） */
  registerAllTools({ toolRegistry, registry, draftService, draftPoolService, callbacks }: ToolRegisterArgs): void {
    // query_erp_data — 查询 ERP 数据
    toolRegistry.register({
      definition: {
        type: 'function',
        function: {
          name: 'query_erp_data',
          description: '查询 ERP 系统中的真实业务数据',
          strict: true,
          parameters: {
            type: 'object',
            properties: {
              data_type: {
                type: 'string',
                enum: ['all', 'spu', 'sku', 'shapes', 'colors', 'materials', 'effects', 'series', 'rules'],
                description: '数据类型。all=全部',
              },
            },
            required: ['data_type'],
            additionalProperties: false,
          },
        },
      },
      execute: async (_name, args) => {
        return await callbacks.executeErpQuery(String(args['data_type'] || 'all'))
      },
    })

    // query_knowledge — 查询知识库
    toolRegistry.register({
      definition: {
        type: 'function',
        function: {
          name: 'query_knowledge',
          description: '查询知识库中的行业经验和最佳实践，用于辅助决策。支持单个关键词或多关键词（逗号分隔）',
          strict: true,
          parameters: {
            type: 'object',
            properties: {
              keyword: {
                type: 'string',
                description: '搜索关键词，如 钛合金、圆框、定价策略、脸型匹配。多个关键词用逗号分隔',
              },
            },
            required: ['keyword'],
            additionalProperties: false,
          },
        },
      },
      execute: async (_name, args) => {
        return await callbacks.executeKnowledgeQuery(String(args['keyword'] || ''))
      },
      agentTypes: [],
    })

    // ── erdl_crud V1.3：实体代理引擎 ──
    const entityNames = registry.getAllEntities()
      .filter(e => e.namespace === 'industry.eyewear')
      .map(e => e.name).join('/')
    toolRegistry.register({
      definition: {
        type: 'function',
        function: {
          name: 'erdl_crud',
          description: `ERDL实体代理引擎。read=查询, create=插入, update=修改, delete=软删除。可用Entity: ${entityNames}。字段名用语义名(如spuCode)或别名(如"售价")均可。`,
          strict: true,
          parameters: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['create', 'update', 'delete', 'read'] },
              entity: { type: 'string', description: `Entity名称。可用: ${entityNames}` },
              values: { type: 'object', description: 'create/update时的字段值，用语义字段名(如spuCode)或别名(如"售价")均可' },
              where: { type: 'object', description: 'update/delete/read时的条件' },
              select: { type: 'array', description: 'read时选择的字段', items: { type: 'string' } },
            },
            required: ['action', 'entity'],
            additionalProperties: false,
          },
        },
      },
      execute: async (_name, args) => {
        return callbacks.executeErdlCrud(args as { action: string; entity: string; values?: Record<string, unknown>; where?: Record<string, unknown> })
      },
      agentTypes: [],
    })

    // ── draft_create：创建草稿 SPU/SKU ──
    toolRegistry.register({
      definition: {
        type: 'function',
        function: {
          name: 'draft_create',
          description: '在草稿池中创建 SPU/SKU 草稿。草稿需人工审核后才能上架。创建后可调 aesthetics_check 校验。支持传入 spuName(必填)、gender、shapeCode、seriesCode、structureStandardCode、spuDescription、skus 等字段。skus 数组每项支持 colorCode(必填)、colorName、skinToneEffect、faceShapeEffect、displayName。',
          strict: true,
          parameters: {
            type: 'object',
            properties: {
              spuName: { type: 'string', description: 'SPU名称（必填），如"秒镜 S5366 · 圆框时尚系列 · 女款"' },
              gender: { type: 'string', description: '性别：female/male/unisex/limited' },
              shapeCode: { type: 'string', description: '框型编码，如 RND=Round/圆框, REC=Rectangle/方框, CAT=CatEye/猫眼, OVL=Oval/椭圆, HEX=Hexagon/六角, BRC=Browline/眉框, SQR=Square/方形, WEL=Wellington/威灵顿' },
              seriesCode: { type: 'string', description: '系列编码，如 FSH=时尚, BUS=商务, CLS=经典, SPT=运动' },
              structureStandardCode: { type: 'string', description: '结构标准编码，如 STD_4848, STD_5147, STD_5245' },
              spuDescription: { type: 'string', description: 'SPU描述文案' },
              skus: { type: 'array', description: 'SKU列表', items: { type: 'object', properties: { colorCode: { type: 'string', description: '色号编码' }, colorName: { type: 'string', description: '颜色名称' }, skinToneEffect: { type: 'string', description: '肤色效果词' }, faceShapeEffect: { type: 'string', description: '脸型效果词' }, displayName: { type: 'string', description: 'SKU展示名' } }, required: ['colorCode'] } },
            },
            required: ['spuName', 'gender', 'shapeCode', 'seriesCode', 'structureStandardCode'],
            additionalProperties: true,
          },
        },
      },
      execute: async (_name, args) => {
        return callbacks.executeDraftCreate(args as unknown as DraftCreateArgs)
      },
      agentTypes: ['product_listing'],
    })

    // ── draft_add_sku：为已有 SPU 补充 SKU ──
    toolRegistry.register({
      definition: {
        type: 'function',
        function: {
          name: 'draft_add_sku',
          description: '为已有 SPU 补充 SKU 到草稿池。传入 spuId（必填，如 S5344-RND-0001）和 skus 数组即可。skus 每项支持 colorCode(必填)、colorName、skinToneEffect、faceShapeEffect、displayName、retailPrice。无需重复传 SPU 级字段（gender/shapeCode等会自动从已有SPU读取）。',
          strict: true,
          parameters: {
            type: 'object',
            properties: {
              spuId: { type: 'string', description: '已有SPU的ID（必填），如 S5344-RND-0001' },
              skus: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    colorCode: { type: 'string', description: '色号编码（必填）' },
                    colorName: { type: 'string', description: '颜色名称' },
                    skinToneEffect: { type: 'string', description: '肤色效果词' },
                    faceShapeEffect: { type: 'string', description: '脸型效果词' },
                    displayName: { type: 'string', description: 'SKU展示名' },
                    retailPrice: { type: 'number', description: '零售价（元）' },
                  },
                  required: ['colorCode'],
                },
                description: '要添加的SKU列表',
              },
            },
            required: ['spuId', 'skus'],
            additionalProperties: false,
          },
        },
      },
      execute: async (_name, args) => callbacks.executeDraftAddSku(args as unknown as { spuId: string; skus: Array<{ colorCode: string; colorName?: string; skinToneEffect?: string; faceShapeEffect?: string; displayName?: string; retailPrice?: number }> }),
      agentTypes: ['main', 'product_listing'],
    })

    // ── aesthetics_check：美学校验 ──
    toolRegistry.register({
      definition: {
        type: 'function',
        function: {
          name: 'aesthetics_check',
          description: '对 SPU/SKU 进行美学校验（框型+脸型、色彩+肤色等）。返回通过/警告/阻断及建议。',
          strict: true,
          parameters: {
            type: 'object',
            properties: {
              shapeCode: { type: 'string', description: '框型编码' },
              seriesCode: { type: 'string', description: '系列编码' },
              gender: { type: 'string' },
              colorCode: { type: 'string', description: '色号' },
              skinToneEffect: { type: 'string', description: '肤色效果词' },
              faceShapeEffect: { type: 'string', description: '脸型效果词' },
            },
            required: ['shapeCode', 'colorCode'],
            additionalProperties: false,
          },
        },
      },
      execute: async (_name, args) => {
        return callbacks.executeAestheticsCheck(args as unknown as AestheticsCheckArgs)
      },
      agentTypes: ['product_listing'],
    })

    // ── draft_list：查询草稿池 ──
    toolRegistry.register({
      definition: {
        type: 'function',
        function: {
          name: 'draft_list',
          description: '查询草稿池中的草稿列表，可按状态、性别、框型、系列、来源筛选。用于查看已创建的草稿及审核状态。',
          strict: true,
          parameters: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['draft', 'reviewed', 'approved', 'published', 'rejected'], description: '草稿状态' },
              gender: { type: 'string', enum: ['female', 'male', 'unisex', 'limited'] },
              source: { type: 'string', enum: ['ai', 'manual'], description: '来源：ai=AI生成, manual=人工创建' },
              pageSize: { type: 'number', description: '每页数量，默认20' },
            },
            additionalProperties: false,
          },
        },
      },
      execute: async (_name, args) => {
        return callbacks.executeDraftList(args as unknown as DraftListArgs)
      },
      agentTypes: [],
    })

    // ── csv_export（智能模式） ──
    toolRegistry.register({
      definition: {
        type: 'function',
        function: {
          name: 'csv_export',
          description: '导出数据为CSV/Markdown/JSON文件。用法1: csv_export(entity:"StructureStandard",format:"csv") 自动查询+导出。用法2: csv_export(data:[...],format:"csv") 手动传入数据',
          strict: true,
          parameters: {
            type: 'object',
            properties: {
              entity: { type: 'string', description: '要自动查询导出的Entity名称(如StructureStandard)。优先于data参数' },
              format: { type: 'string', enum: ['csv', 'markdown', 'json'], description: '导出格式' },
              data: { type: 'array', items: { type: 'object' }, description: '手动传入的数据数组(可选，优先用entity)' },
              filename: { type: 'string', description: '文件名' },
            },
            required: [],
            additionalProperties: false,
          },
        },
      },
      execute: async (_name, args) => callbacks.executeCsvExport(String(args['entity'] || ''), String(args['format'] || 'csv'), (args['data'] as Record<string, unknown>[]) || [], String(args['filename'] || '')),
    })

    // ── draft_update：更新草稿 ──
    toolRegistry.register({
      definition: {
        type: 'function',
        function: {
          name: 'draft_update',
          description: '更新草稿池中的草稿信息。可更新标题、正文、标签等。',
          strict: true,
          parameters: {
            type: 'object',
            properties: {
              draftId: { type: 'string', description: '草稿ID' },
              title: { type: 'string', description: '草稿标题' },
              bodyText: { type: 'string', description: '正文文本' },
              bodyJson: { type: 'object', description: '正文JSON数据' },
              tags: { type: 'array', items: { type: 'string' }, description: '标签数组' },
            },
            required: ['draftId'],
            additionalProperties: false,
          },
        },
      },
      execute: async (_name, args) => {
        const a = args as Record<string, unknown>
        const draftId = String(a.draftId || '')
        const update: Record<string, unknown> = {}
        if (a.title) update.title = a.title
        if (a.bodyText) update.bodyText = a.bodyText
        if (a.bodyJson) update.bodyJson = a.bodyJson
        if (a.tags) update.tags = a.tags
        try {
          await draftService.update(draftId, update)
          return `✅ 草稿 ${draftId} 已更新`
        } catch (e: unknown) {
          try {
            await draftPoolService.updateDraft(draftId, update)
            return `✅ 草稿 ${draftId} 已更新(fallback)`
          } catch (e2: unknown) {
            return `❌ 草稿更新失败: ${(e2 as Error).message}`
          }
        }
      },
      agentTypes: ['main', 'product_listing', 'content_creation'],
    })

    // ── web_fetch：网页抓取 ──
    toolRegistry.register({
      definition: {
        type: 'function',
        function: {
          name: 'web_fetch',
          description: '抓取网页内容并提取文本。用于获取竞品信息、行业资讯等。',
          strict: true,
          parameters: {
            type: 'object',
            properties: {
              url: { type: 'string', description: '网页URL' },
              extractMode: { type: 'string', enum: ['markdown', 'text'], description: '提取模式' },
              maxChars: { type: 'number', description: '最大返回字符数' },
            },
            required: ['url'],
            additionalProperties: false,
          },
        },
      },
      execute: async (_name, args) => callbacks.executeWebFetch(String(args['url']), String(args['extractMode'] || 'markdown'), args['maxChars'] as number),
    })

    // ── data_analyze：数据分析 ──
    toolRegistry.register({
      definition: {
        type: 'function',
        function: {
          name: 'data_analyze',
          description: '对数据进行分析：summarize(统计摘要)、topN(排序取前N)、trend(趋势)、filter(过滤)',
          strict: true,
          parameters: {
            type: 'object',
            properties: {
              operation: { type: 'string', enum: ['summarize', 'topN', 'trend', 'filter'], description: '分析操作' },
              data: { type: 'array', description: '数据数组', items: { type: 'object' } },
              field: { type: 'string', description: '操作字段' },
              topCount: { type: 'number', description: 'topN操作的返回数量' },
              filterField: { type: 'string', description: 'filter操作的过滤字段' },
              filterValue: { type: 'string', description: 'filter操作的过滤值' },
            },
            required: ['operation', 'data'],
            additionalProperties: false,
          },
        },
      },
      execute: async (_name, args) => callbacks.executeDataAnalyze(String(args['operation']), (args['data'] as Record<string, unknown>[]) || [], String(args['field'] || ''), args['topCount'] as number, String(args['filterField'] || ''), String(args['filterValue'] || '')),
    })

    // ── import_analyze：导入文件分析 ──
    toolRegistry.register({
      definition: {
        type: 'function',
        function: {
          name: 'import_analyze',
          description: '分析CSV/JSON导入文件，返回列名预览和数据结构。',
          strict: true,
          parameters: {
            type: 'object',
            properties: {
              filePath: { type: 'string', description: '文件路径' },
            },
            required: ['filePath'],
            additionalProperties: false,
          },
        },
      },
      execute: async (_name, args) => callbacks.executeImportAnalyze(String(args['filePath'])),
    })

    // ── import_map：导入列映射 ──
    toolRegistry.register({
      definition: {
        type: 'function',
        function: {
          name: 'import_map',
          description: '将导入文件列映射到目标Entity字段。',
          strict: true,
          parameters: {
            type: 'object',
            properties: {
              columns: { type: 'array', items: { type: 'string' }, description: '源列名数组' },
              entity: { type: 'string', description: '目标Entity名称' },
            },
            required: ['columns', 'entity'],
            additionalProperties: false,
          },
        },
      },
      execute: async (_name, args) => callbacks.executeImportMap(args['columns'] as string[], String(args['entity'])),
    })

    // ── import_execute：导入执行 ──
    toolRegistry.register({
      definition: {
        type: 'function',
        function: {
          name: 'import_execute',
          description: '将规范化数据写入目标Entity。',
          strict: true,
          parameters: {
            type: 'object',
            properties: {
              entity: { type: 'string', description: '目标Entity名称' },
              data: { type: 'array', items: { type: 'object' }, description: '要导入的数据数组' },
            },
            required: ['entity', 'data'],
            additionalProperties: false,
          },
        },
      },
      execute: async (_name, args) => callbacks.executeImportExecute(String(args['entity']), (args['data'] as Record<string, unknown>[]) || []),
    })

    // H18: 注册开发工具
    const ADMIN_TOOLS = ['main']
    toolRegistry.register({ definition: { type: 'function', function: { name: 'file_edit', description: '精准编辑项目源代码文件。read=读取(默认5000行，可设limit+offset分页), replace=替换, write=覆写。大文件用 offset 分段读取。目录输入返回文件列表。', parameters: { type: 'object', properties: { operation: { type: 'string', enum: ['read','replace','write'] }, filePath: { type: 'string', description: '文件路径，如 backend/src/modules/soul/soul.service.ts' }, oldStr: { type: 'string', description: 'replace 时：要替换的原文本' }, newStr: { type: 'string' }, content: { type: 'string', description: 'write 时：完整文件内容' } }, required: ['operation','filePath'], additionalProperties: false } } }, execute: async (_n, args) => callbacks.executeFileEdit(args as unknown as FileEditArgs), agentTypes: ADMIN_TOOLS })
    toolRegistry.register({ definition: { type: 'function', function: { name: 'tsc_check', description: 'TypeScript 编译检查。修改代码后调用验证。project: backend/frontend/both', parameters: { type: 'object', properties: { project: { type: 'string', description: 'backend | frontend | both' } } } } }, execute: async (_n, args) => callbacks.executeTscCheck(String(args['project'] || 'backend')), agentTypes: ADMIN_TOOLS })
    toolRegistry.register({ definition: { type: 'function', function: { name: 'git_diff', description: '查看 Git 工作区变更。mode: status/diff/stat', parameters: { type: 'object', properties: { mode: { type: 'string' }, filePath: { type: 'string' } } } } }, execute: async (_n, args) => callbacks.executeGitDiff(String(args['mode'] || 'stat'), args['filePath'] as string), agentTypes: ADMIN_TOOLS })

    this.logger.log(`已注册 ${toolRegistry.getDefinitions().length} 个 Agent 工具`)
  }
}
