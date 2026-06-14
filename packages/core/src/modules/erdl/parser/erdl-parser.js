"use strict";
/**
 * 秒镜科技 · ERDL — Enterprise Resource Definition Language
 *
 * @file ERDL Parser — 轻量 YAML 解析器
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-01
 * @version 1.3 — 新增 Entity 物理映射（table / dbColumn / primaryKey）
 * @license AGPL-3.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERDLParser = void 0;
const yaml = __importStar(require("js-yaml"));
const zod_1 = require("zod");
const fs = __importStar(require("fs"));
// ============================================
// Zod Schema — ERDL 语法校验
// ============================================
/** ERDL Entity 属性值 Schema — V1.3 新增 dbColumn */
const PropertySchema = zod_1.z.union([
    zod_1.z.string(),
    zod_1.z.object({
        type: zod_1.z.string().optional(),
        required: zod_1.z.boolean().optional(),
        maxLength: zod_1.z.number().optional(),
        default: zod_1.z.any().optional(),
        enum: zod_1.z.array(zod_1.z.string()).optional(),
        dbColumn: zod_1.z.string().optional(), // V1.3: 数据库物理列名
    }),
]);
/** ERDL Entity 定义 Schema — V1.3 新增 table/primaryKey */
const EntitySchema = zod_1.z.object({
    table: zod_1.z.string().optional(), // V1.3: 数据库物理表名
    primaryKey: zod_1.z.string().default('id'), // V1.3: 主键列名
    properties: zod_1.z.record(zod_1.z.string(), PropertySchema),
    metadata: zod_1.z
        .object({
        knowledge: zod_1.z.string().optional(),
        icon: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
    })
        .optional(),
});
/** ERDL 规则条件 Schema */
const RuleConditionSchema = zod_1.z.lazy(() => zod_1.z.object({
    logic: zod_1.z.enum(['AND', 'OR']),
    conditions: zod_1.z.array(zod_1.z.union([RuleConditionSchema, zod_1.z.unknown()])),
}));
/** ERDL 规则动作 Schema */
const RuleActionSchema = zod_1.z.object({
    type: zod_1.z.enum(['assign', 'calculate', 'validate', 'notify']),
    params: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
});
/** ERDL 策略规则 Schema */
const PolicyRuleSchema = zod_1.z.object({
    name: zod_1.z.string(),
    priority: zod_1.z.number().default(100),
    trigger: zod_1.z.string().optional(),
    tier: zod_1.z.enum(['validation', 'policy']).default('policy'),
    entity: zod_1.z.string().optional(),
    condition: RuleConditionSchema.optional(),
    actions: zod_1.z.array(RuleActionSchema).optional(),
});
/** ERDL Agent 定义 Schema */
const AgentSchema = zod_1.z.object({
    capabilities: zod_1.z.array(zod_1.z.string()).optional(),
    knowledgeBases: zod_1.z.array(zod_1.z.string()).optional(),
    triggers: zod_1.z.array(zod_1.z.object({
        event: zod_1.z.string(),
        condition: zod_1.z.string().optional(),
    })).optional(),
    permissions: zod_1.z.object({
        canRead: zod_1.z.array(zod_1.z.string()).optional(),
        canWrite: zod_1.z.array(zod_1.z.string()).optional(),
    }).optional(),
});
/** ERDL 知识库定义 Schema */
const KnowledgeBaseSchema = zod_1.z.object({
    type: zod_1.z.enum(['STRUCTURED', 'FILE', 'API']).optional(),
    source: zod_1.z.object({
        type: zod_1.z.enum(['FILE', 'API']).optional(),
        path: zod_1.z.string().optional(),
        endpoint: zod_1.z.string().optional(),
        sync: zod_1.z.string().optional(),
    }).optional(),
    retrieval: zod_1.z.object({
        top_k: zod_1.z.number().optional(),
        similarity_threshold: zod_1.z.number().optional(),
    }).optional(),
});
/** 同步策略 */
const SyncPolicySchema = zod_1.z.record(zod_1.z.string(), zod_1.z.object({
    mode: zod_1.z.enum(['scheduled', 'on-demand']).default('scheduled'),
    refresh: zod_1.z.string().optional(),
    source: zod_1.z.object({
        type: zod_1.z.enum(['api', 'db', 'dict', 'file']),
        endpoint: zod_1.z.string().optional(),
        table: zod_1.z.string().optional(),
        fields: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    transform: zod_1.z.enum(['passthrough', 'llm_normalize', 'range_map']).default('passthrough'),
    target: zod_1.z.enum(['system_prompt', 'context_json']).default('system_prompt'),
})).optional();
/** 语义层 */
const SemanticLayerSchema = zod_1.z.object({
    dictionaries: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        source: zod_1.z.string(),
        mapping_engine: zod_1.z.enum(['llm_bridge', 'regex', 'lookup']).default('llm_bridge'),
    })).optional(),
    hotword_rules: zod_1.z.object({
        detect_from: zod_1.z.array(zod_1.z.string()).optional(),
        normalize_to: zod_1.z.string().optional(),
        confidence_threshold: zod_1.z.number().default(0.7),
    }).optional(),
}).optional();
/** 演化规则 */
const EvolutionRulesSchema = zod_1.z.object({
    auto_expand: zod_1.z.boolean().default(false),
    threshold: zod_1.z.number().default(100),
    review_workflow: zod_1.z.enum(['auto_draft', 'human_approve']).default('human_approve'),
}).optional();
/** 别名映射：行业黑话 → 标准字段名 */
const AliasesSchema = zod_1.z.record(zod_1.z.string(), // Entity 名
zod_1.z.record(zod_1.z.string(), zod_1.z.string())).optional();
/** ERDL Action 参数定义 Schema (V1.5) */
const ActionParamSchema = zod_1.z.object({
    entity: zod_1.z.string().optional(),
    field: zod_1.z.string().optional(),
    required: zod_1.z.boolean().optional(),
    type: zod_1.z.string().optional(),
    enum: zod_1.z.array(zod_1.z.string()).optional(),
    values: zod_1.z.array(zod_1.z.string()).optional(),
    isArray: zod_1.z.boolean().optional(),
    default: zod_1.z.any().optional(),
});
/** ERDL Action 定义 Schema (V1.5) */
const ActionSchema = zod_1.z.object({
    description: zod_1.z.string().optional(),
    service: zod_1.z.string().optional(),
    agentTypes: zod_1.z.array(zod_1.z.string()).optional(),
    params: zod_1.z.record(zod_1.z.string(), ActionParamSchema).optional(),
});
/** ERDL 完整 Schema */
const ERDLSchema = zod_1.z.object({
    namespace: zod_1.z.string().min(1, 'namespace 不能为空'),
    module: zod_1.z.object({
        version: zod_1.z.string().optional(),
        extends: zod_1.z.string().optional(),
    }).optional(),
    entities: zod_1.z.record(zod_1.z.string(), EntitySchema).optional(),
    aliases: AliasesSchema.optional(),
    actions: zod_1.z.record(zod_1.z.string(), ActionSchema).optional(),
    rulesets: zod_1.z.record(zod_1.z.string(), zod_1.z.object({
        policies: zod_1.z.array(PolicyRuleSchema).optional(),
        validations: zod_1.z.array(PolicyRuleSchema).optional(),
    })).optional(),
    agents: zod_1.z.record(zod_1.z.string(), AgentSchema).optional(),
    knowledgeBases: zod_1.z.record(zod_1.z.string(), KnowledgeBaseSchema).optional(),
    sync_policy: SyncPolicySchema.optional(),
    semantic_layer: SemanticLayerSchema.optional(),
    evolution_rules: EvolutionRulesSchema.optional(),
});
// ============================================
// ERDL Parser 核心类
// ============================================
class ERDLParser {
    static parse(filePath) {
        if (!fs.existsSync(filePath))
            throw new Error(`ERDL 文件不存在: ${filePath}`);
        return this.parseString(fs.readFileSync(filePath, 'utf-8'));
    }
    static parseString(yamlStr) {
        const raw = yaml.load(yamlStr);
        if (raw === null || typeof raw !== 'object')
            throw new Error('ERDL 文件内容不能为空');
        return ERDLSchema.parse(raw);
    }
    static validate(yamlStr) {
        try {
            const raw = yaml.load(yamlStr);
            if (raw === null || typeof raw !== 'object')
                return { valid: false, errors: ['ERDL 文件内容不能为空'] };
            ERDLSchema.parse(raw);
            return { valid: true, errors: [] };
        }
        catch (e) {
            return { valid: false, errors: [e instanceof Error ? e.message : String(e)] };
        }
    }
}
exports.ERDLParser = ERDLParser;
//# sourceMappingURL=erdl-parser.js.map