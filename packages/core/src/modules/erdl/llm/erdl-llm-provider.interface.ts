/**
 * 秒镜科技 · ERDL — LLM Provider 接口定义
 *
 * @file ERDL LLM Provider 接口 + 模型定义类型
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-01
 * @license BSL-1.1
 *
 * 设计参考：OpenClaw Provider Extension 架构
 * 核心理念：统一 OpenAI Chat Completions 格式，一个接口支持所有厂商
 */

// ============================================
// 模型定义
// ============================================

/** LLM 模型成本（每百万 token，单位 ¥） */
export interface ERDLLLMCost {
  input: number
  output: number
  cacheRead?: number
  cacheWrite?: number
}

/** LLM 模型定义 */
export interface ERDLModelDefinition {
  /** 模型 ID（如 "deepseek-chat"） */
  id: string
  /** 显示名称 */
  name: string
  /** 是否支持推理/思考模式 */
  reasoning: boolean
  /** 上下文窗口（token） */
  contextWindow: number
  /** 最大输出 token */
  maxTokens: number
  /** 成本 */
  cost: ERDLLLMCost
}

/** LLM Provider 定义 */
export interface ERDLLLMProvider {
  /** Provider 标识 */
  id: string
  /** 显示名称 */
  name: string
  /** API 基础 URL */
  baseUrl: string
  /** API 协议类型 */
  api: 'openai-completions'
  /** 默认模型 ID */
  defaultModel: string
  /** API Key 环境变量名 */
  apiKeyEnv: string
  /** 模型列表 */
  models: ERDLModelDefinition[]
  /** 构建请求头 */
  buildHeaders(apiKey: string): Record<string, string>
}

// ============================================
// 请求/响应类型
// ============================================

/** LLM 消息 */
export interface ERDLLLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
}

/** Function Calling 工具定义 */
export interface ERDLLMTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
    /** DeepSeek strict 模式（Beta），强制模型严格遵循 JSON Schema */
    strict?: boolean
  }
}

/** LLM 请求选项 */
export interface ERDLLLMRequest {
  /** 模型 ID 覆盖（不传则用默认） */
  model?: string
  /** 消息列表 */
  messages: ERDLLLMMessage[]
  /** 温度 0-2 */
  temperature?: number
  /** 最大输出 token */
  maxTokens?: number
  /** Function Calling 工具列表 */
  tools?: ERDLLMTool[]
  /** 工具调用模式 */
  toolChoice?: 'auto' | 'required' | 'none'
}

/** Token 用量统计 */
export interface ERDLLLMUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  /** 估算成本（¥） */
  estimatedCost: number
}

/** LLM 响应 */
export interface ERDLLLMResponse {
  /** 回复内容 */
  content: string
  /** 使用的模型 ID */
  model: string
  /** 使用的 Provider ID */
  provider: string
  /** Token 用量 */
  usage: ERDLLLMUsage
  /** 延迟（毫秒） */
  latencyMs: number
  /** 原始 API choices（含 tool_calls） */
  rawChoices?: Array<{ message: { content?: string; tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }> } }>
}

/** LLM 查询结果（含 failover 信息） */
export interface ERDLLLMQueryResult {
  response: ERDLLLMResponse
  /** 是否经过 failover */
  fallbackUsed: boolean
  /** 尝试过的 Provider 列表 */
  attemptedProviders: string[]
}
