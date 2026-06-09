<template>
 <div class="system-page">
 <el-tabs v-model="activeTab" type="border-card">
 <!-- 用户管理 -->
 <el-tab-pane label="用户管理" name="users">
 <div class="toolbar">
 <el-input v-model="userSearch" placeholder="搜索用户名/姓名..." prefix-icon="Search" clearable style="width:260px" />
 <el-select v-model="userStatusFilter" placeholder="状态" clearable style="width:120px;margin-left:12px">
 <el-option label="启用" value="active" />
 <el-option label="禁用" value="inactive" />
 </el-select>
 <el-button type="primary" @click="openUserDialog()" style="margin-left:auto">新增用户</el-button>
 </div>
 <el-table :data="userList" stripe v-loading="userLoading" style="margin-top:12px">
 <el-table-column prop="username" label="用户名" width="140" />
 <el-table-column prop="realName" label="姓名" width="120" />
 <el-table-column prop="phone" label="手机号" width="140" />
 <el-table-column prop="email" label="邮箱" min-width="180" />
 <el-table-column prop="status" label="状态" width="80">
 <template #default="{ row }">
 <el-tag :type="row.status === 'active' ? 'success' : 'info'">{{ row.status === 'active' ? '启用' : '禁用' }}</el-tag>
 </template>
 </el-table-column>
 <el-table-column prop="createdAt" label="创建时间" width="180" />
 <el-table-column label="操作" width="220" fixed="right">
 <template #default="{ row }">
 <el-button type="primary" link size="small" @click="openUserDialog(row)">编辑</el-button>
 <el-button type="warning" link size="small" @click="handleToggleStatus(row)">{{ row.status === 'active' ? '禁用' : '启用' }}</el-button>
 <el-button type="danger" link size="small" @click="handleDeleteUser(row)">删除</el-button>
 </template>
 </el-table-column>
 </el-table>
 <el-pagination
 v-model:current-page="userPage"
 v-model:page-size="userPageSize"
 :total="userTotal"
 layout="total, prev, pager, next"
 style="margin-top:16px;justify-content:flex-end"
 @current-change="loadUsers"
 />
 </el-tab-pane>

 <!-- 角色管理 -->
 <el-tab-pane label="角色管理" name="roles">
 <div class="toolbar">
 <el-button type="primary" @click="openRoleDialog()">新增角色</el-button>
 </div>
 <el-table :data="roleList" stripe v-loading="roleLoading" style="margin-top:12px">
 <el-table-column prop="roleCode" label="角色编码" width="160" />
 <el-table-column prop="roleName" label="角色名称" width="160" />
 <el-table-column prop="description" label="描述" min-width="200" />
 <el-table-column prop="status" label="状态" width="80">
 <template #default="{ row }">
 <el-tag :type="row.status === 'active' ? 'success' : 'info'">{{ row.status === 'active' ? '正常' : '禁用' }}</el-tag>
 </template>
 </el-table-column>
 <el-table-column label="操作" width="260" fixed="right">
 <template #default="{ row }">
 <el-button type="primary" link size="small" @click="openRoleDialog(row)">编辑</el-button>
 <el-button type="success" link size="small" @click="openPermissionDialog(row)">权限</el-button>
 <el-button type="danger" link size="small" @click="handleDeleteRole(row)">删除</el-button>
 </template>
 </el-table-column>
 </el-table>
 </el-tab-pane>

 <!-- 审计日志 -->
 <el-tab-pane label="审计日志" name="audit">
 <div class="toolbar">
 <el-select v-model="auditFilter.actorType" placeholder="操作者类型" clearable style="width:140px">
 <el-option label="人类" value="human" />
 <el-option label="Agent" value="agent" />
 <el-option label="系统" value="system" />
 </el-select>
 <el-select v-model="auditFilter.category" placeholder="操作类别" clearable style="width:140px;margin-left:8px">
 <el-option label="API 调用" value="api_call" />
 <el-option label="数据访问" value="data_access" />
 <el-option label="LLM 调用" value="llm_call" />
 <el-option label="外部 API" value="external_api" />
 <el-option label="文件访问" value="file_access" />
 </el-select>
 <el-select v-model="auditFilter.sensitivity" placeholder="敏感级别" clearable style="width:140px;margin-left:8px">
 <el-option label="无敏感" value="none" />
 <el-option label="PII" value="pii" />
 <el-option label="财务" value="financial" />
 <el-option label="机密" value="confidential" />
 </el-select>
 </div>
 <el-table :data="auditList" stripe v-loading="auditLoading" style="margin-top:12px" max-height="520">
 <el-table-column prop="actionTime" label="时间" width="180" />
 <el-table-column label="操作者" width="140">
 <template #default="{ row }">
 <span>{{ row.actorName || row.actorId }}</span>
 <el-tag size="small" :type="row.actorType === 'agent' ? 'warning' : ''" style="margin-left:4px">{{ row.actorType }}</el-tag>
 </template>
 </el-table-column>
 <el-table-column label="操作" min-width="160">
 <template #default="{ row }">
 <div class="action-cell">
 <el-tag size="small" type="info">{{ row.category }}</el-tag>
 <span style="margin-left:6px;font-family:monospace;font-size:12px">{{ row.action }}</span>
 </div>
 </template>
 </el-table-column>
 <el-table-column prop="resource" label="资源" min-width="180" />
 <el-table-column label="数据域" width="100">
 <template #default="{ row }">
 <el-tag v-if="row.dataDomain" size="small">{{ row.dataDomain }}</el-tag>
 </template>
 </el-table-column>
 <el-table-column label="敏感" width="70">
 <template #default="{ row }">
 <el-icon v-if="row.sensitivity !== 'none'" :color="row.sensitivity === 'confidential' ? '#f56c6c' : '#e6a23c'"><WarningFilled /></el-icon>
 </template>
 </el-table-column>
 <el-table-column label="脱敏" width="70">
 <template #default="{ row }">
 <el-icon v-if="row.wasMasked" color="#67c23a"><CircleCheckFilled /></el-icon>
 </template>
 </el-table-column>
 <el-table-column prop="exportTarget" label="出口目标" width="120" />
 <el-table-column prop="result" label="结果" width="80">
 <template #default="{ row }">
 <el-tag :type="row.result === 'success' ? 'success' : row.result === 'blocked' ? 'danger' : 'warning'" size="small">{{ row.result }}</el-tag>
 </template>
 </el-table-column>
 </el-table>
 <el-pagination
 v-model:current-page="auditPage"
 v-model:page-size="auditPageSize"
 :total="auditTotal"
 layout="total, prev, pager, next"
 style="margin-top:16px;justify-content:flex-end"
 @current-change="loadAuditLogs"
 />
 </el-tab-pane>
 </el-tabs>

 <!-- 用户编辑弹窗 -->
 <el-dialog v-model="userDialogVisible" :title="editingUser ? '编辑用户' : '新增用户'" width="500px" @closed="resetUserForm">
 <el-form :model="userForm" label-width="80px" ref="userFormRef">
 <el-form-item label="用户名" required>
 <el-input v-model="userForm.username" :disabled="!!editingUser" />
 </el-form-item>
 <el-form-item label="姓名">
 <el-input v-model="userForm.realName" />
 </el-form-item>
 <el-form-item label="手机号">
 <el-input v-model="userForm.phone" />
 </el-form-item>
 <el-form-item label="邮箱">
 <el-input v-model="userForm.email" />
 </el-form-item>
 <el-form-item v-if="!editingUser" label="密码" required>
 <el-input v-model="userForm.password" type="password" show-password />
 </el-form-item>
 <el-form-item label="角色">
 <el-select v-model="userForm.roleIds" multiple placeholder="选择角色" style="width:100%">
 <el-option v-for="r in roleList" :key="r.roleId" :label="r.roleName" :value="r.roleId" />
 </el-select>
 </el-form-item>
 </el-form>
 <template #footer>
 <el-button @click="userDialogVisible = false">取消</el-button>
 <el-button type="primary" @click="handleSaveUser" :loading="userSaving">保存</el-button>
 </template>
 </el-dialog>

 <!-- 角色编辑弹窗 -->
 <el-dialog v-model="roleDialogVisible" :title="editingRole ? '编辑角色' : '新增角色'" width="500px" @closed="resetRoleForm">
 <el-form :model="roleForm" label-width="80px" ref="roleFormRef">
 <el-form-item label="角色编码" required>
 <el-input v-model="roleForm.roleCode" :disabled="!!editingRole" />
 </el-form-item>
 <el-form-item label="角色名称" required>
 <el-input v-model="roleForm.roleName" />
 </el-form-item>
 <el-form-item label="描述">
 <el-input v-model="roleForm.description" type="textarea" :rows="2" />
 </el-form-item>
 </el-form>
 <template #footer>
 <el-button @click="roleDialogVisible = false">取消</el-button>
 <el-button type="primary" @click="handleSaveRole" :loading="roleSaving">保存</el-button>
 </template>
 </el-dialog>

 <!-- 权限分配弹窗 -->
 <el-dialog v-model="permissionDialogVisible" title="分配权限" width="560px">
 <el-checkbox-group v-model="selectedPermissionIds">
 <div v-for="perm in permissionList" :key="perm.permissionId" style="padding:4px 0">
 <el-checkbox :value="perm.permissionId">
 <span style="font-weight:bold">{{ perm.permissionName }}</span>
 <span style="color:#909399;font-size:12px;margin-left:8px">{{ perm.permissionCode }}</span>
 <span style="color:#c0c4cc;font-size:12px;margin-left:8px">{{ perm.resourceType }}</span>
 </el-checkbox>
 </div>
 </el-checkbox-group>
 <template #footer>
 <el-button @click="permissionDialogVisible = false">取消</el-button>
 <el-button type="primary" @click="handleSavePermissions" :loading="permSaving">保存</el-button>
 </template>
 </el-dialog>

 </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { WarningFilled, CircleCheckFilled } from '@element-plus/icons-vue'
