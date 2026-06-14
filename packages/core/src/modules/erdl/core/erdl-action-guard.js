"use strict";
/**
 * 秒镜科技 · ERDL V1.5 — Action Guard
 *
 * @file ERDL Action Guard — LLM 输出协议转换层
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-12
 * @license AGPL-3.0
 *
 * 核心理念：
 *   LLM 输出不可预测（有时 FC，有时 XML 文本，有时纯文本）。
 *   Action Guard 是唯一的协议翻译层：无论 LLM 返回什么格式，
 *   都统一解析为 Action，校验后路由到具体 Service 执行。
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ERDLActionGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERDLActionGuard = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const erdl_registry_1 = require("./erdl-registry");
const entity_proxy_service_1 = require("./entity-proxy.service");
// ═══════════════════════════════════════════
// ERDL Action Guard
// ═══════════════════════════════════════════
let ERDLActionGuard = ERDLActionGuard_1 = class ERDLActionGuard {
    constructor(registry, proxy, dataSource) {
        this.registry = registry;
        this.proxy = proxy;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(ERDLActionGuard_1.name);
        this.enabled = process.env.ERDL_ACTION_GUARD !== 'false';
    }
    /** 是否启用 */
    isEnabled() { return this.enabled; }
    /**
     * ① 意图解析：从 LLM 原始输出中统一提取 Action
     *
     * 支持三种来源：
     * - 原生 Function Calling tool_calls
     * - 文本中的 <invoke> XML 标签
     * - （未来）纯文本语义解析
     */
    extractActions(rawChoices) {
        if (!rawChoices || rawChoices.length === 0)
            return [];
        const choice = rawChoices[0];
        const actions = [];
        // ── 路径1: 原生 tool_calls ──
        if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
            for (const tc of choice.message.tool_calls) {
                let args = {};
                try {
                    args = JSON.parse(tc.function.arguments || '{}');
                }
                catch { /* keep empty */ }
                actions.push({
                    name: tc.function.name,
                    args,
                    source: 'fc',
                    rawToolCallId: tc.id,
                    description: this.getActionDescription(tc.function.name, args),
                });
            }
        }
        // ── 路径2: 文本中的 <invoke> XML 标签 ──
        const content = choice?.message?.content || '';
        if (content.includes('<invoke') && content.includes('</invoke>')) {
            const xmlActions = this.parseInvokeXML(content);
            // 避免与路径1重复
            for (const xa of xmlActions) {
                const dup = actions.find(a => a.name === xa.name);
                if (!dup) {
                    actions.push({
                        ...xa,
                        source: 'xml',
                        description: this.getActionDescription(xa.name, xa.args),
                    });
                }
            }
        }
        return actions;
    }
    /**
     * ② 操作校验：检查 Action 参数完整性
     */
    validate(action) {
        const def = this.getActionDef(action.name);
        if (!def || !def.params) {
            // 没有定义 → 宽松模式，允许通过（如 query_knowledge）
            return { ok: true };
        }
        const warnings = [];
        const normalizedArgs = { ...action.args };
        // 别名映射：LLM 可能用了行业黑话 → 转换为标准字段名
        const aliasMap = this.registry.getAliasMap('industry.eyewear', 'ProductSpu');
        if (aliasMap) {
            for (const [key, val] of Object.entries(normalizedArgs)) {
                if (aliasMap[key]) {
                    const mappedKey = aliasMap[key];
                    if (mappedKey !== key) {
                        normalizedArgs[mappedKey] = val;
                        delete normalizedArgs[key];
                    }
                }
            }
        }
        // 必填检查
        for (const [paramName, paramDef] of Object.entries(def.params)) {
            if (paramDef.required && normalizedArgs[paramName] === undefined) {
                return {
                    ok: false,
                    error: `缺少必填参数: ${paramName} (${paramDef.field || paramDef.type || ''})`,
                };
            }
        }
        // 枚举检查
        for (const [paramName, paramDef] of Object.entries(def.params)) {
            const enumValues = paramDef.enum || paramDef.values;
            if (enumValues && normalizedArgs[paramName] !== undefined) {
                const val = String(normalizedArgs[paramName]);
                if (!enumValues.includes(val)) {
                    warnings.push(`${paramName}="${val}" 不在允许值 [${enumValues.join(', ')}] 中`);
                }
            }
        }
        return {
            ok: true,
            warnings: warnings.length > 0 ? warnings : undefined,
            normalizedArgs,
        };
    }
    /**
     * 清理 LLM 输出中的 <invoke> XML 标签（前端不应看到这些）
     */
    cleanOutput(content) {
        if (!content)
            return content;
        return content.replace(/<invoke[\s\S]*?<\/invoke>/g, '').trim();
    }
    /**
     * ③ 获取 Action 定义
     */
    getActionDef(name) {
        return this.registry.getActionDef(name);
    }
    /**
     * 从 ERDL 定义生成 Action 描述（用于 thought 事件）
     */
    getActionDescription(name, args) {
        const def = this.getActionDef(name);
        if (def?.description)
            return def.description;
        // 自动生成
        const argPreview = JSON.stringify(args).substring(0, 60).replace(/[{}\"]/g, '');
        return `${name}: ${argPreview}`;
    }
    /**
     * 解析文本中的 <invoke> XML 标签
     *
     * 格式:
     *   <invoke name="draft_create">
     *     <parameter name="spuName" string="true">秒镜 S5344</parameter>
     *   </invoke>
     */
    parseInvokeXML(content) {
        const results = [];
        const invokeRegex = /<invoke\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/invoke>/g;
        let match;
        while ((match = invokeRegex.exec(content)) !== null) {
            const toolName = match[1];
            const inner = match[2];
            const args = {};
            // 兼容两种格式：带 string="true"/string="false" 属性和不带属性的简化格式
            const paramRegex = /<parameter\s+name="([^"]+)"(?:[^>]*string="true"[^>]*)?>([^<]*)<\/parameter>/g;
            const paramRegexJSON = /<parameter\s+name="([^"]+)"[^>]*string="false"[^>]*>([^<]*)<\/parameter>/g;
            this.extractParams(inner, paramRegex, args, false);
            this.extractParams(inner, paramRegexJSON, args, true);
            results.push({ name: toolName, args });
        }
        return results;
    }
    extractParams(inner, regex, args, parseJSON) {
        let m;
        while ((m = regex.exec(inner)) !== null) {
            const key = m[1];
            const raw = m[2].trim();
            if (parseJSON) {
                try {
                    args[key] = JSON.parse(raw);
                }
                catch {
                    args[key] = raw;
                }
            }
            else {
                args[key] = raw;
            }
        }
    }
};
exports.ERDLActionGuard = ERDLActionGuard;
exports.ERDLActionGuard = ERDLActionGuard = ERDLActionGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Optional)()),
    __param(2, (0, common_1.Inject)(typeorm_1.DataSource)),
    __metadata("design:paramtypes", [erdl_registry_1.ERDLRegistry,
        entity_proxy_service_1.EntityProxyService,
        typeorm_1.DataSource])
], ERDLActionGuard);
//# sourceMappingURL=erdl-action-guard.js.map