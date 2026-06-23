/**
 * 秒镜科技 · 系统管理 API
 *
 * @file system.ts
 * @author 唐浩然
 * @since 2026-05-02
 */

import request from './request'

// ============================================
// 类型定义
// ============================================

export interface UserItem {
  userId: string
  username: string
  realName: string
  phone: string
  email: string
  status: string
  createdAt: string
}

export interface RoleItem {
  roleId: string
  roleCode: string
  roleName: string
  description: string
  status: string
  permissions?: PermissionItem[]
}

export interface PermissionItem {
  permissionId: string
  permissionCode: string
  permissionName: string
  resourceType: string
  resourcePath: string
  description: string
  parentId: string
  sortOrder: number
}

export interface MenuItem {
  menuId: string
  menuCode: string
  menuName: string
  parentId: string | null
  menuType: string
  path: string
  icon: string
  sortOrder: number
  permissionCode: string
  isVisible: boolean
  children?: MenuItem[]
}

export interface AgentItem {
  agentId: string
  agentCode: string
  agentName: string
  agentType: string
  securityClearance: string
  capabilitiesJson: string
  status: string
  lastActiveAt: string
  statsJson: string
  // 联表字段
  realName?: string
  orgRoleCode?: string
  orgRoleName?: string
}

export interface AuditLogItem {
  logId: string
  actorType: string
  actorId: string
  actorName: string
  actionTime: string
  category: string
  action: string
  resource: string
  detail: string
  dataDomain: string
  sensitivity: string
  wasMasked: boolean
  exportTarget: string
  sourceIp: string
  result: string
}

// ============================================
// 用户管理 API
// ============================================

export function getUsers(params: {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
}): Promise<{ items: UserItem[]; total: number }> {
  return request.get('/system/users', { params })
}

export function getUser(id: string): Promise<UserItem> {
  return request.get(`/system/users/${id}`)
}

export function createUser(data: Record<string, unknown>) {
  return request.post('/system/users', data)
}

export function updateUser(id: string, data: Record<string, unknown>) {
  return request.put(`/system/users/${id}`, data)
}

export function deleteUser(id: string) {
  return request.delete(`/system/users/${id}`)
}

export function toggleUserStatus(id: string) {
  return request.put(`/system/users/${id}/toggle-status`)
}

export function changePassword(data: { oldPassword: string; newPassword: string }) {
  return request.post('/system/users/change-password', data)
}

export function resetPassword(data: { userId: string; newPassword: string }) {
  return request.post('/system/users/reset-password', data)
}

// ============================================
// 角色管理 API
// ============================================

export function getRoles(): Promise<RoleItem[]> {
  return request.get('/system/roles')
}

export function getRole(id: string): Promise<RoleItem> {
  return request.get(`/system/roles/${id}`)
}

export function getRolePermissions(id: string): Promise<PermissionItem[]> {
  return request.get(`/system/roles/${id}/permissions`)
}

export function createRole(data: {
  roleCode: string
  roleName: string
  description?: string
  permissionIds?: string[]
}) {
  return request.post('/system/roles', data)
}

export function updateRole(
  id: string,
  data: { roleName?: string; description?: string; status?: string; permissionIds?: string[] },
) {
  return request.put(`/system/roles/${id}`, data)
}

export function deleteRole(id: string) {
  return request.delete(`/system/roles/${id}`)
}

// ============================================
// 权限管理 API
// ============================================

export function getPermissions(): Promise<PermissionItem[]> {
  return request.get('/system/permissions')
}

export function createPermission(data: Partial<PermissionItem>) {
  return request.post('/system/permissions', data)
}

export function updatePermission(id: string, data: Partial<PermissionItem>) {
  return request.put(`/system/permissions/${id}`, data)
}

export function deletePermission(id: string) {
  return request.delete(`/system/permissions/${id}`)
}

// ============================================
// 菜单管理 API
// ============================================

export function getMenuTree() {
  return request.get<MenuItem[]>('/system/menus/tree')
}

export function getMenus() {
  return request.get<MenuItem[]>('/system/menus')
}

export function createMenu(data: Partial<MenuItem>) {
  return request.post('/system/menus', data)
}

export function updateMenu(id: string, data: Partial<MenuItem>) {
  return request.put(`/system/menus/${id}`, data)
}

export function deleteMenu(id: string) {
  return request.delete(`/system/menus/${id}`)
}

export function updateMenuSort(items: { menuId: string; sortOrder: number }[]) {
  return request.put('/system/menus/sort/batch', items)
}

// ============================================
// Agent 管理 API
// ============================================

export function getAgents(): Promise<AgentItem[]> {
  return request.get('/system/agents')
}

export function getAgent(id: string): Promise<AgentItem> {
  return request.get(`/system/agents/${id}`)
}

export function updateAgentStatus(id: string, status: string) {
  return request.put(`/system/agents/${id}/status`, { status })
}

export function deleteAgent(id: string) {
  return request.delete(`/system/agents/${id}`)
}

export function registerAgent(data: Record<string, unknown>) {
  return request.post('/system/agents/register', data)
}

// ============================================
// 审计日志 API
// ============================================

export function getAuditLogs(params: Record<string, unknown>): Promise<{ items: AuditLogItem[]; total: number }> {
  return request.get('/system/audit-logs', { params })
}

export function getAgentSummary(agentId: string, days?: number) {
  return request.get<Record<string, number>>('/system/audit-logs/agent-summary', { params: { agentId, days } })
}

// ============================================
// 模型管理 API (1.1.0 — Key 与 Model 解耦)
// ============================================

export interface ProviderKeyItem {
  id: string
  providerCode: string
  agentCode: string
  label: string
  hasKey: boolean
  baseUrl: string | null
  models: {
    id: string
    modelCode: string
    modelName: string
    category: string
    contextWindow: number
    maxTokens: number
    supportsReasoning: number
    isDefault: number
  }[]
}

export function getProviderKeys(): Promise<ProviderKeyItem[]> {
  return request.get('/system/llm/keys')
}

export function saveProviderKey(data: {
  provider: string
  apiKey: string
  label?: string
  baseUrl?: string
  modelCode?: string
}) {
  return request.post('/system/llm/config', data)
}

export function testProviderKey(data: { provider: string; apiKey?: string }) {
  return request.post('/system/llm/test', data)
}

// 获取可用 Provider 列表
export function getProviders() {
  return request.get('/system/llm/providers')
}

// 设置默认模型（后端路由: POST /system/llm/config/set-default）
export function setDefaultModel(data: { provider: string; modelCode: string }) {
  return request.post('/system/llm/config/set-default', data)
}

export function deleteProviderKey(id: string) {
  return request.delete(`/system/llm/config/${id}`)
}
