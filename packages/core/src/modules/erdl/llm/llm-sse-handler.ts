/**
 * OpenOBA · ERDL LLM SSE Handler
 *
 * @file LLM 流式处理 — https.request + SSE 行解析 + tool_calls 拼装
 * @author 唐浩然（OpenOBA AI 联合创始人）
 * @since 2026-06-21
 * @license BSL-1.1
 *
 * 从 erdl-llm-bridge.ts（组B）拆分而来
 * 负责：streamReActRound / streamFinalResponse / sanitizeContent
 */

import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common'
import type { ILlmSseHandler } from './llm-interfaces'
import type {
  ERDLLLMMessage,
  ERDLLMTool,
} from './erdl-llm-provider.interface'
import type { StreamEvent } from '../../eros/stream/stream-event.types'
import { ModelRegistryService } from '../../system/model-registry.service'
import {
  getDefaultProvider,
  getFailoverProviders,
} from './erdl-llm-providers'
import * as https from 'https'
import * as http from 'http'
import type { IncomingMessage } from 'http'

@Injectable()
export class LlmSseHandler implements ILlmSseHandler {
  private readonly logger = new Logger(LlmSseHandler.name)

  constructor(
    @Optional()
    @Inject(forwardRef(() => ModelRegistryService))
    private readonly modelRegistry?: ModelRegistryService,
  ) {}

  /* ── 空实现（Step 2 先接线，Step 3 再搬逻辑）── */

  async streamReActRound(
    _messages: ERDLLLMMessage[],
    _tools: ERDLLMTool[],
    _onEvent: (e: StreamEvent) => void,
    _abortSignal?: AbortSignal,
    _preferredProviderCode?: string,
  ): Promise<{
    assistantContent: string
    reasoningContent: string
    rawToolCalls: Array<{ id: string; type: string; function: { name: string; arguments: string } }> | null
    model: string
    provider: string
  }> {
    throw new Error('[LlmSseHandler] Not implemented yet — pending Step 3 migration')
  }

  async streamFinalResponse(
    _messages: ERDLLLMMessage[],
    _onEvent: (e: StreamEvent) => void,
  ): Promise<{ content: string; model: string; provider: string }> {
    throw new Error('[LlmSseHandler] Not implemented yet — pending Step 3 migration')
  }

  sanitizeContent(text: string): string {
    // 空实现：原样返回（Step 3 搬迁逻辑）
    return text
  }
}
