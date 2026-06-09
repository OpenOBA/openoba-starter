// @openoba/types — 评价层枚举
// 来源：review.constants.ts
// 注意：与 order.constants.ts 中的 REVIEW_STATUS_CODE（pending/unreviewed）是不同概念，各自独立
// V1.4-b M1 Step 3

/** 评价状态 */
export const REVIEW_STATUS = ['pending', 'approved', 'rejected'] as const
export type ReviewStatus = (typeof REVIEW_STATUS)[number]
