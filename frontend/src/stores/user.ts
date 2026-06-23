import { defineStore } from 'pinia'
import { ref } from 'vue'

function safeParseJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (e) {
    console.warn('[userStore] JSON解析失败:', e instanceof Error ? e.message : String(e))
    return null
  }
}

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('access_token') || '')
  const userInfo = ref<Record<string, unknown> | null>(safeParseJson(localStorage.getItem('user_info')))

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('access_token', newToken)
  }

  function setInfo(info: Record<string, unknown>) {
    userInfo.value = info
    localStorage.setItem('user_info', JSON.stringify(info))
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_info')
  }

  return { token, userInfo, setToken, setInfo, logout }
})
