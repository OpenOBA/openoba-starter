/**
 * API 响应类型定义
 *
 * 对应 request.ts 中的响应拦截器行为：
 * 1. 数组 → 直接返回数组
 * 2. { code: 0, data: T } → 返回 data
 * 3. 其他 → 直接透传
 *
 * @file api-types.ts
 */

/** 分页响应 */
export interface PaginatedData<T> {
  items: T[]
  total: number
  page?: number
  pageSize?: number
}

/** 数据字典条目 */
export interface DictItem {
  code: string
  name: string
  sort_order?: number
  is_active?: number
  [key: string]: unknown
}

/** 标准 API 响应包装 */
export interface ApiResponse<T = unknown> {
  code: number
  message?: string | string[]
  data: T
}

/** 字典 API 返回：可能是数组或被包装 */
export type DictResponse = DictItem[] | PaginatedData<DictItem>

/** ERDL 校验结果 */
export interface ERDLValidationResult {
  yaml?: string
  valid: boolean
  errors: string[]
}

/** ERDL 统计 */
export interface ERDLStats {
  entities: number
  rules: number
  agents: number
  knowledgeBases: number
  files: number
}

/** ERDL 加载结果 */
export interface ERDLLoadResult {
  entities: unknown[]
  rulesets: unknown[]
  agents: unknown[]
  knowledgeBases: unknown[]
  stats: ERDLStats | null
}
