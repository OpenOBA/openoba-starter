/**
 * Work-Agent 任务引擎 API 封装
 */

import request from '@/api/request'

// ── 类型定义 ──

export type TaskStatus =
  | 'drafted'
  | 'proposed'
  | 'revised'
  | 'executing'
  | 'delivered'
  | 'published'
  | 'completed'
  | 'cancelled'
  | 'aborted'
  | 'escalated'
export type TaskType = 'product_listing' | 'content_creation' | 'customer_service' | 'tech_support'
export type ReportFrequency = 'every_step' | 'per_phase' | 'daily_digest' | 'on_exception'
export type TargetLevel = 'L0' | 'L1' | 'L2'

export interface ReportTarget {
  id: string
  name: string
  role: string
  level: TargetLevel
  scope: string[]
  parentId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AgentRegistry {
  id: string
  agentName: string
  agentType: string
  displayName: string
  platform: string
  capabilities: string[]
  defaultReportTo: string | null
  allowedActions: string[]
  status: 'active' | 'inactive' | 'maintenance'
  createdAt: string
  updatedAt: string
}

export interface TaskProposal {
  version: number
  content: string
  timestamp: string
  status: 'submitted' | 'accepted' | 'rejected'
  feedback?: {
    reason: string
    suggestions?: string
    rejectedAt: string
    rejectedBy: string
  }
}

export interface TaskDeliverable {
  type: string
  url: string
  status: string
}

export interface AgentTask {
  id: string
  taskNo: string
  title: string
  type: TaskType
  createdBy: string
  reportTo: string
  escalateTo: string | null
  escalationHours: number
  status: TaskStatus
  currentPhase: number
  totalPhases: number
  reportFrequency: ReportFrequency
  context: Record<string, unknown>
  proposals: TaskProposal[] | null
  deliverables: TaskDeliverable[] | null
  agentId: string | null
  retryCount: number
  maxRetries: number
  createdAt: string
  updatedAt: string
}

export interface CognitiveLog {
  id: string
  logType: string
  sourceModule: string
  sourceId: string
  level: 'debug' | 'info' | 'warn' | 'error'
  title: string
  content: Record<string, unknown>
  agentId: string | null
  actor: string
  actorType: 'human' | 'agent' | 'system'
  createdAt: string
}

export interface TaskStats {
  proposed: number
  executing: number
  completed: number
  escalated: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
}

// ── 任务 API ──

export function createTask(data: {
  title: string
  type: string
  reportTo: string
  subject?: string
  requirements?: string
  createdBy?: string
  escalateTo?: string
  escalationHours?: number
  reportFrequency?: string
  context?: Record<string, unknown>
  agentId?: string
  totalPhases?: number
}): Promise<AgentTask> {
  return request.post('/eros/tasks', data)
}

export function queryTasks(params?: {
  status?: TaskStatus
  type?: TaskType
  reportTo?: string
  agentId?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedResponse<AgentTask>> {
  return request.get('/eros/tasks', { params })
}

export function getTask(id: string): Promise<AgentTask> {
  return request.get(`/eros/tasks/${id}`)
}

export function updateTask(
  id: string,
  data: {
    title?: string
    reportTo?: string
    reportFrequency?: string
    context?: Record<string, unknown>
  },
): Promise<AgentTask> {
  return request.put(`/eros/tasks/${id}`, data)
}

export function getTaskLogs(id: string): Promise<CognitiveLog[]> {
  return request.get(`/eros/tasks/${id}/logs`)
}

// ── Task Report ──

export function submitReport(
  id: string,
  data: {
    content: string
    attachments?: { name: string; url: string; type: string }[]
    decisions?: string[]
  },
): Promise<{ task: AgentTask; report: string }> {
  return request.post(`/eros/tasks/${id}/report`, data)
}

// ── Human Approval ──

export function approveTask(
  id: string,
  data: {
    action: string
    comment?: string
    rejectReason?: string
    suggestions?: string
    additionalContext?: Record<string, unknown>
  },
): Promise<AgentTask> {
  return request.post(`/eros/tasks/${id}/approve`, data)
}

// ── 交付 / 发布 / 完成 ──

export function deliverTask(
  id: string,
  data: {
    deliverables?: { type: string; url: string; status: string }[]
  },
): Promise<AgentTask> {
  return request.post(`/eros/tasks/${id}/deliver`, data)
}

export function publishTask(id: string): Promise<AgentTask> {
  return request.post(`/eros/tasks/${id}/publish`)
}

export function completeTask(id: string): Promise<AgentTask> {
  return request.post(`/eros/tasks/${id}/complete`)
}

// ── 异常处理 ──

export function cancelTask(id: string): Promise<AgentTask> {
  return request.post(`/eros/tasks/${id}/cancel`)
}

export function abortTask(id: string): Promise<AgentTask> {
  return request.post(`/eros/tasks/${id}/abort`)
}

export function deleteTask(id: string): Promise<{ deleted: boolean }> {
  return request.delete(`/eros/tasks/${id}`)
}

export function escalateTask(
  id: string,
  data: {
    reason?: string
    escalateTo?: string
  },
): Promise<AgentTask> {
  return request.post(`/eros/tasks/${id}/escalate`, data)
}

export function resumeTask(id: string): Promise<AgentTask> {
  return request.post(`/eros/tasks/${id}/resume`)
}

// ── 任务统计 ──

export function getTaskStats(reportTo?: string): Promise<TaskStats> {
  return request.get('/eros/tasks/stats', { params: reportTo ? { reportTo } : {} })
}

export function getPendingApprovals(reportTo: string): Promise<AgentTask[]> {
  return request.get(`/eros/tasks/pending/${reportTo}`)
}

// ── 汇报对象 API ──

export function getReportTargets(): Promise<ReportTarget[]> {
  return request.get('/eros/report-targets')
}

export function checkEscalations(): Promise<{ escalated: number }> {
  return request.post('/eros/tasks/check-escalations')
}

// ── Agent 会话 ──

/** 发送消息到 Agent → 返回 SSE 流 */
export function sendMessage(taskId: string, message: string): Promise<Response> {
  // H14: request 拦截器已处理 token 注入，无需手动读取
  return request.post(`/eros/tasks/${taskId}/message`, { message })
}
