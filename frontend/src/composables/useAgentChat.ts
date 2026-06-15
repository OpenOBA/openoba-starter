import { ref, shallowRef, triggerRef, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getTask, getTaskLogs } from '@/api/task-engine'
import { useWsClient } from '@/composables/useWsClient'
import { useERASettings } from '@/composables/useERASettings'
import { useReActTimeline } from '@/composables/useReActTimeline'

/**
 * AgentChat 核心编排 composable
 *
 * 负责：任务加载（localStorage 三级恢复）、消息发送（WS 优先 + SSE 降级）、缓存、中止
 * 内部管理：
 *   - 14 个状态 ref
 *   - sendMsg 双路（WS/socket 分支 + SSE/fetch 分支）
 *   - loadTask 三级恢复
 *   - localStorage 缓存（含 ReAct 状态）
 */
export function useAgentChat() {
  // ── 子 composables ──
  const ws = useWsClient()
  const { settings: eraSettings } = useERASettings()

  // ── 状态 ──
  const taskId = ref('')
  const taskTitle = ref('')
  const taskDone = ref(false)
  const messages = shallowRef<any[]>([])
  const inputText = ref('')
  const agentLoading = ref(false)
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const usedModel = ref('')
  const taskInfo = ref<any>(null)
  const logs = ref<any[]>([])

  // ReAct handler
  const { handleSSEEvent } = useReActTimeline(messages, () => triggerRef(messages), () => saveReActCache(), usedModel)

  // ── localStorage 缓存 ──
  const LS_KEY = computed(() => 'chat-' + taskId.value)

  function saveReActCache() {
    try {
      const clean = messages.value.map((m: any) => ({
        role: m.role,
        content: m.content || '',
        time: m.time || '',
        agentFooter: m.agentFooter || undefined,
        reactTimeline: m.reactTimeline ? m.reactTimeline.slice(-40).map((item: any) => ({
          ...item,
          result: item.result ? item.result.substring(0, 500) : '',
        })) : undefined,
      }))
      const trimmed = clean.slice(-50)
      localStorage.setItem(LS_KEY.value, JSON.stringify(trimmed))
    } catch (e) {
      console.warn('localStorage 写入失败:', e)
    }
  }

  function saveCache() { saveReActCache() }

  // ── 任务加载 ──
  async function loadTask() {
    if (!taskId.value || taskId.value === 'undefined') {
      ElMessage.error('无效任务')
      return
    }
    try {
      const t = await getTask(taskId.value)
      taskTitle.value = t.title
      taskInfo.value = t
      taskDone.value = ['completed', 'cancelled', 'aborted'].includes(t.status)
      getTaskLogs(taskId.value).then((l) => { logs.value = l }).catch(() => {})

      // 1. localStorage 缓存优先（含 ReAct 状态恢复）
      const cached = localStorage.getItem(LS_KEY.value)
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) {
            messages.value = parsed.map((m: any) => ({
              role: m.role,
              content: m.content || '',
              time: m.time || '',
              agentFooter: m.agentFooter || undefined,
              reactTimeline: m.reactTimeline !== undefined ? m.reactTimeline : undefined,
              streaming: false,
            }))
            scrollBottom()
            return
          }
        } catch { /* 缓存损坏 */ }
      }

      // 2. fallback: proposals → 构建初始对话
      const ctx = (t.context || {}) as Record<string, unknown>
      const proposals = (t.proposals || []) as any[]

      if (proposals.length > 0) {
        const initMsg = String(ctx['任务主体'] || t.title)
        const built: any[] = [{
          role: 'human', content: initMsg,
          time: formatTime(t.createdAt),
        }]
        for (const p of proposals) {
          if (p.content) {
            built.push({
              role: 'proposal', content: p.content, version: p.version,
              status: p.status || 'submitted', feedback: p.feedback,
              time: p.timestamp ? formatTime(p.timestamp) : '',
            })
          }
        }
        messages.value = built
        saveCache()
        scrollBottom()
        return
      }

      // 3. 全新任务
      const initMsg = String(ctx['任务主体'] || t.title)
      if (initMsg) {
        messages.value = [{ role: 'human', content: initMsg, time: formatTime(t.createdAt) }]
        saveCache()
        if (t.status === 'drafted') await sendMsg(initMsg)
      }
      scrollBottom()
    } catch {
      ElMessage.error('加载任务失败')
    }
  }

  // ── 消息发送 ──
  const pendingSendKeys = new Set<string>()

  async function sendMsg(text: string) {
    const idempotencyKey = crypto.randomUUID()
    if (pendingSendKeys.has(idempotencyKey)) return
    pendingSendKeys.add(idempotencyKey)

    const agentMsg: any = {
      role: 'agent',
      content: '',
      time: formatTime(),
      streaming: true,
      toolCalls: [],
      statusHint: 'Agent 正在思考...',
    }
    messages.value.push(agentMsg)
    const msgIdx = messages.value.length - 1
    isLoading.value = true
    isStreaming.value = true
    scrollBottom()

    // M2: WS 优先路径
    if (ws.socket?.connected) {
      pendingSendKeys.delete(idempotencyKey)

      ws.socket.off('chat.started')
      ws.socket.off('chat.event')
      ws.socket.off('chat.done')
      ws.socket.off('chat.aborted')
      ws.socket.off('chat.error')

      ws.socket.on('chat.started', (_payload: any) => {
        messages.value[msgIdx].statusHint = 'Agent 正在思考...'
      })

      ws.socket.on('chat.event', (payload: any) => {
        handleSSEEvent(payload, msgIdx)
      })

      ws.socket.on('chat.done', (payload: any) => {
        messages.value[msgIdx].agentFooter = {
          name: payload.agentName || 'Agent',
          model: payload.model || '',
          ts: formatFooterTime(),
        }
        messages.value[msgIdx].streaming = false
        isStreaming.value = false; isLoading.value = false; agentLoading.value = false
        saveReActCache()
      })

      ws.socket.on('chat.aborted', (payload: any) => {
        if (payload.partialContent) messages.value[msgIdx].content = payload.partialContent
        messages.value[msgIdx].content += '\n\n*[已中止]*'
        messages.value[msgIdx].streaming = false
        isStreaming.value = false; isLoading.value = false; agentLoading.value = false
        saveCache()
      })

      ws.socket.on('chat.error', (payload: any) => {
        messages.value[msgIdx].content = (payload.message || '会话失败')
        messages.value[msgIdx].streaming = false
        isStreaming.value = false; isLoading.value = false; agentLoading.value = false
        saveReActCache()
      })

      const history = messages.value.slice(0, -2).map((m: any) => ({ role: m.role, content: m.content }))
      ws.send('chat.send', {
        sessionKey: taskId.value, message: text, history,
        idempotencyKey, model: eraSettings.agent.defaultModel,
      })
      agentLoading.value = true
      return
    }

    // M2: SSE 降级路径
    try {
      const token = localStorage.getItem('access_token') || ''
      pendingSendKeys.delete(idempotencyKey)
      const sseHistory = messages.value.slice(0, -2).map((m: any) => ({ role: m.role, content: m.content }))

      const streamRes = await fetch('/api/eros/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': '***' + token,
        },
        body: JSON.stringify({
          message: text, history: sseHistory,
          idempotencyKey, model: eraSettings.agent.defaultModel,
        }),
      })

      if (!streamRes.ok) {
        messages.value[msgIdx].content = '⚠️ 流连接失败 (' + streamRes.status + ')'
        messages.value[msgIdx].streaming = false
        isStreaming.value = false; isLoading.value = false; agentLoading.value = false
        saveCache()
        return
      }

      const reader = streamRes.body!.getReader()
      const decoder = new TextDecoder('utf-8', { fatal: false })
      let buffer = ''
      let lastEventTime = Date.now()
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null

      heartbeatTimer = setInterval(() => {
        const elapsed = Date.now() - lastEventTime
        if (elapsed > 35000) {
          if (messages.value[msgIdx]?.streaming) {
            messages.value[msgIdx].statusHint = '⚠️ 连接中断，正在重连...'
            triggerRef(messages)
          }
        }
      }, 5000)

      function read() {
        reader.read().then(({ done, value }) => {
          lastEventTime = Date.now()
          if (done) {
            messages.value[msgIdx].streaming = false
            isStreaming.value = false; isLoading.value = false; agentLoading.value = false
            if (heartbeatTimer) clearInterval(heartbeatTimer)
            saveCache()
            scrollBottom()
            return
          }
          const decoded = decoder.decode(value, { stream: true })
          buffer += decoded
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const json = JSON.parse(line.slice(6))

              if (json.type === 'done') {
                messages.value[msgIdx].agentFooter = {
                  name: json.agentName || 'AI 执行官',
                  model: json.model || usedModel.value || '',
                  ts: formatFooterTime(),
                }
                messages.value[msgIdx].streaming = false
                isStreaming.value = false; isLoading.value = false; agentLoading.value = false
                if (heartbeatTimer) clearInterval(heartbeatTimer)
                saveReActCache()
                getTask(taskId.value).then((t) => {
                  taskInfo.value = t
                  taskDone.value = ['completed', 'cancelled', 'aborted'].includes(t.status)
                }).catch(() => {})
              } else {
                handleSSEEvent(json, msgIdx)
              }
            } catch { /* skip malformed */ }
          }
          if (messages.value[msgIdx]?.streaming !== false) read()
        }).catch(() => {
          messages.value[msgIdx].streaming = false
          isStreaming.value = false; isLoading.value = false; agentLoading.value = false
          if (heartbeatTimer) clearInterval(heartbeatTimer)
          saveCache()
        })
      }
      read()
    } catch {
      messages.value[msgIdx].content = '⚠️ 发送失败'
      messages.value[msgIdx].streaming = false
      isStreaming.value = false; isLoading.value = false; agentLoading.value = false
      saveCache()
    }
  }

  // ── 中止 ──
  async function handleAbort() {
    const token = localStorage.getItem('access_token') || ''
    const lastMsg = messages.value[messages.value.length - 1]
    if (!lastMsg || lastMsg.role !== 'agent' || !lastMsg.streaming) return

    try {
      const res = await fetch('/api/eros/chat/abort-by-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': '***' + token,
        },
        body: JSON.stringify({ sessionKey: taskId.value }),
      })
      if (res.ok) {
        lastMsg.streaming = false
        lastMsg.content += '\n\n*[已中止]*'
        isStreaming.value = false; isLoading.value = false; agentLoading.value = false
        saveCache()
        triggerRef(messages)
      }
    } catch {
      ElMessage.error('中止失败，请刷新页面')
    }
  }

  // ── 辅助 ──
  function scrollBottom() {
    nextTick(() => {
      const el = document.querySelector('.chat-body') as HTMLElement
      if (el) el.scrollTop = el.scrollHeight
    })
  }

  function formatTime(isoStr?: string): string {
    const d = isoStr ? new Date(isoStr) : new Date()
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  function formatFooterTime(): string {
    const now = new Date()
    return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }

  return {
    taskId, taskTitle, taskDone, messages, inputText,
    agentLoading, isLoading, isStreaming, usedModel, taskInfo, logs,
    loadTask, sendMsg, handleAbort, saveCache, saveReActCache,
    scrollBottom, formatTime,
  }
}
