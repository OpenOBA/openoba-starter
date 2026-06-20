/**
 * 秒镜科技 · ERDL — Enterprise Resource Definition Language
 *
 * @file Rule Definition — 规则类型定义
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
 * 定义 ERDL 规则引擎使用的核心类型：
 * - RuleCondition: 条件表达式
 * - RuleConditionGroup: 条件组（支持 AND/OR 嵌套）
 * - RuleAction: 规则动作
 * - RuleDefinition: 完整规则定义
 */

// ============================================
// 规则条件
// ============================================

/**
 * 规则条件操作符
 *
 * - `eq`: 等于（严格相等）
 * - `ne`: 不等于
 * - `gt`: 大于
 * - `gte`: 大于等于
 * - `lt`: 小于
 * - `lte`: 小于等于
 * - `in`: 在数组中
 * - `contains`: 字符串包含
 * - `match`: 正则匹配
 * - `exists`: 字段存在（非 undefined/null）
 */
export type RuleOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'contains'
  | 'match'
  | 'exists'

/**
 * 叶子条件：单个字段与值的比较
 *
 * @example
 * ```typescript
 * { field: 'customer.tier', operator: 'eq', value: 'VIP' }
 * { field: 'retailPrice', operator: 'gte', value: 100 }
 * ```
 */
export interface RuleCondition {
  /** 字段路径，支持点号分隔的嵌套路径（如 "customer.tier"） */
  field: string
  /** 比较操作符 */
  operator: RuleOperator
  /** 比较值 */
  value: unknown
}

/**
 * 条件组：支持 AND/OR 逻辑嵌套
 *
 * @example
 * ```typescript
 * {
 *   logic: 'AND',
 *   conditions: [
 *     { field: 'customer.tier', operator: 'eq', value: 'VIP' },
 *     { field: 'quantity', operator: 'gte', value: 10 }
 *   ]
 * }
 * ```
 */
export interface RuleConditionGroup {
  /** 逻辑运算符：AND（全部满足）或 OR（任一满足） */
  logic: 'AND' | 'OR'
  /** 条件列表，可嵌套子条件组 */
  conditions: (RuleCondition | RuleConditionGroup)[]
}

// ============================================
// 规则动作
// ============================================

/**
 * 规则动作类型
 *
 * - `assign`: 赋值操作
 * - `calculate`: 计算操作（支持公式表达式）
 * - `validate`: 校验操作（失败时返回错误信息）
 * - `notify`: 通知操作（预留）
 */
export type RuleActionType = 'assign' | 'calculate' | 'validate' | 'notify'

/**
 * 规则动作：满足条件时执行的操作
 *
 * @example
 * ```typescript
 * // 计算动作：应用折扣
 * { type: 'calculate', params: { formula: 'retailPrice * 0.8' } }
 *
 * // 校验动作：返回错误信息
 * { type: 'validate', params: { error: '零售价必须至少是成本价的1.2倍' } }
 * ```
 */
export interface RuleAction {
  /** 动作类型 */
  type: RuleActionType
  /** 动作参数，根据 type 不同而不同 */
  params: Record<string, unknown>
}

// ============================================
// 规则定义
// ============================================

/**
 * 规则层级
 *
 * - `validation`: 校验规则（用于表单提交前验证）
 * - `policy`: 策略规则（用于业务逻辑决策）
 */
export type RuleTier = 'validation' | 'policy'

/**
 * ERDL 规则定义 — 完整的可执行规则
 *
 * @example
 * ```typescript
 * {
 *   id: 'rule-vip-discount',
 *   name: '会员等级折扣-VIP',
 *   namespace: 'industry.eyewear',
 *   entity: 'ProductSku',
 *   trigger: 'Product.price.calculate',
 *   priority: 1,
 *   tier: 'policy',
 *   condition: {
 *     logic: 'AND',
 *     conditions: [
 *       { field: 'customer.tier', operator: 'eq', value: 'VIP' }
 *     ]
 *   },
 *   actions: [
 *     { type: 'calculate', params: { formula: 'retailPrice * 0.8' } }
 *   ],
 *   isActive: true,
 *   createdAt: new Date(),
 *   version: 1
 * }
 * ```
 */
export interface RuleDefinition {
  /** 规则唯一标识（UUID） */
  id: string
  /** 规则名称（人类可读） */
  name: string
  /** 命名空间（如 "industry.eyewear"） */
  namespace: string
  /** 关联实体类型（如 "ProductSku"） */
  entity: string
  /** 触发器标识（如 "Product.price.calculate"） */
  trigger?: string
  /** 优先级（数字越小优先级越高） */
  priority: number
  /** 规则层级 */
  tier: RuleTier
  /** 触发条件 */
  condition: RuleConditionGroup
  /** 满足条件时执行的动作 */
  actions: RuleAction[]
  /** 是否激活 */
  isActive: boolean
  /** 创建时间 */
  createdAt: Date
  /** 版本号（用于热替换检测） */
  version: number
}
