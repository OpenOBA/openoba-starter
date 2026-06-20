/**
 * ERA Chat WebSocket 消息类型定义
 *
 * @file chat.types.ts
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-21
 * @license BSL-1.1
 */

// ═══════════════════════════════════════════
// 客户端 → 服务端
// ═══════════════════════════════════════════

export interface ChatSendPayload {
  sessionKey: string
  message: string
  history?: { role: string; content: string }[]
  idempotencyKey?: string
}

export interface ChatAbortPayload {
  runId: string
}

export interface ChatInjectPayload {
  sessionKey: string
  message: string
  label?: string
}

export interface ChatHistoryPayload {
  sessionKey: string
  limit?: number
}

export type WsClientMessage =
  | { type: 'chat.send'; payload: ChatSendPayload }
  | { type: 'chat.abort'; payload: ChatAbortPayload }
  | { type: 'chat.inject'; payload: ChatInjectPayload }
  | { type: 'chat.history'; payload: ChatHistoryPayload }

// ═══════════════════════════════════════════
// 服务端 → 客户端
// ═══════════════════════════════════════════

/** 统一流式事件 — 直接映射 StreamEvent */
export interface ChatEventPayload {
  runId: string
  type?: string
  delta?: string
  tool?: string
  args?: Record<string, unknown>
  result?: string
  rows?: number
  durationMs?: number
  text?: string
  message?: string
  code?: string
  phase?: string
  totalPhases?: number
  taskId?: string
  title?: string
  agent?: string
  status?: string
  progress?: number
  summary?: string
  kind?: string
  ref?: string
  label?: string
  data?: unknown
  name?: string
  url?: string
  mimeType?: string
  size?: number
  alt?: string
  width?: number
  height?: number
  [key: string]: unknown  // 允许 StreamEvent 的额外字段
}

export interface ChatStartedPayload {
  runId: string
}

export interface ChatDonePayload {
  runId: string
  usage?: { input: number; output: number }
}

export interface ChatAbortedPayload {
  runId: string
  partialContent?: string
}

export interface ChatErrorPayload {
  runId?: string
  message: string
  code?: string
}

export interface ChatInjectedPayload {
  sessionKey: string
  message: string
  label?: string
}

export interface ChatHistoryResultPayload {
  sessionKey: string
  messages: { role: string; content: string; timestamp?: string }[]
}

export type WsServerEvent =
  | { type: 'chat.started'; payload: ChatStartedPayload }
  | { type: 'chat.event'; payload: ChatEventPayload }
  | { type: 'chat.done'; payload: ChatDonePayload }
  | { type: 'chat.aborted'; payload: ChatAbortedPayload }
  | { type: 'chat.error'; payload: ChatErrorPayload }
  | { type: 'chat.injected'; payload: ChatInjectedPayload }
  | { type: 'chat.history'; payload: ChatHistoryResultPayload }
  | { type: 'heartbeat'; payload: { ts: string } }