import {
 getUsers, createUser, updateUser, deleteUser, toggleUserStatus,
 getRoles, getRole, createRole, updateRole, deleteRole,
 getPermissions,
 getAuditLogs,
} from '@/api/system'
import type { UserItem, RoleItem, PermissionItem, AuditLogItem } from '@/api/system'

// ============================================
// 状态
// ============================================

const activeTab = ref('users')

// 用户
const userList = ref<UserItem[]>([])
const userLoading = ref(false)
const userTotal = ref(0)
const userPage = ref(1)
const userPageSize = ref(20)
const userSearch = ref('')
const userStatusFilter = ref('')
const userDialogVisible = ref(false)
const editingUser = ref<UserItem | null>(null)
const userForm = reactive({ username: '', realName: '', phone: '', email: '', password: '', roleIds: [] as string[] })
const userFormRef = ref()
const userSaving = ref(false)

// 角色
const roleList = ref<RoleItem[]>([])
const roleLoading = ref(false)
const roleDialogVisible = ref(false)
const editingRole = ref<RoleItem | null>(null)
const roleForm = reactive({ roleCode: '', roleName: '', description: '' })
const roleFormRef = ref()
const roleSaving = ref(false)

// 权限
const permissionList = ref<PermissionItem[]>([])
const permissionDialogVisible = ref(false)
const currentRoleId = ref('')
const selectedPermissionIds = ref<string[]>([])
const permSaving = ref(false)

