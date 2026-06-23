/**
 * 秒镜 ERP — User Store 单元测试
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { defineStore } from 'pinia'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'

// 模拟 localStorage
const store: Record<string, string> = {}
const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value
  },
  removeItem: (key: string) => {
    delete store[key]
  },
}

// Pinia store 定义（等同于 src/stores/user.ts）
const useUserStore = defineStore('user', () => {
  const token = ref(mockLocalStorage.getItem('access_token') || '')
  const userInfo = ref<unknown>(JSON.parse(mockLocalStorage.getItem('user_info') || 'null'))

  function setToken(newToken: string) {
    token.value = newToken
    mockLocalStorage.setItem('access_token', newToken)
  }

  function setInfo(info: unknown) {
    userInfo.value = info
    mockLocalStorage.setItem('user_info', JSON.stringify(info))
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    mockLocalStorage.removeItem('access_token')
    mockLocalStorage.removeItem('user_info')
  }

  return { token, userInfo, setToken, setInfo, logout }
})

describe('User Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.keys(store).forEach((k) => delete store[k])
  })

  it('初始状态：无token时为空字符串', () => {
    const user = useUserStore()
    expect(user.token).toBe('')
    expect(user.userInfo).toBeNull()
  })

  it('setToken 写入 token 和 localStorage', () => {
    const user = useUserStore()
    user.setToken('eyJhbGciOiJIUzI1NiIs...')
    expect(user.token).toBe('eyJhbGciOiJIUzI1NiIs...')
    expect(mockLocalStorage.getItem('access_token')).toBe('eyJhbGciOiJIUzI1NiIs...')
  })

  it('setInfo 写入用户信息和 localStorage', () => {
    const user = useUserStore()
    user.setInfo({ name: '管理员', role: 'admin' })
    expect(user.userInfo).toEqual({ name: '管理员', role: 'admin' })
    const stored = mockLocalStorage.getItem('user_info')
    expect(JSON.parse(stored!)).toEqual({ name: '管理员', role: 'admin' })
  })

  it('logout 清除 token、userInfo、localStorage', () => {
    const user = useUserStore()
    user.setToken('some-token')
    user.setInfo({ name: 'Admin' })
    user.logout()
    expect(user.token).toBe('')
    expect(user.userInfo).toBeNull()
    expect(mockLocalStorage.getItem('access_token')).toBeNull()
    expect(mockLocalStorage.getItem('user_info')).toBeNull()
  })

  it('已有 token 时正确初始化', () => {
    mockLocalStorage.setItem('access_token', 'existing-token')
    mockLocalStorage.setItem('user_info', JSON.stringify({ name: 'Existing' }))
    const user = useUserStore()
    expect(user.token).toBe('existing-token')
    expect(user.userInfo).toEqual({ name: 'Existing' })
  })
})
