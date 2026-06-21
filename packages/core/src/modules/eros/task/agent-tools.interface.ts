/**
 * OpenOBA · Agent Tools Interface
 *
 * @file Agent 工具子模块接口 — 回调签名 + 工具实现类型
 * @author 唐浩然（OpenOBA AI 联合创始人）
 * @since 2026-06-21
 * @license BSL-1.1
 *
 * 用于渐进式拆分 agent-executor.service.ts（2360行 → ~5文件）
 * 共享状态的传递方式：回调透传（非反向注入，避免循环依赖）
 */

import type { AgentTask } from './agent-task.entity'
import type { StreamEvent } from '../stream/stream-event.types'

// ============================================
// AgentToolCallbacks — 共享状态回调
// ============================================

/**
 * 工具执行时需要的共享状态回调
 *
 * usedModel / _lastDraftId / sessionDeltaFiles 三块可变状态
 * 通过回调透传而非反向注入，避免 AgentToolImplementations
 * 反向依赖 AgentExecutorService 造成循环引用
 */
export interface AgentToolCallbacks {
  /** 获取当前使用的模型（被 chatExecute 写入，getUsedModel 读取） */
  getUsedModel: () => string

  /** 设置当前使用的模型 */
  setUsedModel: (model: string) => void

  /** 获取最近创建的草稿 ID（draft_create 写入，draft_add_sku 读取） */
  getLastDraftId: () => string

  /** 设置最近创建的草稿 ID */
  setLastDraftId: (id: string) => void

  /** 追踪 Delta 文件变更 */
  trackDeltaFile: (filePath: string, op: string) => void

  /** 获取当前会话的 Delta 文件列表 */
  getDeltaFiles: () => string[]
}

// ============================================
// AgentSecurityGuard 接口
// ============================================

export interface IAgentSecurityGuard {
  /** SSRF 防护：校验抓取 URL */
  validateFetchUrl(url: string): void

  /** 路径穿越防护：校验文件编辑路径 */
  validateFilePath(filePath: string): void

  /** 命令注入防护：校验 Git 模式参数 */
  validateGitMode(mode: string): void
}

// ============================================
// AgentToolImplementations 接口
// ============================================

/**
 * 单个工具执行签名
 *
 * @param name - 工具名称
 * @param args - LLM 传入的 JSON 参数
 * @param callbacks - 共享状态回调
 * @returns 工具执行结果（Markdown 或 JSON 字符串）
 */
export type AgentToolExecutor = (
  name: string,
  args: Record<string, unknown>,
  callbacks: AgentToolCallbacks,
) => Promise<string>

// ============================================
// AgentTaskExecutor 接口
// ============================================

export interface IAgentTaskExecutor {
  /** 执行任务（从 executing 状态开始） */
  executeTask(taskId: string): Promise<string>

  /** Agent 自动分析 + 汇报 */
  analyzeAndReport(taskId: string): Promise<string>

  /** 驳回后返工（重新分析） */
  reviseProposal(taskId: string): Promise<string>

  /** 流式执行（SSE） */
  streamExecute(
    taskId: string,
    onEvent: (e: StreamEvent) => void,
  ): Promise<{ content: string; model: string; provider: string } | null>
}

// ============================================
// 重新导出上文类型
// ============================================

export type { StreamEvent, AgentTask }
