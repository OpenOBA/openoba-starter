/**
 * OpenOBA · Task State Machine
 *
 * @file 任务状态机 + 审批回复解析 — 纯函数工具
 * @author 唐浩然（OpenOBA AI 联合创始人）
 * @since 2026-06-21
 * @license BSL-1.1
 *
 * 从 agent-task.service.ts 拆分而来
 */

import type { AgentTaskStatus } from './agent-task.entity'

// ============================================
// 状态转换表
// ============================================

export const STATE_TRANSITIONS: Record<AgentTaskStatus, AgentTaskStatus[]> = {
  drafted: ['proposed'],
  proposed: ['revised', 'executing', 'cancelled', 'aborted', 'escalated'],
  revised: ['proposed'],
  executing: ['delivered', 'aborted', 'escalated', 'cancelled'],
  delivered: ['published', 'cancelled', 'aborted'],
  published: ['completed', 'executing', 'aborted'],
  completed: [],
  cancelled: [],
  aborted: [],
  escalated: ['executing', 'cancelled', 'aborted'],
}

// ============================================
// 状态校验
// ============================================

export function validateTransition(current: AgentTaskStatus, target: AgentTaskStatus): void {
  const allowed = STATE_TRANSITIONS[current]
  if (!allowed || !allowed.includes(target)) {
    throw new Error(`非法状态转换: ${current} → ${target}`)
  }
}

// ============================================
// 审批回复解析
// ============================================

export interface ParsedApproval {
  action: 'approved' | 'rejected' | 'partial'
  comment: string
  modifications: string[]
}

export function parseApprovalComment(raw: string): ParsedApproval {
  const lowered = raw.toLowerCase().trim()

  if (/^(通过|ok|okay|approved|approve|可以|没问题|继续|下一步)/.test(lowered)) {
    return { action: 'approved', comment: raw, modifications: [] }
  }

  if (/^(不|不同意|不行|拒绝|reject|驳回|重做|重新)/.test(lowered)) {
    return { action: 'rejected', comment: raw, modifications: [] }
  }

  if (/暂停|挂起|等等|等我|稍后/.test(lowered)) {
    return { action: 'rejected', comment: raw, modifications: [] }
  }

  return { action: 'approved', comment: raw, modifications: [] }
}
