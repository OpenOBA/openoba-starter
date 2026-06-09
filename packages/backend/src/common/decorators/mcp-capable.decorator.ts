// ============================================
// @MCPCapable() 装饰器 — AI-BOS V2.0
// 标记 API 端点可被 MCP 协议暴露
// ============================================

import { SetMetadata } from '@nestjs/common'

export const MCP_CAPABLE_KEY = 'mcp_capable'

export interface MCPCapableOptions {
  /** MCP 工具名，如 'inventory.alert' */
  tool: string
  /** 工具描述 */
  description: string
  /** 业务域：'order' | 'inventory' | 'customer' | 'product' | 'aftersales' | 'system' */
  category: string
  /** 是否只读操作 */
  readOnly?: boolean
  /** 是否行业相关（true=换行业时需审查此端点） */
  industryScoped?: boolean
  /** 版本 */
  version?: string
}

export const MCPCapable = (options: MCPCapableOptions) => SetMetadata(MCP_CAPABLE_KEY, options)
