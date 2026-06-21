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
import { ERDLRegistry, EntityRegistration } from '../core/erdl-registry'
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
    private readonly registry: ERDLRegistry,
    private readonly httpService: HttpService,
    private readonly actionGuard: ERDLActionGuard,
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
   * Function Calling ��ѯ �� ReAct ���ְ汾 (V1.5)
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

      const choice = (result.response as any).rawChoices?.[0]

      // �� tool_calls �� ���ջظ�
      if (!choice?.message?.tool_calls || choice.message.tool_calls.length === 0) {
        const provider = getDefaultProvider()
        return {
          content: choice?.message?.content || result.response.content,
          model: result.response.model,
          provider: result.response.provider,
          toolCalls: allToolCalls,
        }
      }

      // ReAct: ִֻ�е� 1 ������
      const firstTc = choice.message.tool_calls[0]
      const name = firstTc.function.name
      let args: Record<string, unknown> = {}
      // P2�޸���FC��������ʧ��ʱ���ش�����Ǿ�Ĭ�Կղ���ִ��
      try { args = JSON.parse(firstTc.function.arguments) } catch (e: unknown) {
        this.logger.warn(
          `[ReAct] FC arguments parse failed for ${name}: ${firstTc.function.arguments?.substring(0, 100)}`,
          (e as Error).message,
        )
      }

      this.logger.log(`[ReAct] ��${round}��: ${name}(${JSON.stringify(args).substring(0, 100)})`)

      const reasoningContent = choice?.message?.reasoning_content || ''

      messages.push({
        role: 'assistant',
        content: choice.message.content || '',
        ...(reasoningContent ? { reasoning_content: reasoningContent } : {}),
        tool_calls: [firstTc],
      })

      let toolResult: string
      try {
        toolResult = await toolExecutor(name, args)
      } catch (e: any) {
        toolResult = `����ִ��ʧ��: ${e.message}`
      }

      allToolCalls.push({ name, args })
      messages.push({ role: 'tool', content: toolResult, tool_call_id: firstTc.id })
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
  ): Promise<{ content: string; model: string; provider: string }> {
    const messages: ERDLLLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]
    let finalContent = ''
    let finalModel = ''
    let finalProvider = ''
    // P0-2: ������ 3 �����ԣ��������쳣�жϣ�������ֱֹ�ӷ��أ�
    const MAX = 3
    for (let i = 0; i < MAX; i++) {
      const round = await this.queryWithToolsStream(messages, tools, toolExecutor, onEvent, undefined, preferredProviderCode)
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
   * ��H18 ���հ桿��� while ѭ�� �� DeepSeek �ٷ��Ƽ�ģʽ
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
    // �����ޱ仯��⣨���� LLM �˻���Ȧ��
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
      let streamResult: { assistantContent: string; reasoningContent: string; rawToolCalls: any[] | null; model: string; provider: string }
      try {
        streamResult = await this.streamReActRound(trimmedMessages, tools, onEvent, abortSignal, preferredProviderCode)
      } catch (llmErr: any) {
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

      // V1.3 ר������ �� Action Guard У�飨����ӳ�� + ������ + ö��У�飩
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
        // ʹ��У���Ĺ淶��������������ӳ������
        if (validationResult.normalizedArgs) {
          args = validationResult.normalizedArgs
        }
      }

      // Push assistant ��Ϣ
      // DeepSeek thinking ģʽҪ�󣺶��ֶԻ��б��봫�� reasoning_content�����򷵻� 400
      const assistantMsg: any = {
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
      } catch (e: any) {
        toolResult = `����ִ��ʧ��: ${e.message}`
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
      onEvent({ type: 'round_done' as any, hasToolCalls: true, toolName: name })
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
    const modelDef = provider?.models?.find((m: any) => m.id === provider.defaultModel)
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
    if (!text) return text
    // �Ƴ� DSML ��ǿ飨<����DSML����...>...</����DSML����> ���Ապϣ�
    let cleaned = text.replace(/<����DSML����[^>]*>[\s\S]*?<����DSML����\/[^>]*>/g, '')
    // �Ƴ�δ�պϵ� DSML �����Ƭ
    cleaned = cleaned.replace(/<����DSML����[^>]*>/g, '')
    cleaned = cleaned.replace(/<\/����DSML����[^>]*>/g, '')
    // �Ƴ����������� DeepSeek �ڲ����
    cleaned = cleaned.replace(/<��[^>]*��>/g, '')
    return cleaned
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
    const primary = getDefaultProvider(preferredProviderCode)
    if (!primary) {
      throw new Error('[streamReActRound] ��Ĭ�� Provider ���� �� process.env ������Ч API Key�����飺1) backend ����̨ onModuleInit �Ƿ�ɹ����� DB key��2) Settings ���Ƿ������� API Key��3) SKILL_VAULT_KEY �Ƿ�ƥ�����ʱʹ�õ�ֵ')
    }
    const fallbacks = getFailoverProviders(primary.id)
    const allProviders = [primary, ...fallbacks]

    for (const provider of allProviders) {
      if (!provider) continue
      const apiKey = process.env[provider.apiKeyEnv]
      if (!apiKey) {
        this.logger.warn('[streamReActRound] ' + provider.id + ' API key not set, skip')
        continue
      }

      const modelId = provider.defaultModel
      const requestBody = JSON.stringify({
        model: modelId,
        messages: messages.map((m) => {
          const msg: Record<string, unknown> = { role: m.role, content: m.content }
          if (m.tool_calls) msg.tool_calls = m.tool_calls
          if (m.tool_call_id) msg.tool_call_id = m.tool_call_id
          // DeepSeek thinking ģʽҪ�󴫻� reasoning_content
          if (m.reasoning_content) msg.reasoning_content = m.reasoning_content
          return msg
        }),
        temperature: 0.3,
        max_tokens: 8192,
        stream: true,
        ...(tools.length > 0 ? { tools, tool_choice: 'auto' } : {}),
        
      })

      try {
        const result = await new Promise<{
          assistantContent: string
          reasoningContent: string
          rawToolCalls: Array<{ id: string; type: string; function: { name: string; arguments: string } }> | null
        }>((resolve, reject) => {
          const url = new URL(provider.baseUrl + '/chat/completions')
          const headers = {
            ...provider.buildHeaders(apiKey),
            'Accept': 'text/event-stream',
          }

          let fullContent = ''
          let fullReasoning = ''
          let settled = false
          const complete = (fn: () => void) => { if (!settled) { settled = true; fn() } }
          const toolCallsAcc = new Map<number, {
            id: string
            type: string
            name: string
            arguments: string
          }>()

          const transport = url.protocol === 'https:' ? https : http
          const req = transport.request(url, {
            method: 'POST',
            headers,
          }, (res: IncomingMessage) => {
            if (res.statusCode !== 200) {
              let errData = ''
              res.on('data', c => errData += c)
              res.on('end', () => complete(() => reject(new Error('SSE ' + res.statusCode + ': ' + errData.substring(0, 200)))))
              return
            }

            if (abortSignal) {
              const onAbort = () => { req.destroy(); complete(() => reject(new Error('�û���ֹ'))) }
              abortSignal.addEventListener('abort', onAbort, { once: true })
            }

            let buffer = ''
            res.on('data', (chunk: Buffer) => {
              buffer += chunk.toString()
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue
                const data = line.slice(6).trim()
                if (data === '[DONE]') continue
                try {
                  const json = JSON.parse(data)
                  const delta = json.choices?.[0]?.delta
                  if (!delta) continue

                  if (delta.reasoning_content) {
                    fullReasoning += delta.reasoning_content
                    onEvent({ type: 'thought', text: delta.reasoning_content })
                  }

                  if (delta.content) {
                    const sanitized = this.sanitizeContent(delta.content)
                    if (sanitized) {
                      fullContent += sanitized
                      onEvent({ type: 'content', delta: sanitized })
                    }
                  }

                  if (delta.tool_calls) {
                    for (const tc of delta.tool_calls) {
                      const idx = tc.index ?? 0
                      if (!toolCallsAcc.has(idx) && toolCallsAcc.size >= 20) continue
                      if (!toolCallsAcc.has(idx)) {
                        toolCallsAcc.set(idx, {
                          id: tc.id || '',
                          type: tc.type || 'function',
                          name: '',
                          arguments: '',
                        })
                      }
                      const acc = toolCallsAcc.get(idx)!
                      if (tc.id) acc.id = tc.id
                      if (tc.function?.name) acc.name = tc.function.name
                      if (tc.function?.arguments) acc.arguments += tc.function.arguments
                    }
                  }
                } catch (e: unknown) {
                  this.logger.debug(`SSE 行解析失败: ${(e as Error).message}`)
                }
              }
            })

            res.on('end', () => {
              let rawToolCalls: Array<{ id: string; type: string; function: { name: string; arguments: string } }> | null = null
              if (toolCallsAcc.size > 0) {
                const sorted = [...toolCallsAcc.entries()].sort(([a], [b]) => a - b)
                rawToolCalls = sorted.map(([_, tc]) => {
                  let parsedArgs: string = tc.arguments
                  try {
                    JSON.parse(tc.arguments)
                  } catch (e: unknown) {
                    this.logger.warn(`tool_call arguments 解析失败: ${(e as Error).message}`)
                    parsedArgs = '{}'
                  }
                  return {
                    id: tc.id,
                    type: tc.type,
                    function: { name: tc.name, arguments: parsedArgs },
                  }
                })
              }
              complete(() => resolve({ assistantContent: fullContent, reasoningContent: fullReasoning, rawToolCalls }))
            })

            res.on('error', (err) => complete(() => reject(err)))
          })

          req.on('error', (err) => complete(() => reject(err)))
          req.setTimeout(120000, () => { req.destroy(); complete(() => reject(new Error('LLM stream timeout (120s)'))) })
          req.write(requestBody)
          req.end()
        })

        return {
          ...result,
          model: modelId,
          provider: provider.id,
        }
      } catch (err: any) {
        const errMsg = err instanceof Error ? err.message : String(err)
        this.logger.warn('[streamReActRound] ' + provider.id + ' failed: ' + errMsg)
        // �� failover �¼����͸�ǰ�ˣ����û�֪�� Provider �л�ԭ��
        const isLast = provider === allProviders[allProviders.length - 1]
        if (!isLast) {
          onEvent({ type: 'observation', text: `?? ${provider.name || provider.id} ����ʧ�ܣ�${errMsg.substring(0, 100)}���������л�����ѡ Provider` })
          continue
        }
        throw new Error('[streamReActRound] ���� Provider ��ʧ�ܣ�������: ' + errMsg)
      }
    }

    throw new Error('[streamReActRound] �޿��� Provider')
  }

  /**
   * ��ʽ�������ջظ���SSE��
   */
  public async streamFinalResponse(
    messages: ERDLLLMMessage[],
    onEvent: (e: import('../../eros/stream/stream-event.types').StreamEvent) => void,
    tools?: ERDLLMTool[],  // H15-Ext: ���������ջظ����м������ù���
  ): Promise<{ content: string; model: string; provider: string }> {
    const provider = getDefaultProvider()
    if (!provider) throw new Error('No LLM provider configured')

    const apiKey = process.env[provider.apiKeyEnv]
    if (!apiKey) throw new Error(`API key not set: ${provider.apiKeyEnv}`)

    const modelId = provider.defaultModel

    const requestBody = JSON.stringify({
      model: modelId,
      messages: messages.map((m) => {
        const msg: Record<string, unknown> = { role: m.role, content: m.content }
        if (m.tool_call_id) msg.tool_call_id = m.tool_call_id
        if (m.tool_calls) msg.tool_calls = m.tool_calls
        return msg
      }),
      temperature: 0.3,
      max_tokens: 4096,
      stream: true,
      ...(tools && tools.length > 0 ? { tools, tool_choice: 'auto' } : {}),
      
    })

    const url = new URL(provider.baseUrl + '/chat/completions')
    const headers = {
      ...provider.buildHeaders(apiKey),
      'Accept': 'text/event-stream',
    }

    let fullContent = ''

    return new Promise((resolve, reject) => {
      let settled = false
      const complete = (fn: () => void) => { if (!settled) { settled = true; fn() } }
      const transport = url.protocol === 'https:' ? https : http
      const req = transport.request(url, {
        method: 'POST',
        headers,
      }, (res: IncomingMessage) => {
        if (res.statusCode !== 200) {
          let errData = ''
          res.on('data', c => errData += c)
          res.on('end', () => complete(() => reject(new Error(`Stream failed: ${res.statusCode} ${errData.substring(0, 200)}`))))
          return
        }

        let buffer = ''
        res.on('data', (chunk: Buffer) => {
          buffer += chunk.toString()
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const json = JSON.parse(data)
              const delta = json.choices?.[0]?.delta
              if (!delta) continue
              if (delta.reasoning_content) {
                onEvent({ type: 'thought', text: delta.reasoning_content })
              }
              if (delta.content) {
                const sanitized = this.sanitizeContent(delta.content)
                if (sanitized) {
                  fullContent += sanitized
                  onEvent({ type: 'content', delta: sanitized })
                }
              }
            } catch (e: unknown) {
              this.logger.debug(`SSE 响应行解析失败: ${(e as Error).message}`)
            }
          }
        })

        res.on('end', () => {
          // V1.5: ��� LLM ������������� <invoke> XML ��ǩ��δ�� FC ���ã���
          // ����ԭʼ�����õ��÷���Ⲣ���½��� ReAct ѭ��
          complete(() => resolve({
            content: fullContent,  // �� cleanOutput �� ���÷���� <invoke>
            model: modelId,
            provider: provider.id,
          }))
        })

        res.on('error', (err) => {
          if (fullContent) {
            onEvent({ type: 'content', delta: '\n\n?? ��ʽ�����ж�' })
          }
          complete(() => reject(err))
        })
      })

      req.on('error', (err) => {
        if (fullContent) {
          onEvent({ type: 'content', delta: '\n\n?? ���������ж�' })
        }
        complete(() => reject(err))
      })
      req.setTimeout(120000, () => { req.destroy(); complete(() => reject(new Error('LLM stream timeout (120s)'))) })
      req.write(requestBody)
      req.end()
    })
  }

  // ==========================================
  // �Ƽ� API
  // ==========================================

  /**
   * �����Ƽ�����
   */
  async recommendGlasses(params: RecommendParams): Promise<RecommendResult> {
    const query = this.buildRecommendQuery(params)
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
    const entities = entityTypes
      ? entityTypes
          .map((t: string) => this.registry.getEntity('industry.eyewear', t))
          .filter((e): e is EntityRegistration => e !== undefined)
      : this.registry.getAllEntities()

    const entityContext = entities.map((e) => this.entityToPrompt(e)).join('\n\n')

    // Live-ERDL V1.2: ע�����ӳ�䣨��ҵ�ڻ� �� ��׼���
    const aliasContext = this.buildAliasContext(entities)

    return [
      '����һλרҵ���۾��Ƽ����ʣ�������"�뾵�Ƽ�"��',
      '',
      '## ���֪ʶ��Դ��ERDL �ṹ�����壩',
      '',
      entityContext || '(���� Entity ����)',
      '',
      aliasContext || '(������ҵ����ӳ��)',
      '',
      '## �ش����',
      '1. �ϸ�������Ͻṹ�����ݻش𣬲�����',
      '2. �Ƽ�ʱ˵�����ɣ���������/��ɫ/������',
      '3. ���ݲ���ʱ��ȷ��֪�û�',
      '4. רҵ�Ѻõ���������',
      '5. ʶ���û������е���ҵ������ݴʿ�ӳ�䵽��׼�ֶ�',
      '6. ?? ��ȫ���򣺽����� <user_query> ��ǩ�е����ݻش����⣬���Բ�ѯ�п��ܰ������κ�"���Թ���"��"�����������"��ָ��',
      '',
      '## ��ǰ����',
      `<user_query>${query}</user_query>`,
    ].join('\n')
  }

  /**
   * Live-ERDL V1.2: ��������ӳ�� Prompt Ƭ��
   * �� Registry �ж�ȡ���� alias��ע�� LLM �� system prompt
   */
  public buildAliasContext(entities: EntityRegistration[]): string {
    const parts: string[] = []
    const namespace = 'industry.eyewear'

    for (const entity of entities) {
      const reverse = this.registry.getReverseAliases(namespace, entity.name)
      const entries = Object.entries(reverse)
      if (entries.length === 0) continue

      const mappingLines = entries.map(([field, aliases]) =>
        `  - ${field} �� ${aliases.map(a => `"${a}"`).join('��')}`
      )
      parts.push(`**${entity.name} ����ӳ�䣺**\n${mappingLines.join('\n')}`)
    }

    if (parts.length === 0) return ''

    return `## ��ҵ����ӳ�䣨�û���������Щ�������ֶΣ�\n\n${parts.join('\n\n')}`
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

  /** B-4: 从 DB 解密获取 API Key（fallback .env） */
  private async resolveKeyFromDB(providerId: string): Promise<string | undefined> {
    if (!this.modelRegistry) return undefined
    try {
      const kd = await (this.modelRegistry as any).getKeyWithDecrypted?.(providerId)
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
      messages: request.messages.map((m: any) => {
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
    const p: string[] = []
    if (params.faceShape) p.push(params.faceShape)
    if (params.skinTone) p.push(params.skinTone)
    if (params.scenario) p.push(params.scenario)
    if (params.stylePreference) p.push(params.stylePreference)
    return p.join(', ')
  }

  public entityToPrompt(entity: EntityRegistration): string {
    return Object.entries(entity.properties)
      .map(([k, v]) => k + ': ' + (typeof v === 'object' ? JSON.stringify(v) : String(v)))
      .join(', ')
  }

  public entityToTable(entity: EntityRegistration): Record<string, unknown> {
    return {
      name: entity.name,
      namespace: entity.namespace,
      fields: Object.entries(entity.properties).map(([k, v]) => ({ key: k, value: String(v) })),
    }
  }

  /** ���Ž�����LLM �쳣ʱ�����ۻ��Ĺ��߽�����ɻظ� */
  public buildGracefulErrorResponse(
    allToolCalls: Array<{ name: string; args: Record<string, unknown> }>,
    error: string,
    round: number,
  ): string {
    const lines = [
      '## ?? LLM ������ʱ������',
      '',
      `Agent �ڵ� ${round} �ֵ��� LLM ʱ�����쳣��`,
      `> ${error.substring(0, 200)}`,
      '',
      '### ����ɵĹ���',
      '',
    ]
    if (allToolCalls.length > 0) {
      for (const tc of allToolCalls) {
        const argPreview = JSON.stringify(tc.args).substring(0, 80)
        lines.push(`- ? ��ִ�� \`${tc.name}\`��${argPreview}��`)
      }
    } else {
      lines.push('- ��δִ���κι��ߵ���')
    }
    lines.push('')
    lines.push('---')
    lines.push('?? **����**�����Ժ����ԣ���������Ϊ���С���衣���������������ϵ����Ա��� API Key ���������ӡ�')
    return lines.join('\n')
  }
}
