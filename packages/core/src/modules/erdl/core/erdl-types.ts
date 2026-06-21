/**
 * OpenOBA · ERDL Core Types
 *
 * @file ERDL 注册类型定义
 * @author 唐浩然（OpenOBA AI 联合创始人）
 * @since 2026-06-21
 * @license BSL-1.1
 *
 * 从 erdl-registry.ts 拆分而来
 */

/**
 * Entity 注册信息
 */
export interface EntityRegistration {
  namespace: string
  name: string
  /** 数据库物理表名 */
  table?: string
  /** 主键列名 */
  primaryKey?: string
  /** Entity 属性定义 */
  properties: Record<string, unknown>
  /** 元数据（知识关联、图标、分类等） */
  metadata?: Record<string, unknown>
  /** 源文件路径（用于热替换检测） */
  sourceFile?: string
  /** 注册时间 */
  loadedAt: Date
}

/**
 * Agent 注册信息
 */
export interface AgentRegistration {
  name: string
  namespace: string
  definition: Record<string, unknown>
  sourceFile?: string
}

/**
 * 知识库注册信息
 */
export interface KnowledgeBaseRegistration {
  name: string
  namespace: string
  definition: Record<string, unknown>
  sourceFile?: string
}
