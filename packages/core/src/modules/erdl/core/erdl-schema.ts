/**
 * ERDL Schema 定义 — .erdl 文件的完整规则校验 Schema
 *
 * @file erdl-schema.ts
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-26
 */

import type { EntityInfo } from '../../meta-mirror/types'
import type { EnhancedRuleInfo } from '../../meta-mirror/scanners/rule.scanner'

/** 校验严重级别 */
export type Severity = 'ERROR' | 'WARNING'

/** 单条校验结果 */
export interface ValidationIssue {
  severity: Severity
  rule: string        // 校验规则名（如 "entity_exists"）
  message: string     // 人类可读的错误描述
  file: string        // 出错的文件名
  line?: number       // 近似行号
  section?: string    // 文件段落（如 "rulesets.PricingRules.validations[1]"）
}

/** 校验报告 */
export interface ValidationReport {
  valid: boolean
  errors: number
  warnings: number
  issues: ValidationIssue[]
}

/** Entity 引用校验上下文 */
export interface ERDLValidationContext {
  /** 已注册的 Entity 名列表（来自 ERDLRegistry + EntityScanner） */
  entityNames: string[]
  /** Entity 的字段名集合（按 entityName 索引） */
  entityFields: Record<string, string[]>
  /** 已注册的 Alias 列表 */
  aliasCount: number
  /** 文件内容（按行分割，用于行号报告） */
  fileLines: string[]
}

/** 合法操作符白名单 */
export const VALID_OPERATORS = [
  'eq', 'ne', 'gt', 'gte', 'lt', 'lte',
  'in', 'contains', 'match', 'exists',
] as const

/** 合法 Rule tier 白名单 */
export const VALID_TIERS = ['policy', 'validation'] as const

/** 合法 ERDL 类型 */
export const VALID_ERDL_TYPES = [
  'String', 'UUID', 'Integer', 'Decimal', 'Boolean',
  'Enum', 'JSON', 'DateTime', 'Money(CNY)', 'Date',
] as const

/** 合法 Action 类型 */
export const VALID_ACTION_TYPES = ['calculate', 'validate', 'assign', 'notify'] as const

/** ERDL Schema 校验规则集 */
export const ERDL_SCHEMA_RULES = {
  /** 1. Entity 引用必须存在 */
  entityExists: {
    severity: 'ERROR' as Severity,
    description: 'ruleset 引用的 entity 必须存在于 Entity 列表中',
  },
  /** 2. Field 引用必须存在于对应 Entity */
  fieldExists: {
    severity: 'ERROR' as Severity,
    description: 'condition.field 必须在对应的 Entity 中定义',
  },
  /** 3. Operator 必须是合法值 */
  validOperator: {
    severity: 'ERROR' as Severity,
    description: `operator 必须是以下之一: ${VALID_OPERATORS.join(', ')}`,
  },
  /** 4. Validate action 必须有 error 消息 */
  validateHasError: {
    severity: 'ERROR' as Severity,
    description: 'validation 规则的 validate action 必须包含 params.error',
  },
  /** 5. Policy action 的 formula 语法合法 */
  validFormula: {
    severity: 'ERROR' as Severity,
    description: 'policy 规则的 calculate action 的 formula 必须是合法的数学表达式',
  },
  /** 6. Alias 目标字段必须存在于对应 Entity */
  aliasTargetExists: {
    severity: 'ERROR' as Severity,
    description: 'alias 映射的目标字段必须在对应的 Entity 中定义',
  },
  /** 7. Alias 目标 Entity 必须存在 */
  aliasEntityExists: {
    severity: 'ERROR' as Severity,
    description: 'alias 区域下的 Entity 键名必须存在于 Entity 列表中',
  },
  /** 8. Entity 字段 type 必须是合法 ERDL 类型 */
  validEntityType: {
    severity: 'WARNING' as Severity,
    description: `field type 建议使用标准 ERDL 类型: ${VALID_ERDL_TYPES.join(', ')}`,
  },
  /** 9. Enum 字段必须有 enum 值 */
  enumHasValues: {
    severity: 'WARNING' as Severity,
    description: 'type=Enum 的字段应包含 enum 值列表',
  },
  /** 10. Tier 必须是合法值 */
  validTier: {
    severity: 'ERROR' as Severity,
    description: `tier 必须是 ${VALID_TIERS.join(' 或 ')}`,
  },
  /** 11. Sync policy 引用的表名必须合理（字母数字下划线） */
  validSyncTable: {
    severity: 'WARNING' as Severity,
    description: 'sync_policy 的 table 名称应只包含字母数字下划线',
  },
  /** 12. 必填字段标记一致 */
  requiredConsistency: {
    severity: 'WARNING' as Severity,
    description: 'ERDL 中标记 required:true 的字段与 Entity 定义应保持一致',
  },
  /** 13. 公式中引用的变量必须在 condition.field 或 context 中存在 */
  formulaVariables: {
    severity: 'WARNING' as Severity,
    description: 'formula 中引用的变量应确保在 context 中可获取',
  },
} as const

/** 校验规则名类型 */
export type ERDLSchemaRuleName = keyof typeof ERDL_SCHEMA_RULES
