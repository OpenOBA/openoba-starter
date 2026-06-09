<template>
 <div class="agent-management">
 <div class="toolbar">
 <el-input v-model="keyword" placeholder="搜索 Agent..." prefix-icon="Search" clearable style="width:240px" />
 <el-select v-model="typeFilter" placeholder="类型" clearable style="width:120px;margin-left:12px">
 <el-option label="Main Agent" value="main" />
 <el-option label="Sub Agent" value="sub" />
 </el-select>
 <el-button type="primary" size="small" style="margin-left:12px" @click="openCreate">新增 Agent</el-button>
 <span style="margin-left:auto;font-size:13px;color:#909399">
 {{ agentList.length }} 个 Agent · {{ agentList.filter(a => a.status === 'active').length }} 在线
 </span>
 </div>

 <el-table :data="filteredAgents" stripe v-loading="loading" style="margin-top:12px">
 <el-table-column label="" width="50">
 <template #default="{ row }">
 <span style="font-size:18px">{{ row.agentType === 'main' ? '' : '' }}</span>
 </template>
 </el-table-column>
 <el-table-column prop="agentName" label="名称" width="200">
 <template #default="{ row }">
 <div>
 <div style="font-weight:600">{{ row.agentName }}</div>
 <div v-if="row.realName && row.agentType === 'sub'" style="font-size:11px;color:#909399">
 关联用户：{{ row.realName }}
 </div>
 </div>
 </template>
 </el-table-column>
 <el-table-column prop="agentType" label="类型" width="90">
 <template #default="{ row }">
 <el-tag size="small" :type="row.agentType === 'main' ? '' : 'info'">
 {{ row.agentType === 'main' ? 'Main' : 'Sub' }}
 </el-tag>
 </template>
 </el-table-column>
 <el-table-column label="岗位角色" width="110">
 <template #default="{ row }">
 <el-tag v-if="row.orgRoleName" size="small" type="success">{{ row.orgRoleName }}</el-tag>
 <span v-else style="color:#c0c4cc">-</span>
 </template>
 </el-table-column>
 <el-table-column prop="securityClearance" label="安全等级" width="95">
 <template #default="{ row }">
 <el-tag :type="clearanceType(row.securityClearance)" size="small">{{ row.securityClearance }}</el-tag>
 </template>
 </el-table-column>
 <el-table-column prop="lastActiveAt" label="最后活跃" width="165" />
 <el-table-column prop="status" label="状态" width="85">
 <template #default="{ row }">
 <el-tag :type="row.status === 'active' ? 'success' : row.status === 'inactive' ? 'warning' : 'danger'" size="small">
 {{ statusLabel(row.status) }}
 </el-tag>
 </template>
 </el-table-column>
 <el-table-column label="操作" width="200" fixed="right">
 <template #default="{ row }">
 <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
 <template v-if="row.agentType !== 'main'">
 <el-button
 v-if="row.status !== 'suspended'"
 type="warning" link size="small"
 @click="handleSuspend(row)"
 >挂起</el-button>
 <el-button v-else type="success" link size="small" @click="handleActivate(row)">恢复</el-button>
 <el-button
 v-if="row.status !== 'active'"
 type="danger" link size="small"
 @click="handleDelete(row)"
 >删除</el-button>
 </template>
 </template>
 </el-table-column>
 </el-table>

 <!-- Agent 编辑弹窗 -->
 <el-dialog v-model="editVisible" :title="editMode === 'view' ? 'Agent 详情' : '编辑 Agent'" width="580px">
 <template v-if="editing">
 <div class="edit-header">
 <span style="font-size:32px">{{ editing.agentType === 'main' ? '' : '' }}</span>
 <div style="margin-left:12px">
 <div style="font-size:16px;font-weight:700">{{ editing.agentName }}</div>
 <el-tag size="small" :type="editing.agentType === 'main' ? '' : 'info'">
 {{ editing.agentType === 'main' ? 'Main Agent · AI CEO' : 'Sub Agent · 员工助手' }}
 </el-tag>
 </div>
 </div>

 <el-form :model="editForm" label-width="90px" style="margin-top:16px">
 <el-form-item label="Agent 标识">
 <el-input :model-value="editing.agentCode" disabled size="small" />
 </el-form-item>
 <el-form-item label="显示名称">
 <el-input v-model="editForm.agentName" size="small" placeholder="Agent 显示名称"
 :disabled="editMode === 'view'" />
 </el-form-item>
 <el-form-item label="关联用户">
 <el-input :model-value="editing.realName || '-'" disabled size="small" />
 </el-form-item>
 <el-form-item label="岗位角色">
 <el-input :model-value="editing.orgRoleName || '-'" disabled size="small" />
 </el-form-item>
 <el-form-item label="安全等级">
 <el-select v-model="editForm.securityClearance" size="small" style="width:100%"
 :disabled="editMode === 'view'">
 <el-option label="L1 · 公开数据" value="L1" />
 <el-option label="L2 · 运营数据" value="L2" />
 <el-option label="L3 · 含 PII" value="L3" />
 <el-option label="L4 · 含财务" value="L4" />
 </el-select>
 </el-form-item>
 <el-form-item label="状态">
 <el-select v-model="editForm.status" size="small" style="width:100%"
 :disabled="editMode === 'view' || editing.agentType === 'main'">
 <el-option label=" 在线" value="active" />
 <el-option label=" 离线" value="inactive" />
 <el-option label=" 已挂起" value="suspended" />
 </el-select>
 </el-form-item>
 <el-form-item label="最后活跃">
 <el-input :model-value="editing.lastActiveAt || '-'" disabled size="small" />
 </el-form-item>
 </el-form>
 </template>

 <template #footer>
 <template v-if="editMode === 'view'">
 <el-button @click="editMode = 'edit'; Object.assign(editForm, { ...editing! })" type="primary">进入编辑</el-button>
 <el-button @click="editVisible = false">关闭</el-button>
 </template>
 <template v-else>
 <el-button @click="editMode = 'view'; Object.assign(editForm, { ...editing! })">取消编辑</el-button>
 <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
 </template>
 </template>
 </el-dialog>

 <!-- 新增 Agent 弹窗 -->
 <el-dialog v-model="createVisible" title="新增 Agent" width="480px">
 <el-form :model="createForm" label-width="90px">
 <el-form-item label="Agent 名称">
 <el-input v-model="createForm.agentName" size="small" placeholder="例如：客服助手" />
 </el-form-item>
 <el-form-item label="Agent 标识">
 <el-input v-model="createForm.agentCode" size="small" placeholder="例如：sub-cs-001" />
 </el-form-item>
 <el-form-item label="安全等级">
 <el-select v-model="createForm.securityClearance" size="small" style="width:100%">
 <el-option label="L1 · 公开数据" value="L1" />
 <el-option label="L2 · 运营数据" value="L2" />
 </el-select>
 </el-form-item>
 </el-form>
 <template #footer>
 <el-button @click="createVisible = false">取消</el-button>
 <el-button type="primary" @click="handleCreate" :loading="creating">创建</el-button>
 </template>
 </el-dialog>
 </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAgents, updateAgentStatus, deleteAgent, registerAgent } from '@/api/system'
