/**
 * �뾵�Ƽ� �� ERDL �� Enterprise Resource Definition Language
 *
 * @file ERDL LLM Bridge v2 �� �� Provider + Failover + Token ����
 * @author �ƺ�Ȼ���뾵 AI ���ϴ�ʼ�ˣ�
 * @since 2026-05-01
 * @license BSL-1.1
 *
 * @description
 * v2 ���������� OpenClaw �ܹ��о�����
 * 1. �� Provider ֧�֣�DeepSeek + Qwen������չ��
 * 2. �Զ� Failover���� Provider ������ʱ�л���
 * 3. Token ���� + �ɱ�����
 * 4. ͳһ OpenAI Chat Completions ��ʽ
 * 5. ������ v1 API��ERDLRecommendController ����Ķ���
 */

import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import type { EntityRegistration } from '../core/erdl-registry'
import { ERDLActionGuard, ParsedAction } from '../core/erdl-action-guard'
import {
  getDefaultProvider,
  getFailoverProviders,
  findProviderForModel,
  estimateTokens,
} from './erdl-llm-providers'
import { ModelRegistryService } from '../../system/model-registry.service'
import type {
  ERDLLLMProvider,
  ERDLLLMRequest,
  ERDLLLMResponse,
  ERDLLLMUsage,
  ERDLLLMQueryResult,
  ERDLModelDefinition,
  ERDLLLMMessage,
  ERDLLMTool,
} from './erdl-llm-provider.interface'
import type { ILlmSseHandler, ILlmPromptBuilder } from './llm-interfaces'
import { LlmSseHandler } from './llm-sse-handler'
import { LlmPromptBuilder } from './llm-prompt-builder'
import * as https from 'https'
import * as http from 'http'
import { IncomingMessage } from 'http'

// ============================================
// �Ƽ��������
// ============================================

export interface RecommendParams {
  faceShape?: string
  skinTone?: string
  scenario?: string
  stylePreference?: string
}

export interface RecommendResult {
  recommendation: string
  reasoning: string
}

// ============================================
// ERDL LLM Bridge v2
// ============================================

@Injectable()
export class ERDLLLMBridge implements ILlmSseHandler, ILlmPromptBuilder {
  private readonly logger = new Logger(ERDLLLMBridge.name)

  constructor(
    private readonly httpService: HttpService,
    private readonly actionGuard: ERDLActionGuard,
    private readonly sseHandler: LlmSseHandler,
    private readonly promptBuilder: LlmPromptBuilder,
    @Optional() @Inject(forwardRef(() => ModelRegistryService))
    private readonly modelRegistry?: ModelRegistryService,
  ) {}

  // ==========================================
  // ���� API��ͨ�� LLM ��ѯ���� Provider + Failover��
  // ==========================================

