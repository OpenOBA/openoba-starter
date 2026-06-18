<template>
  <div class="task-dashboard">
    <!-- 顶部 Header：标题 + 模型选择 -->
    <div class="dash-header">
      <div class="dash-brand">
        <img src="@/assets/logos/openoba-logo.svg" class="dash-logo" alt="OpenOBA" />
        <h2 class="dash-title">ERA-Chat</h2>
      </div>
      <div class="dash-model-select">
        <label class="dash-model-label">默认模型</label>
        <el-select
          v-model="selectedModel"
          size="small"
          :loading="loadingModels"
          style="width:240px"
          placeholder="选择默认模型"
          @change="onModelChange"
        >
          <el-option
            v-for="m in availableModels"
            :key="m.value"
            :label="m.label"
            :value="m.value"
          />
        </el-select>
      </div>
    </div>

    <!-- 对话区 -->
    <div class="main-area">
      <AgentSidebar :agents="agentList" @select="onAgentSelect" @create="goToAgentManagement" @update:agents="onAgentsUpdate" />

      <EraChatWelcome
        ref="eraChatWelcomeRef"
        :agent-list="agentList"
        :creating="creating"
        :messages="messages"
        :task-done="false"
        :templates="templates"
        @quick-task="quickTask"
        @send="handleCallingSend"
        @agent-select="onAgentSelect"
        @template-edit="handleTemplateEdit"
        @template-remove="removeTemplate"
        @template-add="handleTemplateAdd"
        @template-reset="resetTemplates"
        @template-apply="applyTemplate"
        @templates-saved="onTemplatesSaved"
        @cancel-confirm="cancelConfirm"
        @execute-confirm="executeConfirm"
        @go-to-task="goToTask"
      />

      <TaskListPanel
        :tasks="tasks"
        :total="total"
        :loading="loading"
        :display-limit="displayLimit"
        :search-keyword="searchKeyword"
        :filter-status="filterStatus"
        :page="page"
        :page-size="pageSize"
        :has-more="hasMore"
        :selected-ids="selectedIds"
        @update:search-keyword="(val: string) => { searchKeyword = val; loadTasks() }"
        @update:filter-status="(val: string) => { filterStatus = val; loadTasks() }"
        @load-tasks="loadTasks"
        @load-more="loadMore"
        @page-change="(val: number) => { page = val; loadTasks() }"
        @selection-change="handleSelectionChange"
        @batch-delete="batchDelete"
        @go-detail="goDetail"
      />
    </div>
  </div>

</template>

<script setup lang="ts">

function goToTask(taskId: string) { router.push('/chat/' + taskId) }
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import EraChatWelcome from '@/components/EraChatWelcome.vue'
import TaskListPanel from '@/components/TaskListPanel.vue'
import { queryTasks, createTask, deleteTask } from '@/api/task-engine'
import type { AgentTask, TaskStatus } from '@/api/task-engine'
import AgentSidebar from '@/components/AgentSidebar.vue'
import type { AgentEntry } from '@/components/AgentSidebar.vue'
import { getAgents } from '@/api/system'
import { useERASettings } from '@/composables/useERASettings'
import { useTemplates } from '@/composables/useTemplates'
import request from '@/api/request'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const { settings: eraSettings } = useERASettings()
const userStore = useUserStore()
const loginUsername = computed(() => userStore.userInfo?.username || '用户')
const eraChatWelcomeRef = ref<InstanceType<typeof EraChatWelcome>>()

// ── 常用语模板 ──
const {
  templates,
  applyTemplate,
  removeTemplate,
  resetTemplates,
} = useTemplates()

function onTemplatesSaved(items: { icon: string; text: string; fill: string }[]) {
  templates.value = items
}

