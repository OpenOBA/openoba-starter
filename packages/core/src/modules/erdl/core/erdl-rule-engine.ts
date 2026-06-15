/**
 * 秒镜科技 · ERDL — Enterprise Resource Definition Language
 *
 * @file ERDL Rule Engine — 规则执行引擎
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-01
 * @license BSL-1.1
 *
 * Copyright (c) 2026 深圳市秒镜科技有限公司
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * @description
 * 规则执行引擎，负责：
 * - 按触发器筛选和排序规则
 * - 评估规则条件树（支持 AND/OR 嵌套）
 * - 执行规则动作（计算/校验/赋值）
 * - 提供表单校验接口
 *
 * 使用 expr-eval 库进行公式表达式求值。
 *
 * @example
 * ```typescript
 * const result = await ruleEngine.evaluate('Product.price.calculate', {
 *   customer: { tier: 'VIP' },
 *   retailPrice: 299,
 * })
 * // result: { matched: true, ruleName: '会员等级折扣-VIP', result: 239.2 }
 * ```
 */

import { Injectable, Logger } from '@nestjs/common'
import { Parser as ExpressionParser } from 'expr-eval'
import { ERDLRegistry } from './erdl-registry'
import {
  RuleDefinition,
  RuleCondition,
  RuleConditionGroup,
} from './rule-definition'

// ============================================
// 类型定义
// ============================================

/**
 * 规则评估结果
 */
export interface EvaluationResult {
  /** 是否有规则匹配 */
  matched: boolean
  /** 匹配的规则名称（未匹配时为 undefined） */
  ruleName?: string
  /** 规则执行结果（计算值等） */
  result?: unknown
}

/**
 * 校验结果
 */
export interface ValidationResult {
  /** 是否通过所有校验 */
  valid: boolean
  /** 错误信息列表 */
  errors: string[]
}

// ============================================
// ERDL Rule Engine 核心类
// ============================================

/**
 * ERDL 规则执行引擎
 *
 * 从 ERDLRegistry 获取规则定义，根据触发器和上下文评估规则，
 * 执行匹配规则的动作并返回结果。
 *
 * 执行流程：
 * 1. 按 trigger 筛选相关规则
 * 2. 按 priority 升序排序（数字越小优先级越高）
 * 3. 逐条评估 condition（支持 AND/OR 嵌套）
 * 4. 执行第一条匹配规则的 action
 */
@Injectable()
export class ERDLRuleEngine {
  private readonly logger = new Logger(ERDLRuleEngine.name)
  private readonly exprParser = new ExpressionParser()

  constructor(private readonly registry: ERDLRegistry) {}

  /**
   * 评估规则：给定触发器和上下文，执行匹配的规则
   *
   * @param trigger 触发器标识（如 "Product.price.calculate"）
   * @param context 评估上下文（包含规则条件需要的字段）
   * @returns 评估结果
   */
  async evaluate(trigger: string, context: Record<string, unknown>): Promise<EvaluationResult> {
    const rules = this.registry.getRulesByTrigger(trigger)

    if (rules.length === 0) {
      this.logger.debug(`[ERDL] No rules found for trigger: ${trigger}`)
      return { matched: false }
    }

    // 按优先级排序（数字越小优先级越高）
    const sorted = [...rules].sort((a, b) => a.priority - b.priority)

    for (const rule of sorted) {
      if (!rule.isActive) continue

      const matched = this.evaluateCondition(rule.condition, context)
      if (matched) {
        this.logger.log(`[ERDL] ✅ Rule matched: ${rule.name} (trigger: ${trigger}, priority: ${rule.priority})`)
        const result = this.executeActions(rule.actions, context)
        return { matched: true, ruleName: rule.name, result }
      }
    }

    this.logger.debug(`[ERDL] No rules matched for trigger: ${trigger}`)
    return { matched: false }
  }