  /**
   * ���� LLM ��ѯ���Զ����� Provider ѡ��� failover
   *
   * @param request LLM ����
   * @returns ��ѯ������� failover ��Ϣ��
   */
  async queryWithFailover(request: ERDLLLMRequest): Promise<ERDLLLMQueryResult> {
    const attempted: string[] = []

    // 1. ȷ���� Provider
    const primary = request.model
      ? findProviderForModel(request.model)
      : getDefaultProvider()

    if (!primary) {
      throw new Error(
        'No LLM provider configured. Set DEEPSEEK_API_KEY or DASHSCOPE_API_KEY in .env',
      )
    }

    // 2. ������ Provider
    attempted.push(primary.id)
    try {
      const response = await this.callProvider(primary, request)
      return { response, fallbackUsed: false, attemptedProviders: attempted }
    } catch (error) {
      this.logger.warn(
        `Primary provider ${primary.id} failed: ${error instanceof Error ? error.message : String(error)}`,
      )
      if (error instanceof Error) this.logger.warn(`Stack: ${error.stack}`)
    }

    // 3. Failover ������ Provider
    const fallbacks = getFailoverProviders(primary.id)
    for (const fb of fallbacks) {
      attempted.push(fb.id)
      try {
        const response = await this.callProvider(fb, request)
        this.logger.log(`Failover to ${fb.id} succeeded after ${attempted.slice(0, -1).join(', ')} failed`)
        return { response, fallbackUsed: true, attemptedProviders: attempted }
      } catch (error) {
        this.logger.warn(
          `Failover provider ${fb.id} failed: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    throw new Error(
      `All LLM providers failed. Attempted: ${attempted.join(', ')}`,
    )
  }

  /**
   * �����ݵļ򵥲�ѯ�����ش��ı���
   */
  async queryLLM(query: string, entityTypes?: string[]): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(query, entityTypes)
    try {
      const result = await this.queryWithFailover({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ],
        temperature: 0.7,
        maxTokens: 1024,
      })
      return result.response.content
    } catch (error) {
      this.logger.error(`LLM query failed: ${error instanceof Error ? error.message : String(error)}`)
      return '?? LLM ������ʱ�����ã����Ժ�����'
    }
  }

  /**
   *
   * while ѭ�� + ÿ��ִֻ�е� 1 �����ߣ��� queryWithToolsStream �߼�һ��
   */
  async queryWithTools(
    systemPrompt: string,
    userMessage: string,
    tools: ERDLLMTool[],
    toolExecutor: (name: string, args: Record<string, unknown>) => Promise<string>,
  ): Promise<{ content: string; model: string; provider: string; toolCalls: Array<{ name: string; args: Record<string, unknown> }> }> {
    const messages: ERDLLLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]

    const allToolCalls: Array<{ name: string; args: Record<string, unknown> }> = []
    const MAX_ROUNDS = 12
    let round = 0

    while (round < MAX_ROUNDS) {
      round++
      const result = await this.queryWithFailover({
        messages,
        tools,
        toolChoice: 'auto',
        temperature: 0.3,
        maxTokens: 2048,  // H16�޸�
      })

      const choice = (result.response as { rawChoices?: Array<Record<string, unknown>> }).rawChoices?.[0]
      const msg = choice ? (choice.message as Record<string, unknown>) : undefined
      // �� tool_calls �� ���ջظ�
      if (!msg?.tool_calls || (msg.tool_calls as unknown[]).length === 0) {
        const provider = getDefaultProvider()
        return {
          content: (msg?.content as string) || result.response.content,
          model: result.response.model,
          provider: result.response.provider,
          toolCalls: allToolCalls,
        }
      }

      // ReAct: ִֻ�е� 1 ������
      const firstTc = (msg!.tool_calls as unknown[])[0] as Record<string, unknown>
      const tcFn = (firstTc.function as Record<string, unknown>) as { name: string; arguments: string }
      const name = tcFn.name
      let args: Record<string, unknown> = {}
      // P2�޸���FC��������ʧ��ʱ���ش�����Ǿ�Ĭ�Կղ���ִ��
      // P2�޸���FC��������ʧ��ʱ���ش�����Ǿ�Ĭ�Կղ���ִ��
      try { args = JSON.parse(tcFn.arguments) } catch (e: unknown) {
        this.logger.warn(
          `[ReAct] FC arguments parse failed for ${name}: ${tcFn.arguments?.substring(0, 100)}`,
          (e as Error).message,
        )
      }

      this.logger.log(`[ReAct] ��${round}��: ${name}(${JSON.stringify(args).substring(0, 100)})`)

      const reasoningContent = (msg?.reasoning_content as string) || ''


      messages.push({
        role: 'assistant',
        content: (msg!.content as string) || '',
        ...(reasoningContent ? { reasoning_content: reasoningContent } : {}),
        tool_calls: [{ id: (firstTc.id as string), type: 'function', function: { name, arguments: JSON.stringify(args) } }],
      })

      let toolResult: string
      try {
        toolResult = await toolExecutor(name, args)
      } catch (e: unknown) {
        toolResult = `����ִ��ʧ��: ${(e as Error).message}`
      }
      messages.push({ role: 'tool', content: toolResult, tool_call_id: (firstTc.id as string) })
      allToolCalls.push({ name, args })
    }

    // ��������ִΣ�ֱ���������ջظ�
    const finalResult = await this.queryWithFailover({
      messages,
      temperature: 0.3,
      maxTokens: 2048,
    })
    const provider = getDefaultProvider()
    return {
      content: finalResult.response.content,
      model: finalResult.response.model,
      provider: finalResult.response.provider,
      toolCalls: allToolCalls,
    }
  }

  /**
   * Function Calling ��ʽ��ѯ �� ReAct ģʽ (V1.5)
   *
   * �������Thought �� Action �� Observation ѭ��
   * - ÿ�� LLM ִֻ�� 1 �����ߣ���ʹ LLM �����˶����
   * - ִ�к�������������� �� LLM ��������پ�����һ��
   * - ���� LLM ��������;�������ԣ�������ä�����й���
   *
   * �봫ͳ batch ģʽ������
   *   batch:  LLM �� [A,B,C] �� ȫ��ִ�� �� LLM ����ȫ�����
   *   ReAct:  LLM �� [A,B,C] �� ִֻ�� A �� LLM ���� A ��� �� �����Ƿ���Ҫ B,C
   */
  /**
   * H17 ���ݲ㣺Task ģʽ��ʹ�� while ѭ���������쳡������ context �������⣩
   * ���쳡����ʹ���µĵ��� queryWithToolsStream(messages, tools, executor, onEvent)
   */
  async queryWithToolsLegacy(
    systemPrompt: string,
    userMessage: string,
    tools: ERDLLMTool[],
    toolExecutor: (name: string, args: Record<string, unknown>) => Promise<string>,
    onEvent: (e: import('../../eros/stream/stream-event.types').StreamEvent) => void,
    preferredProviderCode?: string,
    abortSignal?: AbortSignal,
  ): Promise<{ content: string; model: string; provider: string }> {
    const messages: ERDLLLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]
    let finalContent = ''
    let finalModel = ''
    let finalProvider = ''
    // P0-2: ������ 3 �����ԣ��������쳣�жϣ�������ֱֹ�ӷ��أ�
    // V1.5.1: abort signal check before loop
    if (abortSignal?.aborted) {
      onEvent({ type: 'observation', text: '✋ User aborted' })
      return { content: '(Aborted)', model: '', provider: '' }
    }
    const MAX = 3
    for (let i = 0; i < MAX; i++) {
      if (abortSignal?.aborted) break
      const round = await this.queryWithToolsStream(messages, tools, toolExecutor, onEvent, abortSignal, preferredProviderCode)
      if (!round.toolCalls || round.toolCalls.length === 0) {
        // ������ֹ��LLM �����˴��ı��ظ� �� ֱ�ӷ��أ�������
        finalContent = round.content || ''
        finalModel = round.model || ''
        finalProvider = round.provider || ''
        break
      }
      // �� toolCalls �������ߴ�ϣ���ѭ��/���ޣ��� ���� messages ������һ��
      if (i < MAX - 1) {
        messages.splice(0, messages.length, ...round.messages)
        this.logger.warn(`[Legacy] ��${i + 1}�� Stream �����ߴ�ϣ�${round.toolCalls.length} �ι��ߵ��ã���׼������`)
      } else {
        // ���һ�� �� ʹ����������
        finalContent = round.content || ''
        finalModel = round.model || ''
        finalProvider = round.provider || ''
        break
      }
    }
    // ѭ���ľ����޴��ı��ظ� �� �ٵ�һ�β��� tools �� LLM ��ȡ���ջظ�
    if (!finalContent) {
      const lastResult = await this.queryLLM(
        '��������Ϲ���ִ�н�����ü�������ܽ���ķ��ֺͽ��顣',
        undefined,
      )
      finalContent = lastResult || '(Agent ����ɷ�����δ����ժҪ)'
      finalModel = 'default'
      finalProvider = 'default'
    }
    return { content: finalContent || '(Agent δ���)', model: finalModel, provider: finalProvider }
  }

  /**
   *
   * �����ִ�Ӳ���ޡ���ֹ������
   *   1. LLM ���ش��ı�����Ȼ��ֹ��
   *   2. ���� 3 ����ͬ����+��ͬ��������ѭ����⣩
   *   3. AbortController ��ֹ���û��жϣ�
   *
   * ÿ��ͨ�� SSE ���ͽ��ȣ�thought/tool/result/round_done��
   */
  async queryWithToolsStream(
    messages: ERDLLLMMessage[],
    tools: ERDLLMTool[],
    toolExecutor: (name: string, args: Record<string, unknown>) => Promise<string>,
    onEvent: (e: import('../../eros/stream/stream-event.types').StreamEvent) => void,
    abortSignal?: AbortSignal,
    preferredProviderCode?: string,
  ): Promise<{
    messages: ERDLLLMMessage[]
    content: string
    model: string
    provider: string
    toolCalls: Array<{ name: string; args: Record<string, unknown> }>
  }> {
    const allToolCalls: Array<{ name: string; args: Record<string, unknown> }> = []
    let round = 0

    // ������ 30 �֣����̽��Э���� Agent �������������������м��ٴ�����
    const SOFT_ROUND_LIMIT = 30
    let lastToolSignature = ''
    let sameToolStreak = 0
    const MAX_SAME_STREAK = 4

    onEvent({ type: 'phase_start', phase: 'ReAct ����' })

    // ?? ���������Ӳ���ޣ�̽��Э�� + ����ʾ�� Agent ��������
    while (true) {
      round++

      // ������ �� ���� 30 ���Զ�����ժҪ�˳���LLM �����˻���Ȧ��
      if (round > 30) {
        this.logger.warn(`[ReAct] �ﵽ������ 30 �֣�ǿ������ժҪ�˳�`)
        onEvent({ type: 'observation', text: `?? �ﵽִ�����ޣ�30 �֣����Զ��ܽᲢ�˳�` })
        messages.push({
          role: 'system',
          content: `��ִ�� 30 �ֲ������������ü�������ܽ���ķ��ֺͽ��飬��Ҫ�������ù��ߡ�`,
        })
        try {
          const lastResult = await this.streamReActRound(
            this.trimHistoryByTokenBudget(messages), [], onEvent, abortSignal, preferredProviderCode,
          )
          const lastContent = lastResult.assistantContent || 'Agent �Ѵﵽִ�����ޣ���ˢ��ҳ�����¿�ʼ��'
          onEvent({ type: 'content', delta: lastContent })
          onEvent({ type: 'phase_end', phase: 'ReAct ����' })
          return { messages, content: lastContent, model: lastResult.model || '', provider: lastResult.provider || '', toolCalls: allToolCalls }
        } catch (e: unknown) {
          this.logger.warn(`[ReAct] 软上限摘要生成失败 ${round} 轮: ${(e as Error).message}`)
          const fallback = `Agent ִ���� ${round} �ֹ��ߵ��ú�ﵽ�����ޡ�\n����ɣ�\n` + allToolCalls.map(tc => `- ? ${tc.name}`).join('\n')
          return { messages, content: fallback, model: '', provider: '', toolCalls: allToolCalls }
        }
      }

      // ���� 3��token budget �ضϣ�1M context������������
      const trimmedMessages = this.trimHistoryByTokenBudget(messages)

      // ���� 4���û���ֹ
      if (abortSignal?.aborted) {
        onEvent({ type: 'observation', text: '?? �û���ֹ' })
        break
      }

      // ���� LLM ���ã�V1.3 ��ʽ������
      let streamResult: { assistantContent: string; reasoningContent: string; rawToolCalls: Array<{ id: string; type: string; function: { name: string; arguments: string } }> | null; model: string; provider: string }
      try {
        streamResult = await this.streamReActRound(trimmedMessages, tools, onEvent, abortSignal, preferredProviderCode)
      } catch (llmErr: unknown) {
        const errMsg = llmErr instanceof Error ? llmErr.message : String(llmErr)
        this.logger.error(`[ReAct] ��${round}�� LLM ����ʧ��: ${errMsg}`)
        if (allToolCalls.length > 0) break
        return { messages, content: `?? LLM ����ʧ�ܣ�${errMsg.substring(0, 200)}`, model: '', provider: '', toolCalls: allToolCalls }
      }

      const assistantContent = streamResult.assistantContent
      const reasoningContent = streamResult.reasoningContent
      let rawToolCalls = streamResult.rawToolCalls
      let hasToolCalls = rawToolCalls && rawToolCalls.length > 0

      // ���� 1��LLM ��Ȼ��ֹ
      if (!hasToolCalls) {
        // V1.3 ר������ �� ��� assistantContent �е� <invoke> XML ��ǩ����
        // �� LLM δ���� FC tool_calls �����ı���Ƕ���� <invoke> ����ʱ��
        // ͨ�� Action Guard ������ʽ������·���� XML����ȡ����
        const hasXmlInvoke = this.actionGuard.isEnabled() && assistantContent?.includes('<invoke')
        if (hasXmlInvoke) {
          const xmlActions = this.actionGuard.extractActions([
            { message: { content: assistantContent } },
          ])
          if (xmlActions.length > 0) {
            this.logger.log(`[ReAct] Action Guard �� XML ��ȡ ${xmlActions.length} ������`)
            const xmlAction = xmlActions[0]
            rawToolCalls = [{
              id: 'xml_' + Date.now(),
              type: 'function',
              function: { name: xmlAction.name, arguments: JSON.stringify(xmlAction.args) },
            }]
            hasToolCalls = true
            // �������ı�����·������������Ĺ���ִ�з�֧
          }
        }

        // XML ����û���� �� �����Ĵ��ı��ظ�
        if (!hasToolCalls) {
          // ������ assistant ��Ϣ push �� messages�����ı��ظ���
          if (assistantContent) {
            const sanitizedFinal = this.sanitizeContent(assistantContent)
            messages.push({ role: 'assistant', content: sanitizedFinal })
            onEvent({ type: 'content', delta: sanitizedFinal })
          }
          onEvent({ type: 'phase_end', phase: 'ReAct ����' })
          if (assistantContent) {
            return {
              messages,
              content: this.sanitizeContent(assistantContent),
              model: streamResult.model || '',
              provider: streamResult.provider || '',
              toolCalls: allToolCalls,
            }
          }
          // ������ʽ�������ջظ�
          onEvent({ type: 'phase_start', phase: '���ɻظ�' })
          const finalResult = await this.streamFinalResponse(messages, onEvent)
          onEvent({ type: 'phase_end', phase: '���ɻظ�' })
          return {
            messages,
            content: finalResult.content,
            model: finalResult.model,
            provider: finalResult.provider,
            toolCalls: allToolCalls,
          }
        }
      }

      // ���� ִ�е�һ�� tool_call ����
      const firstTc = rawToolCalls![0]
      const name = firstTc.function.name
      let args: Record<string, unknown> = {}
      try { args = JSON.parse(firstTc.function.arguments) } catch (e: unknown) {
        this.logger.warn(`[ReAct] args parse failed: ${firstTc.function.arguments?.substring(0, 100)}`, (e as Error).message)
      }

      this.logger.log(`[ReAct] ��${round}��: ${name}(${JSON.stringify(args).substring(0, 100)})`)

      // Thought �¼�
      if (reasoningContent) {
        onEvent({ type: 'thought', text: reasoningContent.substring(0, 300) })
      } else if (assistantContent?.trim()) {
        onEvent({ type: 'thought', text: assistantContent.trim().substring(0, 300) })
      }

      // ͨ�� ERDL_ACTION_GUARD=false ����������һ������
      if (this.actionGuard.isEnabled()) {
        const parsedAction: ParsedAction = {
          name, args, source: 'fc', rawToolCallId: firstTc.id,
        }
        const validationResult = this.actionGuard.validate(parsedAction)
        if (!validationResult.ok) {
          const errorMsg = validationResult.error || '����У��ʧ��'
          this.logger.warn(`[ReAct] Action Guard У��δͨ��: ${errorMsg}`)
          // У��ʧ�� �� ������� �� LLM ��һ������
          messages.push({ role: 'tool', content: `?? ${errorMsg}`, tool_call_id: firstTc.id })
          onEvent({ type: 'observation', text: `?? ${errorMsg}` })
          continue
        }
        if (validationResult.normalizedArgs) {
          args = validationResult.normalizedArgs
        }
      }

      // Push assistant ��Ϣ
      // DeepSeek thinking ģʽҪ�󣺶��ֶԻ��б��봫�� reasoning_content�����򷵻� 400
      const assistantMsg: ERDLLLMMessage = {
        role: 'assistant',
        content: assistantContent,
        tool_calls: [{
          id: firstTc.id,
          type: 'function',
          function: { name, arguments: JSON.stringify(args) },
        }],
      }
      if (reasoningContent) {
        assistantMsg.reasoning_content = reasoningContent
      }
      messages.push(assistantMsg)

      // ���� ִ�й��� ����
      onEvent({ type: 'tool_start', tool: name, args })
      const startMs = Date.now()
      let toolResult: string
      try {
        toolResult = await toolExecutor(name, args)
      } catch (e: unknown) {
        toolResult = `����ִ��ʧ��: ${(e as Error).message}`
      }

      // ��ʱѹ��
      toolResult = this.compressToolResult(toolResult, name)

      const durationMs = Date.now() - startMs
      const firstLine = toolResult.split('\n')[0]?.trim() || toolResult
      onEvent({ type: 'observation', text: firstLine.substring(0, 80) })
      onEvent({ type: 'tool_end', tool: name, result: toolResult.substring(0, 500), durationMs })

      allToolCalls.push({ name, args })
      messages.push({ role: 'tool', content: toolResult, tool_call_id: firstTc.id })

      // �����¼�
      onEvent({ type: 'round_done' as const, hasToolCalls: true, toolName: name })
    }

    // �����ߴ�� �� ����ժҪ
    onEvent({ type: 'phase_end', phase: 'ReAct ����' })
    const summary = `Agent ִ���� ${round} �ֹ��ߵ��ú�ֹͣ��\n����ɣ�\n` +
      allToolCalls.map(tc => `- ? ${tc.name}(${JSON.stringify(tc.args).substring(0, 60)})`).join('\n')
    return { messages, content: summary, model: '', provider: '', toolCalls: allToolCalls }
  }

  /** H17: ���߽����ʱѹ����Level 1��Լ 800 tokens / 3200 �ַ��� */
  private compressToolResult(result: string, toolName?: string): string {
    // file_edit/git_diff �� ���� 200 ��ʱ�ضϱ���ͷβ������ context ˲�����ͣ�
    if (toolName === 'file_edit' || toolName === 'git_diff') {
      const lines = result.split('\n')
      if (lines.length > 200) {
        const head = lines.slice(0, 80).join('\n')
        const tail = lines.slice(-40).join('\n')
        return `${head}\n\n... [${lines.length - 120} ����ʡ�ԣ��� ${lines.length} ��] ...\n\n${tail}`
      }
      return result
    }

    const MAX_CHARS = 3200
    if (result.length <= MAX_CHARS) return result

    // �����ļ�������ͷ�� + β��
    const lines = result.split('\n')
    if (lines.length > 50) {
      const head = lines.slice(0, 20).join('\n')
      const tail = lines.slice(-15).join('\n')
      return `${head}\n\n... [�м�ضϣ��� ${lines.length} �У�${result.length} �ַ�] ...\n\n${tail}`
    }

    // ��ͨ���ı�����ȡͷβ
    return result.substring(0, 1600) + `\n\n... [�ضϣ��� ${result.length} �ַ�] ...\n\n` + result.substring(result.length - 800)
  }

  /** H17: Token budget �ض� history���ֹ���1���ġ�2 tokens��1Ӣ�ġ�4 tokens�� */
  private trimHistoryByTokenBudget(messages: ERDLLLMMessage[]): ERDLLLMMessage[] {
    const provider = getDefaultProvider()
    const modelDef = provider?.models?.find((m: ERDLModelDefinition) => m.id === provider.defaultModel)
    // DeepSeek V4 ��� 1M��ʵ����Ч ~200K���ñ���ֵ���� API �� context overflow ����
    const CONTEXT_LIMIT = Math.min(modelDef?.contextWindow || 1_000_000, 200_000)
    const OUTPUT_RESERVE = 8192  // Henryԭ�򣺲�����
    const SAFETY_MARGIN = 2000
    const budget = CONTEXT_LIMIT - OUTPUT_RESERVE - SAFETY_MARGIN

    // ����ÿ����Ϣ�� token ��
    const estimateTokens = (msg: ERDLLLMMessage): number => {
      const content = msg.content || ''
      // �����ַ� �� 2x token������ �� 4x token������ȡ 3
      return Math.ceil(content.length / 3)
    }

    // System prompt ���ܽض�
    const systemMsg = messages.find(m => m.role === 'system')
    const sysTokens = systemMsg ? estimateTokens(systemMsg) : 0
    let remaining = budget - sysTokens

    // �Ӻ���ǰȡ������������Ϣ��
    const nonSystem = messages.filter(m => m.role !== 'system')
    const kept: ERDLLLMMessage[] = []

    // ʼ�ձ��� user ��Ϣ
    let userMsg: ERDLLLMMessage | undefined
    for (let i = nonSystem.length - 1; i >= 0; i--) {
      if (nonSystem[i].role === 'user') { userMsg = nonSystem[i]; break }
    }
    if (userMsg) {
      const userTokens = estimateTokens(userMsg)
      remaining -= userTokens
      kept.unshift(userMsg)
    }

    // ��������ǰȡ assistant/tool �ԣ�ֱ������ budget
    const pairs: ERDLLLMMessage[] = []
    for (let i = nonSystem.length - 1; i >= 0; i--) {
      const msg = nonSystem[i]
      if (msg === userMsg) continue
      const t = estimateTokens(msg)
      if (remaining - t < 0 && pairs.length >= 4) break  // ���ٱ��� 2 �������Ի�
      remaining -= t
      pairs.unshift(msg)
    }

    // ������� budget����ǰ�����ժҪ
    const skipped = nonSystem.length - pairs.length - (userMsg ? 1 : 0)
    const result: ERDLLLMMessage[] = [systemMsg].filter(Boolean) as ERDLLLMMessage[]
    if (skipped > 0) {
      result.push({
        role: 'system',
        content: `[��ʷ����ժҪ] ǰ����ִ�� ${Math.ceil(skipped / 2)} �����ߵ��ã������ʡ���Խ�ʡ�����ģ�������������ĶԻ���`,
      })
    }
    if (userMsg) result.push(userMsg)
    result.push(...pairs)

    return result
  }

  /** H17: LLM ������ࣨ�û��Ѻã� */
  private classifyLLMError(msg: string): string {
    const lower = msg.toLowerCase()
    if (lower.includes('timeout') || lower.includes('etimedout')) return '?? LLM ��Ӧ��ʱ�����Ժ�����'
    if (lower.includes('econnrefused') || lower.includes('enotfound')) return '? �޷����� LLM ������������'
    if (lower.includes('401') || lower.includes('403') || lower.includes('unauthorized')) return '? API Key �쳣������ϵ����Ա'
    if (lower.includes('429') || lower.includes('rate limit')) return '? �������Ƶ������ȴ� 30 ��'
    return `?? LLM �����쳣��${msg.substring(0, 100)}`
  }

  /**
   * ���� DeepSeek thinking ģʽй¶�� content �е��ڲ���ǡ�
   *
   * DeepSeek �� thinking ģʽ�£���ʱ���� content �ֶ��л��룺
   * - DSML ���ߵ��ñ�ǣ�<����DSML����tool_calls>...<����DSML����/tool_calls>
   * - DSML invoke ��ǣ�<����DSML����invoke>...<����DSML����/invoke>
   * - �����ڲ���������
   * ��Щ��ǲ�Ӧ�������û��ɼ�������С�
   */
  public sanitizeContent(text: string): string {
    return this.sseHandler.sanitizeContent(text)
  }

  /**
   * ��ʽ ReAct ����������SSE���� V1.3
   *
   * ��� queryWithFailover �� ReAct ��ѭ���е� 2 �����ã�
   * ʵ��˼ά���� token ���� + ���Ĵ��ֻ� + tool_calls ����ƴ�ӡ�
   *
   * Failover ���ԣ����ӽ׶γ��� primary Provider��HTTP �� 200 ʱ�л���
   * ��ʽ���������л��������ظ� token �ɱ�����
   */
  public async streamReActRound(
    messages: ERDLLLMMessage[],
    tools: ERDLLMTool[],
    onEvent: (e: import('../../eros/stream/stream-event.types').StreamEvent) => void,
    abortSignal?: AbortSignal,
    preferredProviderCode?: string,
  ): Promise<{
    assistantContent: string
    reasoningContent: string
    rawToolCalls: Array<{ id: string; type: string; function: { name: string; arguments: string } }> | null
    model: string
    provider: string
  }> {
    return this.sseHandler.streamReActRound(messages, tools, onEvent, abortSignal, preferredProviderCode)
  }
  /**
   * ��ʽ�������ջظ���SSE��
   */
  public async streamFinalResponse(
    messages: ERDLLLMMessage[],
    onEvent: (e: import('../../eros/stream/stream-event.types').StreamEvent) => void,
    tools?: ERDLLMTool[],  // H15-Ext: ���������ջظ����м������ù���
  ): Promise<{ content: string; model: string; provider: string }> {
    return this.sseHandler.streamFinalResponse(messages, onEvent, tools)
  }
  // ==========================================
  // �Ƽ� API
  // ==========================================

  /**
   * �����Ƽ�����
   */
  async recommendGlasses(params: RecommendParams): Promise<RecommendResult> {
    const query = this.promptBuilder.buildRecommendQuery(params)
    const response = await this.queryLLM(query, ['ProductSpu', 'ProductSku'])

    return {
      recommendation: response,
      reasoning: '���� ERDL �������Ʒ�ṹ + Ч����֪ʶ������',
    }
  }

  // ==========================================
  // System Prompt ����
  // ==========================================

  /**
   * ���� ERDL ע��� System Prompt
   */
  buildSystemPrompt(query: string, entityTypes?: string[]): string {
    return this.promptBuilder.buildSystemPrompt(query, entityTypes);
  }

  /**
   * Live-ERDL V1.2: ��������ӳ�� Prompt Ƭ��
   * �� Registry �ж�ȡ���� alias��ע�� LLM �� system prompt
   */
  public buildAliasContext(entities: EntityRegistration[]): string {
    return this.promptBuilder.buildAliasContext(entities);
  }

  // ==========================================
  // Provider ͳ��
  // ==========================================

  /** ��ȡ��ǰ���� Provider �б� */
  getAvailableProviders(): { id: string; name: string; models: string[] }[] {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAvailableProviders } = require('./erdl-llm-providers')
    return getAvailableProviders().map((p: ERDLLLMProvider) => ({
      id: p.id,
      name: p.name,
      models: p.models.map((m: ERDLModelDefinition) => m.id),
    }))
  }

  /** ��ȡĬ�� Provider */
  getDefaultProviderId(): string | undefined {
    return getDefaultProvider()?.id
  }

  private async resolveKeyFromDB(providerId: string): Promise<string | undefined> {
    if (!this.modelRegistry) return undefined
    try {
      const kd = await (this.modelRegistry as { getKeyWithDecrypted?: (providerId: string) => Promise<{ apiKey?: string }> }).getKeyWithDecrypted?.(providerId)
      if (kd?.apiKey) {
        this.logger.log(`API Key resolved from DB: ${providerId}`)
        return kd.apiKey
      }
    } catch (e: unknown) {
      this.logger.debug(`DB key lookup failed for ${providerId}: ${(e as Error).message}`)
    }
    return undefined
  }

  // ==========================================
  // ˽�з���
  /** ���õ��� Provider��ԭ�� https.request���ƹ� axios 400�� */
  private async callProvider(
    provider: ERDLLLMProvider,
    request: ERDLLLMRequest,
  ): Promise<ERDLLLMResponse> {
    const apiKey = process.env[provider.apiKeyEnv]
      || (await this.resolveKeyFromDB(provider.id))
    if (!apiKey) throw new Error('API key not set: '+provider.apiKeyEnv)
    const modelId = request.model || provider.defaultModel
    const model = provider.models.find(m => m.id === modelId)
    if (!model) throw new Error('Model '+modelId+' not found')
    const startTime = Date.now()
    const body: Record<string, unknown> = {
      model: modelId,
      messages: request.messages.map((m: ERDLLLMMessage) => {
        const msg: Record<string, unknown> = { role: m.role, content: m.content }
        if (m.tool_calls) msg.tool_calls = m.tool_calls
        if (m.tool_call_id) msg.tool_call_id = m.tool_call_id
        // DeepSeek thinking ģʽҪ�󴫻� reasoning_content
        if (m.reasoning_content) msg.reasoning_content = m.reasoning_content
        return msg
      }),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? model.maxTokens,
      
    }
    if (request.tools && request.tools.length) {
      body.tools = request.tools
      body.tool_choice = request.toolChoice || 'required'
    }
    const requestBody = JSON.stringify(body)
    const url = new URL(provider.baseUrl + '/chat/completions')
    const headers = { ...provider.buildHeaders(apiKey), 'Content-Length': String(Buffer.byteLength(requestBody)) }
    return new Promise((resolve, reject) => {
      const transport = url.protocol === 'https:' ? https : http
      const req = transport.request(url, { method: 'POST', headers }, (res) => {
        let data = ''
        res.on('data', c => data += c)
        res.on('end', () => {
          if (res.statusCode !== 200) return reject(new Error(provider.id+' '+res.statusCode+': '+data.substring(0,300)))
          try {
            const json = JSON.parse(data)
            const cost = ((json.usage?.prompt_tokens||0)/1_000_000)*(model.cost?.input||0) + ((json.usage?.completion_tokens||0)/1_000_000)*(model.cost?.output||0)
            const usage: ERDLLLMUsage = {
              promptTokens: json.usage?.prompt_tokens || 0,
              completionTokens: json.usage?.completion_tokens || 0,
              totalTokens: json.usage?.total_tokens || 0,
              estimatedCost: cost,
            }
            const durationMs = Date.now() - startTime
            this.logger.log('[LLM] '+provider.id+'/'+modelId+' -- '+usage.totalTokens+' tokens, '+cost.toFixed(4)+', '+durationMs+'ms')
            resolve({ content: json.choices?.[0]?.message?.content||'', model: modelId, usage, rawChoices: json.choices } as ERDLLLMResponse)
          } catch(e) { reject(new Error('JSON parse failed: '+e)) }
        })
      })
      req.on('error', reject)
      req.setTimeout(60000, () => { req.destroy(); reject(new Error('LLM request timeout (60s)')) })
      req.write(requestBody)
      req.end()
    })
  }

  public buildRecommendQuery(params: RecommendParams): string {
    return this.promptBuilder.buildRecommendQuery(params);
  }

  public entityToPrompt(entity: EntityRegistration): string {
    return this.promptBuilder.entityToPrompt(entity);
  }

  public entityToTable(entity: EntityRegistration): Record<string, unknown> {
    return this.promptBuilder.entityToTable(entity);
  }

  /** ���Ž�����LLM �쳣ʱ�����ۻ��Ĺ��߽�����ɻظ� */
  public buildGracefulErrorResponse(
    allToolCalls: Array<{ name: string; args: Record<string, unknown> }>,
    error: string,
    round: number,
  ): string {
    return this.promptBuilder.buildGracefulErrorResponse(allToolCalls, error, round);
  }
}