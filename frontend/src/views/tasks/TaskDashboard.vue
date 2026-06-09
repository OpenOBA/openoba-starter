<template>
  <div class="task-dashboard">
    <!-- 对话区 -->

    <div class="main-area">
      <AgentSidebar :agents="agentList" @select="onAgentSelect" @create="goToAgentManagement" @update:agents="onAgentsUpdate" />

      <div class="content-area">
        <!-- 对话区 -->
        <div class="chat-area" ref="chatAreaRef">
          <div v-if="messages.length === 0" class="chat-empty">
            <div class="empty-brand">
              <img src="/logo.png" alt="OpenOBA" class="empty-logo-img">
            </div>
            <div class="empty-title">选择 Agent 或直接描述任务</div>
            <div class="empty-hint">
              <svg class="hint-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#bot"/></svg>
              不指定 Agent 由 MainAgent 自动分派
            </div>
            <div class="empty-hint">
              <svg class="hint-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#users"/></svg>
              @多个 Agent 启动议会模式
            </div>
            <div class="quick-actions">
              <el-button size="small" round @click="quickTask('product')">
                <svg class="qa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#package"/></svg>
                商品上架
              </el-button>
              <el-button size="small" round @click="quickTask('content')">
                <svg class="qa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#pen-line"/></svg>
                内容创作
              </el-button>
              <el-button size="small" round @click="quickTask('data')">
                <svg class="qa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#chart-bar"/></svg>
                数据分析
              </el-button>
              <el-button size="small" round @click="quickTask('service')">
                <svg class="qa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#headphones"/></svg>
                AI客服
              </el-button>
              <el-button size="small" round @click="quickTask('code')">
                <svg class="qa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#code-xml"/></svg>
                代码修改
              </el-button>
              <el-button size="small" round @click="quickTask('custom')">
                <svg class="qa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#wand-sparkles"/></svg>
                功能自定
              </el-button>
            </div>
          </div>

          <div v-for="(msg, i) in messages" :key="i" class="chat-msg" :class="msg.role">
            <div class="msg-meta">
              <span class="msg-sender">{{ msg.sender }}</span>
              <span class="msg-time">{{ msg.time }}</span>
            </div>
            <div class="msg-content">{{ msg.content }}</div>
            <div v-if="msg.data && msg.data.length" class="msg-data">
              <el-tag size="small" type="info" v-for="(item, di) in msg.data" :key="di">{{ item }}</el-tag>
            </div>
            <!-- 确认面板：Agent 复述任务后等待用户确认 -->
            <div v-if="msg.role === 'agent' && msg.needConfirm && !taskDone" class="confirm-panel">
              <div class="confirm-body">{{ msg.confirmText }}</div>
              <div class="confirm-btns">
                <el-button size="small" @click="cancelConfirm(i)">取消</el-button>
                <el-button size="small" type="primary" :loading="creating" @click="executeConfirm(i)">立即执行</el-button>
              </div>
            </div>
            <div v-if="msg.taskId" class="msg-task-link">
              <el-button link type="primary" size="small" @click="$router.push('/chat/' + msg.taskId)">
                进入任务详情
              </el-button>
            </div>
          </div>
        </div>

        <!-- 常用语模板区 -->
        <div class="template-bar">
          <span class="template-label">常用语</span>
          <el-popover
            v-for="(tpl, i) in templates"
            :key="i"
            trigger="contextmenu"
            :width="120"
            placement="top"
          >
            <template #reference>
              <el-button size="small" text @click="applyTemplate(tpl)">{{ tpl.text }}</el-button>
            </template>
            <div class="tpl-menu">
              <el-button link size="small" @click="editTemplate(i)">编辑</el-button>
              <el-button link size="small" type="danger" @click="removeTemplate(i)">删除</el-button>
            </div>
          </el-popover>
          <el-button size="small" text @click="openAddTemplate" class="tpl-add">+</el-button>
          <el-button size="small" text @click="resetTemplates" class="tpl-reset">重置</el-button>
        </div>

        <CallingInput
          ref="callingInputRef"
          :agents="agentList"
          :sending="creating"
          :rows="2"
          @send="handleCallingSend"
        />

        <el-collapse v-model="activeCollapse" class="task-collapse">
          <el-collapse-item name="tasks">
            <template #title>
              <span>任务列表</span>
              <el-tag size="small" type="info" style="margin-left:8px">{{ total }}</el-tag>
            </template>
            <div class="filter-bar">
              <div class="filter-left">
                <el-input
                  v-model="searchKeyword"
                  size="small"
                  placeholder="搜索任务编号或标题"
                  clearable
                  style="width:220px"
                  @change="loadTasks"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
                <el-radio-group v-model="filterStatus" size="small" @change="loadTasks">
                  <el-radio-button value="">全部</el-radio-button>
                  <el-radio-button value="proposed">待审批</el-radio-button>
                  <el-radio-button value="executing">执行中</el-radio-button>
                  <el-radio-button value="completed">已完成</el-radio-button>
                </el-radio-group>
                <el-popconfirm
                  title="确定删除选中任务？"
                  @confirm="batchDelete"
                  confirm-button-text="删除"
                  cancel-button-text="取消"
                >
                  <template #reference>
                    <el-button size="small" type="danger" plain :disabled="selectedIds.length === 0">
                      删除 ({{ selectedIds.length }})
                    </el-button>
                  </template>
                </el-popconfirm>
              </div>
            </div>
            <el-table
              :data="displayedTasks"
              stripe
              v-loading="loading"
              @selection-change="handleSelectionChange"
              @row-dblclick="goDetail"
              row-class-name="clickable-row"
              size="small"
            >
              <el-table-column type="selection" width="40" />
              <el-table-column prop="taskNo" label="编号" width="140" />
              <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
              <el-table-column prop="agentId" label="Agent" width="130" />
              <el-table-column prop="status" label="状态" width="85">
                <template #default="{ row }">
                  <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
                </template>
              </el-table-column>
              
              <el-table-column prop="createdAt" label="时间" width="95">
                <template #default="{ row }">
                  <span class="task-time">{{ formatTaskTime(row.createdAt) }}</span>
                </template>
              </el-table-column>
            </el-table>
            <div class="task-footer" v-if="hasMore || total > displayLimit">
              <span class="task-count-info">显示 {{ displayedTasks.length }} / {{ total }} 条</span>
              <el-button v-if="hasMore" link type="primary" size="small" @click="loadMore">查看更多</el-button>
            </div>
            <div class="pagination-wrap" v-if="total > pageSize && !searchKeyword">
              <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" small @current-change="loadTasks" />
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </div>

    <!-- 常用语编辑对话框 -->
    <el-dialog v-model="showTemplateDialog" title="编辑常用语" width="400px" destroy-on-close>
      <el-form :model="editingTemplate" label-width="60px" size="small">
        <el-form-item label="名称">
          <el-input v-model="editingTemplate.text" placeholder="按钮上显示的文字" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="editingTemplate.fill" type="textarea" :rows="3" placeholder="点击按钮时填入输入框的内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="showTemplateDialog = false">取消</el-button>
        <el-button size="small" type="primary" @click="saveTemplate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { queryTasks, createTask, deleteTask } from '@/api/task-engine'
