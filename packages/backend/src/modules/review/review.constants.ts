/**
 * 评价模块状态常量 — TASK-013 Batch 8
 * 对应字典表：dict_review_status
 */

// ===== 评价状态（dict_review_status） =====
export const REVIEW_STATUS = {
  pending: 'pending', // 待审核
  approved: 'approved', // 已通过
  rejected: 'rejected', // 已拒绝
} as const
