// useAgentChat.ts — SSE/WS connection + event dispatch logic
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getTask, getTaskLogs, approveTask, queryTasks } from '@/api/task-engine'
import request from '@/api/request'
import { useWsClient } from '@/composables/useWsClient'
import { useERASettings } from '@/composables/useERASettings'

export interface TimelineItem {
  kind: 'thought' | 'tool' | 'observation'
  text?: string
  name?: string
  args?: Record<string, unknown>
  result?: string
  status?: string
  durationMs?: number
  ts?: number
  _streaming?: boolean
  _expanded?: boolean
  progress?: { current: number; total: number; message?: string }
  streamLines?: string[]
}

export interface ChatMsg {
  role: 'human' | 'agent' | 'system' | 'proposal'
  content: string
  streaming?: boolean
  time?: string
  reactTimeline?: TimelineItem[]
  statusHint?: string
  version?: number
  status?: string
  feedback?: Record<string, unknown>
  agentFooter?: { name: string; model: string; ts: string }
}

interface WsPayload {
  runId?: string
  type?: string
  delta?: string
  message?: string
  partialContent?: string
  agentName?: string
  model?: string
}

interface ChatSSEEvent {
  type?: string
  delta?: string
  tool?: string
  args?: Record<string, unknown>
  result?: string
  text?: string
  runId?: string
  partialContent?: string
  message?: string
  current?: number
  total?: number
  line?: string
  durationMs?: number
}

