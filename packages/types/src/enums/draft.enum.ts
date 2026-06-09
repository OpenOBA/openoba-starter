// @openoba/types — 草稿池枚举
// 来源：draft.entity.ts + draft-spu/sku/batch/publish-batch/task entities
// V1.4-b M1 Step 3

/** 草稿状态 */
export const DRAFT_STATUS = ['editing', 'ready', 'published', 'archived'] as const
export type DraftStatus = (typeof DRAFT_STATUS)[number]

/** 草稿类型 */
export const DRAFT_TYPE = ['spu', 'content', 'report', 'note', 'mixed'] as const
export type DraftType = (typeof DRAFT_TYPE)[number]

/** 发布动作 */
export const PUBLISH_ACTION = ['insert', 'update', 'replace', 'export', 'post', 'merge'] as const
export type PublishAction = (typeof PUBLISH_ACTION)[number]

/** 投递渠道 */
export const DELIVERY_CHANNEL = ['system', 'local_file'] as const
export type DeliveryChannel = (typeof DELIVERY_CHANNEL)[number]

/** 草稿任务状态 */
export const DRAFT_TASK_STATUS = ['pending', 'running', 'completed', 'failed', 'cancelled'] as const
export type DraftTaskStatus = (typeof DRAFT_TASK_STATUS)[number]

/** 批量发布状态 */
export const DRAFT_BATCH_STATUS = ['generating', 'pending', 'published', 'failed'] as const
export type DraftBatchStatus = (typeof DRAFT_BATCH_STATUS)[number]

/** 草稿来源 */
export const DRAFT_SOURCE = ['ai', 'manual', 'import'] as const
export type DraftSource = (typeof DRAFT_SOURCE)[number]

/** 美学评级 */
export const AESTHETIC_LEVEL = ['pass', 'warn', 'block'] as const
export type AestheticLevel = (typeof AESTHETIC_LEVEL)[number]

/** 咨询报告状态 */
export const ADVISORY_STATUS = ['pending', 'generating', 'completed', 'failed'] as const
export type AdvisoryStatus = (typeof ADVISORY_STATUS)[number]

/** SKU 草稿状态 */
export const DRAFT_SKU_STATUS = ['draft', 'ready', 'published', 'archived'] as const
export type DraftSkuStatus = (typeof DRAFT_SKU_STATUS)[number]

/** 内容块类型 */
export const CONTENT_BLOCK_TYPE = ['text', 'image', 'video', 'table'] as const
export type ContentBlockType = (typeof CONTENT_BLOCK_TYPE)[number]