// Agent
// Agent 管理已迁移到 ERA-Chat 页面（/tasks → Agent 管理 Tab）

// 审计
const auditList = ref<AuditLogItem[]>([])
const auditLoading = ref(false)
const auditTotal = ref(0)
const auditPage = ref(1)
const auditPageSize = ref(20)
const auditFilter = reactive({ actorType: '', category: '', sensitivity: '' })

// ============================================
// Tab 切换加载
// ============================================

watch(activeTab, (tab) => {
 if (tab === 'users' && !userList.value.length) loadUsers()
 if (tab === 'roles' && !roleList.value.length) loadRoles()
 if (tab === 'audit' && !auditList.value.length) loadAuditLogs()
 if (tab === 'roles') loadPermissions()
})

onMounted(() => {
 loadUsers()
})

// ============================================
// 用户管理方法
// ============================================

async function loadUsers() {
 userLoading.value = true
 try {
 const res = await getUsers({ page: userPage.value, pageSize: userPageSize.value, keyword: userSearch.value, status: userStatusFilter.value })
 userList.value = res.items
 userTotal.value = res.total
 } catch (e: unknown) {
 ElMessage.error(e?.message || '加载用户失败')
 } finally {
 userLoading.value = false
 }
}

function openUserDialog(row?: UserItem) {
 editingUser.value = row || null
 if (row) {
 userForm.username = row.username
 userForm.realName = row.realName
 userForm.phone = row.phone || ''
 userForm.email = row.email || ''
 userForm.password = ''
 userForm.roleIds = row.roleIds || row.roles?.map((r: any) => r.roleId) || []
 } else {
 resetUserForm()
 }
 userDialogVisible.value = true
}

async function handleSaveUser() {
 userSaving.value = true
 try {
 if (editingUser.value) {
 // 编辑时只传允许的字段（不含 password）
 const { username, realName, email, phone, roleIds } = userForm
 await updateUser(editingUser.value.userId, { username, realName, email, phone, roleIds })
 ElMessage.success('用户已更新')
 } else {
 await createUser({ ...userForm })
 ElMessage.success('用户已创建')
 }
 userDialogVisible.value = false
 loadUsers()
 } catch (e: unknown) {
 ElMessage.error(e?.message || '保存失败')
 } finally {
 userSaving.value = false
 }
}