export function useAgentChat(
  messages: { value: any[] },
  triggerRef: (v: any) => void,
  onEvent: (json: ChatSSEEvent, msgIdx: number) => void,
  _onSaveCache: () => void,
  onSaveReActCache: () => void,
  onScrollBottom: () => void,
  formatTime: (isoStr?: string) => string,
  formatFooterTime: () => string,
  syncProposals: (proposals: Array<{ version: number; content: string; timestamp: string; status: string }>) => void,
  insertSummary: (t: any, fileUrl: string, fileName: string) => void,
) {
  const route = useRoute()
  const router = useRouter()
  const ws = useWsClient()
  const { settings: eraSettings } = useERASettings()

  const taskId = computed(() => route.params.id as string)
  const taskTitle = ref('')
  const taskDone = ref(false)
  const taskInfo = ref<any>(null)
  const logs = ref<any[]>([])
  const inputText = ref('')
  const agentLoading = ref(false)
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const agreeing = ref(false)
  const usedModel = ref('')
  const historyTasks = ref<any[]>([])
  const historyLoading = ref(false)
  const chatBodyRef = ref<HTMLElement>()

  const LS_KEY = computed(() => 'chat-' + taskId.value)
  const chatModel = computed(() => eraSettings.agent.defaultModel || '')

  const showAgreeBtn = computed(() => {
    if (taskDone.value) return false
    if (agentLoading.value) return false
    const hasAgentReply = messages.value.some((m: ChatMsg) => m.role === 'agent' && m.content && !m.streaming)
    return hasAgentReply
  })

  async function loadHistoryTasks() {
    historyLoading.value = true
    try {
      const res: any = await queryTasks({ pageSize: 20 })
      const items = res?.items || res?.data?.items || []
      historyTasks.value = items.filter((t: any) =>
        ['drafted', 'proposed', 'executing', 'completed', 'delivered', 'published', 'cancelled', 'aborted'].includes(t.status)
      )
    } catch { }
    finally { historyLoading.value = false }
  }

  function switchToTask(newId: string) {
    if (newId === taskId.value) return
    saveCache()
    messages.value = []
    taskTitle.value = ''
    taskDone.value = false
    taskInfo.value = null
    logs.value = []
    inputText.value = ''
    router.push('/chat/' + newId)
  }

  async function loadTask() {
    try {
      const t = await getTask(taskId.value)
      taskTitle.value = t.title
      taskInfo.value = t
      taskDone.value = ['completed', 'cancelled', 'aborted'].includes(t.status)
      getTaskLogs(taskId.value).then(l => logs.value = l).catch(() => {})

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
              reactTimeline: m.reactTimeline || (m.thoughts || m.toolCalls || m.observations
                ? [
                    ...(m.thoughts || []).map((t: TimelineItem) => ({ kind: 'thought' as const, text: t.text, ts: Date.now() })),
                    ...(m.toolCalls || []).map((t: TimelineItem) => ({ kind: 'tool' as const, name: t.name, args: t.args, status: t.status, result: t.result, _expanded: false, ts: Date.now() })),
                    ...(m.observations || []).map((o: TimelineItem) => ({ kind: 'observation' as const, text: o.text, ts: Date.now() })),
                  ]
                : undefined),
              streaming: false,
            }))
            syncProposals(t.proposals || [])
            console.log('🔍 AgentChat: 从 localStorage 恢复 ' + parsed.length + ' 条消息（含 ReAct 状态）')
            onScrollBottom()
            return
          }
        } catch { /* 缓存损坏 */ }
      }

      const ctx = (t.context || {}) as Record<string, unknown>
      const proposals = (t.proposals || []) as any[]
      console.log('🔍 AgentChat: localStorage 无缓存, proposals=' + proposals.length + '条, status=' + t.status)

      if (proposals.length > 0) {
        const initMsg = String(ctx['任务主体'] || t.title)
        const built: Array<{ role: string; content: string; reactTimeline?: TimelineItem[]; time?: string; version?: number; status?: string; feedback?: Record<string, unknown> }> = [{
          role: 'human', content: initMsg, time: formatTime(t.createdAt),
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
        onScrollBottom()
        return
      }

      const initMsg = String(ctx['任务主体'] || t.title)
      if (initMsg) {
        messages.value = [{ role: 'human', content: initMsg, time: formatTime(t.createdAt) }]
        saveCache()
        if (t.status === 'drafted') await sendMsg(initMsg)
      }
      onScrollBottom()
    } catch { ElMessage.error('加载任务失败') }
  }

  function syncProposalsLocal(_proposals: Array<{ version: number; content: string; timestamp: string; status: string }>) {
    // proposals 只在 TaskDetail 历史档案中查看
  }

  async function handleAgree() {
    agreeing.value = true
    try {
      await approveTask(taskId.value, { action: 'approved' })
      for (const msg of messages.value) {
        if (msg.role === 'proposal' && msg.status !== 'accepted') msg.status = 'accepted'
      }
      const t = await getTask(taskId.value)
      taskInfo.value = t
      taskDone.value = ['completed', 'cancelled', 'aborted'].includes(t.status)
      syncProposalsLocal(t.proposals || [])
      let fileUrl = ''
      let fileName = ''
      try {
        const json: any = await request.post(`/eros/tasks/${taskId.value}/export-md`)
        fileUrl = json?.url || ''
        fileName = json?.fileName || ''
      } catch { /* ignore */ }
      insertSummary(t, fileUrl, fileName)
      saveCache()
      triggerRef(messages)
      ElMessage.success('已同意方案')
    } catch { ElMessage.error('操作失败') }
    finally { agreeing.value = false }
  }

  const pendingSendKeys = new Set<string>()

  async function handleSend() {
    const text = inputText.value.trim()
    if (!text || agentLoading.value) return
    inputText.value = ''
    messages.value.push({ role: 'human', content: text, time: formatTime() })
    saveCache()
    onScrollBottom()
    await sendMsg(text)
  }

  async function sendMsg(text: string) {
    const idempotencyKey = crypto.randomUUID()
    if (pendingSendKeys.has(idempotencyKey)) return
    pendingSendKeys.add(idempotencyKey)

    const agentMsg = {
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
    onScrollBottom()

    const sock = ws.socket.value
    if (sock?.connected) {
      pendingSendKeys.delete(idempotencyKey)

      sock.off('chat.started')
      sock.off('chat.event')
      sock.off('chat.done')
      sock.off('chat.aborted')
      sock.off('chat.error')

      sock.on('chat.started', (_payload: WsPayload) => {
        messages.value[msgIdx].statusHint = 'Agent 正在思考...'
      })

      sock.on('chat.event', (payload: WsPayload) => {
        onEvent(payload, msgIdx)
      })

      sock.on('chat.done', (payload: WsPayload) => {
        messages.value[msgIdx].agentFooter = {
          name: payload.agentName || 'AI 执行官',
          model: payload.model || usedModel.value || chatModel.value || '',
          ts: formatFooterTime(),
        }
        messages.value[msgIdx].streaming = false
        isStreaming.value = false
        isLoading.value = false
        agentLoading.value = false
        onSaveReActCache()
      })

      sock.on('chat.aborted', (payload: WsPayload) => {
        if (payload.partialContent) messages.value[msgIdx].content = payload.partialContent
        messages.value[msgIdx].content += '\n\n*[已中止]*'
        messages.value[msgIdx].streaming = false
        isStreaming.value = false
        isLoading.value = false
        agentLoading.value = false
        saveCache()
      })

      sock.on('chat.error', (payload: WsPayload) => {
        messages.value[msgIdx].content = (payload.message || '会话失败')
        messages.value[msgIdx].streaming = false
        isStreaming.value = false
        isLoading.value = false
        agentLoading.value = false
        onSaveReActCache()
      })

      const history = messages.value.slice(0, -2).map((m: any) => ({ role: m.role, content: m.content }))
      ws.send('chat.send', { sessionKey: taskId.value, message: text, history, idempotencyKey, model: eraSettings.agent.defaultModel })
      agentLoading.value = true
      return
    }

    // SSE fallback
    try {
      const token = localStorage.getItem('access_token') || ''
      pendingSendKeys.delete(idempotencyKey)
      const sseHistory = messages.value.slice(0, -2).map((m: any) => ({ role: m.role, content: m.content }))
      const streamRes = await fetch('/api/eros/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({ message: text, history: sseHistory, idempotencyKey, model: eraSettings.agent.defaultModel }),
      })

      if (!streamRes.ok) {
        messages.value[msgIdx].content = '⚠️ 流连接失败 (' + streamRes.status + ')'
        messages.value[msgIdx].streaming = false
        isStreaming.value = false; isLoading.value = false
        agentLoading.value = false
        saveCache()
        return
      }

      const reader = streamRes.body!.getReader()
      const decoder = new TextDecoder('utf-8', { fatal: false })
      let decodeErrors = 0
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
            isStreaming.value = false; isLoading.value = false
            agentLoading.value = false
            if (heartbeatTimer) clearInterval(heartbeatTimer)
            saveCache()
            onScrollBottom()
            return
          }
          const decoded = decoder.decode(value, { stream: true })
          const replacementCount = decoded.split('\uFFFD').length - 1
          if (replacementCount > 0) {
            decodeErrors += replacementCount
            console.warn('[SSE] UTF-8 解码替换 #' + decodeErrors + ': ' + replacementCount + ' 个 U+FFFD')
          }
          buffer += decoded
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const json = JSON.parse(line.slice(6))
              if (json.type === 'ack') {
                messages.value[msgIdx].statusHint = 'Agent 正在思考...'
              } else if (json.type === 'model') {
                usedModel.value = json.model || ''
              } else if (json.type === 'done') {
                messages.value[msgIdx].agentFooter = {
                  name: json.agentName || 'AI 执行官',
                  model: json.model || usedModel.value || chatModel.value || '',
                  ts: formatFooterTime(),
                }
                messages.value[msgIdx].streaming = false
                isStreaming.value = false
                isLoading.value = false
                agentLoading.value = false
                if (heartbeatTimer) clearInterval(heartbeatTimer)
                onSaveReActCache()
                getTask(taskId.value).then(t => {
                  taskInfo.value = t
                  taskDone.value = ['completed', 'cancelled', 'aborted'].includes(t.status)
                  syncProposalsLocal(t.proposals || [])
                }).catch(() => {})
              } else if (json.type === 'aborted') {
                if (json.partialContent) messages.value[msgIdx].content = json.partialContent
                messages.value[msgIdx].content += '\n\n*[已中止]*'
                messages.value[msgIdx].streaming = false
                isStreaming.value = false
                isLoading.value = false
                agentLoading.value = false
                if (heartbeatTimer) clearInterval(heartbeatTimer)
                saveCache()
              } else if (json.type === 'error') {
                messages.value[msgIdx].content = '⚠️ ' + json.message
                messages.value[msgIdx].streaming = false
                isStreaming.value = false
                isLoading.value = false
                agentLoading.value = false
                if (heartbeatTimer) clearInterval(heartbeatTimer)
                onSaveReActCache()
              } else {
                onEvent(json, msgIdx)
              }
            } catch { /* skip malformed */ }
          }
          if (messages.value[msgIdx]?.streaming !== false) read()
        }).catch(() => {
          messages.value[msgIdx].streaming = false
          isStreaming.value = false; isLoading.value = false
          agentLoading.value = false
          if (heartbeatTimer) clearInterval(heartbeatTimer)
          saveCache()
        })
      }
      read()
    } catch {
      messages.value[msgIdx].content = '⚠️ 发送失败'
      messages.value[msgIdx].streaming = false
      isStreaming.value = false; isLoading.value = false
      agentLoading.value = false
      saveCache()
    }
  }

  async function handleAbort() {
    const token = localStorage.getItem('access_token') || ''
    const lastMsg = messages.value[messages.value.length - 1]
    if (!lastMsg || lastMsg.role !== 'agent' || !lastMsg.streaming) return

    try {
      const res = await fetch('/api/eros/chat/abort-by-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({ sessionKey: taskId.value }),
      })
      if (res.ok) {
        lastMsg.streaming = false
        lastMsg.content += '\n\n*[已中止]*'
        isStreaming.value = false; isLoading.value = false
        agentLoading.value = false
        saveCache()
        triggerRef(messages)
      }
    } catch {
      ElMessage.error('中止失败，请刷新页面')
    }
  }

  function saveCache() {
    onSaveReActCache()
  }

  return {
    taskId, taskTitle, taskDone, taskInfo, logs, inputText, agentLoading,
    isLoading, isStreaming, agreeing, showAgreeBtn, chatBodyRef,
    historyTasks, historyLoading,
    loadTask, loadHistoryTasks, switchToTask, handleSend, handleAbort, handleAgree,
    saveCache, ws,
  }
}
