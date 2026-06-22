import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { AgentTask } from '@/api/task-engine'
import { queryTasks, createTask, deleteTask } from '@/api/task-engine'
import { getAgents } from '@/api/system'
import type { AgentEntry } from '@/components/AgentSidebar.vue'
import { useERASettings } from '@/composables/useERASettings'
import { useTemplates } from '@/composables/useTemplates'
import request from '@/api/request'
import { useUserStore } from '@/stores/user'

interface ChatMessage {
  role: 'human' | 'agent' | 'system'
  sender: string
  content: string
  time: string
  taskId?: string
  data?: string[]
  needConfirm?: boolean
  confirmText?: string
  confirmPayload?: { text: string; agentIds: string[]; taskType?: string }
}

const AGENT_STORAGE_KEY = 'eros_agents'
const defaultAgents: AgentEntry[] = [
  { id: 'main-agent', agentCode: 'main-agent', agentName: 'OpenOBA Main', displayName: 'MainAgent', icon: '', description: '总管 · L4', agentType: 'main', securityClearance: 'L4', status: 'active' },
]

function loadAgentsFromLocalStorage(): AgentEntry[] {
  try {
    const raw = localStorage.getItem(AGENT_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return [...defaultAgents]
}

export function useTaskDashboard() {
  const router = useRouter()
  const { settings: eraSettings } = useERASettings()
  const userStore = useUserStore()

  const loginUsername = computed(() => userStore.userInfo?.username || '用户')

  // ── 常用语模板 ──
  const { templates, applyTemplate, removeTemplate, resetTemplates } = useTemplates()

  // ── 模型选择 ──
  const selectedModel = ref(eraSettings.agent.defaultModel || '')
  const availableModels = ref<Array<{ value: string; label: string; isDefault: boolean }>>([])
  const loadingModels = ref(false)

  async function loadModels() {
    loadingModels.value = true
    try {
      const res: any = await request.get('/system/llm/providers')
      if (res?.success && Array.isArray(res.providers)) {
        const models: Array<{ value: string; label: string; isDefault: boolean }> = []
        for (const p of res.providers) {
          for (const m of (p.models || [])) {
            models.push({
              value: m.modelCode || m.id,
              label: `${p.providerName || p.name} · ${m.modelName || m.name}${m.isDefault ? ' ★' : ''}`,
              isDefault: !!m.isDefault,
            })
          }
        }
        availableModels.value = models
        if (!selectedModel.value && models.length > 0) {
          const defModel = models.find(m => m.isDefault)
          selectedModel.value = eraSettings.agent.defaultModel || defModel?.value || models[0].value
        }
      }
    } catch { /* silent */ }
    finally { loadingModels.value = false }
  }

  function onModelChange(val: string) {
    eraSettings.agent.defaultModel = val
  }

  // Agent 列表
  const agentList = ref<AgentEntry[]>(loadAgentsFromLocalStorage())

  async function loadAgentList() {
    try {
      const agents = await getAgents()
      if (agents && agents.length > 0) {
        agentList.value = agents.map((a: any) => ({
          id: a.agentCode || a.agentId,
          agentCode: a.agentCode,
          agentName: a.agentName,
          displayName: a.agentName,
          icon: '',
          description: `${a.agentType} · ${a.securityClearance}`,
          agentType: a.agentType,
          securityClearance: a.securityClearance,
          status: (a.status === 'active' ? 'active' : 'inactive') as 'active' | 'inactive',
        }))
      }
    } catch {
      agentList.value = loadAgentsFromLocalStorage()
    }
  }

  function saveAgents(agents: AgentEntry[]) {
    localStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(agents))
  }

  function goToAgentManagement() {
    router.push('/chat/agents')
  }

  // ── 任务状态 ──
  const loading = ref(false)
  const creating = ref(false)
  const tasks = ref<AgentTask[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const filterStatus = ref('')
  const searchKeyword = ref('')
  const displayLimit = ref(10)
  const hasMore = ref(false)
  const selectedIds = ref<string[]>([])

  // ── 消息 ──
  const messages = ref<ChatMessage[]>([])
  const chatAreaRef = ref<HTMLElement>()
  const callingInputRef = ref()

  function now() { return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }

  function scrollToBottom() {
    nextTick(() => {
      if (chatAreaRef.value) chatAreaRef.value.scrollTop = chatAreaRef.value.scrollHeight
    })
  }

  function onAgentsUpdate(agents: AgentEntry[]) {
    agentList.value = agents
    saveAgents(agents)
  }

  function onAgentSelect(agent: AgentEntry) {
    callingInputRef.value?.selectAgent(agent)
  }

  function quickTask(type: string) {
    const taskMap: Record<string, { text: string; type: string }> = {
      product: { text: '上架一款钛合金圆框系列，主打25-35岁轻奢女性', type: 'product_listing' },
      content: { text: '为钛合金圆框系列写一篇小红书种草笔记', type: 'content_creation' },
      data: { text: '分析最近销售数据，找出畅销款和滞销款', type: 'data_analysis' },
      service: { text: '处理客户关于镜框尺寸不合适需要换货的售后问题', type: 'customer_service' },
      code: { text: '修改前端商品列表页的排序逻辑，改为按销量降序', type: 'code_development' },
      custom: { text: '请描述你需要的功能或任务...', type: 'custom' },
    }
    const task = taskMap[type]
    if (!task) return
    handleCallingSend({ text: task.text, agentIds: [], taskType: task.type })
  }

  async function handleCallingSend({ text, agentIds, taskType }: { text: string; agentIds: string[]; files?: File[]; taskType?: string }) {
    const t = now()
    const msgData = agentIds.length > 0 ? agentIds.map(id => '@' + (agentList.value.find(a => a.id === id)?.displayName || id)) : undefined

    messages.value.push({
      role: 'human', sender: loginUsername.value as string, content: text, time: t, data: msgData,
    })
    scrollToBottom()

    const confirmLines = ['收到：' + text, '', '你还有什么要补充的吗？']
    messages.value.push({
      role: 'agent', sender: 'Agent', content: confirmLines.join('\n'), time: now(),
      needConfirm: true, confirmText: '确认以上任务内容无误后，点击「立即执行」开始',
      confirmPayload: { text, agentIds, taskType: taskType || 'product_listing' },
    })
    scrollToBottom()
  }

  function cancelConfirm(idx: number) {
    messages.value.splice(idx, 1)
  }

  async function executeConfirm(idx: number) {
    const msg = messages.value[idx]
    if (!msg || !msg.confirmPayload) return

    creating.value = true
    try {
      const { text, agentIds, taskType } = msg.confirmPayload
      const title = text.substring(0, 80)
      const agentId = agentIds.length === 1 ? agentIds[0] : agentIds.length > 1 ? 'main-agent' : ''
      const task = await createTask({
        title, type: taskType || 'product_listing',
        context: { description: text }, reportTo: 'rt-l1-product',
        createdBy: '', agentId: agentId || undefined,
      })
      const taskId = (task as any).id || (task as any).taskId || ''
      if (!taskId) { ElMessage.error('任务创建失败'); return }

      msg.needConfirm = false; msg.taskId = taskId
      msg.content = '收到：' + text + '\n\n任务已创建，正在进入执行...'
      ElMessage.success('任务已创建')
      router.push('/chat/' + taskId)
    } catch (e: unknown) {
      ElMessage.error('创建失败: ' + ((e as any)?.message || e))
    } finally { creating.value = false }
  }

  async function loadTasks() {
    loading.value = true
    try {
      const params: Record<string, number | string> = {
        page: 1, pageSize: searchKeyword.value ? 50 : pageSize.value,
      }
      if (filterStatus.value) params.status = filterStatus.value
      if (searchKeyword.value) params.search = searchKeyword.value
      const res = await queryTasks(params)
      tasks.value = res.items; total.value = res.total
      hasMore.value = total.value > displayLimit.value
    } catch { /* ignore */ } finally { loading.value = false }
  }

  function loadMore() {
    displayLimit.value += 20
    hasMore.value = total.value > displayLimit.value
  }

  function handleSelectionChange(rows: AgentTask[]) {
    selectedIds.value = rows.map(r => r.id)
  }

  async function batchDelete() {
    if (selectedIds.value.length === 0) return
    try {
      for (const id of selectedIds.value) await deleteTask(id)
      ElMessage.success(`已删除 ${selectedIds.value.length} 个任务`)
      selectedIds.value = []
      loadTasks()
    } catch (e: unknown) {
      ElMessage.error('删除失败: ' + ((e as any)?.message || e))
    }
  }

  function goDetail(task: AgentTask) { router.push(`/chat/${task.id}`) }
  function goToTask(taskId: string) { router.push('/chat/' + taskId) }

  onMounted(() => { loadAgentList(); loadTasks(); loadModels() })

  return {
    // refs
    selectedModel, availableModels, loadingModels,
    agentList, loading, creating, tasks, total, page, pageSize, filterStatus, searchKeyword,
    displayLimit, hasMore, selectedIds, messages, chatAreaRef, callingInputRef,
    // template composable
    templates, applyTemplate, removeTemplate, resetTemplates,
    // methods
    onModelChange, loadModels, loadAgentList, saveAgents, goToAgentManagement,
    onAgentsUpdate, onAgentSelect, quickTask, handleCallingSend, cancelConfirm,
    executeConfirm, loadTasks, loadMore, handleSelectionChange, batchDelete,
    goDetail, goToTask,
  }
}