  /**
   * 校验规则：用于表单提交前的数据验证
   *
   * 评估所有 tier=validation 的规则，收集所有未通过的规则错误信息。
   *
   * @param entity 实体类型（如 "ProductSpu"）
   * @param data 待校验的数据对象
   * @returns 校验结果
   */
  validate(entity: string, data: Record<string, unknown>): ValidationResult {
    // 获取所有校验规则（不区分 trigger）
    const allRules = this.registry.getAllRules()
    const validationRules = allRules.filter(
      (r) => r.tier === 'validation' && r.entity === entity && r.isActive,
    )

    if (validationRules.length === 0) {
      this.logger.debug(`[ERDL] No validation rules for entity: ${entity}`)
      return { valid: true, errors: [] }
    }

    const errors: string[] = []

    for (const rule of validationRules) {
      const passed = this.evaluateCondition(rule.condition, data)
      if (!passed) {
        // 获取错误信息
        const errorMsg = rule.actions
          .find((a) => a.type === 'validate')
          ?.params?.error as string | undefined
        errors.push(errorMsg || `校验规则 "${rule.name}" 未通过`)
        this.logger.warn(`[ERDL] Validation failed: ${rule.name} — ${errorMsg || '(no error message)'}`)
      }
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * 获取指定触发器的所有规则（供调试和管理界面使用）
   *
   * @param trigger 触发器标识
   * @returns 规则定义列表
   */
  getRulesForTrigger(trigger: string): RuleDefinition[] {
    return this.registry.getRulesByTrigger(trigger)
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 递归评估条件树
   *
   * 支持 AND/OR 逻辑嵌套，深度不限。
   *
   * @param group 条件组
   * @param context 评估上下文
   * @returns 条件是否满足
   */
  private evaluateCondition(group: RuleConditionGroup, context: Record<string, unknown>): boolean {
    const results = group.conditions.map((cond) => {
      // 递归处理嵌套条件组
      if ('logic' in cond) {
        return this.evaluateCondition(cond as RuleConditionGroup, context)
      }
      // 叶子条件
      return this.evaluateLeafCondition(cond as RuleCondition, context)
    })

    // 根据逻辑运算符聚合结果
    return group.logic === 'AND' ? results.every(Boolean) : results.some(Boolean)
  }

  /**
   * 评估叶子条件（单个字段比较）
   *
   * @param cond 叶子条件
   * @param context 评估上下文
   * @returns 条件是否满足
   */
  private evaluateLeafCondition(cond: RuleCondition, context: Record<string, unknown>): boolean {
    const value = this.resolvePath(cond.field, context)

    switch (cond.operator) {
      case 'eq':
        return value === cond.value
      case 'ne':
        return value !== cond.value
      case 'gt':
        return typeof value === 'number' && value > (cond.value as number)
      case 'gte':
        return typeof value === 'number' && value >= (cond.value as number)
      case 'lt':
        return typeof value === 'number' && value < (cond.value as number)
      case 'lte':
        return typeof value === 'number' && value <= (cond.value as number)
      case 'in':
        return Array.isArray(cond.value) && (cond.value as unknown[]).includes(value)
      case 'contains':
        return typeof value === 'string' && typeof cond.value === 'string' && value.includes(cond.value)
      case 'match':
        return typeof value === 'string' && new RegExp(cond.value as string).test(value)
      case 'exists':
        return value !== undefined && value !== null
      default:
        this.logger.warn(`[ERDL] Unknown operator: ${(cond as RuleCondition).operator}`)
        return false
    }
  }

  /**
   * 执行规则动作列表
   *
   * 按顺序执行所有动作，返回最后一个动作的结果。
   * 目前主要支持 calculate 类型的动作。
   *
   * @param actions 动作列表
   * @param context 执行上下文
   * @returns 最后一个动作的执行结果
   */
  private executeActions(actions: RuleDefinition['actions'], context: Record<string, unknown>): unknown {
    let lastResult: unknown = null

    for (const action of actions) {
      switch (action.type) {
        case 'calculate': {
          const formula = action.params.formula as string | undefined
          if (formula) {
            try {
              // 安全白名单过滤：防止原型污染和代码注入
              // expr-eval 仅用于内部管理员配置的 YAML 规则中的数学公式求值
              this.validateFormula(formula)
              const flattened = this.flattenContext(context)
              lastResult = this.exprParser.evaluate(formula, flattened as Record<string, number>)
            } catch (error) {
              this.logger.error(
                `[ERDL] Formula evaluation failed: ${formula}`,
                error instanceof Error ? error.stack : String(error),
              )
              lastResult = null
            }
          }
          break
        }
        case 'assign': {
          // 预留：赋值操作
          this.logger.debug('[ERDL] assign action (not yet implemented)')
          break
        }
        case 'validate':
          // 校验动作在 validate() 方法中处理
          break
        case 'notify':
          // 预留：通知操作
          this.logger.debug('[ERDL] notify action (not yet implemented)')
          break
      }
    }

    return lastResult
  }

  /**
   * 从上下文中按路径取值（支持点号分隔的嵌套路径）
   *
   * @param path 路径（如 "customer.tier"）
   * @param context 上下文对象
   * @returns 路径对应的值，路径不存在时返回 undefined
   */
  private resolvePath(path: string, context: Record<string, unknown>): unknown {
    return path.split('.').reduce<unknown>((obj, key) => {
      if (obj === null || obj === undefined || typeof obj !== 'object') {
        return undefined
      }
      return (obj as Record<string, unknown>)[key]
    }, context)
  }

  /**
   * 将嵌套上下文展平为一层（供表达式引擎使用）
   *
   * 表达式引擎不支持嵌套对象，需要将一层嵌套展开为扁平对象。
   *
   * @param context 原始上下文
   * @returns 展平后的上下文
   */
  private flattenContext(context: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...context }

    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // 将一层嵌套展开（如 { customer: { tier: 'VIP' } } → { customer.tier: 'VIP' }）
        for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
          result[`${key}.${subKey}`] = subValue
        }
      }
    }