import type { AgentItem } from '@/api/system'
import request from '@/api/request'

const loading = ref(false)
const saving = ref(false)
const keyword = ref('')
const typeFilter = ref('')
const agentList = ref<AgentItem[]>([])
const editVisible = ref(false)
const editMode = ref<'view' | 'edit'>('view')
const editing = ref<AgentItem | null>(null)
const editForm = reactive<Partial<AgentItem>>({})

const filteredAgents = computed(() => {
 let list = agentList.value
 if (typeFilter.value) {
 list = list.filter(a => a.agentType === typeFilter.value)
 }
 if (keyword.value) {
 const kw = keyword.value.toLowerCase()
 list = list.filter(a =>
 (a.agentCode || '').toLowerCase().includes(kw) ||
 (a.agentName || '').toLowerCase().includes(kw) ||
 (a.realName || '').toLowerCase().includes(kw)
 )
 }
 return list
})

onMounted(() => loadAgents())

async function loadAgents() {
 loading.value = true
 try {
 agentList.value = await getAgents()
 } catch (e: unknown) {
 ElMessage.error((e as any)?.message || '加载 Agent 失败')
 } finally {
 loading.value = false
 }
}

function openEdit(row: AgentItem) {
 editing.value = row
 editForm.agentName = row.agentName
 editForm.securityClearance = row.securityClearance
 editForm.status = row.status
 editMode.value = 'view'
 editVisible.value = true
}

