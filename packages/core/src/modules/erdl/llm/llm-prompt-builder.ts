/**
 * OpenOBA · ERDL LLM Prompt Builder
 *
 * @file 上下文构建器 — System Prompt / 别名映射 / Entity→Prompt / 错误回复
 * @author 唐浩然（OpenOBA AI 联合创始人）
 * @since 2026-06-21
 * @license BSL-1.1
 *
 * 从 erdl-llm-bridge.ts（组C）拆分而来
 * 负责：buildSystemPrompt / buildAliasContext / recommendGlasses 等 7 个方法
 */

import { Injectable, Logger } from '@nestjs/common'
import type { ILlmPromptBuilder, RecommendParams, RecommendResult } from './llm-interfaces'
import type { EntityRegistration } from '../core/erdl-registry'
import { ERDLRegistry } from '../core/erdl-registry'

@Injectable()
export class LlmPromptBuilder implements ILlmPromptBuilder {
  private readonly logger = new Logger(LlmPromptBuilder.name)

  constructor(
    private readonly registry: ERDLRegistry,
  ) {}

  /* ── 空实现（Step 2 先接线，Step 3 再搬逻辑）── */

  buildSystemPrompt(_query: string, _entityTypes?: string[]): string {
    throw new Error('[LlmPromptBuilder] buildSystemPrompt not implemented yet')
  }

  buildAliasContext(_entities: EntityRegistration[]): string {
    throw new Error('[LlmPromptBuilder] buildAliasContext not implemented yet')
  }

  buildRecommendQuery(_params: RecommendParams): string {
    throw new Error('[LlmPromptBuilder] buildRecommendQuery not implemented yet')
  }

  entityToPrompt(_entity: EntityRegistration): string {
    throw new Error('[LlmPromptBuilder] entityToPrompt not implemented yet')
  }

  entityToTable(_entity: EntityRegistration): Record<string, unknown> {
    throw new Error('[LlmPromptBuilder] entityToTable not implemented yet')
  }

  buildGracefulErrorResponse(
    _allToolCalls: Array<{ name: string; args: Record<string, unknown> }>,
    _error: string,
    _round: number,
  ): string {
    throw new Error('[LlmPromptBuilder] buildGracefulErrorResponse not implemented yet')
  }

  async recommendGlasses(_params: RecommendParams): Promise<RecommendResult> {
    throw new Error('[LlmPromptBuilder] recommendGlasses not implemented yet')
  }
}
