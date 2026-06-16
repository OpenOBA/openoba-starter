<template>
  <div class="agent-chat">
    <!-- 悬浮 Header -->
    <div class="chat-header-floating">
      <el-button link type="primary" @click="$router.push('/tasks')">
        <el-icon><ArrowLeft /></el-icon> 返回
      </el-button>
      <div class="header-info">
        <h3>{{ taskTitle || 'Agent 对话' }}</h3>
        <el-select
          v-model="chatModel"
          size="small"
          :loading="loadingChatModels"
          style="width:240px;margin-left:12px"
          placeholder="选择模型"
        >
          <el-option
            v-for="m in chatModels"
            :key="m.value"
            :label="m.label"
            :value="m.value"
          />
        </el-select>
      </div>
    </div>

    <!-- 主体三栏 -->
    <div class="chat-main">
      <!-- 左侧：任务信息 -->
      <!-- 左侧：任务信息 + 历史任务 → P1-3b 独立组件 -->
      <AgentChatSidebar
        :task-info="taskInfo"
        :task-id="taskId"
        :history-tasks="historyTasks"
        :history-loading="historyLoading"
        @switch-task="switchToTask"
      />

      <!-- 中栏：对话区 -->
      <div class="chat-mid">
        <div class="chat-body" ref="chatBodyRef">
          <div v-for="(msg, i) in messages" :key="i">
            <div v-if="msg.role === 'human'" class="chat-bubble human">
              <div class="bubble-meta"><svg class="bubble-avatar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#user"/></svg><span>You</span><span>{{ msg.time }}</span></div>
              <div class="bubble-text" v-html="renderMarkdown(msg.content)"></div>
            </div>
            <div v-else-if="msg.role === 'agent'" class="chat-bubble agent">
              <div class="bubble-meta"><svg class="bubble-avatar agent-avatar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#bot"/></svg><span>Agent</span><span>{{ msg.time }}</span></div>
              <div v-if="msg.statusHint" class="bubble-status">{{ msg.statusHint }}</div>
              <!-- ReAct 统一时间线：按实际到达顺序渲染 thought/tool/observation -->
              <div v-if="msg.reactTimeline && msg.reactTimeline.length > 0" class="react-timeline">
                <template v-for="(item, ti) in msg.reactTimeline" :key="'rt'+ti">
                  <!-- 💭 思考 -->
                  <div v-if="item.kind === 'thought'" class="thought-bubble">
                    {{ item.text }}
                  </div>
                  <!-- 🔧 工具调用卡片 -->
                  <div v-else-if="item.kind === 'tool'" class="tool-card" :class="{ done: item.status === 'done' }">
                    <div class="tool-card-head" @click="item._expanded = !item._expanded">
                      <span>{{ item.status === 'done' ? '✅' : '🔧' }} {{ item.name }}</span>
                      <span class="tool-arrow">{{ item._expanded ? '收起' : '展开' }}</span>
                    </div>
                    <div v-if="item._expanded" class="tool-card-body">
                      <div class="tool-args">参数: {{ JSON.stringify(item.args) }}</div>
                      <!-- M3.1: 进度条 -->
                      <div v-if="item.progress" class="tool-progress">
                        <div class="tool-progress-bar" :style="{ width: (item.progress.current / item.progress.total * 100) + '%' }"></div>
                        <span class="tool-progress-text">{{ item.progress.current }}/{{ item.progress.total }} {{ item.progress.message }}</span>
                      </div>
                      <!-- M3.1: 实时流式输出 -->
                      <div v-if="item.streamLines && item.streamLines.length > 0" class="tool-stream">
                        <div v-for="(line, li) in item.streamLines.slice(-50)" :key="'sl'+li" class="tool-stream-line">{{ line }}</div>
                      </div>
                      <div class="tool-result" v-if="item.result">{{ item.result }}</div>
                    </div>
                  </div>
                  <!-- 📋 观察 -->
                  <div v-else-if="item.kind === 'observation'" class="obs-line">
                    {{ item.text }}
                  </div>
                </template>
              </div>
              <div v-if="msg.streaming" class="bubble-text streaming">{{ msg.content }}<span class="cursor">|</span></div>
              <div v-else class="bubble-text" v-html="renderMarkdown(msg.content)"></div>
              <div v-if="!msg.streaming && msg.content && msg.agentFooter" class="agent-footer">
                <span class="footer-name">{{ msg.agentFooter.name }}</span>
                <span class="footer-sep">·</span>
                <span class="footer-time">{{ msg.agentFooter.ts }}</span>
                <span class="footer-sep">·</span>
                <span class="footer-model">{{ msg.agentFooter.model }}</span>
              </div>
            </div>
            <div v-else class="chat-bubble system">
              <div class="bubble-text" v-html="renderMarkdown(msg.content)"></div>
            </div>
          </div>
        </div>

        <!-- 底部输入 -->
        <div class="chat-input-bar" v-if="!taskDone">
          <el-input
            v-model="inputText"
            type="textarea"
            :rows="2"
            placeholder="输入消息..."
            :disabled="agentLoading"
            @keydown.enter.exact.prevent="handleSend"
          />
          <div class="input-actions">
            <span class="input-hint">Enter 发送</span>
            <div>
              <el-button v-if="isStreaming" size="small" type="danger" @click="handleAbort">
                停止
              </el-button>
              <el-button v-if="showAgreeBtn" size="small" type="success" :loading="agreeing" @click="handleAgree">
                同意方案
              </el-button>
              <el-button type="primary" size="small" :loading="isLoading" :disabled="!inputText.trim()" @click="handleSend">
                发送
              </el-button>
            </div>
          </div>
        </div>
        <div v-else class="chat-done-bar">
          任务已结束
          <el-button size="small" @click="$router.push('/tasks/' + taskId)">查看历史</el-button>
        </div>
      </div>

      <!-- 右侧：认知日志 -->
      <!-- 右侧：认知日志 → P1-3b 独立组件 -->
      <AgentChatLogPanel :logs="logs" />
