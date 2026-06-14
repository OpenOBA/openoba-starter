"use strict";
/**
 * ERDL Schema 定义 — .erdl 文件的完整规则校验 Schema
 *
 * @file erdl-schema.ts
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-26
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERDL_SCHEMA_RULES = exports.VALID_ACTION_TYPES = exports.VALID_ERDL_TYPES = exports.VALID_TIERS = exports.VALID_OPERATORS = void 0;
/** 合法操作符白名单 */
exports.VALID_OPERATORS = [
    'eq', 'ne', 'gt', 'gte', 'lt', 'lte',
    'in', 'contains', 'match', 'exists',
];
/** 合法 Rule tier 白名单 */
exports.VALID_TIERS = ['policy', 'validation'];
/** 合法 ERDL 类型 */
exports.VALID_ERDL_TYPES = [
    'String', 'UUID', 'Integer', 'Decimal', 'Boolean',
    'Enum', 'JSON', 'DateTime', 'Money(CNY)', 'Date',
];
/** 合法 Action 类型 */
exports.VALID_ACTION_TYPES = ['calculate', 'validate', 'assign', 'notify'];
/** ERDL Schema 校验规则集 */
exports.ERDL_SCHEMA_RULES = {
    /** 1. Entity 引用必须存在 */
    entityExists: {
        severity: 'ERROR',
        description: 'ruleset 引用的 entity 必须存在于 Entity 列表中',
    },
    /** 2. Field 引用必须存在于对应 Entity */
    fieldExists: {
        severity: 'ERROR',
        description: 'condition.field 必须在对应的 Entity 中定义',
    },
    /** 3. Operator 必须是合法值 */
    validOperator: {
        severity: 'ERROR',
        description: `operator 必须是以下之一: ${exports.VALID_OPERATORS.join(', ')}`,
    },
    /** 4. Validate action 必须有 error 消息 */
    validateHasError: {
        severity: 'ERROR',
        description: 'validation 规则的 validate action 必须包含 params.error',
    },
    /** 5. Policy action 的 formula 语法合法 */
    validFormula: {
        severity: 'ERROR',
        description: 'policy 规则的 calculate action 的 formula 必须是合法的数学表达式',
    },
    /** 6. Alias 目标字段必须存在于对应 Entity */
    aliasTargetExists: {
        severity: 'ERROR',
        description: 'alias 映射的目标字段必须在对应的 Entity 中定义',
    },
    /** 7. Alias 目标 Entity 必须存在 */
    aliasEntityExists: {
        severity: 'ERROR',
        description: 'alias 区域下的 Entity 键名必须存在于 Entity 列表中',
    },
    /** 8. Entity 字段 type 必须是合法 ERDL 类型 */
    validEntityType: {
        severity: 'WARNING',
        description: `field type 建议使用标准 ERDL 类型: ${exports.VALID_ERDL_TYPES.join(', ')}`,
    },
    /** 9. Enum 字段必须有 enum 值 */
    enumHasValues: {
        severity: 'WARNING',
        description: 'type=Enum 的字段应包含 enum 值列表',
    },
    /** 10. Tier 必须是合法值 */
    validTier: {
        severity: 'ERROR',
        description: `tier 必须是 ${exports.VALID_TIERS.join(' 或 ')}`,
    },
    /** 11. Sync policy 引用的表名必须合理（字母数字下划线） */
    validSyncTable: {
        severity: 'WARNING',
        description: 'sync_policy 的 table 名称应只包含字母数字下划线',
    },
    /** 12. 必填字段标记一致 */
    requiredConsistency: {
        severity: 'WARNING',
        description: 'ERDL 中标记 required:true 的字段与 Entity 定义应保持一致',
    },
    /** 13. 公式中引用的变量必须在 condition.field 或 context 中存在 */
    formulaVariables: {
        severity: 'WARNING',
        description: 'formula 中引用的变量应确保在 context 中可获取',
    },
};
//# sourceMappingURL=erdl-schema.js.map