/**
 * 秒镜科技 · ERDL — Enterprise Resource Definition Language
 *
 * @file ERDL Parser — 轻量 YAML 解析器
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-01
 * @version 1.3 — 新增 Entity 物理映射（table / dbColumn / primaryKey）
 * @license BSL-1.1
 */

import * as yaml from 'js-yaml'
import { z } from 'zod'
import * as fs from 'fs'

// ============================================
// Zod Schema — ERDL 语法校验
// ============================================

/** ERDL Entity 属性值 Schema — V1.3 新增 dbColumn */
const PropertySchema = z.union([
  z.string(),
  z.object({
    type: z.string().optional(),
    required: z.boolean().optional(),
    maxLength: z.number().optional(),
    default: z.any().optional(),
    enum: z.array(z.string()).optional(),
    dbColumn: z.string().optional(),         // V1.3: 数据库物理列名
  }),
])

/** ERDL Entity 定义 Schema — V1.3 新增 table/primaryKey */
const EntitySchema = z.object({
  table: z.string().optional(),              // V1.3: 数据库物理表名
  primaryKey: z.string().default('id'),       // V1.3: 主键列名
  properties: z.record(z.string(), PropertySchema),
  metadata: z
    .object({
      knowledge: z.string().optional(),
      icon: z.string().optional(),
      category: z.string().optional(),
    })
    .optional(),
})

/** ERDL 规则条件 Schema */
const RuleConditionSchema: z.ZodType = z.lazy(() =>
  z.object({
    logic: z.enum(['AND', 'OR']),
    conditions: z.array(z.union([RuleConditionSchema, z.unknown()])),
  }),
)

/** ERDL 规则动作 Schema */
const RuleActionSchema = z.object({
  type: z.enum(['assign', 'calculate', 'validate', 'notify']),
  params: z.record(z.string(), z.any()),
})

/** ERDL 策略规则 Schema */
const PolicyRuleSchema = z.object({
  name: z.string(),
  priority: z.number().default(100),
  trigger: z.string().optional(),
  tier: z.enum(['validation', 'policy']).default('policy'),
  entity: z.string().optional(),
  condition: RuleConditionSchema.optional(),
  actions: z.array(RuleActionSchema).optional(),
})

/** ERDL Agent 定义 Schema */
const AgentSchema = z.object({
  capabilities: z.array(z.string()).optional(),
  knowledgeBases: z.array(z.string()).optional(),
  triggers: z.array(z.object({
    event: z.string(),
    condition: z.string().optional(),
  })).optional(),
  permissions: z.object({
    canRead: z.array(z.string()).optional(),
    canWrite: z.array(z.string()).optional(),
  }).optional(),
})

/** ERDL 知识库定义 Schema */
const KnowledgeBaseSchema = z.object({
  type: z.enum(['STRUCTURED', 'FILE', 'API']).optional(),
  source: z.object({
    type: z.enum(['FILE', 'API']).optional(),
    path: z.string().optional(),
    endpoint: z.string().optional(),
    sync: z.string().optional(),
  }).optional(),
  retrieval: z.object({
    top_k: z.number().optional(),
    similarity_threshold: z.number().optional(),
  }).optional(),
})

/** 同步策略 */
const SyncPolicySchema = z.record(z.string(), z.object({
  mode: z.enum(['scheduled', 'on-demand']).default('scheduled'),
  refresh: z.string().optional(),
  source: z.object({
    type: z.enum(['api', 'db', 'dict', 'file']),
    endpoint: z.string().optional(),
    table: z.string().optional(),
    fields: z.array(z.string()).optional(),
  }),
  transform: z.enum(['passthrough', 'llm_normalize', 'range_map']).default('passthrough'),
  target: z.enum(['system_prompt', 'context_json']).default('system_prompt'),
})).optional()

