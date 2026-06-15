/**
 * ER-OS StreamEvent — 企业级流式事件模型
 *
 * @file stream-event.types.ts
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-09
 * @license BSL-1.1
 *
 * 设计原则：
 * - 所有 Agent 执行步骤作为结构化事件推送
 * - 工具调用可见、参数可见、结果可审计
 * - 预埋 V1.2+ 的多模态/SubAgent/长任务事件类型
 */

export type StreamEvent =
  // ═══════════════════════════════════════════
  // V1.1 实现：工具调用 + 内容流 + 生命周期
  // ═══════════════════════════════════════════

  /** 工具调用开始 */
  | {
      type: 'tool_start'
      tool: string
      args: Record<string, unknown>
    }

  /** 工具调用完成 */
  | {
      type: 'tool_end'
      tool: string
      result: string
      rows?: number
      durationMs?: number
    }

  /** 流式内容（逐 token） */
  | {
      type: 'content'
      delta: string
    }

  /** 流式结束 */
  | {
      type: 'done'
    }

  /** 错误 */
  | {
      type: 'error'
      message: string
      code?: string
    }

  // ═══════════════════════════════════════════
  // V1.5 ReAct：思考→行动→观察 事件
  // ═══════════════════════════════════════════

  /** 思考：LLM 在调用工具前的推理 */
  | {
      type: 'thought'
      text: string
    }

  /** 观察：工具执行后的结果摘要 */
  | {
      type: 'observation'
      text: string
    }

  // ═══════════════════════════════════════════
  // V2.0：工具流式增量输出
  // ═══════════════════════════════════════════

  /** 工具执行进度（批量操作时实时推送） */
  | {
      type: 'tool_progress'
      tool: string
      current: number
      total: number
      message: string
    }

  /** 工具执行实时流式输出（逐行推送） */
  | {
      type: 'tool_stream'
      tool: string
      line: string
    }

  // ═══════════════════════════════════════════
  // V1.2 预埋：阶段性事件
  // ═══════════════════════════════════════════

  /** 阶段开始 */
  | {
      type: 'phase_start'
      phase: string
      totalPhases?: number
    }

  /** 阶段结束 */
  | {
      type: 'phase_end'
      phase: string
    }

  // ═══════════════════════════════════════════
  // V1.2 预埋：子任务
  // ═══════════════════════════════════════════

  /** 子任务创建 */
  | {
      type: 'subtask_create'
      taskId: string
      title: string
      agent?: string
    }

  /** 子任务进度 */
  | {
      type: 'subtask_progress'
      taskId: string
      status: string
      progress?: number
    }

  /** 子任务完成 */
  | {
      type: 'subtask_result'
      taskId: string
      summary: string
    }

  // ═══════════════════════════════════════════
  // V1.2 预埋：多模态输出
  // ═══════════════════════════════════════════

  /** 结构化内容块 */
  | {
      type: 'content_block'
      kind: 'text' | 'table' | 'image' | 'file'
      data: unknown
    }

  /** 文件输出 */
  | {
      type: 'file_output'
      name: string
      url: string
      mimeType: string
      size?: number
    }

  /** 图片输出 */
  | {
      type: 'image_output'
      url: string
      alt: string
      width?: number
      height?: number
    }

  // ═══════════════════════════════════════════
  // V1.2 预埋：交付物
  // ═══════════════════════════════════════════

  /** Delta 报告推送事件 */
  | {
      type: 'delta_report'
      deltaId: string
      summary: string
      files: string[]
      actions: Array<{ action: string; label: string; type: string }>
    }

  // ═══════════════════════════════════════════
  // H17: 前端驱动多轮架构 — round_done 事件
  // ═══════════════════════════════════════════

  /** 本轮所有工具执行完毕（前端据此决定是否续轮） */
  | {
      type: 'round_done'
      hasToolCalls: boolean
      toolName?: string
    }

  /** 会话结束 */
  | {
      type: 'done'
      roundCount?: number
    }
