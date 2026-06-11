import { ref, shallowRef, triggerRef, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getTask, getTaskLogs } from '@/api/task-engine'
import { useWsClient } from '@/composables/useWsClient'
import { useERASettings } from '@/composables/useERASettings'
import { useReActTimeline } from '@/composables/useReActTimeline'

/**
 * AgentChat 鏍稿績缂栨帓 composable
 *
 * 璐熻矗锛氫换鍔″姞杞斤紙localStorage涓夌骇鎭㈠锛夈€佹秷鎭彂閫侊紙WS浼樺厛+SSE闄嶇骇锛夈€佺紦瀛樸€佷腑姝? *
 * 鍐呴儴绠＄悊锛? *   - 14 涓姸鎬?ref
 *   - sendMsg 鍙岃矾锛圵S/socket 鍒嗘敮 + SSE/fetch 鍒嗘敮锛? *   - loadTask 涓夌骇鎭㈠
 *   - localStorage 缂撳瓨锛堝惈 ReAct 鐘舵€侊級
 */
export function useAgentChat() {
  // 鈹€鈹€ 瀛?composables 鈹€鈹€
  const ws = useWsClient()
  const { settings: eraSettings } = useERASettings()

  // 鈹€鈹€ 鐘舵€?鈹€鈹€
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

  // 鈹€鈹€ localStorage 缂撳瓨 鈹€鈹€
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
      console.warn('localStorage 鍐欏叆澶辫触:', e)
    }
  }

  function saveCache() { saveReActCache() }

  // 鈹€鈹€ 浠诲姟鍔犺浇 鈹€鈹€
  async function loadTask() {
    if (!taskId.value || taskId.value === 'undefined') {
      ElMessage.error('鏃犳晥浠诲姟')
      return
    }
    try {
      const t = await getTask(taskId.value)
      taskTitle.value = t.title
      taskInfo.value = t
      taskDone.value = ['completed', 'cancelled', 'aborted'].includes(t.status)
      getTaskLogs(taskId.value).then((l) => { logs.value = l }).catch(() => {})

      // 1. localStorage 缂撳瓨浼樺厛锛堝惈 ReAct 鐘舵€佹仮澶嶏級
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
        } catch { /* 缂撳瓨鎹熷潖 */ }
      }

      // 2. fallback: proposals 鈫?鏋勫缓鍒濆瀵硅瘽
      const ctx = (t.context || {}) as Record<string, unknown>
      const proposals = (t.proposals || []) as any[]

      if (proposals.length > 0) {
        const initMsg = String(ctx['浠诲姟涓讳綋'] || t.title)
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

      // 3. 鍏ㄦ柊浠诲姟
      const initMsg = String(ctx['浠诲姟涓讳綋'] || t.title)
      if (initMsg) {
        messages.value = [{ role: 'human', content: initMsg, time: formatTime(t.createdAt) }]
        saveCache()
        if (t.status === 'drafted') await sendMsg(initMsg)
      }
      scrollBottom()
    } catch {
      ElMessage.error('鍔犺浇浠诲姟澶辫触')
    }
  }

  // 鈹€鈹€ 娑堟伅鍙戦€?鈹€鈹€
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
      statusHint: 'Agent 姝ｅ湪鎬濊€?..',
    }
    messages.value.push(agentMsg)
    const msgIdx = messages.value.length - 1
    isLoading.value = true
    isStreaming.value = true
    scrollBottom()

    // M2: WS 浼樺厛璺緞
    if (ws.socket?.connected) {
      pendingSendKeys.delete(idempotencyKey)

      ws.socket.off('chat.started')
      ws.socket.off('chat.event')
      ws.socket.off('chat.done')
      ws.socket.off('chat.aborted')
      ws.socket.off('chat.error')

      ws.socket.on('chat.started', (_payload: any) => {
        messages.value[msgIdx].statusHint = 'Agent 姝ｅ湪鎬濊€?..'
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
        messages.value[msgIdx].content += '\n\n*[宸蹭腑姝*'
        messages.value[msgIdx].streaming = false
        isStreaming.value = false; isLoading.value = false; agentLoading.value = false
        saveCache()
      })

      ws.socket.on('chat.error', (payload: any) => {
        messages.value[msgIdx].content = (payload.message || '浼氳瘽澶辫触')
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

    // M2: SSE 闄嶇骇璺緞
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
        messages.value[msgIdx].content = '鈿狅笍 娴佽繛鎺ュけ璐?(' + streamRes.status + ')'
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
            messages.value[msgIdx].statusHint = '鈿狅笍 杩炴帴涓柇锛屾鍦ㄩ噸杩?..'
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
                  name: json.agentName || 'AI 鎵ц瀹?,
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
      messages.value[msgIdx].content = '鈿狅笍 鍙戦€佸け璐?
      messages.value[msgIdx].streaming = false
      isStreaming.value = false; isLoading.value = false; agentLoading.value = false
      saveCache()
    }
  }

  // 鈹€鈹€ 涓 鈹€鈹€
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
        lastMsg.content += '\n\n*[宸蹭腑姝*'
        isStreaming.value = false; isLoading.value = false; agentLoading.value = false
        saveCache()
        triggerRef(messages)
      }
    } catch {
      ElMessage.error('涓澶辫触锛岃鍒锋柊椤甸潰')
    }
  }

  // 鈹€鈹€ 杈呭姪 鈹€鈹€
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
    return `${now.getFullYear()}骞?{now.getMonth() + 1}鏈?{now.getDate()}鏃?${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }

  return {
    taskId, taskTitle, taskDone, messages, inputText,
    agentLoading, isLoading, isStreaming, usedModel, taskInfo, logs,
    loadTask, sendMsg, handleAbort, saveCache, saveReActCache,
    scrollBottom, formatTime,
  }
}