/** 语义层 */
const SemanticLayerSchema = z.object({
  dictionaries: z.array(z.object({
    name: z.string(),
    source: z.string(),
    mapping_engine: z.enum(['llm_bridge', 'regex', 'lookup']).default('llm_bridge'),
  })).optional(),
  hotword_rules: z.object({
    detect_from: z.array(z.string()).optional(),
    normalize_to: z.string().optional(),
    confidence_threshold: z.number().default(0.7),
  }).optional(),
}).optional()

/** 演化规则 */
const EvolutionRulesSchema = z.object({
  auto_expand: z.boolean().default(false),
  threshold: z.number().default(100),
  review_workflow: z.enum(['auto_draft', 'human_approve']).default('human_approve'),
}).optional()

/** 别名映射：行业黑话 → 标准字段名 */
const AliasesSchema = z.record(
  z.string(),                                 // Entity 名
  z.record(z.string(), z.string()),           // alias → field_name
).optional()

/** ERDL Action 参数定义 Schema (V1.5) */
const ActionParamSchema = z.object({
  entity: z.string().optional(),
  field: z.string().optional(),
  required: z.boolean().optional(),
  type: z.string().optional(),
  enum: z.array(z.string()).optional(),
  values: z.array(z.string()).optional(),
  isArray: z.boolean().optional(),
  default: z.any().optional(),
})

/** ERDL Action 定义 Schema (V1.5) */
const ActionSchema = z.object({
  description: z.string().optional(),
  service: z.string().optional(),
  agentTypes: z.array(z.string()).optional(),
  params: z.record(z.string(), ActionParamSchema).optional(),
})

/** ERDL 完整 Schema */
const ERDLSchema = z.object({
  namespace: z.string().min(1, 'namespace 不能为空'),
  module: z.object({
    version: z.string().optional(),
    extends: z.string().optional(),
  }).optional(),
  entities: z.record(z.string(), EntitySchema).optional(),
  aliases: AliasesSchema.optional(),
  actions: z.record(z.string(), ActionSchema).optional(),
  rulesets: z.record(z.string(), z.object({
    policies: z.array(PolicyRuleSchema).optional(),
    validations: z.array(PolicyRuleSchema).optional(),
  })).optional(),
  agents: z.record(z.string(), AgentSchema).optional(),
  knowledgeBases: z.record(z.string(), KnowledgeBaseSchema).optional(),
  sync_policy: SyncPolicySchema.optional(),
  semantic_layer: SemanticLayerSchema.optional(),
  evolution_rules: EvolutionRulesSchema.optional(),
})

// ============================================
// 类型导出
// ============================================

export type ERDLAST = z.infer<typeof ERDLSchema>

/** ERDL Action 参数定义类型 (V1.5) */
export type ERDLActionParamDef = z.infer<typeof ActionParamSchema>
/** ERDL Action 定义类型 (V1.5) */
export type ERDLActionDef = z.infer<typeof ActionSchema>

/** 别名映射类型 */
export type AliasMap = Record<string, string>
export type AliasesRegistry = Record<string, AliasMap>

// ============================================
// ERDL Parser 核心类
// ============================================

export class ERDLParser {
  static parse(filePath: string): ERDLAST {
    if (!fs.existsSync(filePath)) throw new Error(`ERDL 文件不存在: ${filePath}`)
    return this.parseString(fs.readFileSync(filePath, 'utf-8'))
  }

  static parseString(yamlStr: string): ERDLAST {
    const raw = yaml.load(yamlStr)
    if (raw === null || typeof raw !== 'object') throw new Error('ERDL 文件内容不能为空')
    return ERDLSchema.parse(raw)
  }

  static validate(yamlStr: string): { valid: boolean; errors: string[] } {
    try {
      const raw = yaml.load(yamlStr)
      if (raw === null || typeof raw !== 'object') return { valid: false, errors: ['ERDL 文件内容不能为空'] }
      ERDLSchema.parse(raw)
      return { valid: true, errors: [] }
    } catch (e) {
      return { valid: false, errors: [e instanceof Error ? e.message : String(e)] }
    }
  }
}
