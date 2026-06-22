/**
 * 秒镜 AI-BOS · ToolRegistry → Agent 桥接服务
 *
 * @file 将 ERP 层 ToolRegistry 的工具定义转换为 LLM Function Calling 格式
 *       让 Agent 自动感知所有已注册的 Tool
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-19
 */

import { Injectable, Logger } from '@nestjs/common'
import { ToolRegistry } from '../../tool-registry/tool-registry.service'
import { ToolDefinition, ToolContext } from '../../tool-registry/types/tool.interface'
import type { ERDLLMTool } from '../../erdl/llm/erdl-llm-provider.interface'
import type { ToolExecutor } from './agent-tool-registry'

@Injectable()
export class ToolRegistryBridge {
  private readonly logger = new Logger(ToolRegistryBridge.name)

  constructor(private readonly toolRegistry: ToolRegistry) {}

  /**
   * 将 ToolRegistry 中的所有 Tool 转换为 ERDLLMTool 格式
   * 可直接注入 LLM System Prompt 作为 Function Calling 定义
   */
  toLLMTools(agentId: string, industry?: string): ERDLLMTool[] {
    const definitions = this.toolRegistry.getAllDefinitions(industry)

    return definitions.map((def) => {
      const properties: Record<string, unknown> = {}

      // 将我们的 JSONSchemaProperty → OpenAI parameters.properties
      const props = def.inputSchema.properties
      for (const key of Object.keys(props)) {
        const p = (props as unknown as Record<string, Record<string, unknown>>)[key]
        if (!p) continue
        properties[key] = {
          type: p.type,
          description: p.description,
        }
        if (p.enum) {
          (properties[key] as Record<string, unknown>).enum = p.enum
        }
      }

      // 处理嵌套 items
      // 注意：OpenAI FC format 使用嵌套结构，不是我们的 JSONSchema 格式
      // 这里简化处理——对于基本的 object/array 类型，保持兼容

      return {
        type: 'function',
        function: {
          name: def.name,
          description: this.buildToolDescription(def),
          parameters: {
            type: 'object',
            properties,
            required: def.inputSchema.required,
          },
        },
      }
    })
  }

  /**
   * 创建 ToolExecutor，将 LLM FC → ToolRegistry.execute()
   */
  createExecutor(agentId: string): ToolExecutor {
    return async (name: string, args: Record<string, unknown>): Promise<string> => {
      const ctx: ToolContext = {
        agentId,
      }

      const result = await this.toolRegistry.execute(name, args, ctx)

      if (result.success) {
        return JSON.stringify(result.data)
      }

      return JSON.stringify({
        error: result.error?.code || 'UNKNOWN',
        message: result.error?.message || 'Unknown error',
      })
    }
  }

  /**
   * 获取 System Prompt 片段——告知 LLM 它可以调用哪些工具
   */
  getSystemPromptTools(agentId: string, industry?: string): string {
    const definitions = this.toolRegistry.getAllDefinitions(industry)

    if (definitions.length === 0) return ''

    const lines: string[] = [
      '你是秒镜 ERP 的 AI Agent。你可以通过 Function Calling 调用以下工具：',
      '',
    ]

    for (const def of definitions) {
      const icon = def.annotations?.readOnlyHint ? '📖' : def.annotations?.destructiveHint ? '⚠️' : '🔧'
      lines.push(`### ${icon} ${def.name}`)
      lines.push(`- **描述**：${def.description}`)
      lines.push(`- **领域**：${def.domain}`)
      if (def.inputSchema.required.length > 0) {
        lines.push(`- **必填参数**：${def.inputSchema.required.join(', ')}`)
      }
      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * 构建增强的 Tool 描述——包含注解信息
   */
  private buildToolDescription(def: ToolDefinition): string {
    let desc = def.description

    if (def.annotations) {
      const hints: string[] = []
      if (def.annotations.readOnlyHint) hints.push('只读操作')
      if (def.annotations.destructiveHint) hints.push('会修改/删除数据')
      if (def.annotations.idempotentHint) hints.push('幂等（可重复调用）')
      if (hints.length > 0) {
        desc += ' [' + hints.join(', ') + ']'
      }
    }

    return desc
  }
}