async function handleToggleStatus(row: UserItem) {
 try {
 await toggleUserStatus(row.userId)
 ElMessage.success(`用户已${row.status === 'active' ? '禁用' : '启用'}`)
 loadUsers()
 } catch (e: unknown) {
 ElMessage.error(e?.message || '操作失败')
 }
}

async function handleDeleteUser(row: UserItem) {
 try {
 await ElMessageBox.confirm(`确定删除用户 "${row.username}" 吗？`, '确认删除', { type: 'warning' })
 await deleteUser(row.userId)
 ElMessage.success('用户已删除')
 loadUsers()
 } catch { /* cancelled */ }
}

function resetUserForm() {
 userForm.username = ''
 userForm.realName = ''
 userForm.phone = ''
 userForm.email = ''
 userForm.password = ''
 userForm.roleIds = []
}

// ============================================
// 角色管理方法
// ============================================

async function loadRoles() {
 roleLoading.value = true
 try {
 roleList.value = await getRoles()
 } catch (e: unknown) {
 ElMessage.error(e?.message || '加载角色失败')
 } finally {
 roleLoading.value = false
 }
}

async function loadPermissions() {
 try {
 permissionList.value = await getPermissions()
 } catch { /* ignore */ }
}

function openRoleDialog(row?: RoleItem) {
 editingRole.value = row || null
 if (row) {
 roleForm.roleCode = row.roleCode
 roleForm.roleName = row.roleName
 roleForm.description = row.description || ''
 } else {
 resetRoleForm()
 }
 roleDialogVisible.value = true
}

async function handleSaveRole() {
 roleSaving.value = true
 try {
 if (editingRole.value) {
 // 只传 UpdateRoleDto 允许的字段
 const { roleName, description } = roleForm
 await updateRole(editingRole.value.roleId, { roleName, description })
 ElMessage.success('角色已更新')
 } else {
 await createRole({ ...roleForm })
 ElMessage.success('角色已创建')
 }
 roleDialogVisible.value = false
 loadRoles()
 } catch (e: unknown) {
 ElMessage.error(e?.message || '保存失败')
 } finally {
 roleSaving.value = false
 }
}

function resetRoleForm() {
 roleForm.roleCode = ''
 roleForm.roleName = ''
 roleForm.description = ''
}

async function handleDeleteRole(row: RoleItem) {
 try {
 await ElMessageBox.confirm(`确定删除角色 "${row.roleName}" 吗？`, '确认删除', { type: 'warning' })
 await deleteRole(row.roleId)
 ElMessage.success('角色已删除')
 loadRoles()
 } catch { /* cancelled */ }
}

async function openPermissionDialog(row: RoleItem) {
 currentRoleId.value = row.roleId
 try {
 const perms = await getRole(row.roleId)
 selectedPermissionIds.value = (perms.permissions || []).map((p: PermissionItem) => p.permissionId)
 } catch {
 selectedPermissionIds.value = []
 }
 permissionDialogVisible.value = true
}

async function handleSavePermissions() {
 permSaving.value = true
 try {
 await updateRole(currentRoleId.value, { permissionIds: selectedPermissionIds.value })
 ElMessage.success('权限已更新')
 permissionDialogVisible.value = false
 loadRoles()
 } catch (e: unknown) {
 ElMessage.error(e?.message || '保存失败')
 } finally {
 permSaving.value = false
 }
}

// ============================================
// Agent 管理已迁移到 ERA-Chat 页面（/tasks → Agent 管理 Tab）
// ============================================

// ============================================
// 审计日志方法
// ============================================

async function loadAuditLogs() {
 auditLoading.value = true
 try {
 const params: Record<string, unknown> = { page: auditPage.value, pageSize: auditPageSize.value }
 if (auditFilter.actorType) params.actorType = auditFilter.actorType
 if (auditFilter.category) params.category = auditFilter.category
 if (auditFilter.sensitivity) params.sensitivity = auditFilter.sensitivity
 const res = await getAuditLogs(params)
 auditList.value = res.items
 auditTotal.value = res.total
 } catch (e: unknown) {
 ElMessage.error(e?.message || '加载审计日志失败')
 } finally {
 auditLoading.value = false
 }
}
</script>

<style scoped>
.system-page { padding: 16px; }
.toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.capability-tags { display: flex; flex-wrap: wrap; gap: 2px; }
.action-cell { display: flex; align-items: center; }
</style>
