/**
 * Agent 事件总线 — 连接 Chat 面板与数据面板
 *
 * Agent 完成操作后 emit 事件，数据面板监听并自动刷新。
 * Chat 面板是唯一的事件生产者，数据面板是事件消费者。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface AgentEvent {
  type: string // 'product:created' | 'product:updated' | 'order:created' | ...
  payload: Record<string, unknown>
  timestamp: number
}

export const useAgentEvents = defineStore('agentEvents', () => {
  const lastEvent = ref<AgentEvent | null>(null)
  const eventLog = ref<AgentEvent[]>([])

  function emit(type: string, payload: Record<string, unknown> = {}) {
    const ev: AgentEvent = { type, payload, timestamp: Date.now() }
    lastEvent.value = ev
    eventLog.value.push(ev)
    if (eventLog.value.length > 50) eventLog.value.shift()
    console.log(`🔔 [AgentEvent] ${type}`, payload)
  }

  function consume(type?: string): AgentEvent | null {
    if (!lastEvent.value) return null
    if (type && lastEvent.value.type !== type) return null
    const ev = lastEvent.value
    lastEvent.value = null
    return ev
  }

  function clear() {
    lastEvent.value = null
    eventLog.value = []
  }

  return { lastEvent, eventLog, emit, consume, clear }
})