import type { AgentTask, TaskStatus } from '@/api/task-engine'
import AgentSidebar from '@/components/AgentSidebar.vue'
import type { AgentEntry } from '@/components/AgentSidebar.vue'
import CallingInput from '@/components/CallingInput.vue'
import { getAgents } from '@/api/system'

const router = useRouter()

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
  drafted: '草稿', proposed: '待审批', revised: '待修改',
  executing: '执行中', delivered: '已交付', published: '已发布',
  completed: '已完成', cancelled: '已取消', aborted: '已中止', escalated: '已升级',
}[s] || s)
const statusTagType = (s: TaskStatus) => {
  const m: Record<string, string> = { drafted: 'info', proposed: 'warning', executing: 'primary', delivered: 'success', published: 'success', completed: 'success', cancelled: 'danger', escalated: 'danger' }
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
  messages.value.push({ role: 'human', sender: 'Henry', content: task.text, time: t })
  scrollToBottom()
  handleCallingSend({ text: task.text, agentIds: [], taskType: task.type })
}

async function handleCallingSend({ text, agentIds, taskType }: { text: string; agentIds: string[]; files?: File[]; taskType?: string }) {
  const t = now()
  const msgData = agentIds.length > 0 ? agentIds.map(id => '@' + (agentList.value.find(a => a.id === id)?.displayName || id)) : undefined

  // 人类消息
  messages.value.push({
    role: 'human', sender: 'Henry', content: text, time: t,
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
      createdBy: 'Henry',
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

// 常用语模板
interface TemplateItem { icon: string; text: string; fill: string }
const TPL_STORAGE_KEY = 'eros_templates'

function loadTemplates(): TemplateItem[] {
  try {
    const raw = localStorage.getItem(TPL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveTemplates(items: TemplateItem[]) {
  localStorage.setItem(TPL_STORAGE_KEY, JSON.stringify(items))
}

const defaultTemplates: TemplateItem[] = [
  { icon: '', text: '上架新品', fill: '上架一款新的，主打市场，需要几种框型，参考风格' },
  { icon: '', text: '写小红书', fill: '为新品写一篇小红书种草笔记，面向女性用户，突出换框如换衣，语气轻松种草' },
  { icon: '', text: '销售分析', fill: '分析最近一周的销售数据，对比TOP3畅销款，找出滞销原因并给出建议' },
  { icon: '', text: '配色方案', fill: '为春季新品设计配色方案，参考今年流行色趋势，考虑冷暖皮适配' },
  { icon: '', text: '定价策略', fill: '为新品制定定价策略，参考竞品定价，考虑成本因素和会员折扣' },
  { icon: '', text: '竞品分析', fill: '分析竞品在框型/定价/营销上的表现，找出我们的差异化切入' },
]

const templates = ref<TemplateItem[]>(loadTemplates().length > 0 ? loadTemplates() : [...defaultTemplates])
const showTemplateDialog = ref(false)
const editingTemplate = reactive<TemplateItem>({ icon: '', text: '', fill: '' })
const editingIndex = ref(-1)

function applyTemplate(tpl: TemplateItem) {
  const ta = document.querySelector('.calling-input textarea') as HTMLTextAreaElement
  if (ta) {
    ta.value = tpl.fill
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    ta.focus()
  }
}

function openAddTemplate() {
  editingTemplate.icon = ''
  editingTemplate.text = ''
  editingTemplate.fill = ''
  editingIndex.value = -1
  showTemplateDialog.value = true
}

function editTemplate(index: number) {
  const tpl = templates.value[index]
  editingTemplate.icon = tpl.icon
  editingTemplate.text = tpl.text
  editingTemplate.fill = tpl.fill
  editingIndex.value = index
  showTemplateDialog.value = true
}

function removeTemplate(index: number) {
  templates.value.splice(index, 1)
  saveTemplates(templates.value)
}

function saveTemplate() {
  if (!editingTemplate.text.trim() || !editingTemplate.fill.trim()) return
  if (editingIndex.value >= 0) {
    templates.value[editingIndex.value] = { ...editingTemplate }
  } else {
    templates.value.push({ ...editingTemplate })
  }
  saveTemplates(templates.value)
  showTemplateDialog.value = false
}

function resetTemplates() {
  templates.value = [...defaultTemplates]
  saveTemplates(templates.value)
}

onMounted(() => { loadAgentList(); loadTasks() })
</script>

<style scoped>
.task-dashboard {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0;
  background: linear-gradient(160deg, #f0f4fa 0%, #faf8fc 50%, #f0f7f8 100%);
}

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
