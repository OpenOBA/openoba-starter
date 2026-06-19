/**
 * 秒镜科技 · ERDL — 前端 API 封装
 *
 * @file erdl.ts
 * @author 唐浩然
 * @since 2026-05-01
 */

import request from './request'
import type { ERDLValidationResult, ERDLLoadResult } from './api-types'
// note: ERDLStats defined locally at L40 to avoid import conflict

// ============================================
// 类型定义
// ============================================

export interface ERDLEntity {
  namespace: string
  name: string
  properties: Record<string, unknown>
  metadata?: Record<string, unknown>
  sourceFile?: string
  loadedAt: string
}

export interface ERDLRule {
  id: string
  name: string
  namespace: string
  entity: string
  trigger?: string
  priority: number
  tier: string
  isActive: boolean
  createdAt: string
  version: number
  /** UI-only: debounce flag during toggle */
  _toggling?: boolean
}

export interface ERDLStats {
  entities: number
  rules: number
  agents: number
  knowledgeBases: number
  files: number
}

export interface FormFieldSchema {
  field: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'money' | 'boolean'
  required: boolean
  options?: { label: string; value: string }[]
  validation?: { min?: number; max?: number; pattern?: string; message?: string }
}

export interface FormSchema {
  entity: string
  namespace: string
  fields: FormFieldSchema[]
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface RecommendParams {
  faceShape?: string
  skinTone?: string
  scenario?: string
  stylePreference?: string
}

export interface RecommendResult {
  recommendation: string
  reasoning: string
}

// ============================================
// ERDL 管理端 API
// ============================================

/** 获取所有 ERDL Entity */
export function getERDLEntities() {
  return request.get<ERDLEntity[]>('/erdl/entities')
}

/** 获取所有 ERDL 规则 */
export function getERDLRules() {
  return request.get<ERDLRule[]>('/erdl/rules')
}

/** 按触发器筛选规则 */
export function getRulesByTrigger(trigger: string) {
  return request.get<ERDLRule[]>('/erdl/rules/by-trigger', { params: { trigger } })
}

/** 获取注册统计信息 */
export function getERDLStats(): Promise<ERDLStats> {
  return request.get('/erdl/stats')
}

/** 数据校验 */
export function validateERDL(entity: string, data: Record<string, unknown>) {
  return request.post<ValidationResult>('/erdl/validate', { entity, data })
}

/** 获取指定 Entity 的表单 Schema */
export function getFormSchema(namespace: string, entity: string) {
  return request.get<FormSchema | null>('/erdl/schema', { params: { namespace, entity } })
}

/** 获取所有 Entity 的表单 Schema */
export function getAllFormSchemas() {
  return request.get<FormSchema[]>('/erdl/schemas')
}

/** 解析并加载 YAML */
export function parseERDLYaml(yaml: string) {
  return request.post('/erdl/parse', { yaml })
}

// ============================================
// ERDL Playground API
// ============================================

/** 校验 ERDL YAML 语法 */
export function validatePlaygroundYaml(yaml: string): Promise<ERDLValidationResult> {
  return request.post('/erdl/playground/validate', { yaml })
}

/** 加载 ERDL YAML 到运行时 */
export function loadPlaygroundYaml(yaml: string): Promise<ERDLLoadResult> {
  return request.post('/erdl/playground/load', { yaml })
}

/** 🤖 自然语言 → ERDL YAML 生成 */
export function generateERDLFromPrompt(prompt: string, namespace?: string): Promise<ERDLValidationResult> {
  return request.post('/erdl/playground/generate', { prompt, namespace })
}

// ============================================
// ERDL 智能推荐 API
// ============================================

/** 智能推荐镜框 */
export function recommendGlasses(params: RecommendParams) {
  return request.post<RecommendResult>('/erdl/recommend/glasses', params)
}

/** 通用 LLM 查询 */
export function queryLLM(query: string, entityTypes?: string[]) {
  return request.post<string>('/erdl/recommend/query', { query, entityTypes })
}

// ============================================
// 规则 CRUD API
// ============================================

export interface CreateRulePayload {
  name: string
  trigger: string
  namespace: string
  entity: string
  tier: 'policy' | 'validation' | 'computed'
  priority: number
  isActive?: boolean
  condition: Record<string, unknown>
  actions: Record<string, unknown>[]
}

export interface UpdateRulePayload {
  name?: string
  trigger?: string
  namespace?: string
  entity?: string
  tier?: 'policy' | 'validation' | 'computed'
  priority?: number
  isActive?: boolean
  condition?: Record<string, unknown>
  actions?: Record<string, unknown>[]
}

/** 创建规则 */
export function createRule(data: CreateRulePayload) {
  return request.post('/erdl/rules', data)
}

/** 更新规则 */
export function updateRule(id: string, data: UpdateRulePayload) {
  return request.put(`/erdl/rules/${id}`, data)
}

/** 删除规则 */
export function deleteRule(id: string) {
  return request.delete(`/erdl/rules/${id}`)
}

/** 切换规则启用/禁用 */
export function toggleRule(id: string) {
  return request.patch(`/erdl/rules/${id}/toggle`)
}

// ============================================
// 知识库 API
// ============================================

export interface KnowledgeBase {
  id: string
  name: string
  namespace: string
  description?: string
  entityTypes?: string[]
  sourceFile?: string
  loadedAt?: string
}

/** 获取所有知识库 */
export function getKnowledgeBases() {
  return request.get<KnowledgeBase[]>('/erdl/knowledge-bases')
}
