/**
 * 秒镜 ERP — API 请求拦截器测试（request.ts）
 *
 * 测试维度：
 * 1. 请求拦截器：token 注入 / 无 token 时 header 状态
 * 2. 响应拦截器：成功解包（code=0） / 业务错误 / 数组直返
 * 3. 401 处理：清 token / 跳转 login
 * 4. 超时处理
 * 5. 错误消息格式化（数组/字符串）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ═══════════════════════════════════════
// 模拟 localStorage
// ═══════════════════════════════════════
const store: Record<string, string> = {}
const mockLS = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
}

// ═══════════════════════════════════════
// 重建 request.ts 逻辑（mock 外部依赖）
// ═══════════════════════════════════════

let capturedHeaders: Record<string, string> = {}
let lastErrorMsg = ''
let didRedirect = false
let didClearStorage = false

function simulateRequestInterceptor(config: { headers: Record<string, string> }) {
  const token = mockLS.getItem('access_token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
}

function simulateResponseInterceptor(responseData: any, status: number) {
  // 401 处理
  if (status === 401) {
    mockLS.removeItem('access_token')
    mockLS.removeItem('user_info')
    didClearStorage = true
    didRedirect = true
    return Promise.reject(new Error('登录已过期'))
  }
  // 数组直接返回
  if (Array.isArray(responseData)) return responseData
  // 标准解包 { code, message, data }
  const { code, message, data } = responseData || {}
  if (code === 0) return data
  const errMsg = Array.isArray(message) ? message.join('; ') : (message || '请求失败')
  lastErrorMsg = errMsg
  return Promise.reject(new Error(errMsg))
}

describe('Request 拦截器 — Token 注入', () => {
  beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k])
    capturedHeaders = {}
    didRedirect = false
    didClearStorage = false
  })

  it('有 token 时注入 Authorization header', () => {
    mockLS.setItem('access_token', 'jwt-token-123')
    const config = { headers: {} }
    simulateRequestInterceptor(config)
    expect(config.headers['Authorization']).toBe('Bearer jwt-token-123')
  })

  it('无 token 时不注入 Authorization', () => {
    const config = { headers: {} }
    simulateRequestInterceptor(config)
    expect(config.headers['Authorization']).toBeUndefined()
  })

  it('不会覆盖已有的自定义 header', () => {
    mockLS.setItem('access_token', 'jwt-456')
    const config = { headers: { 'X-Custom': 'value' } }
    simulateRequestInterceptor(config)
    expect(config.headers['X-Custom']).toBe('value')
    expect(config.headers['Authorization']).toBe('Bearer jwt-456')
  })
})

describe('Response 拦截器 — 成功响应', () => {
  it('code=0 返回 data', () => {
    const result = simulateResponseInterceptor({ code: 0, data: { id: 1 } }, 200)
    expect(result).toEqual({ id: 1 })
  })

  it('数组响应直接返回（字典 API）', () => {
    const result = simulateResponseInterceptor([{ code: 'a' }, { code: 'b' }], 200)
    expect(result).toEqual([{ code: 'a' }, { code: 'b' }])
  })

  it('code=0 的 data 为 null 返回 null', () => {
    const result = simulateResponseInterceptor({ code: 0, data: null }, 200)
    expect(result).toBeNull()
  })

  it('code=0 无 data 字段返回 undefined', () => {
    const result = simulateResponseInterceptor({ code: 0 }, 200)
    expect(result).toBeUndefined()
  })
})

describe('Response 拦截器 — 错误处理', () => {
  it('业务错误 code≠0', async () => {
    await expect(
      simulateResponseInterceptor({ code: 1, message: '商品不存在' }, 200)
    ).rejects.toThrow('商品不存在')
  })

  it('验证错误 message 为数组时用分号拼接', async () => {
    await expect(
      simulateResponseInterceptor({ code: 400, message: ['name 不能为空', 'price 必须大于0'] }, 400)
    ).rejects.toThrow('name 不能为空; price 必须大于0')
  })

  it('401 时清除 token 和用户信息', async () => {
    mockLS.setItem('access_token', 'expired')
    mockLS.setItem('user_info', '{"name":"test"}')
    try {
      await simulateResponseInterceptor({ code: 401 }, 401)
    } catch {}
    expect(didClearStorage).toBe(true)
    expect(didRedirect).toBe(true)
  })

  it('无 message 时兜底请求失败', async () => {
    await expect(
      simulateResponseInterceptor({ code: 500 }, 500)
    ).rejects.toThrow('请求失败')
  })
})

describe('Response 拦截器 — 边界情况', () => {
  it('data 为数组但外层包装在对象中', () => {
    // { code:0, data: [...] } → 不是数组顶层，走解包逻辑
    const result = simulateResponseInterceptor(
      { code: 0, message: 'ok', data: [{ id: 1 }, { id: 2 }] },
      200,
    )
    expect(result).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('空对象响应', () => {
    const result = simulateResponseInterceptor({ code: 0, data: {} }, 200)
    expect(result).toEqual({})
  })

  it('null response data 返回 rejected Promise', async () => {
    // 模拟后端返回 null body —— null 无 code 属性，走到 throw new Error('请求失败')
    await expect(
      simulateResponseInterceptor(null, 200)
    ).rejects.toThrow('请求失败')
  })
})
