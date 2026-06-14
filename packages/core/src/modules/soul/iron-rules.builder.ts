/**
 * ERA SOUL 模块 — 铁律构建器
 *
 * 三层铁律体系：
 *   T0 · 系统铁律：所有 Agent 无条件注入
 *   T1 · 岗位铁律：按 Agent 的 roleCode 注入
 *   T2 · 任务铁律：按 taskType 临时叠加
 *
 * @file iron-rules.builder.ts
 * @author OpenOBA
 * @since 2026-05-25
 */

import { Injectable, Logger } from '@nestjs/common'
import { AgentIdentity, IronRuleSet } from './soul.types'
import {
  SYSTEM_IRON_RULES,
  ROLE_IRON_RULES,
  TASK_IRON_RULES,
} from './soul-content/iron-rules'

@Injectable()
export class IronRulesBuilder {
  private readonly logger = new Logger(IronRulesBuilder.name)

  /**
   * 构建操作铁律 System Prompt 块
   *
   * @param identity - Agent 身份
   * @param taskType - 任务类型（可选）
   */
  build(identity: AgentIdentity, taskType?: string): string {
    const ruleSets: IronRuleSet[] = []

    // T0 系统铁律（无条件）
    ruleSets.push({ source: 'system', rules: SYSTEM_IRON_RULES })

    // T1 岗位铁律（去重：同一角色可能因多 roleCode 触发多次，只注入一次）
    const injectedRoles = new Set<string>()
    for (const code of identity.roleCodes) {
      const rules = ROLE_IRON_RULES[code]
      if (rules && !injectedRoles.has(code)) {
        injectedRoles.add(code)
        ruleSets.push({ source: 'role', roleCode: code, rules })
      }
    }

    // 如果没有任何岗位铁律匹配，Main Agent 也不需要岗位铁律
    // Sub Agent 至少有一条通用规则（兜底）
    if (injectedRoles.size === 0 && identity.agentType !== 'main') {
      ruleSets.push({
        source: 'role',
        roleCode: 'general',
        rules: '请根据你的岗位职责，在操作前确认数据的准确性。不确定时先查询再决策。',
      })
    }

    // T2 任务铁律
    if (taskType && TASK_IRON_RULES[taskType]) {
      // 避免与 T1 重复
      // 开发角色的 tsc_check 铁律在 T1 已经注入，T2 tech_support 如果不冲突则叠加
      ruleSets.push({ source: 'task', taskType, rules: TASK_IRON_RULES[taskType] })
    }

    return ruleSets.map(rs => rs.rules).join('\n\n')
  }
}
