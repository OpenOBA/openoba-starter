/**
 * ER-OS Agent Tool Registry — 工具注册中心
 * 
 * 管理 Agent Function Calling 工具的定义与执行。
 * 工具定义（给 LLM 用）与执行逻辑（查数据库）分离。
 */

import { Injectable, Logger } from '@nestjs/common'
import type { ERDLLMTool } from '../../erdl/llm/erdl-llm-provider.interface'

export type ToolExecutor = (name: string, args: Record<string, unknown>) => Promise<string>

export interface ToolRegistration {
  definition: ERDLLMTool
  execute: ToolExecutor
  /** 适用 Agent 类型（空 = 全部可用） */
  agentTypes?: string[]
}

@Injectable()
export class AgentToolRegistry {
  private readonly logger = new Logger(AgentToolRegistry.name)
  private readonly tools = new Map<string, ToolRegistration>()

  register(tool: ToolRegistration): void {
    const name = tool.definition.function.name
    const existing = this.tools.get(name)
    if (existing) {
      // 已有真实 execute handler → 不覆盖（SKILL 占位符不能替换真实现）
      // 仅当现有 handler 同是占位符时才允许更新
      this.logger.warn(`工具 ${name} 已注册，跳过重复注册`)
      return
    }
    this.tools.set(name, tool)
  }

  /** 获取某 Agent 类型的工具定义列表（不传 agentType 返回全部） */
  getDefinitions(agentType?: string): ERDLLMTool[] {
    const defs: ERDLLMTool[] = []
    for (const [, t] of this.tools) {
      // 不传 agentType → 返回全部 | 传了 → 只返回匹配的
      if (!agentType || !t.agentTypes || t.agentTypes.length === 0 || t.agentTypes.includes(agentType)) {
        defs.push(t.definition)
      }
    }
    return defs
  }

  /** 创建工具执行器闭包（30s 超时保护） */
  createExecutor(): ToolExecutor {
    const TOOL_TIMEOUT = 30000
    return async (name, args) => {
      const tool = this.tools.get(name)
      if (!tool) {
        return JSON.stringify({ error: `未知工具: ${name}` })
      }
      try {
        return await Promise.race([
          tool.execute(name, args),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error(`工具超时: ${name} (${TOOL_TIMEOUT}ms)`)), TOOL_TIMEOUT)
          ),
        ])
      } catch (e) {
        return JSON.stringify({ error: String(e) })
      }
    }
  }
}
