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

  // ═══════════════════════════════════════════
  // DSML 标记过滤
  // ═══════════════════════════════════════════

  sanitizeContent(text: string): string {
    if (!text) return text
    // 移除 DSML 标记块
    let cleaned = text.replace(/<þþDSMLþþ[^>]*>[\s\S]*?<þþDSMLþþ\/[^>]*>/g, '')
    // 移除未闭合的 DSML 标记碎片
    cleaned = cleaned.replace(/<þþDSMLþþ[^>]*>/g, '')
    cleaned = cleaned.replace(/<\/þþDSMLþþ[^>]*>/g, '')
    // 移除其他可能的 DeepSeek 内部标记
    cleaned = cleaned.replace(/<�[^>]*�>/g, '')
    return cleaned
  }

  // ═══════════════════════════════════════════
  // 流式 ReAct 单轮推理（SSE）
  // ═══════════════════════════════════════════

  async streamReActRound(
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
  }> {
    const primary = getDefaultProvider(preferredProviderCode)
    if (!primary) {
      throw new Error('[streamReActRound] 无法获取默认 Provider — 请检查 process.env 中是否有有效的 API Key')
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
              const onAbort = () => { req.destroy(); complete(() => reject(new Error('用户中止'))) }
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
                  this.logger.debug('SSE line parse failed: ' + String((e as Error).message))
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
                    this.logger.warn('tool_call arguments parse failed: ' + String((e as Error).message))
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
      } undefined {
        const errMsg = err instanceof Error ? err.message : String(err)
        this.logger.warn('[streamReActRound] ' + provider.id + ' failed: ' + errMsg)
        const isLast = provider === allProviders[allProviders.length - 1]
        if (!isLast) {
          onEvent({ type: 'observation', text: '🔄 ' + (provider.name || provider.id) + ' 调用失败(' + errMsg.substring(0, 100) + ')，正在切换到备选 Provider' })
          continue
        }
        throw new Error('[streamReActRound] 所有 Provider 均失败，最后错误: ' + errMsg)
      }
    }

    throw new Error('[streamReActRound] 无可用的 Provider')
  }

  // ═══════════════════════════════════════════
  // 流式最终回复（无工具调用）
  // ═══════════════════════════════════════════

  async streamFinalResponse(
    messages: ERDLLLMMessage[],
    onEvent: (e: StreamEvent) => void,
    tools?: ERDLLMTool[],
  ): Promise<{ content: string; model: string; provider: string }> {
    const provider = getDefaultProvider()
    if (!provider) throw new Error('No LLM provider configured')

    const apiKey = process.env[provider.apiKeyEnv]
    if (!apiKey) throw new Error('API key not set: ' + provider.apiKeyEnv)

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
          res.on('end', () => complete(() => reject(new Error('Stream failed: ' + res.statusCode + ' ' + errData.substring(0, 200)))))
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
              this.logger.debug('SSE response line parse failed: ' + String((e as Error).message))
            }
          }
        })

        res.on('end', () => {
          complete(() => resolve({
            content: fullContent,
            model: modelId,
            provider: provider.id,
          }))
        })

        res.on('error', (err) => {
          if (fullContent) {
            onEvent({ type: 'content', delta: '\n\n[流式响应中断]' })
          }
          complete(() => reject(err))
        })
      })

      req.on('error', (err) => {
        if (fullContent) {
          onEvent({ type: 'content', delta: '\n\n[网络连接中断]' })
        }
        complete(() => reject(err))
      })
      req.setTimeout(120000, () => { req.destroy(); complete(() => reject(new Error('LLM stream timeout (120s)'))) })
      req.write(requestBody)
      req.end()
    })
  }
}
