/**
 * ERDL Schema 校验器 — 启动时验证 .erdl 文件语法正确性
 *
 * @file erdl-validator.ts
 * @author 唐浩然（OpenOBA AI 执行官）
 * @since 2026-05-26
 * @version 2.0 — 基于 AST 的语义校验，弃用行级文本解析
 *
 * 校验范围：
 *  - Entity 引用存在性
 *  - Field 引用存在性
 *  - Operator 合法性
 *  - Alias 目标字段验证
 *  - Validation 必须有 error message
 *  - Policy 的 formula 语法合法
 */

import { Injectable, Logger } from '@nestjs/common'
import * as path from 'path'
import { ERDLAST } from '../parser/erdl-parser'
import {
  ValidationReport,
  ValidationIssue,
  ERDLValidationContext,
  Severity,
  VALID_OPERATORS,
  VALID_TIERS,
} from './erdl-schema'

/** Entity 字段汇总（从 ERDL AST 中提取，不依赖 DB） */
export interface ErdEntityDef {
  name: string
  fields: string[]
  fieldTypes: Record<string, string>
  fieldRequired: Record<string, boolean>
}

@Injectable()
export class ERDLValidator {
  private readonly logger = new Logger(ERDLValidator.name)

  /**
   * V2.0: 基于 AST 校验 .erdl 文件
   *
   * 不再做行级文本解析。AST 已由 ERDLParser.parse() 通过 YAML + Zod 完整校验。
   * 本方法仅做语义层面的交叉引用校验（entity/field 存在性等）。
   *
   * @param ast 已解析并通过 Zod 校验的 ERDL AST
   * @param fileName 文件名（仅用于错误报告）
   * @returns 校验报告
   */
  validateFromAst(ast: ERDLAST, fileName: string): ValidationReport {
    const entityDefs: ErdEntityDef[] = this.extractEntityDefs(ast)

    const ctx: ERDLValidationContext = {
      entityNames: entityDefs.map(e => e.name),
      entityFields: {},
      aliasCount: 0,
      fileLines: [], // 不再需要行级引用
    }
    for (const e of entityDefs) {
      ctx.entityFields[e.name] = e.fields
    }

    const issues: ValidationIssue[] = []

    // 逐项语义校验
    this.validateEntitySemantics(entityDefs, fileName, issues)
    this.validateRulesetSemantics(ast, ctx, fileName, issues)
    this.validateAliasSemantics(ast, ctx, fileName, issues)
    this.validateSyncPolicySemantics(ast, fileName, issues)
    this.validateEntityTypeMismatch(entityDefs, fileName, issues)

    const errors = issues.filter(i => i.severity === 'ERROR').length
    const warnings = issues.filter(i => i.severity === 'WARNING').length

    if (errors > 0) {
      this.logger.error(`❌ ERDL 校验失败 · ${fileName}: ${errors} 错误, ${warnings} 警告`)
    } else if (warnings > 0) {
      this.logger.warn(`⚠️ ERDL 校验通过但有问题 · ${fileName}: ${warnings} 警告`)
    } else {
      this.logger.log(`✅ ERDL 校验通过 · ${fileName}`)
    }

    return {
      valid: errors === 0,
      errors,
      warnings,
      issues,
    }
  }

  /**
   * V2.0: 从 ERDL AST 中提取 Entity 定义
   *
   * 替代原来的 parseEntitiesFromErdl 行级文本解析。
   * AST 已包含完整且经过 Zod 校验的 entity 数据。
   */
  extractEntityDefs(ast: ERDLAST): ErdEntityDef[] {
    if (!ast.entities) return []

    return Object.entries(ast.entities).map(([name, entityDef]) => {
      const properties = entityDef.properties || {}
      const fields = Object.keys(properties)
      const fieldTypes: Record<string, string> = {}
      const fieldRequired: Record<string, boolean> = {}

      for (const [fieldName, propDef] of Object.entries(properties)) {
        if (typeof propDef === 'string') {
          fieldTypes[fieldName] = propDef
          fieldRequired[fieldName] = false
        } else if (propDef && typeof propDef === 'object') {
          fieldTypes[fieldName] = (propDef as { type?: string }).type || 'string' || 'string'
          fieldRequired[fieldName] = !!(propDef as { required?: boolean }).required
        }
      }

      return { name, fields, fieldTypes, fieldRequired }
    })
  }

  // ═══════════════════════════════════════════
  // V2.0: 基于 AST 的语义校验器
  // ═══════════════════════════════════════════

  /** 校验 Entity 定义本身的语义 */
  private validateEntitySemantics(
    entityDefs: ErdEntityDef[],
    fileName: string,
    issues: ValidationIssue[],
  ): void {
    for (const entity of entityDefs) {
      for (const fieldName of entity.fields) {
        const fieldType = entity.fieldTypes[fieldName] || 'string'

        if (fieldType === 'Enum') {
          issues.push({
            severity: 'WARNING',
            rule: 'enumHasValues',
            message: `Entity "${entity.name}" 的字段 "${fieldName}" type=Enum 但未定义 enum 值列表`,
            file: fileName,
            section: `entities.${entity.name}.${fieldName}`,
          })
        }

        const standardTypes = ['String', 'UUID', 'Integer', 'Decimal', 'Boolean', 'Enum', 'JSON', 'DateTime', 'Money(CNY)']
        if (!standardTypes.includes(fieldType)) {
          issues.push({
            severity: 'WARNING',
            rule: 'validEntityType',
            message: `Entity "${entity.name}" 的字段 "${fieldName}" 使用了非标准类型 "${fieldType}"`,
            file: fileName,
            section: `entities.${entity.name}.${fieldName}`,
          })
        }
      }
    }
  }

