/**
 * OpenOBA · ERDL LLM Bridge Interfaces
 *
 * @file LLM Bridge 子模块接口定义 — ILlmSseHandler + ILlmPromptBuilder
 * @author 唐浩然（OpenOBA AI 联合创始人）
 * @since 2026-06-21
 * @license BSL-1.1
 *
 * 用于渐进式拆分 erdl-llm-bridge.ts（1,209行 → ~550行）
 * 拆出模块：LlmSseHandler + LlmPromptBuilder
 */

import type {
  ERDLLLMMessage,
  ERDLLMTool,
} from './erdl-llm-provider.interface'
import type { EntityRegistration } from '../core/erdl-registry'
import type { StreamEvent } from '../../eros/stream/stream-event.types'

/** 推荐参数（与 Bridge 中的本地定义一致） */
export interface RecommendParams {
  faceShape?: string
  skinTone?: string
  scenario?: string
  stylePreference?: string
}

/** 推荐结果 */
export interface RecommendResult {
  recommendation: string
  reasoning: string
}

// ============================================
// ILlmSseHandler — SSE 流式处理接口
// ============================================

export interface ILlmSseHandler {
  /**
   * 流式 ReAct 单轮推理（SSE）
   *
   * 负责：https.request → SSE 行解析 → tool_calls 拼装
   * 包含 primary + failover Provider 切换
   */
  streamReActRound(
    messages: ERDLLLMMessage[],
    tools: ERDLLMTool[],
    onEvent: (e: StreamEvent) => void,
    abortSignal?: AbortSignal,
    preferredProviderCode?: string,
  ): Promise<{
    assistantContent: string
    reasoningContent: string
    rawToolCalls: Array<{ id: string; type: string; function: { name: string; arguments: string } }> | null
    model: string
    provider: string
  }>

  /**
   * 流式最终回复（无工具调用的纯文本回复）
   */
  streamFinalResponse(
    messages: ERDLLLMMessage[],
    onEvent: (e: StreamEvent) => void,
  ): Promise<{ content: string; model: string; provider: string }>

  /**
   * DSML 标记过滤 — DeepSeek thinking 模式内部标记清理
   */
  sanitizeContent(text: string): string
}

// ============================================
// ILlmPromptBuilder — 上下文构建接口
// ============================================

export interface ILlmPromptBuilder {
  /** 构建带 ERDL Entity 上下文 + 别名映射的系统 Prompt */
  buildSystemPrompt(query: string, entityTypes?: string[]): string

  /** 构建行业黑话别名映射（Live-ERDL V1.2） */
  buildAliasContext(entities: EntityRegistration[]): string

  /** 构建眼镜推荐 LLM 查询 */
  buildRecommendQuery(params: RecommendParams): string

  /** Entity → 单行 Prompt 文本 */
  entityToPrompt(entity: EntityRegistration): string

  /** Entity → 表格结构 */
  entityToTable(entity: EntityRegistration): Record<string, unknown>

  /**
   * 构建优雅错误响应（LLM 异常时，基于已完成工具调用的降级回复）
   */
  buildGracefulErrorResponse(
    allToolCalls: Array<{ name: string; args: Record<string, unknown> }>,
    error: string,
    round: number,
  ): string
}

// ============================================
// 重新导出上游类型（便捷导入）
// ============================================

export type {
  ERDLLLMMessage,
  ERDLLMTool,
  EntityRegistration,
  StreamEvent,
}
