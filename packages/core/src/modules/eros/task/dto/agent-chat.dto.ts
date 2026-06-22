/* eslint-disable @typescript-eslint/no-explicit-any -- CORE 泛型/第三方库约束 */
/**
 * OpenOBA · Agent Chat DTO & Utilities
 *
 * @file Chat 会话相关类型、常量、工具函数
 * @author 唐浩然（OpenOBA AI 联合创始人）
 * @since 2026-06-21
 * @license BSL-1.1
 *
 * 从 agent-chat.controller.ts 拆分而来
 */

import type { Request } from 'express'

// ============================================
// 类型定义
// ============================================

/** 聊天消息 */
export interface ChatMessage {
  role: 'system' | 'human' | 'agent' | 'tool'
  content: string
  time?: string
}

// ============================================
// 常量
// ============================================

/** 单条消息最大长度 */
export const MAX_MESSAGE_LENGTH = 4000

/** 历史记录最多保留条数 */
export const MAX_HISTORY_ENTRIES = 20

/** 速率限制：每分钟最大请求数 */
export const RATE_LIMIT_MAX = 30

/** 速率限制窗口（毫秒） */
export const RATE_LIMIT_WINDOW_MS = 60_000

// ============================================
// 工具函数（从 controller 提取的 helper）
// ============================================

/** 简单文本清洗（去除 HTML/特殊标签） */
export function cleanInput(text: string): string {
  if (!text) return text
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim()
}

/** 从 Request 提取用户 ID */
export function getUserId(req: Request): string {
  return undefined?.id || (req as unknown as { user?: { id?: string; sub?: string } }).user?.sub || 'anonymous'
}

/** 分类 LLM/运行时错误，返回用户友好消息 */
export function classifyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes('timeout') || msg.includes('TIMEOUT')) return '请求超时，请稍后重试'
  if (msg.includes('401') || msg.includes('Unauthorized')) return '认证失败，请检查 API Key'
  if (msg.includes('429') || msg.includes('rate')) return '请求过于频繁，请稍后重试'
  if (msg.includes('503') || msg.includes('Service Unavailable')) return 'LLM 服务暂时不可用'
  if (msg.includes('insufficient_quota') || msg.includes('quota')) return 'API 额度不足'
  return '服务暂时不可用，请稍后重试'
}

/** 构建用户友好的错误消息 */
export function getUserFriendlyMessage(error: unknown): string {
  const classified = classifyError(error)
  const detail = error instanceof Error ? error.message : String(error)
  const safeDetail = detail.length > 200 ? detail.substring(0, 200) + '...' : detail
  return `${classified}（${safeDetail}）`
}
