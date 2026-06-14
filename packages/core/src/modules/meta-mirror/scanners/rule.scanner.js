"use strict";
/**
 * 元镜 Rule Scanner V2.0 — ERDL 语义解析
 *
 * @file rule.scanner.ts
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-22 / V2.0 增强 2026-05-26
 *
 * V2.0 增强：
 *  - 解析 ERDL Entity 属性（type / enum / required / maxLength）
 *  - 解析 Ruleset Validation（name / condition / error message）
 *  - 解析 Ruleset Policy（name / trigger / formula）
 *  - 解析 Aliases（行业黑话 → 语义字段映射）
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var RuleScanner_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleScanner = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let RuleScanner = RuleScanner_1 = class RuleScanner {
    constructor() {
        this.logger = new common_1.Logger(RuleScanner_1.name);
    }
    /** V1.0 兼容：统计级扫描 */
    scan(projectRoot) {
        const rules = this.scanEnhanced(projectRoot);
        // 降级为 V1.0 格式（向后兼容）
        return rules.map(r => ({
            name: r.name,
            file: r.file,
            entity: r.entity,
            trigger: r.trigger,
            conditions: r.conditions,
            actions: r.actions,
            description: r.ruleDetail,
        }));
    }
    /** V2.0 增强：语义级扫描 */
    scanEnhanced(projectRoot) {
        const backendDir = path.join(projectRoot, 'backend');
        const erdlDir = path.join(backendDir, 'erdl');
        if (!fs.existsSync(erdlDir)) {
            // Fallback: 尝试项目根的 erdl/
            const altErdlDir = path.join(projectRoot, 'erdl');
            if (!fs.existsSync(altErdlDir))
                return [];
            return this.scanErdlDir(altErdlDir);
        }
        return this.scanErdlDir(erdlDir);
    }
    scanErdlDir(erdlDir) {
        const rules = [];
        const files = fs.readdirSync(erdlDir).filter(f => f.endsWith('.erdl') && !f.startsWith('demo-'));
        for (const file of files) {
            const filePath = path.join(erdlDir, file);
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const lines = content.split('\n');
                // 提取 namespace
                const namespace = this.extractNamespace(lines);
                // 1. 提取 Entity 属性（type / enum / required / maxLength）
                const entityProps = this.extractEntityProperties(lines, namespace);
                for (const ep of entityProps) {
                    let detail = `字段 ${ep.fieldName}: ${ep.erdlType}`;
                    if (ep.isRequired)
                        detail += ' (必填)';
                    if (ep.maxLength)
                        detail += ` (最长${ep.maxLength}字符)`;
                    if (ep.enumValues)
                        detail += ` 枚举: [${ep.enumValues.join(', ')}]`;
                    rules.push({
                        name: `${ep.entityName}.${ep.fieldName}`,
                        file,
                        entity: namespace,
                        trigger: 'Agent',
                        conditions: [ep.erdlType],
                        actions: [],
                        ruleType: 'entity_property',
                        ruleDetail: detail,
                    });
                }
                // 2. 提取 Validation 规则
                const validations = this.extractValidations(lines, namespace);
                for (const v of validations) {
                    rules.push(v);
                }
                // 3. 提取 Policy 规则
                const policies = this.extractPolicies(lines, namespace);
                for (const p of policies) {
                    rules.push(p);
                }
                // 4. 提取 Alias 映射
                const aliases = this.extractAliases(lines, namespace);
                for (const a of aliases) {
                    rules.push(a);
                }
            }
            catch (e) {
                this.logger.warn(`扫描 ERDL 规则失败: ${file} — ${e.message}`);
            }
        }
        this.logger.log(`RuleScanner V2: ${rules.length} 条 ` +
            `(entity_property:${rules.filter(r => r.ruleType === 'entity_property').length} ` +
            `validation:${rules.filter(r => r.ruleType === 'validation').length} ` +
            `policy:${rules.filter(r => r.ruleType === 'policy').length} ` +
            `alias:${rules.filter(r => r.ruleType === 'alias').length})`);
        return rules;
    }
    // ═══════════════════════════════════════════
    // 提取器
    // ═══════════════════════════════════════════
    extractNamespace(lines) {
        for (const line of lines) {
            const m = line.match(/^namespace:\s*(.+)/);
            if (m)
                return m[1].trim();
        }
        return 'unknown';
    }
    /** 提取 Entity 属性 */
    extractEntityProperties(lines, namespace) {
        const props = [];
        let currentEntity = '';
        let currentField = '';
        for (const line of lines) {
            // Entity 声明
            const entityMatch = line.match(/^\s{2}(\w+):\s*$/);
            if (entityMatch && line.startsWith('  ') && !line.startsWith('    ')) {
                currentEntity = entityMatch[1];
                continue;
            }
            // 退出 entities 区域
            if (/^\w/.test(line) && !line.startsWith('  ')) {
                if (currentEntity && currentField)
                    currentEntity = '';
                continue;
            }
            // Entity 字段
            const fieldMatch = line.match(/^\s{6}(\w+):\s*\{/);
            if (fieldMatch && currentEntity) {
                currentField = fieldMatch[1];
                continue;
            }
            // 收集字段属性（在同一字段块内）
            if (currentEntity && currentField && line.includes('type:')) {
                const typeMatch = line.match(/type:\s*"([^"]+)"/);
                if (!typeMatch)
                    continue;
                const erdlType = typeMatch[1];
                const required = line.includes('required: true');
                const maxLengthMatch = line.match(/maxLength:\s*(\d+)/);
                const maxLength = maxLengthMatch ? Number(maxLengthMatch[1]) : undefined;
                const enumMatch = line.match(/enum:\s*\[([^\]]+)\]/);
                const enumValues = enumMatch
                    ? enumMatch[1].split(',').map(s => s.trim().replace(/["']/g, ''))
                    : undefined;
                const dbColumnMatch = line.match(/dbColumn:\s*"([^"]+)"/);
                const dbColumn = dbColumnMatch?.[1] || '';
                props.push({
                    entityName: currentEntity,
                    fieldName: currentField,
                    erdlType,
                    isRequired: required,
                    maxLength,
                    enumValues,
                    dbColumn,
                });
                currentField = ''; // 字段块结束
            }
        }
        return props;
    }
    /** 提取 Validation 规则 */
    extractValidations(lines, namespace) {
        const rules = [];
        let inValidations = false;
        let currentName = '';
        let currentEntity = '';
        let currentPriority = 0;
        let currentError = '';
        let currentCondition = '';
        for (const line of lines) {
            if (line.includes('validations:')) {
                inValidations = true;
                continue;
            }
            if (inValidations && /^\S/.test(line) && !line.startsWith('  ') && !line.startsWith('#')) {
                inValidations = false;
                continue;
            }
            if (!inValidations)
                continue;
            const nameMatch = line.match(/^\s{4}-\s+name:\s*"([^"]+)"/);
            if (nameMatch) {
                currentName = nameMatch[1];
                currentEntity = '';
                currentPriority = 0;
                currentError = '';
                currentCondition = '';
                continue;
            }
            const entityMatch = line.match(/entity:\s*(\w+)/);
            if (entityMatch) {
                currentEntity = entityMatch[1];
                continue;
            }
            const priorityMatch = line.match(/priority:\s*(\d+)/);
            if (priorityMatch) {
                currentPriority = Number(priorityMatch[1]);
                continue;
            }
            const errorMatch = line.match(/error:\s*"([^"]+)"/);
            if (errorMatch) {
                currentError = errorMatch[1];
                continue;
            }
            // 收集 condition（简化：记录 operator + value）
            const condMatch = line.match(/operator:\s*(\w+)/);
            if (condMatch) {
                currentCondition += `${condMatch[1]} `;
            }
            const valueMatch = line.match(/value:\s*(.+)/);
            if (valueMatch) {
                currentCondition += valueMatch[1].trim().replace(/"/g, '');
            }
            // actions → 规则结束，产出
            if (line.includes('actions:') && currentName) {
                rules.push({
                    name: currentName,
                    file: '',
                    entity: currentEntity || namespace,
                    trigger: '保存前校验',
                    conditions: [currentCondition.trim()],
                    actions: ['阻断保存'],
                    ruleType: 'validation',
                    ruleDetail: currentError || `${currentName}: ${currentCondition}`,
                    errorMessage: currentError,
                    priority: currentPriority,
                });
                currentName = '';
            }
        }
        return rules;
    }
    /** 提取 Policy 规则 */
    extractPolicies(lines, namespace) {
        const rules = [];
        let currentName = '';
        let currentEntity = '';
        let currentPriority = 0;
        let currentFormula = '';
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // 检测 policy 条目
            const nameMatch = line.match(/^\s{6}-\s+name:\s*"([^"]+)"/);
            if (nameMatch && lines.slice(0, i).some(l => l.includes('policies:'))) {
                currentName = nameMatch[1];
                currentEntity = '';
                currentPriority = 0;
                currentFormula = '';
                continue;
            }
            if (!currentName)
                continue;
            const entityMatch = line.match(/entity:\s*(\w+)/);
            if (entityMatch) {
                currentEntity = entityMatch[1];
                continue;
            }
            const priorityMatch = line.match(/priority:\s*(\d+)/);
            if (priorityMatch) {
                currentPriority = Number(priorityMatch[1]);
                continue;
            }
            const formulaMatch = line.match(/formula:\s*"([^"]+)"/);
            if (formulaMatch) {
                currentFormula = formulaMatch[1];
            }
            // actions 区域 → 规则结束
            if (line.includes('actions:') && currentName) {
                rules.push({
                    name: currentName,
                    file: '',
                    entity: currentEntity || namespace,
                    trigger: '价格计算',
                    conditions: ['触发: Product.price.calculate'],
                    actions: ['apply'],
                    ruleType: 'policy',
                    ruleDetail: currentFormula || currentName,
                    formula: currentFormula,
                    priority: currentPriority,
                });
                currentName = '';
            }
        }
        return rules;
    }
    /** 提取 Alias 映射 */
    extractAliases(lines, namespace) {
        const rules = [];
        let currentEntity = '';
        let inAliases = false;
        for (const line of lines) {
            if (line.includes('aliases:')) {
                inAliases = true;
                continue;
            }
            if (inAliases && /^\S/.test(line) && !line.startsWith('  ') && !line.startsWith('#'))
                break;
            if (!inAliases)
                continue;
            const entityMatch = line.match(/^\s{2}(\w+):\s*$/);
            if (entityMatch) {
                currentEntity = entityMatch[1];
                continue;
            }
            const aliasMatch = line.match(/^\s{4}"([^"]+)":\s*"(\w+)"/);
            if (aliasMatch && currentEntity) {
                rules.push({
                    name: `${currentEntity}: "${aliasMatch[1]}" → ${aliasMatch[2]}`,
                    file: '',
                    entity: currentEntity,
                    trigger: 'Agent',
                    conditions: [`别名: ${aliasMatch[1]}`],
                    actions: [`映射到: ${aliasMatch[2]}`],
                    ruleType: 'alias',
                    ruleDetail: `"${aliasMatch[1]}" 映射到字段 ${aliasMatch[2]}`,
                });
            }
        }
        return rules;
    }
};
exports.RuleScanner = RuleScanner;
exports.RuleScanner = RuleScanner = RuleScanner_1 = __decorate([
    (0, common_1.Injectable)()
], RuleScanner);
//# sourceMappingURL=rule.scanner.js.map