async function handleSave() {
 if (!editing.value || !editForm.agentName?.trim()) {
 ElMessage.warning('名称不能为空')
 return
 }
 saving.value = true
 try {
 // 更新名称（通过 register API upsert）
 await request.post('/system/agents/register', {
 agentCode: editing.value.agentCode,
 agentName: editForm.agentName,
 agentType: editing.value.agentType,
 securityClearance: editForm.securityClearance,
 })
 // 单独更新状态
 if (editForm.status && editForm.status !== editing.value.status) {
 await updateAgentStatus(editing.value.agentId, editForm.status)
 }
 ElMessage.success('已保存')
 editMode.value = 'view'
 await loadAgents()
 } catch (e: any) {
 ElMessage.error(e?.message || '保存失败')
 } finally {
 saving.value = false
 }
}

async function handleSuspend(row: AgentItem) {
 await ElMessageBox.confirm(`确定挂起 "${row.agentName}"？`, '确认', { type: 'warning' })
 try {
 await updateAgentStatus(row.agentId, 'suspended')
 ElMessage.success('已挂起')
 loadAgents()
 } catch (e: unknown) {
 ElMessage.error((e as any)?.message || '操作失败')
 }
}

async function handleActivate(row: AgentItem) {
 try {
 await updateAgentStatus(row.agentId, 'active')
 ElMessage.success('已恢复')
 loadAgents()
 } catch (e: unknown) {
 ElMessage.error((e as any)?.message || '操作失败')
 }
}

async function handleDelete(row: AgentItem) {
 await ElMessageBox.confirm(`确定删除 Agent "${row.agentName}"？`, '确认删除', { type: 'warning' })
 try {
 await deleteAgent(row.agentId)
 ElMessage.success('已删除')
 loadAgents()
 } catch (e: unknown) {
 ElMessage.error((e as any)?.message || '删除失败')
 }
}

const createVisible = ref(false)
const creating = ref(false)
const createForm = reactive({ agentName: '', agentCode: '', securityClearance: 'L2' })

function openCreate() {
 createForm.agentName = ''
 createForm.agentCode = 'sub-' + Date.now().toString(36)
 createForm.securityClearance = 'L2'
 createVisible.value = true
}

async function handleCreate() {
 if (!createForm.agentName.trim() || !createForm.agentCode.trim()) {
 ElMessage.warning('名称和标识不能为空')
 return
 }
 creating.value = true
 try {
 await registerAgent({
 agentCode: createForm.agentCode,
 agentName: createForm.agentName,
 agentType: 'sub',
 securityClearance: createForm.securityClearance,
 })
 ElMessage.success('Agent 已创建')
 createVisible.value = false
 loadAgents()
 } catch (e: unknown) {
 ElMessage.error((e as any)?.message || '创建失败')
 } finally {
 creating.value = false
 }
}

function statusLabel(status: string) {
 const map: Record<string, string> = { active: '在线', inactive: '离线', suspended: '已挂起' }
 return map[status] || status
}

function clearanceType(level: string) {
 const map: Record<string, string> = { L1: '', L2: 'info', L3: 'warning', L4: 'danger' }
 return map[level] || 'info'
}
</script>

<style scoped>
.agent-management {
 padding: 16px 0;
}
.toolbar {
 display: flex;
 align-items: center;
 gap: 8px;
}
.edit-header {
 display: flex;
 align-items: center;
}
</style>
