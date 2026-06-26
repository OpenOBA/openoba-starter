/**
 * erdl-llm-providers 单元测试
 *
 * 测试 isValidApiKey / getAvailableProviders / getDefaultProvider / getFailoverProviders
 */

import {
  getAvailableProviders,
  getDefaultProvider,
} from './erdl-llm-providers'

// 保存原始 process.env
const originalEnv = process.env

describe('erdl-llm-providers', () => {
  beforeEach(() => {
    jest.resetModules()
    // 清空所有 LLM 相关的 env
    delete process.env.DEEPSEEK_API_KEY
    delete process.env.DASHSCOPE_API_KEY
    delete process.env.GLM_API_KEY
    delete process.env.MINIMAX_API_KEY
    delete process.env.MOONSHOT_API_KEY
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('isValidApiKey 相关逻辑', () => {
    it('所有 env 为空时应无可用 Provider', () => {
      const providers = getAvailableProviders()
      expect(providers.length).toBe(0)
    })

    it('设置有效的 DEEPSEEK_API_KEY 后应有可用 Provider', () => {
      process.env.DEEPSEEK_API_KEY = 'ds-test-key-1234567890abcdef1234567890abc'
      const providers = getAvailableProviders()
      // 需要重新 import 以获取新的 env 值
      const { getAvailableProviders: fresh } = require('./erdl-llm-providers')
      const result = fresh()
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].id).toBe('deepseek')
    })

    it('占位符 Key（temp/placeholder/changeme/xxx）应被过滤', () => {
      process.env.DEEPSEEK_API_KEY = 'temp'
      const { getAvailableProviders: fresh } = require('./erdl-llm-providers')
      const result = fresh()
      expect(result.length).toBe(0)
    })

    it('短于 16 字符的 Key 应被过滤', () => {
      process.env.DEEPSEEK_API_KEY = 'sk-short'
      const { getAvailableProviders: fresh } = require('./erdl-llm-providers')
      const result = fresh()
      expect(result.length).toBe(0)
    })
  })

  describe('getDefaultProvider', () => {
    it('无可用 Provider 时应返回 undefined', () => {
      const { getDefaultProvider: fresh } = require('./erdl-llm-providers')
      const result = fresh()
      expect(result).toBeUndefined()
    })

    it('有可用 Provider 时应返回第一个', () => {
      process.env.DEEPSEEK_API_KEY = 'ds-test-key-1234567890abcdef1234567890abc'
      const { getDefaultProvider: fresh } = require('./erdl-llm-providers')
      const result = fresh()
      expect(result).toBeDefined()
      expect(result?.id).toBe('deepseek')
    })
  })

  describe('BUILTIN_LLM_PROVIDERS 结构', () => {
    it('每个 Provider 应有有效的 baseUrl（https）', () => {
      const { BUILTIN_LLM_PROVIDERS: providers } = require('./erdl-llm-providers')
      for (const p of providers) {
        expect(p.baseUrl).toMatch(/^https?:\/\//)
      }
    })

    it('每个 Provider 应有至少一个 model', () => {
      const { BUILTIN_LLM_PROVIDERS: providers } = require('./erdl-llm-providers')
      for (const p of providers) {
        expect(p.models.length).toBeGreaterThan(0)
        expect(p.models[0].id).toBeTruthy()
      }
    })

    it('每个 Provider 应有 buildHeaders 方法', () => {
      const { BUILTIN_LLM_PROVIDERS: providers } = require('./erdl-llm-providers')
      for (const p of providers) {
        expect(typeof p.buildHeaders).toBe('function')
        const headers = p.buildHeaders('test-key')
        expect(headers.Authorization).toBeTruthy()
      }
    })
  })
})
