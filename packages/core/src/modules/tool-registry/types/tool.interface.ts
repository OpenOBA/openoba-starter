/**
 * 秒镜 AI-BOS · ToolRegistry 类型定义
 *
 * @file ToolDefinition / ToolResult / ToolHandler 核心类型
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-19
 */

// ============================================
// JSON Schema 类型（轻量版）
// ============================================

export interface JSONSchemaProperty {
  type: string
  description: string
  enum?: string[]
  items?: JSONSchemaProperty
  properties?: Record<string, JSONSchemaProperty>
  required?: string[]
}

export interface JSONSchema {
  type: 'object'
  properties: Record<string, JSONSchemaProperty>
  required: string[]
}

// ============================================
// Tool 定义
// ============================================

export type ToolDomain =
  | 'order'
  | 'inventory'
  | 'customer'
  | 'product'
  | 'aftersales'
  | 'system'

export interface ToolAnnotations {
  /** 只读提示：不会改变任何数据 */
  readOnlyHint?: boolean
  /** 破坏性提示：会改变/删除数据 */
  destructiveHint?: boolean
  /** 幂等提示：重复调用结果相同 */
  idempotentHint?: boolean
}

export interface ToolDefinition {
  /** 唯一标识：'order.create' */
  name: string
  /** LLM 理解的关键文本 */
  description: string
  /** 业务域 */
  domain: ToolDomain
  /** 参数 JSON Schema（手写） */
  inputSchema: JSONSchema
  /** 注解 */
  annotations?: ToolAnnotations
  /** 行业限制（空/undefined = 所有行业通用） */
  industries?: string[]
  /** 所需角色 */
  requiresRole?: string
  /** 限流配置 */
  rateLimit?: { maxRequests: number; windowMs: number }
}

// ============================================
// Tool 执行上下文
// ============================================

export interface ToolContext {
  /** 调用者 Agent ID */
  agentId: string
  /** 人工用户 ID（可选） */
  humanId?: string
  /** 租户 ID */
  tenantId?: string
  /** 当前行业 */
  industry?: string
  /** Agent 角色列表（P0修复C02） */
  agentRoles?: string[]
}

// ============================================
// Tool 执行结果
// ============================================

export interface ToolError {
  /** 错误码 */
  code: string
  /** 人类可读的错误信息（可喂给 LLM） */
  message: string
  /** 是否可安全透传给 LLM */
  safeForLLM: boolean
}

export interface ToolResult {
  /** 是否成功 */
  success: boolean
  /** 成功时的返回数据 */
  data?: unknown
  /** 失败时的错误信息 */
  error?: ToolError
  /** 认知元数据（可选，Agent 可记录推理过程） */
  cognitiveMeta?: {
    confidence?: number
    reasoning?: string
  }
}

// ============================================
// Tool Handler
// ============================================

export type ToolHandler = (
  args: Record<string, unknown>,
  ctx: ToolContext,
) => Promise<ToolResult>

// ============================================
// 注册表入口
// ============================================

export interface ToolEntry {
  definition: ToolDefinition
  handler: ToolHandler
  registeredAt: Date
}