// 桥接：templateAdd / templateEdit 需要打开 EraChatWelcome 内部的弹窗
// 覆盖 useTemplates 的版本，转发到子组件的 defineExpose 方法
function handleTemplateAdd() {
  eraChatWelcomeRef.value?.openAddTemplate()
}
function handleTemplateEdit(index: number) {
  eraChatWelcomeRef.value?.editTemplate(index)
}

// ── 模型选择（首页）──
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

// Agent 列表持久化
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
    // API fallback
    agentList.value = loadAgentsFromLocalStorage()
  }
}

function saveAgents(agents: AgentEntry[]) {
  localStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(agents))
}

const agentList = ref<AgentEntry[]>(loadAgentsFromLocalStorage())

// 跳转到 Agent 管理页面 (设置/Agent 有完整的创建功能)
function goToAgentManagement() {
  router.push('/chat/agents')
}

// 状态
const loading = ref(false)
const creating = ref(false)
const tasks = ref<AgentTask[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filterStatus = ref('')
const searchKeyword = ref('')
const displayLimit = ref(10) // 默认显示 10 条，超出显示"查看更多"
const hasMore = ref(false)
const activeCollapse = ref<string[]>([])

// 多选删除
const selectedIds = ref<string[]>([])

function handleSelectionChange(rows: AgentTask[]) {
  selectedIds.value = rows.map(r => r.id)
}

async function batchDelete() {
  if (selectedIds.value.length === 0) return
  try {
    for (const id of selectedIds.value) {
      await deleteTask(id)
    }
    ElMessage.success(`已删除 ${selectedIds.value.length} 个任务`)
    selectedIds.value = []
    loadTasks()
  } catch (e: unknown) {
    ElMessage.error('删除失败: ' + ((e as any)?.message || e))
  }
}

// 展示的任务列表：搜索模式下显示全部匹配结果，非搜索模式限制 displayLimit
const displayedTasks = computed(() => {
  if (searchKeyword.value) return tasks.value
  return tasks.value.slice(0, displayLimit.value)
})
const chatAreaRef = ref<HTMLElement>()
const callingInputRef = ref()

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
const messages = ref<ChatMessage[]>([])

const statusLabel = (s: TaskStatus) => ({
  drafted: '草稿', proposed: '待同意', revised: '修订中',
  executing: '执行中', delivered: '已交付', published: '已发布',
  completed: '已完成', cancelled: '已取消', aborted: '已中止', escalated: '已升级',
}[s] || s)
const statusTagType = (s: TaskStatus) => {
  const m: Record<string, string> = { drafted: 'info', proposed: 'warning', revised: 'info', executing: 'primary', delivered: 'success', published: 'success', completed: 'success', cancelled: 'danger', aborted: 'danger', escalated: 'warning' }
  return m[s] || 'info'
}

function now() { return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }

function scrollToBottom() {
  nextTick(() => {
    if (chatAreaRef.value) {
      chatAreaRef.value.scrollTop = chatAreaRef.value.scrollHeight
    }
  })
}

function onAgentSelect(agent: AgentEntry) {
  callingInputRef.value?.selectAgent(agent)
}

function quickTask(type: string) {
  const t = now()
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

  // 人类消息
  messages.value.push({
    role: 'human', sender: loginUsername.value, content: text, time: t,
    data: msgData,
  })
  scrollToBottom()

  // Agent 复述确认：收到用户原话，询问是否补充
  const confirmLines = [
    '收到：' + text,
    '',
    '你还有什么要补充的吗？',
  ]
  messages.value.push({
    role: 'agent',
    sender: 'Agent',
    content: confirmLines.join('\n'),
    time: now(),
    needConfirm: true,
    confirmText: '确认以上任务内容无误后，点击「立即执行」开始',
    confirmPayload: { text, agentIds, taskType: taskType || 'product_listing' },
  })
  scrollToBottom()
}

// 取消确认：移除 Agent 确认消息
function cancelConfirm(idx: number) {
  messages.value.splice(idx, 1)
}

// 确认执行：创建任务 + 跳转
async function executeConfirm(idx: number) {
  const msg = messages.value[idx]
  if (!msg || !msg.confirmPayload) return

  creating.value = true
  try {
    const { text, agentIds, taskType } = msg.confirmPayload
    const title = text.substring(0, 80)
    const agentId = agentIds.length === 1 ? agentIds[0] : agentIds.length > 1 ? 'main-agent' : ''
    const task = await createTask({
      title,
      type: taskType || 'product_listing',
      context: { description: text },
      reportTo: 'rt-l1-product',
      createdBy: '', // 由后端从 JWT 中提取当前登录用户
      agentId: agentId || undefined,
    })
    const taskId = (task as any).id || (task as any).taskId || ''
    if (!taskId) { ElMessage.error('任务创建失败'); return }

    // 标记确认消息为已执行
    msg.needConfirm = false
    msg.taskId = taskId
    msg.content = '收到：' + text + '\n\n任务已创建，正在进入执行...'
    ElMessage.success('任务已创建')
    router.push('/chat/' + taskId)
  } catch (e: unknown) {
    ElMessage.error('创建失败: ' + ((e as any)?.message || e))
  } finally {
    creating.value = false
  }
}

async function loadTasks() {
  loading.value = true
  try {
    // 搜索模式：拉更多数据（50条），前端过滤
    const params: Record<string, number | string> = {
      page: 1,
      pageSize: searchKeyword.value ? 50 : pageSize.value,
    }
    if (filterStatus.value) params.status = filterStatus.value
    if (searchKeyword.value) params.search = searchKeyword.value
    const res = await queryTasks(params)
    tasks.value = res.items; total.value = res.total
    // 检查是否有更多数据
    hasMore.value = total.value > displayLimit.value
  } catch { /* ignore */ } finally { loading.value = false }
}

function loadMore() {
  displayLimit.value += 20
  hasMore.value = total.value > displayLimit.value
}

function formatTaskTime(t: string) {
  if (!t) return '-'
  const d = new Date(t)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function goDetail(task: AgentTask) { router.push(`/chat/${task.id}`) }

async function handleDelete(task: AgentTask) {
  try {
    await deleteTask(task.id)
    ElMessage.success(`任务 ${task.taskNo} 已删除`)
    loadTasks()
  } catch (e: unknown) {
    ElMessage.error(`删除失败: ${(e as any)?.message || e}`)
  }
}

function onAgentsUpdate(agents: AgentEntry[]) {
  agentList.value = agents
  saveAgents(agents)
}

onMounted(() => { loadAgentList(); loadTasks(); loadModels() })
</script>

<style scoped>
.task-dashboard {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0;
  background: linear-gradient(160deg, #f0f4fa 0%, #faf8fc 50%, #f0f7f8 100%);
}

/* 首页 Header：标题 + 模型选择 */
.dash-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px; border-bottom: 1px solid rgba(3,105,161,0.08);
  background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); flex-shrink: 0;
}
.dash-brand { display: flex; align-items: center; gap: 10px; }
.dash-logo { height: 48px; width: auto; flex-shrink: 0; }
.dash-title { margin: 0; font-size: 18px; font-weight: 700; color: #1e293b; }
.dash-model-select { display: flex; align-items: center; gap: 8px; }
.dash-model-label { font-size: 12px; color: #909399; font-weight: 500; }

.page-header {
  height: 48px;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(3,105,161,0.08);
  flex-shrink: 0;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(12px);
}
.page-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}
.header-tabs :deep(.el-radio-button__inner) {
  font-size: 12px;
  padding: 5px 12px;
}

.main-area {
  flex: 1;
  display: flex;
  padding-left: 200px;
  overflow: visible;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: visible;
  min-width: 0;
  background: transparent;
}

/* 对话区 */
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  background: transparent;
}

/* 空状态 */
.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}
.empty-brand {
  margin-bottom: 24px;
}
.empty-logo-img {
  height: 48px;
  width: auto;
  margin-bottom: 8px;
}
.empty-subtitle {
  font-size: 11px;
  color: #7C8DB5;
  letter-spacing: 2px;
  margin-top: 4px;
}
.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: #4a6fa5;
  margin-bottom: 6px;
}
.empty-hint {
  color: #7C8DB5;
  font-size: 13px;
  margin-bottom: 3px;
  line-height: 1.6;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.hint-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}