    return result
  }

  /**
   * 公式安全白名单校验
   *
   * 防止通过 ERDL YAML 配置注入恶意表达式（原型污染、代码执行等）。
   * 仅允许纯数学运算和 Math.* 函数调用，拒绝所有属性访问链和危险标识符。
   *
   * 允许：
   *   - 数字字面量（整数、小数）
   *   - 变量名（由业务上下文提供，如 retailPrice）
   *   - 运算符：+ - * / % ( ) ^
   *   - Math.* 函数：Math.round(), Math.floor(), Math.ceil(), Math.abs() 等
   *
   * 拒绝：
   *   - 属性访问链（如 constructor.constructor, __proto__）
   *   - 方括号访问（如 obj['key']）
   *   - 危险标识符：constructor, prototype, __proto__, this, global, process 等
   *
   * @param formula 待校验的公式字符串
   * @throws Error 公式包含不安全内容时抛出
   */
  private validateFormula(formula: string): void {
    // 1. 禁止属性访问链（如 a.b.c 或 a['b']）—— 阻断原型污染
    if (/\.(?!\d)/.test(formula)) {
      throw new Error(`[ERDL Security] Formula contains property access: ${formula}`)
    }
    if (/\[["'`]/.test(formula)) {
      throw new Error(`[ERDL Security] Formula contains bracket access: ${formula}`)
    }

    // 2. 禁止危险标识符
    const DANGEROUS_IDENTIFIERS = [
      'constructor',
      'prototype',
      '__proto__',
      '__defineGetter__',
      '__defineSetter__',
      '__lookupGetter__',
      '__lookupSetter__',
      'this',
      'self',
      'global',
      'globalThis',
      'process',
      'require',
      'import',
      'eval',
      'Function',
    ]

    // 提取公式中所有标识符（变量名）
    const identifiers = formula.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g) || []
    for (const id of identifiers) {
      // Math.xxx 调用已在上面的点号检查中拦截，此处不重复处理
      if (DANGEROUS_IDENTIFIERS.includes(id)) {
        throw new Error(`[ERDL Security] Formula contains dangerous identifier "${id}": ${formula}`)
      }
    }

    // 3. 允许 Math.xxx 函数调用（在属性访问检查之后单独放行）
    // 注意：第1步已拦截所有 . 访问，包括 Math.round
    // 如果业务需要 Math.* 函数，移除此限制或使用 Math 前缀白名单
    // 当前阶段 ERDL 公式主要为简单四则运算，无需函数调用
    if (formula.includes('Math.')) {
      this.logger.warn(
        `[ERDL Security] Math.* functions blocked by safety filter: ${formula}. ` +
        'If Math functions are needed, consider pre-computing values in context.',
      )
      throw new Error(`[ERDL Security] Formula contains method call: ${formula}`)
    }
  }
}
