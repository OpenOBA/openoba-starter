import axios from 'axios'
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const request: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求拦截器 - 注入 JWT token
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器 - 统一处理错误
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const body = response.data
    // 字典 API 等直接返回数组的接口（无 code 字段），直接透传
    if (Array.isArray(body)) {
      return body
    }
    // 标准 { code, message, data } 格式
    if (body && typeof body === 'object' && 'code' in body) {
      const { code, message, data } = body
      if (code === 0) {
        return data
      }
      const errorMsg = Array.isArray(message) ? message.join('; ') : (message || '请求失败')
      ElMessage.error(errorMsg)
      return Promise.reject(new Error(errorMsg))
    }
    // 非标准格式（如 blob、纯文本等），直接透传
    return body
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user_info')
      router.push('/login')
      ElMessage.error('登录已过期，请重新登录')
    } else {
      const errMsg = error.response?.data?.message
      const msg = Array.isArray(errMsg) ? errMsg.join('; ') : (errMsg || '网络异常')
      ElMessage.error(msg)
    }
    return Promise.reject(error)
  },
)

export default request