.quick-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 20px;
}
.qa-icon {
  width: 14px;
  height: 14px;
  margin-right: 2px;
  vertical-align: -2px;
}

/* 消息气泡 */
.chat-msg {
  margin-bottom: 16px;
  padding: 14px 18px;
  border-radius: 16px;
  max-width: 85%;
  box-shadow: 0 2px 8px rgba(15,23,42,0.04);
}
.chat-msg.human {
  background: linear-gradient(135deg, #e8f4fd 0%, #dceefb 100%);
  margin-left: auto;
  border-bottom-right-radius: 6px;
  border: 1px solid rgba(3,105,161,0.08);
}
.chat-msg.agent {
  background: #ffffff;
  border-bottom-left-radius: 6px;
  border: 1px solid rgba(83,74,183,0.06);
  box-shadow: 0 2px 12px rgba(83,74,183,0.04);
}
.chat-msg.system {
  background: linear-gradient(135deg, #fef7e0 0%, #fdf4d0 100%);
  text-align: center;
  max-width: 100%;
  font-size: 12px;
  color: #909399;
  padding: 10px 16px;
  box-shadow: none;
  border-radius: 10px;
}

.msg-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 6px;
  font-size: 11px;
  color: #909399;
}
.msg-sender {
  font-weight: 600;
  color: #606266;
}
.msg-content {
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  color: #303133;
}
.msg-data {
  margin-top: 8px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.msg-task-link {
  margin-top: 8px;
}

/* 常用语模板 */
.template-bar {
  padding: 6px 16px;
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(3,105,161,0.06);
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.template-label {
  font-size: 11px;
  color: #c0c4cc;
  margin-right: 4px;
  white-space: nowrap;
}
.template-bar :deep(.el-button) {
  font-size: 11px;
  color: #909399;
  padding: 2px 8px;
}
.template-bar :deep(.el-button:hover) {
  color: #409eff;
  background: #ecf5ff;
}
.tpl-add {
  font-size: 14px !important;
}
.tpl-reset {
  margin-left: auto !important;
  font-size: 10px !important;
  color: #c0c4cc !important;
}

.tpl-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 确认面板 */
.confirm-panel {
  margin-top: 12px;
  padding: 14px 16px;
  background: rgba(255,255,255,0.8);
  border: 1px solid rgba(3,105,161,0.1);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(3,105,161,0.04);
}
.confirm-body {
  font-size: 12px;
  color: #909399;
  margin-bottom: 10px;
  line-height: 1.5;
}
.confirm-btns {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
/* 任务列表折叠 */
.task-collapse {
  border-top: 1px solid rgba(3,105,161,0.06);
  flex-shrink: 0;
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(8px);
  position: relative;
  z-index: 230;
}
.task-collapse :deep(.el-collapse-item__header) {
  padding: 0 16px;
  font-size: 13px;
  height: 40px;
}
.task-collapse :deep(.el-collapse-item__content) {
  padding: 0 16px 12px;
}
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.filter-left {
  display: flex;
  gap: 10px;
  align-items: center;
}
.task-time {
  font-size: 11px;
  color: #909399;
}
.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding: 0 4px;
}
.task-count-info {
  font-size: 12px;
  color: #909399;
}
.pagination-wrap {
  margin-top: 8px;
  display: flex;
  justify-content: center;
}

:deep(.clickable-row) {
  cursor: pointer;
}

</style>