</template>

<script setup lang="ts">
// ── 类型定义 ──
interface ChatMsg {
  role: 'human' | 'agent' | 'system'
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
interface TimelineItem {
  kind: 'thought' | 'tool' | 'observation'
  text?: string
  name?: string
  args?: Record<string, unknown>
  result?: string
  status?: string
  durationMs?: number
  ts?: number
}
interface WsPayload {
  runId?: string
  type?: string
  delta?: string
  message?: string
  partialContent?: string
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
}
import { ref, shallowRef, triggerRef, computed, onMounted, nextTick, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Promotion } from '@element-plus/icons-vue'
import { getTask, getTaskLogs, approveTask, queryTasks } from '@/api/task-engine'
import type { AgentTask, TaskStatus } from '@/api/task-engine'
import request from '@/api/request'
import { useWsClient } from '@/composables/useWsClient'
import { useERASettings } from '@/composables/useERASettings'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import AgentChatSidebar from '@/components/AgentChatSidebar.vue'
import AgentChatLogPanel from '@/components/AgentChatLogPanel.vue'

const route = useRoute()
const router = useRouter()

// ── 状态 ──
const taskId = computed(() => route.params.id as string)
const taskTitle = ref('')
const taskDone = ref(false)
const messages = shallowRef<any[]>([])  // shallowRef — 手动 triggerRef 控制渲染时机
const inputText = ref('')
const agentLoading = ref(false)
const isLoading = ref(false)       // M1-6: ACK 后 = true（发送按钮 loading）
const isStreaming = ref(false)     // M1-7: 流式接收中（控制停止按钮显示）
const agreeing = ref(false)
const usedModel = ref('')

function formatFooterTime(): string {
  const now = new Date()
  return `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
}
const chatBodyRef = ref<HTMLElement>()

const LS_KEY = computed(() => 'chat-' + taskId.value)

// M2: WebSocket 客户端（WS 优先 + SSE 降级）
const ws = useWsClient()
const { settings: eraSettings } = useERASettings()

// ── P1-1: ERA-Chat 首页模型下拉框 ──
const chatModels = ref<Array<{ value: string; label: string }>>([])
const loadingChatModels = ref(false)
const chatModel = ref(eraSettings.agent.defaultModel || '')

async function loadChatModels() {
  loadingChatModels.value = true
  try {
    const res: any = await request.get('/system/llm/providers')
    if (res?.success && Array.isArray(res.providers)) {
      const models: Array<{ value: string; label: string }> = []
      for (const p of res.providers) {
        for (const m of (p.models || [])) {
          const modelId = m.modelCode || m.id
          const modelName = (p.providerName || p.name) + ' · ' + (m.modelName || m.name)
          models.push({ value: modelId, label: modelName })
        }
      }
      chatModels.value = models
      if (!chatModel.value && models.length > 0) {
        chatModel.value = eraSettings.agent.defaultModel || models[0].value
      }
    }
  } catch { /* silent */ }
  finally { loadingChatModels.value = false }
}

// 模型切换时更新 eraSettings
watch(chatModel, (val) => {
  if (val) eraSettings.agent.defaultModel = val
})

// 任务信息（中缝显示）
const taskInfo = ref<any>(null)
// 认知日志
const logs = ref<any[]>([]);

const historyTasks = ref<any[]>([])
const historyLoading = ref(false)

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


// ── 加载任务 → localStorage 优先 ──
async function loadTask() {
  try {
    const t = await getTask(taskId.value)
    taskTitle.value = t.title
    taskInfo.value = t
    taskDone.value = ['completed', 'cancelled', 'aborted'].includes(t.status)
    getTaskLogs(taskId.value).then(l => logs.value = l).catch(() => {})

    // 🔑 1. localStorage 缓存优先（V1.5: 完整 ReAct 状态恢复）
    const cached = localStorage.getItem(LS_KEY.value)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // 恢复完整状态（统一时间线: reactTimeline 或 旧版 thoughts/toolCalls/observations）
          messages.value = parsed.map((m: ChatMsg) => ({
            role: m.role,
            content: m.content || '',
            time: m.time || '',
            agentFooter: m.agentFooter || undefined,
            reactTimeline: m.reactTimeline || (m.thoughts || m.toolCalls || m.observations
              ? [
                  ...(m.thoughts || []).map((t: TimelineItem) => ({ kind: 'thought', text: t.text, ts: Date.now(), text: t.text, ts: Date.now() })),
                  ...(m.toolCalls || []).map((t: TimelineItem) => ({ kind: 'tool' as const, name: t.name, args: t.args, status: t.status, result: t.result, _expanded: false, ts: Date.now() })),
                  ...(m.observations || []).map((o: TimelineItem) => ({ kind: 'observation', text: o.text, ts: Date.now() })),
                ]
              : undefined),
            streaming: false,
          }))
          syncProposals(t.proposals || [])
          console.log('🔍 AgentChat: 从 localStorage 恢复 ' + parsed.length + ' 条消息（含 ReAct 状态）')
          scrollBottom()
          return
        }
      } catch { /* 缓存损坏 */ }
    }

    // 🔑 2. fallback: proposals → 构建初始对话
    const ctx = (t.context || {}) as Record<string, unknown>
    const proposals = (t.proposals || []) as any[]
    console.log('🔍 AgentChat: localStorage 无缓存, proposals=' + proposals.length + '条, status=' + t.status)

    if (proposals.length > 0) {
      const initMsg = String(ctx['任务主体'] || t.title)
      const built: Array<{ role: string; content: string; reactTimeline?: TimelineItem[] }> = [{
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
      scrollBottom()
      return
    }

    // 🔑 3. 全新任务
    const initMsg = String(ctx['任务主体'] || t.title)
    if (initMsg) {
      messages.value = [{ role: 'human', content: initMsg, time: formatTime(t.createdAt) }]
      saveCache()
      if (t.status === 'drafted') await sendMsg(initMsg)
    }
    scrollBottom()
  } catch { ElMessage.error('加载任务失败') }
}

// ── 显示「同意方案」按钮 ──
const showAgreeBtn = computed(() => {
  if (taskDone.value) return false
  if (agentLoading.value) return false
  // 只要有 Agent 回复就显示
  const hasAgentReply = messages.value.some((m: ChatMsg) => m.role === 'agent' && m.content && !m.streaming)
  return hasAgentReply
})

// ── 提案同步：更新任务信息中的 proposals 状态（不在对话中显示卡片）──
function syncProposals(_proposals: Array<{ version: number; content: string; timestamp: string; status: string }>) {
  // proposals 只在 TaskDetail 历史档案中查看
  // 此函数仅做状态同步，不向对话插入卡片
}

// ── 提案操作 ──
async function handleAgree() {
  agreeing.value = true
  try {
    await approveTask(taskId.value, { action: 'approved' })
    // 更新本地 proposal 卡片状态
    for (const msg of messages.value) {
      if (msg.role === 'proposal' && msg.status !== 'accepted') msg.status = 'accepted'
    }
    // 刷新任务状态获取最新信息
    const t = await getTask(taskId.value)
    taskInfo.value = t
    taskDone.value = ['completed', 'cancelled', 'aborted'].includes(t.status)
    syncProposals(t.proposals || [])
    // 导出方案为 MD 文件
    let fileUrl = ''
    let fileName = ''
    try {
      const json: any = await request.post(`/eros/tasks/${taskId.value}/export-md`)
      fileUrl = json?.url || ''
      fileName = json?.fileName || ''
    } catch { /* ignore */ }
    // 在对话中插入执行总结
    insertSummary(t, fileUrl, fileName)
    saveCache()
    triggerRef(messages)
    ElMessage.success('已同意方案')
  } catch { ElMessage.error('操作失败') }
  finally { agreeing.value = false }
}

function insertSummary(t: TimelineItem, fileUrl: string, fileName: string) {
  const proposals = t.proposals || []
  const hasProposal = proposals.length > 0
  const lines: string[] = ['**方案已同意 · 执行总结**', '']
  if (hasProposal) {
    const last = proposals[proposals.length - 1]
    const modelMatch = last.content?.match(/🤖 使用模型: (.+)/)
    const kbMatch = last.content?.match(/📚 引用知识: (.+)/)
    if (modelMatch) lines.push(`**模型**：${modelMatch[1]}`)
    if (kbMatch) lines.push(`**知识引用**：${kbMatch[1]}`)
    lines.push(`**版本**：V${last.version}`)
  }
  const allTools: string[] = []
  for (const m of messages.value) {
    if (m.role === 'agent' && m.toolCalls) {
      for (const tc of m.toolCalls || []) {
        if (!allTools.includes(tc.name)) allTools.push(tc.name)
      }
    }
  }
  if (allTools.length > 0) lines.push(`**调用工具**：${allTools.join('、')}`)
  lines.push(`**任务编号**：[${t.taskNo}](/tasks/${t.id})`)
  lines.push(`**历史档案**：[查看提案记录](/tasks/${t.id})`)
  if (fileUrl && fileName) {
    lines.push('')
    lines.push(`**方案文件**：[${fileName}](${fileUrl})  ← 右键另存 / 用 Markdown 编辑器打开`)
  }
  lines.push('')
  lines.push(` ${new Date().toLocaleString('zh-CN')}`)
  messages.value.push({ role: 'system', content: lines.join('\n'), time: formatTime() })
}

// ── 发送消息 ──
// M1-6: 两步发送 — 先 ACK 再 SSE
const pendingSendKeys = new Set<string>()  // M1-9: 前端幂等去重

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || agentLoading.value) return
  inputText.value = ''
  messages.value.push({ role: 'human', content: text, time: formatTime() })
  saveCache()
  scrollBottom()
  await sendMsg(text)
}

async function sendMsg(text: string) {
  // M1-9: 幂等Key生成
  const idempotencyKey = crypto.randomUUID()
  if (pendingSendKeys.has(idempotencyKey)) return
  pendingSendKeys.add(idempotencyKey)

  // M1-6: 立即显示 "Agent 正在思考..."
  const agentMsg: { role: string; content: string; streaming: boolean; reactTimeline?: TimelineItem[] } = {
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

    // 注册 WS 事件监听（每次消息使用新的 msgIdx）
    ws.socket.off('chat.started')
    ws.socket.off('chat.event')
    ws.socket.off('chat.done')
    ws.socket.off('chat.aborted')
    ws.socket.off('chat.error')

    ws.socket.on('chat.started', (payload: WsPayload) => {
      messages.value[msgIdx].statusHint = 'Agent 正在思考...'
    })

    ws.socket.on('chat.event', (payload: WsPayload) => {
      handleSSEEvent(payload, msgIdx)
    })

    ws.socket.on('chat.done', (payload: WsPayload) => {
      messages.value[msgIdx].agentFooter = {
        name: payload.agentName || 'Agent',
        model: payload.model || '',
        ts: formatFooterTime(),
      }
      messages.value[msgIdx].streaming = false
      isStreaming.value = false
      isLoading.value = false
      agentLoading.value = false
      saveReActCache()
    })

    ws.socket.on('chat.aborted', (payload: WsPayload) => {
      if (payload.partialContent) messages.value[msgIdx].content = payload.partialContent
      messages.value[msgIdx].content += '\n\n*[已中止]*'
      messages.value[msgIdx].streaming = false
      isStreaming.value = false
      isLoading.value = false
      agentLoading.value = false
      saveCache()
    })

    ws.socket.on('chat.error', (payload: WsPayload) => {
      messages.value[msgIdx].content = (payload.message || '会话失败')
      messages.value[msgIdx].streaming = false
      isStreaming.value = false
      isLoading.value = false
      agentLoading.value = false
      saveReActCache()
    })

    // 构建 history
    const history = messages.value.slice(0, -2).map(m => ({ role: m.role, content: m.content }))
    ws.send('chat.send', { sessionKey: taskId.value, message: text, history, idempotencyKey, model: eraSettings.agent.defaultModel })
    agentLoading.value = true
    return
  }

  // M2: SSE 降级路径（一步式 — POST /chat 直接返回 SSE 流 + ACK）
  try {
    const token = localStorage.getItem('access_token') || ''
    pendingSendKeys.delete(idempotencyKey)
    // 构建 history（SSE路径）
    const sseHistory = messages.value.slice(0, -2).map(m => ({ role: m.role, content: m.content }))
    // ── 一步式：POST /api/eros/chat → SSE 流 ──
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
      let lastEventTime = Date.now()  // M1-8: 心跳检测
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null

    // M1-8: 心跳超时检测（35s 无事件 → 提示重连）
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
          scrollBottom()
          return
        }
          const decoded = decoder.decode(value, { stream: true })
          const replacementCount = decoded.split('\uFFFD').length - 1
          if (replacementCount > 0) {
            decodeErrors += replacementCount
            console.warn('[SSE] UTF-8 解码替换 #' + decodeErrors + ': ' + replacementCount + ' 个 U+FFFD（chunk=' + value.byteLength + 'B）')
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
                model: json.model || usedModel.value || '',
                ts: formatFooterTime(),
              }
              messages.value[msgIdx].streaming = false
              isStreaming.value = false
              isLoading.value = false
              agentLoading.value = false
              if (heartbeatTimer) clearInterval(heartbeatTimer)
              saveReActCache()
              getTask(taskId.value).then(t => {
                taskInfo.value = t
                taskDone.value = ['completed', 'cancelled', 'aborted'].includes(t.status)
                syncProposals(t.proposals || [])
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
              saveReActCache()
            } else {
              handleSSEEvent(json, msgIdx)
            }
          } catch { /* skip malformed lines */ }
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

// ── M1-7: 中止 Agent ──
async function handleAbort() {
  // 从最近一条 agent 消息中找到 runId（从 stream URL 解析不方便，改用 chat/start 端点）
  // 简化方案：中止所有正在进行中的请求（单会话单 run 场景）
  const token = localStorage.getItem('access_token') || ''
  const lastMsg = messages.value[messages.value.length - 1]
  if (!lastMsg || lastMsg.role !== 'agent' || !lastMsg.streaming) return

  try {
    // 用当前 taskId 作为 session 标识，调用 abort
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

// ── 辅助 ──
// ── M2: 共享 SSE/WS 事件处理（统一时间线版）──
function handleSSEEvent(json: ChatSSEEvent, msgIdx: number) {
  if (!messages.value[msgIdx]) return

  if (json.type === 'heartbeat') return

  // 初始化统一时间线
  const msg = messages.value[msgIdx]
  msg.reactTimeline = msg.reactTimeline || []

  if (json.type === 'thought') {
    // V1.3: 流式 thought 事件多条追加而非覆盖
    // 思维链通过多个 SSE chunk 分阶段推送，需要在同一条目上累积
    const last = msg.reactTimeline[msg.reactTimeline.length - 1]
    if (last?.kind === 'thought' && last._streaming !== false) {
      last.text += json.text
    } else {
      msg.reactTimeline.push({ kind: 'thought', text: json.text, ts: Date.now(), _streaming: true })
    }
    msg.statusHint = `${json.text.substring(0, 60)}...`
    triggerRef(messages)
  } else if (json.type === 'tool_start') {
    // 标记上一个 thought 流结束
    const lastThought = msg.reactTimeline[msg.reactTimeline.length - 1]
    if (lastThought?.kind === 'thought') lastThought._streaming = false
    const entry = { kind: 'tool' as const, name: json.tool, args: json.args, status: 'running' as const, result: '', _expanded: false, ts: Date.now() }
    msg.reactTimeline.push(entry)
    msg.statusHint = `正在执行: ${json.tool}...`
    triggerRef(messages)
  } else if (json.type === 'observation') {
    msg.reactTimeline.push({ kind: 'observation', text: json.text, ts: Date.now() })
    msg.statusHint = `${json.text.substring(0, 60)}...`
    triggerRef(messages)
  } else if (json.type === 'tool_progress') {
    // 更新时间线上同名工具的进度
    for (let i = msg.reactTimeline.length - 1; i >= 0; i--) {
      const item = msg.reactTimeline[i]
      if (item.kind === 'tool' && item.name === json.tool) {
        item.progress = { current: json.current, total: json.total, message: json.message }
        break
      }
    }
    msg.statusHint = `${json.tool}: ${json.current}/${json.total}`
    triggerRef(messages)
  } else if (json.type === 'tool_stream') {
    // 追加实时输出流到时间线上同名工具
    for (let i = msg.reactTimeline.length - 1; i >= 0; i--) {
      const item = msg.reactTimeline[i]
      if (item.kind === 'tool' && item.name === json.tool) {
        item.streamLines = item.streamLines || []
        item.streamLines.push(json.line)
        break
      }
    }
  } else if (json.type === 'tool_end') {
    // 找到时间线上最近的同名 running tool，更新为 done
    for (let i = msg.reactTimeline.length - 1; i >= 0; i--) {
      const item = msg.reactTimeline[i]
      if (item.kind === 'tool' && item.name === json.tool && item.status === 'running') {
        item.status = 'done'
        item.result = json.result
        item.durationMs = json.durationMs
        break
      }
    }
    msg.statusHint = ''
    saveReActCache()
    triggerRef(messages)
  } else if (json.type === 'content') {
    if (msg.statusHint) msg.statusHint = ''
    // V1.3: 标记上一个 thought 流结束
    const lastThought = msg.reactTimeline[msg.reactTimeline.length - 1]
    if (lastThought?.kind === 'thought') lastThought._streaming = false
    msg.content += json.delta
    triggerRef(messages)
  }
}

function formatTime(isoStr?: string): string {
  const d = isoStr ? new Date(isoStr) : new Date()
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function renderMarkdown(text: string): string {
  if (!text) return ''
  return DOMPurify.sanitize(marked.parse(text, { breaks: true, gfm: true }) as string)
}

/* V1.5 ReAct 缓存 — 保存完整消息状态（含 thoughts/toolCalls/observations） */
function saveReActCache() {
  try {
    const clean = messages.value.map((m: ChatMsg) => ({
      role: m.role,
      content: m.content || '',
      time: m.time || '',
      agentFooter: m.agentFooter || undefined,
      reactTimeline: m.reactTimeline ? m.reactTimeline.slice(-40).map((item: TimelineItem) => ({
        ...item,
        result: item.result ? item.result.substring(0, 500) : '',
      })) : undefined,
    }))
    // M23: 最大保留50条消息，防止localStorage溢出
    const trimmed = clean.slice(-50)
    localStorage.setItem(LS_KEY.value, JSON.stringify(trimmed))
  } catch (e) {
    console.warn('localStorage 写入失败:', e)
  }
}

/* 旧版兼容 — 删除 streaming 标记的基础版本，仅用于旧数据迁移 */
function saveCache() {
  saveReActCache()
}

function scrollBottom() {
  nextTick(() => {
    if (chatBodyRef.value) {
      chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
    }
  })
}

onMounted(() => {
  loadChatModels()
  if (!taskId.value || taskId.value === 'undefined') {
    ElMessage.error('无效任务')
    router.push('/chat')
    return
  }

  // M2: 连接 WebSocket（自动降级 SSE）
  ws.connect()

  loadTask()
  loadHistoryTasks()
})

// 组件卸载前兜底保存
onBeforeUnmount(() => {
  if (messages.value.length > 0) {
    saveCache()
  }
})

// 路由变化：从历史任务切换到新任务时自动重载
watch(() => route.params.id, (newId) => {
  if (newId) {
    loadTask()
    loadHistoryTasks()
  }
})
</script>

<style scoped>
/* ═══ ERA-Chat 视觉升级 ═══ */

.agent-chat { height: 100%; display: flex; flex-direction: column; max-width: 100%; margin: 0; background: linear-gradient(160deg, #f0f4fa 0%, #faf8fc 50%, #f0f7f8 100%); }

/* 悬浮 Header */
.chat-header-floating { position: sticky; top: 0; z-index: 210; display: flex; align-items: center; padding: 8px 12px 8px 192px; border-bottom: 1px solid rgba(3,105,161,0.08); gap: 8px; flex-shrink: 0; background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); }
.header-info { flex: 1; min-width: 0; }
.header-info h3 { margin: 0; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #1e293b; }
.header-model { font-size: 11px; color: #909399; }

/* 三栏主体 */
.chat-main { flex: 1; display: flex; overflow: hidden; }

/* 左栏 */
.chat-left { width: 180px; border-right: 1px solid rgba(3,105,161,0.08); overflow-y: auto; flex-shrink: 0; background: rgba(255,255,255,0.7); backdrop-filter: blur(8px); position: fixed; top: 0; left: 0; height: 100vh; z-index: 220; box-shadow: 1px 0 12px rgba(15,23,42,0.04); }
.left-card { padding: 12px; padding-top: 60px; }
.left-title { font-size: 12px; font-weight: 600; margin-bottom: 8px; color: #303133; }
.left-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; border-bottom: 1px solid #f0f2f5; }
.left-divider { border-top: 1px solid #ebeef5; margin: 6px 0; }

.history-tasks { padding: 0 12px 12px; overflow-y: auto; flex: 1; }
.history-item { padding: 8px; border-radius: 8px; cursor: pointer; margin-bottom: 4px; transition: all 0.15s; border: 1px solid transparent; }
.history-item:hover { background: rgba(3,105,161,0.04); border-color: rgba(3,105,161,0.1); }
.history-item.current { background: rgba(3,105,161,0.08); border-color: rgba(3,105,161,0.15); }
.history-title { font-size: 12px; font-weight: 500; color: #303133; line-height: 1.4; margin-bottom: 4px; }
.history-meta { display: flex; align-items: center; gap: 8px; }
.history-time { font-size: 10px; color: #c0c4cc; }
.history-loading, .history-empty { text-align: center; font-size: 11px; color: #c0c4cc; padding: 12px 0; }
.left-k { color: #909399; }
.left-v { font-weight: 500; text-align: right; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 中栏 */
.chat-mid { flex: 1; display: flex; flex-direction: column; min-width: 0; padding-left: 180px; }
.chat-body { flex: 1; overflow-y: auto; padding: 16px 24px; background: transparent; }
.chat-bubble { margin-bottom: 16px; padding: 14px 18px; border-radius: 16px; max-width: 85%; box-shadow: 0 2px 8px rgba(15,23,42,0.04); }
.chat-bubble.human { background: linear-gradient(135deg, #e8f4fd 0%, #dceefb 100%); margin-left: auto; border-bottom-right-radius: 6px; border: 1px solid rgba(3,105,161,0.08); }
.chat-bubble.agent { background: #ffffff; border-bottom-left-radius: 6px; border: 1px solid rgba(83,74,183,0.06); box-shadow: 0 2px 12px rgba(83,74,183,0.04); }
.chat-bubble.system { background: linear-gradient(135deg, #fef7e0 0%, #fdf4d0 100%); text-align: center; max-width: 100%; font-size: 12px; color: #909399; padding: 10px 16px; box-shadow: none; border-radius: 10px; }
.bubble-meta { display: flex; gap: 12px; margin-bottom: 6px; font-size: 11px; color: #909399; align-items: center; }
.bubble-avatar { width: 16px; height: 16px; color: #606266; flex-shrink: 0; }
.bubble-avatar.agent-avatar { color: #534AB7; }
.bubble-meta span:first-child { font-weight: 600; color: #606266; }
.bubble-text { font-size: 14px; line-height: 1.7; word-break: break-word; }
.bubble-text :deep(h1), .bubble-text :deep(h2), .bubble-text :deep(h3) { font-size: 15px; margin: 8px 0 4px; }
.bubble-text :deep(table) { border-collapse: collapse; margin: 8px 0; width: 100%; }
.bubble-text :deep(th), .bubble-text :deep(td) { border: 1px solid #dcdfe6; padding: 4px 8px; text-align: left; font-size: 12px; }
.bubble-text :deep(th) { background: #f5f7fa; font-weight: 600; }
.bubble-text :deep(code) { background: #f0f2f5; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
.bubble-text :deep(pre) { background: #f5f7fa; padding: 8px 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
.bubble-text :deep(a) { color: #409eff; text-decoration: underline; }
.bubble-text :deep(blockquote) { border-left: 3px solid #dcdfe6; padding-left: 10px; color: #909399; margin: 6px 0; }
.bubble-text :deep(ul), .bubble-text :deep(ol) { padding-left: 20px; margin: 4px 0; }
.bubble-text :deep(li) { margin: 2px 0; }
.bubble-status { font-size: 11px; color: #409eff; padding: 2px 0 4px; font-style: italic; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

/* ReAct 统一时间线 */
.react-timeline { margin: 4px 0; }
.thought-bubble { font-size: 11px; color: #909399; background: #f5f7fa; border-left: 3px solid #c0c4cc; padding: 4px 8px; border-radius: 0 6px 6px 0; margin-bottom: 3px; font-style: italic; line-height: 1.5; }
.obs-line { font-size: 10px; color: #67c23a; background: #f0f9eb; border-left: 3px solid #67c23a; padding: 3px 8px; border-radius: 0 6px 6px 0; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 工具调用卡片 */
.tool-card { border: 1px solid #d3d6db; border-radius: 6px; margin-bottom: 4px; overflow: hidden; }
.tool-card.done { border-color: #67c23a; }
.tool-card-head { display: flex; justify-content: space-between; padding: 5px 8px; background: #f5f7fa; cursor: pointer; font-size: 11px; }
.tool-card-head:hover { background: #e8eaed; }
.tool-arrow { color: #909399; font-size: 10px; }
.tool-card-body { padding: 6px 8px; font-size: 10px; }
.tool-args { color: #909399; margin-bottom: 4px; word-break: break-all; }
.tool-result { white-space: pre-wrap; max-height: 200px; overflow-y: auto; background: #fff; padding: 4px 6px; border-radius: 4px; color: #606266; }
/* M3.1: 工具进度条 */
.tool-progress { margin-bottom: 4px; }
.tool-progress-bar { height: 4px; background: #67c23a; border-radius: 2px; transition: width 0.3s; }
.tool-progress-text { font-size: 10px; color: #909399; display: block; margin-top: 2px; }
/* M3.1: 工具实时流式输出 */
.tool-stream { max-height: 200px; overflow-y: auto; background: #2b2b2b; color: #e0e0e0; padding: 4px 6px; border-radius: 4px; margin-bottom: 4px; font-family: 'Courier New', monospace; }
.tool-stream-line { font-size: 10px; line-height: 1.4; white-space: pre-wrap; word-break: break-all; }
.bubble-text.streaming { color: #606266; }
.cursor { animation: blink 1s infinite; color: #409eff; }
@keyframes blink { 0%,50% { opacity: 1; } 51%,100% { opacity: 0; } }
.input-hint { font-size: 11px; color: #c0c4cc; }
.chat-done-bar { padding: 12px 14px; border-top: 1px solid #e4e7ed; background: #f0f9eb; text-align: center; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 10px; flex-shrink: 0; }
.loading-hint { text-align: center; color: #909399; font-size: 12px; padding: 6px; }

/* 右侧：认知日志 */
.chat-right { width: 240px; overflow-y: auto; flex-shrink: 0; background: rgba(250,251,252,0.6); border-left: 1px solid rgba(3,105,161,0.06); }
.right-title { font-size: 12px; font-weight: 600; padding: 10px 12px 6px; color: #303133; position: sticky; top: 0; background: rgba(250,251,252,0.6); backdrop-filter: blur(4px); z-index: 2; }
.log-list { padding: 0 8px; }
.log-line { display: flex; align-items: center; gap: 5px; padding: 3px 4px; font-size: 10px; border-bottom: 1px solid #f0f0f0; }
.log-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
.log-actor { font-weight: 500; min-width: 36px; color: #606266; }
.log-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #303133; }
.log-time { color: #c0c4cc; font-size: 9px; flex-shrink: 0; }
.log-empty { text-align: center; color: #c0c4cc; font-size: 11px; padding: 20px; }

/* 输入栏 */
.chat-input-bar { padding: 10px 16px; border-top: 1px solid rgba(3,105,161,0.08); background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); flex-shrink: 0; position: relative; z-index: 1; border-radius: 0 0 12px 12px; }
.input-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.input-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.input-hint { font-size: 11px; color: #c0c4cc; }
.chat-done-bar { padding: 12px 16px; border-top: 1px solid #e4e7ed; background: #f0f9eb; text-align: center; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 10px; flex-shrink: 0; }
.send-btn { background: #409eff; border-color: #409eff; color: #000; border-radius: 20px; padding: 4px 20px; font-weight: 500; }
.send-btn:disabled { background: #a0cfff; border-color: #a0cfff; color: #000; }


.agent-footer {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid rgba(148,163,184,0.12);
  font-size: 11px;
  color: #94a3b8;
  display: flex;
  gap: 6px;
}
.footer-name { font-weight: 500; color: #64748b; }
.footer-sep { color: #cbd5e1; }</style>