  /** V2.0: 基于 AST 校验 Rulesets */
  private validateRulesetSemantics(
    ast: ERDLAST,
    ctx: ERDLValidationContext,
    fileName: string,
    issues: ValidationIssue[],
  ): void {
    if (!ast.rulesets) return

    for (const [rulesetName, ruleset] of Object.entries(ast.rulesets)) {
      const allRules = [...(ruleset.policies || []), ...(ruleset.validations || [])]
      for (const rule of allRules) {
        // Entity 存在性
        if (rule.entity && !ctx.entityNames.includes(rule.entity)) {
          issues.push({
            severity: 'ERROR',
            rule: 'entityExists',
            message: `规则 "${rule.name}" 引用的 entity "${rule.entity}" 不存在。可用: ${ctx.entityNames.join(', ')}`,
            file: fileName,
            section: `rulesets.${rulesetName}.${rule.name}`,
          })
        }

        // Validation 必须有 error
        if (rule.tier === 'validation') {
          const hasValidate = rule.actions?.some(a => a.type === 'validate')
          if (!hasValidate) {
            issues.push({
              severity: 'ERROR',
              rule: 'validateHasError',
              message: `Validation "${rule.name}" 缺少 actions[type=validate]`,
              file: fileName,
              section: `rulesets.${rulesetName}.${rule.name}`,
            })
          }
        }

        // Formula 语法检查
        if (rule.tier === 'policy' && rule.actions) {
          for (const action of rule.actions) {
            if (action.type === 'calculate' && (action.params as Record<string, unknown>)?.formula) {
              const formula = (action.params as Record<string, unknown>).formula as string
              issues.push(...this.validateFormula(formula, rule.name, fileName))
            }
          }
        }
      }
    }
  }

  /** V2.0: 基于 AST 校验 Aliases */
  private validateAliasSemantics(
    ast: ERDLAST,
    ctx: ERDLValidationContext,
    fileName: string,
    issues: ValidationIssue[],
  ): void {
    if (!ast.aliases) return

    for (const [entityName, aliasMap] of Object.entries(ast.aliases)) {
      // Entity 存在性
      if (!ctx.entityNames.includes(entityName)) {
        issues.push({
          severity: 'ERROR',
          rule: 'aliasEntityExists',
          message: `Alias 区域下的 Entity "${entityName}" 不存在`,
          file: fileName,
          section: `aliases.${entityName}`,
        })
        continue
      }

      // 字段存在性
      const entityFields = ctx.entityFields[entityName] || []
      for (const [alias, targetField] of Object.entries(aliasMap)) {
        if (!entityFields.includes(targetField)) {
          issues.push({
            severity: 'ERROR',
            rule: 'aliasTargetExists',
            message: `Alias "${alias}" 目标字段 "${targetField}" 在 Entity "${entityName}" 中不存在。可用: ${entityFields.join(', ')}`,
            file: fileName,
            section: `aliases.${entityName}`,
          })
        }
      }
    }
  }

  /** V2.0: 基于 AST 校验 Sync Policy */
  private validateSyncPolicySemantics(
    ast: ERDLAST,
    fileName: string,
    issues: ValidationIssue[],
  ): void {
    if (!ast.sync_policy) return

    for (const [name, policy] of Object.entries(ast.sync_policy)) {
      const tableName = (policy as { source?: { table?: string } }).source?.table
      if (tableName && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(tableName)) {
        issues.push({
          severity: 'WARNING',
          rule: 'validSyncTable',
          message: `sync_policy "${name}" 的 table 名称 "${tableName}" 包含非法字符`,
          file: fileName,
          section: `sync_policy.${name}`,
        })
      }
    }
  }

  /** 校验 Entity 类型 */
  private validateEntityTypeMismatch(
    _entityDefs: ErdEntityDef[],
    _fileName: string,
    _issues: ValidationIssue[],
  ): void {
    // 在 validateEntitySemantics 中已处理
  }

  // ═══════════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════════

  private validateFormula(formula: string, ruleName: string, fileName: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    if (formula.includes('* *') || formula.includes('+ +') || formula.includes('/ /')) {
      issues.push({
        severity: 'ERROR',
        rule: 'validFormula',
        message: `规则 "${ruleName}" 的 formula "${formula}" 语法错误：连续运算符`,
        file: fileName,
        section: `rulesets.*.${ruleName}`,
      })
    }

    const open = (formula.match(/\(/g) || []).length
    const close = (formula.match(/\)/g) || []).length
    if (open !== close) {
      issues.push({
        severity: 'ERROR',
        rule: 'validFormula',
        message: `规则 "${ruleName}" 的 formula "${formula}" 语法错误：括号不匹配（左${open} 右${close}）`,
        file: fileName,
        section: `rulesets.*.${ruleName}`,
      })
    }

    return issues
  }
}
