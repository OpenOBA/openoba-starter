/**
 * 售后模块状态常量 — TASK-013 Batch 4
 * 所有售后状态/原因/退款方式硬编码值统一引用此文件
 * 对应字典表：dict_after_sale_status, dict_after_sale_reason, dict_refund_method
 */

// ===== 售后状态机（dict_after_sale_status） =====
export const AFTER_SALES_STATUS = {
  pending: 'pending', // 待审核
  approved: 'approved', // 已批准
  rejected: 'rejected', // 已拒绝
  returning: 'returning', // 退货中
  received: 'received', // 已收货
  refunded: 'refunded', // 已退款
  completed: 'completed', // 已完成
  closed: 'closed', // 已关闭
} as const

// ===== 售后类型 =====
export const AFTER_SALES_TYPE = {
  return: 'return', // 退货退款
  exchange: 'exchange', // 换货
  refund_only: 'refund_only', // 仅退款
  repair: 'repair', // 维修
} as const

// ===== 售后原因 =====
export const AFTER_SALES_REASON = {
  quality: 'quality', // 质量问题
  wrong_item: 'wrong_item', // 发错商品
  not_as_described: 'not_as_described', // 与描述不符
  changed_mind: 'changed_mind', // 七天无理由
  other: 'other', // 其他
} as const

// ===== 退款方式 =====
export const REFUND_METHOD = {
  original: 'original', // 原路退回
  balance: 'balance', // 退回余额
  bank_transfer: 'bank_transfer', // 银行转账
} as const

// ===== 申请人类型 =====
export const APPLICANT_TYPE = {
  customer: 'customer',
  admin: 'admin',
} as const
