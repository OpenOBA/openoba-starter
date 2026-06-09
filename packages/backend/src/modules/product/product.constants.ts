/**
 * 商品模块状态常量 — TASK-013 Batch 5
 * 所有商品状态/类型硬编码值统一引用此文件
 * 对应字典表：dict_product_status, dict_sku_status, dict_promotion_status
 */

// ===== SPU/套装状态（dict_product_status） =====
export const PRODUCT_STATUS = {
  draft: 'draft', // 草稿
  on_sale: 'on_sale', // 在售/上架
  off_sale: 'off_sale', // 下架
} as const

// ===== SKU 状态（dict_sku_status） =====
export const SKU_STATUS = {
  active: 'active', // 在售
  inactive: 'inactive', // 停售
  discontinued: 'discontinued', // 已停产
} as const

// ===== 促销状态（dict_promotion_status） =====
export const PROMOTION_STATUS = {
  draft: 'draft', // 草稿
  active: 'active', // 进行中
  paused: 'paused', // 已暂停
  expired: 'expired', // 已过期
} as const
