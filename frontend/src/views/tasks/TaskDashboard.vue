<template>
  <div class="task-dashboard">
    <!-- 瀵硅瘽鍖?-->

    <div class="main-area">
      <AgentSidebar :agents="agentList" @select="onAgentSelect" @create="goToAgentManagement" @update:agents="onAgentsUpdate" />

      <EraChatWelcome
        :agent-list="agentList"
        :creating="creating"
        :messages="messages"
        :task-done="false"
        :templates="templates"
        @quick-task="quickTask"
        @send="handleCallingSend"
        @agent-select="onAgentSelect"
        @template-edit="editTemplate"
        @template-remove="removeTemplate"
        @template-add="openAddTemplate"
        @template-reset="resetTemplates"
        @template-apply="applyTemplate"
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

import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import EraChatWelcome from '@/components/EraChatWelcome.vue'
import TaskListPanel from '@/components/TaskListPanel.vue'
import { queryTasks, createTask, deleteTask } from '@/api/task-engine'
import type { AgentTask, TaskStatus } from '@/api/task-engine'
import AgentSidebar from '@/components/AgentSidebar.vue'
import type { AgentEntry } from '@/components/AgentSidebar.vue'
import CallingInput from '@/components/CallingInput.vue'
import { getAgents } from '@/api/system'

const router = useRouter()

function goToTask(taskId: string) { router.push('/chat/' + taskId) }

