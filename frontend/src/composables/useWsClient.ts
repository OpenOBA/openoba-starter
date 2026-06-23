/**
 * ERA Chat WebSocket Client — 前端 WS 连接封装
 *
 * @file useWsClient.ts
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-21
 * @license MIT
 */

import { ref, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'

export interface WsClientOptions {
  url?: string
  token?: string
  autoReconnect?: boolean
}

export function useWsClient(options: WsClientOptions = {}) {
  const isConnected = ref(false)
  const isReconnecting = ref(false)
  const error = ref<string | null>(null)

  const socketRef = ref<Socket | null>(null)

  function connect() {
    const token = options.token || localStorage.getItem('access_token') || ''
    const url = options.url || window.location.origin

    const sock = io(url, {
      path: '/eros/ws',
      auth: { token },
      transports: ['websocket'], // WS 优先
      reconnection: options.autoReconnect ?? true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 10,
      timeout: 15000,
    })
    socketRef.value = sock

    sock.on('connect', () => {
      isConnected.value = true
      isReconnecting.value = false
      error.value = null
    })

    sock.on('disconnect', (reason: string) => {
      isConnected.value = false
      if (reason === 'io server disconnect') {
        // 服务端主动断开，不自动重连
        sock.disconnect()
      }
    })

    sock.on('reconnect_attempt', () => {
      isReconnecting.value = true
    })

    sock.on('reconnect_failed', () => {
      error.value = '重连失败，请刷新页面'
      isReconnecting.value = false
    })

    sock.on('connect_error', (err: Error) => {
      error.value = `连接失败: ${err.message}`
      isReconnecting.value = true
    })
  }

  function send(type: string, payload: Record<string, unknown>) {
    const sock = socketRef.value
    if (!sock?.connected) {
      console.warn('WS not connected, cannot send')
      return
    }
    sock.emit(type, payload)
  }

  function on(event: string, handler: (...args: Record<string, unknown>[]) => void) {
    socketRef.value?.on(event, handler)
  }

  function off(event: string, handler?: (...args: Record<string, unknown>[]) => void) {
    socketRef.value?.off(event, handler)
  }

  function disconnect() {
    socketRef.value?.disconnect()
    socketRef.value = null
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected,
    isReconnecting,
    error,
    socket: socketRef, // 暴露为 ref，给 useAgentChat 直接注册事件
    connect,
    send,
    on,
    off,
    disconnect,
  }
}
