// @openoba/types — 售后层枚举
// 来源：after-sales.constants.ts + after-sales.dto.ts
// 注意：合并了 AfterSalesType enum（大写） 和 AFTER_SALES_TYPE const（小写）→ 统一为小写 const
// V1.4-b M1 Step 3

/** 售后状态 */
export const AFTER_SALES_STATUS = [
  'pending',
  'approved',
  'rejected',
  'returning',
  'received',
  'refunded',
  'completed',
  'closed',
] as const
export type AfterSalesStatus = (typeof AFTER_SALES_STATUS)[number]

/** 售后类型 */
export const AFTER_SALES_TYPE = ['return', 'exchange', 'refund_only', 'repair'] as const
export type AfterSalesType = (typeof AFTER_SALES_TYPE)[number]

/** 售后原因 */
export const AFTER_SALES_REASON = ['quality', 'wrong_item', 'not_as_described', 'changed_mind', 'other'] as const
export type AfterSalesReason = (typeof AFTER_SALES_REASON)[number]

/** 退款方式 */
export const REFUND_METHOD = ['original', 'balance', 'bank_transfer'] as const
export type RefundMethod = (typeof REFUND_METHOD)[number]

/** 申请人类型 */
export const APPLICANT_TYPE = ['customer', 'admin'] as const
export type ApplicantType = (typeof APPLICANT_TYPE)[number]

/** 审核动作 */
export const REVIEW_ACTION = ['approve', 'reject'] as const
export type ReviewAction = (typeof REVIEW_ACTION)[number]

/** 处理动作 */
export const PROCESS_ACTION = ['receive', 'refund', 'close', 'reopen'] as const
export type ProcessAction = (typeof PROCESS_ACTION)[number]