// Agent 鍒楄〃鎸佷箙鍖?const AGENT_STORAGE_KEY = 'eros_agents'
const defaultAgents: AgentEntry[] = [
  { id: 'main-agent', agentCode: 'main-agent', agentName: 'OpenOBA Main', displayName: 'MainAgent', icon: '', description: '鎬荤 路 L4', agentType: 'main', securityClearance: 'L4', status: 'active' },
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
        description: `${a.agentType} 路 ${a.securityClearance}`,
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

// 璺宠浆鍒?Agent 绠＄悊椤甸潰 (璁剧疆/Agent 鏈夊畬鏁寸殑鍒涘缓鍔熻兘)
function goToAgentManagement() {
  router.push('/chat/agents')
}

// 鐘舵€?const loading = ref(false)
const creating = ref(false)
const tasks = ref<AgentTask[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filterStatus = ref('')
const searchKeyword = ref('')
const displayLimit = ref(10) // 榛樿鏄剧ず 10 鏉★紝瓒呭嚭鏄剧ず"鏌ョ湅鏇村"
const hasMore = ref(false)
const activeCollapse = ref<string[]>([])

// 澶氶€夊垹闄?const selectedIds = ref<string[]>([])

function handleSelectionChange(rows: AgentTask[]) {
  selectedIds.value = rows.map(r => r.id)
}

async function batchDelete() {
  if (selectedIds.value.length === 0) return
  try {
    for (const id of selectedIds.value) {
      await deleteTask(id)
    }
    ElMessage.success(`宸插垹闄?${selectedIds.value.length} 涓换鍔)
    selectedIds.value = []
    loadTasks()
  } catch (e: unknown) {
    ElMessage.error('鍒犻櫎澶辫触: ' + ((e as any)?.message || e))
  }
}

// 灞曠ず鐨勪换鍔″垪琛細鎼滅储妯″紡涓嬫樉绀哄叏閮ㄥ尮閰嶇粨鏋滐紝闈炴悳绱㈡ā寮忛檺鍒?displayLimit
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
  drafted: '鑽夌', proposed: '寰呭鎵?, revised: '寰呬慨鏀?,
  executing: '鎵ц涓?, delivered: '宸蹭氦浠?, published: '宸插彂甯?,
  completed: '宸插畬鎴?, cancelled: '宸插彇娑?, aborted: '宸蹭腑姝?, escalated: '宸插崌绾?,
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
    product: { text: '涓婃灦涓€娆鹃挍鍚堥噾鍦嗘绯诲垪锛屼富鎵?5-35宀佽交濂㈠コ鎬?, type: 'product_listing' },
    content: { text: '涓洪挍鍚堥噾鍦嗘绯诲垪鍐欎竴绡囧皬绾功绉嶈崏绗旇', type: 'content_creation' },
    data: { text: '鍒嗘瀽鏈€杩戦攢鍞暟鎹紝鎵惧嚭鐣呴攢娆惧拰婊為攢娆?, type: 'data_analysis' },
    service: { text: '澶勭悊瀹㈡埛鍏充簬闀滄灏哄涓嶅悎閫傞渶瑕佹崲璐х殑鍞悗闂', type: 'customer_service' },
    code: { text: '淇敼鍓嶇鍟嗗搧鍒楄〃椤电殑鎺掑簭閫昏緫锛屾敼涓烘寜閿€閲忛檷搴?, type: 'code_development' },
    custom: { text: '璇锋弿杩颁綘闇€瑕佺殑鍔熻兘鎴栦换鍔?..', type: 'custom' },
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

  // 浜虹被娑堟伅
  messages.value.push({
    role: 'human', sender: 'Henry', content: text, time: t,
    data: msgData,
  })
  scrollToBottom()

  // Agent 澶嶈堪纭锛氭敹鍒扮敤鎴峰師璇濓紝璇㈤棶鏄惁琛ュ厖
  const confirmLines = [
    '鏀跺埌锛? + text,
    '',
    '浣犺繕鏈変粈涔堣琛ュ厖鐨勫悧锛?,
  ]
  messages.value.push({
    role: 'agent',
    sender: 'Agent',
    content: confirmLines.join('\n'),
    time: now(),
    needConfirm: true,
    confirmText: '纭浠ヤ笂浠诲姟鍐呭鏃犺鍚庯紝鐐瑰嚮銆岀珛鍗虫墽琛屻€嶅紑濮?,
    confirmPayload: { text, agentIds, taskType: taskType || 'product_listing' },
  })
  scrollToBottom()
}

// 鍙栨秷纭锛氱Щ闄?Agent 纭娑堟伅
function cancelConfirm(idx: number) {
  messages.value.splice(idx, 1)
}

// 纭鎵ц锛氬垱寤轰换鍔?+ 璺宠浆
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
    if (!taskId) { ElMessage.error('浠诲姟鍒涘缓澶辫触'); return }

    // 鏍囪纭娑堟伅涓哄凡鎵ц
    msg.needConfirm = false
    msg.taskId = taskId
    msg.content = '鏀跺埌锛? + text + '\n\n浠诲姟宸插垱寤猴紝姝ｅ湪杩涘叆鎵ц...'
    ElMessage.success('浠诲姟宸插垱寤?)
    router.push('/chat/' + taskId)
  } catch (e: unknown) {
    ElMessage.error('鍒涘缓澶辫触: ' + ((e as any)?.message || e))
  } finally {
    creating.value = false
  }
}

async function loadTasks() {
  loading.value = true
  try {
    // 鎼滅储妯″紡锛氭媺鏇村鏁版嵁锛?0鏉★級锛屽墠绔繃婊?    const params: Record<string, number | string> = {
      page: 1,
      pageSize: searchKeyword.value ? 50 : pageSize.value,
    }
    if (filterStatus.value) params.status = filterStatus.value
    if (searchKeyword.value) params.search = searchKeyword.value
    const res = await queryTasks(params)
    tasks.value = res.items; total.value = res.total
    // 妫€鏌ユ槸鍚︽湁鏇村鏁版嵁
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
  if (diff < 604800000) return Math.floor(diff / 86400000) + '澶╁墠'
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function goDetail(task: AgentTask) { router.push(`/chat/${task.id}`) }

async function handleDelete(task: AgentTask) {
  try {
    await deleteTask(task.id)
    ElMessage.success(`浠诲姟 ${task.taskNo} 宸插垹闄)
    loadTasks()
  } catch (e: unknown) {
    ElMessage.error(`鍒犻櫎澶辫触: ${(e as any)?.message || e}`)
  }
}

function onAgentsUpdate(agents: AgentEntry[]) {
  agentList.value = agents
  saveAgents(agents)
}

// 甯哥敤璇ā鏉?function loadTemplates(): TemplateItem[] {
  try {
    const raw = localStorage.getItem(TPL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveTemplates(items: TemplateItem[]) {
  localStorage.setItem(TPL_STORAGE_KEY, JSON.stringify(items))
}

const defaultTemplates: TemplateItem[] = [
  { icon: '', text: '涓婃灦鏂板搧', fill: '涓婃灦涓€娆炬柊鐨勶紝涓绘墦甯傚満锛岄渶瑕佸嚑绉嶆鍨嬶紝鍙傝€冮鏍? },
  { icon: '', text: '鍐欏皬绾功', fill: '涓烘柊鍝佸啓涓€绡囧皬绾功绉嶈崏绗旇锛岄潰鍚戝コ鎬х敤鎴凤紝绐佸嚭鎹㈡濡傛崲琛ｏ紝璇皵杞绘澗绉嶈崏' },
  { icon: '', text: '閿€鍞垎鏋?, fill: '鍒嗘瀽鏈€杩戜竴鍛ㄧ殑閿€鍞暟鎹紝瀵规瘮TOP3鐣呴攢娆撅紝鎵惧嚭婊為攢鍘熷洜骞剁粰鍑哄缓璁? },
  { icon: '', text: '閰嶈壊鏂规', fill: '涓烘槬瀛ｆ柊鍝佽璁￠厤鑹叉柟妗堬紝鍙傝€冧粖骞存祦琛岃壊瓒嬪娍锛岃€冭檻鍐锋殩鐨€傞厤' },
  { icon: '', text: '瀹氫环绛栫暐', fill: '涓烘柊鍝佸埗瀹氬畾浠风瓥鐣ワ紝鍙傝€冪珵鍝佸畾浠凤紝鑰冭檻鎴愭湰鍥犵礌鍜屼細鍛樻姌鎵? },
  { icon: '', text: '绔炲搧鍒嗘瀽', fill: '鍒嗘瀽绔炲搧鍦ㄦ鍨?瀹氫环/钀ラ攢涓婄殑琛ㄧ幇锛屾壘鍑烘垜浠殑宸紓鍖栧垏鍏? },
]

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

/* 瀵硅瘽鍖?*/
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  background: transparent;
}

/* 绌虹姸鎬?*/
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

/* 娑堟伅姘旀场 */
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

/* 甯哥敤璇ā鏉?*/
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

/* 纭闈㈡澘 */
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
/* 浠诲姟鍒楄〃鎶樺彔 */
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
