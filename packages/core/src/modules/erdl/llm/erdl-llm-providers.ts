/**
 * 秒镜科技 · ERDL — 内置 LLM Provider 注册表
 *
 * @file ERDL 内置 Provider 定义（DeepSeek + Qwen）
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-01
 * @license BSL-1.1
 *
 * 设计参考：OpenClaw 的多 Provider 模型
 * 每个 Provider 只需要 baseUrl + models + buildHeaders
 */

import type { ERDLLLMProvider } from './erdl-llm-provider.interface'

// ============================================
// DeepSeek Provider
// ============================================

const DEEPSEEK_PROVIDER: ERDLLLMProvider = {
  id: 'deepseek',
  name: 'DeepSeek',
  baseUrl: 'https://api.deepseek.com',
  api: 'openai-completions',
  defaultModel: 'deepseek-chat',
  apiKeyEnv: 'DEEPSEEK_API_KEY',
  models: [
    {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat',
      reasoning: true,
      contextWindow: 1_000_000,
      maxTokens: 384_000,
      cost: { input: 1.74, output: 3.48 },
    },
    {
      id: 'deepseek-v4-flash',
      name: 'DeepSeek V4 Flash',
      reasoning: false,
      contextWindow: 1_000_000,
      maxTokens: 384_000,
      cost: { input: 0.28, output: 0.42 },
    },
  ],
  buildHeaders(apiKey) {
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }
  },
}

// ============================================
// Qwen / 阿里云百炼 Provider
// ============================================

const QWEN_PROVIDER: ERDLLLMProvider = {
  id: 'qwen',
  name: 'Qwen / 阿里百炼',
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  api: 'openai-completions',
  defaultModel: 'qwen3.6-plus',
  apiKeyEnv: 'DASHSCOPE_API_KEY',
  models: [
    {
      id: 'qwen3.6-plus',
      name: 'Qwen 3.6 Plus',
      reasoning: true,
      contextWindow: 1_000_000,
      maxTokens: 131_072, cost: { input: 4, output: 12 },
    },
    {
      id: 'qwen-plus',
      name: 'Qwen Plus',
      reasoning: false,
      contextWindow: 131_072,
      maxTokens: 8_192, cost: { input: 2, output: 8 },
    },
  ],
  buildHeaders(apiKey) {
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }
  },
}

// ============================================
// 智谱 GLM Provider
// ============================================

const GLM_PROVIDER: ERDLLLMProvider = {
  id: 'glm',
  name: '智谱 GLM',
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  api: 'openai-completions',
  defaultModel: 'glm-4.7',
  apiKeyEnv: 'GLM_API_KEY',
  models: [
    {
      id: 'glm-4.7',
      name: 'GLM 4.7',
      reasoning: false,
      contextWindow: 128_000,
      maxTokens: 16_384, cost: { input: 5, output: 5 },
    },
    {
      id: 'glm-5.1',
      name: 'GLM 5.1',
      reasoning: true,
      contextWindow: 1_000_000,
      maxTokens: 16_384, cost: { input: 5, output: 5 },
    },
  ],
  buildHeaders(apiKey) {
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }
  },
}

// ============================================
// MiniMax Provider
// ============================================

const MINIMAX_PROVIDER: ERDLLLMProvider = {
  id: 'minimax',
  name: 'MiniMax',
  baseUrl: 'https://api.minimaxi.com/v1',
  api: 'openai-completions',
  defaultModel: 'MiniMax-M3',
  apiKeyEnv: 'MINIMAX_API_KEY',
  models: [
    {
      id: 'MiniMax-M3',
      name: 'MiniMax M3',
      reasoning: false,
      contextWindow: 1_000_000,
      maxTokens: 8_192, cost: { input: 0.5, output: 5 },
    },
  ],
  buildHeaders(apiKey) {
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }
  },
}

// ============================================
// Kimi / Moonshot Provider
// ============================================

const KIMI_PROVIDER: ERDLLLMProvider = {
  id: 'kimi',
  name: 'Kimi / Moonshot',
  baseUrl: 'https://api.moonshot.cn/v1',
  api: 'openai-completions',
  defaultModel: 'moonshot-v1-auto',
  apiKeyEnv: 'MOONSHOT_API_KEY',
  models: [
    {
      id: 'moonshot-v1-auto',
      name: 'Kimi (auto)',
      reasoning: false,
      contextWindow: 128_000,
      maxTokens: 8_192, cost: { input: 12, output: 12 },
    },
  ],
  buildHeaders(apiKey) {
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }
  },
}

// ============================================
// Provider 注册表
// ============================================

/** 所有内置 Provider */
export const BUILTIN_LLM_PROVIDERS: ERDLLLMProvider[] = [
  DEEPSEEK_PROVIDER,
  QWEN_PROVIDER,
  GLM_PROVIDER,
  MINIMAX_PROVIDER,
  KIMI_PROVIDER,
]

/** 按 ID 查找 Provider */
export function getProvider(providerId: string): ERDLLLMProvider | undefined {
  return BUILTIN_LLM_PROVIDERS.find((p) => p.id === providerId)
}

/** 查找包含指定模型的 Provider */
export function findProviderForModel(modelId: string): ERDLLLMProvider | undefined {
  return BUILTIN_LLM_PROVIDERS.find((p) => p.models.some((m) => m.id === modelId))
}

/** 获取所有可用 Provider（已配置 API Key） */
export function getAvailableProviders(): ERDLLLMProvider[] {
  return BUILTIN_LLM_PROVIDERS.filter((p) => Boolean(process.env[p.apiKeyEnv]))
}

/** 获取默认 Provider。preferredProviderCode 优先，否则取第一个可用的。 */
export function getDefaultProvider(preferredProviderCode?: string): ERDLLLMProvider | undefined {
  const available = getAvailableProviders()
  if (preferredProviderCode) {
    return available.find(p => p.id === preferredProviderCode) || available[0]
  }
  return available[0]
}

/** 获取按 providerCode 排序的可用 Provider 列表（默认排第一） */
export function getAvailableProvidersWithPriority(preferredProviderCode?: string): ERDLLLMProvider[] {
  const available = getAvailableProviders()
  if (!preferredProviderCode) return available
  const idx = available.findIndex(p => p.id === preferredProviderCode)
  if (idx <= 0) return available
  const [preferred] = available.splice(idx, 1)
  available.unshift(preferred)
  return available
}

/** 获取 Provider 的所有 failover 备选 */
export function getFailoverProviders(excludeId: string): ERDLLLMProvider[] {
  return getAvailableProviders().filter((p) => p.id !== excludeId)
}

/** Token 估算（中文~2 chars/token, 英文~4 chars/token） */
export function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g) || []).length
  const otherChars = text.length - chineseChars
  return Math.ceil(chineseChars / 1.8 + otherChars / 4)
}
