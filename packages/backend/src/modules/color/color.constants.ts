/**
 * 色彩模块状态常量 — TASK-013 Batch 6
 * 色彩相关状态/优先级硬编码值统一引用此文件
 * 注意：色彩状态为业务级枚举（非日常运营字典），保留代码常量
 */

// ===== 色盘/设计项目状态 =====
export const COLOR_STATUS = {
  draft: 'draft', // 草稿
  active: 'active', // 启用
  archived: 'archived', // 归档
} as const

// ===== 设计项目扩展状态（前端使用） =====
export const PROJECT_STATUS = {
  draft: 'draft', // 草稿
  designing: 'designing', // 设计中
  reviewing: 'reviewing', // 审核中
  approved: 'approved', // 已审批
  production: 'production', // 生产中
  archived: 'archived', // 归档
} as const

// ===== 设计项目优先级 =====
export const PROJECT_PRIORITY = {
  low: 'low', // 低
  normal: 'normal', // 普通
  high: 'high', // 高
  urgent: 'urgent', // 紧急
} as const
