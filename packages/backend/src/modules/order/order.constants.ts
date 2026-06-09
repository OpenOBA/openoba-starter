/**
 * 订单模块状态常量 — TASK-013 Batch 2
 * 所有订单状态/类型/支付/物流硬编码值统一引用此文件
 * 对应字典表：dict_order_status, dict_payment_status, dict_logistics_status
 */

// ===== 订单状态（dict_order_status） =====
export const ORDER_STATUS = {
  pending: 'pending', // 待处理
  confirmed: 'confirmed', // 已确认
  paid: 'paid', // 已支付
  shipped: 'shipped', // 已发货
  delivered: 'delivered', // 已送达
  completed: 'completed', // 已完成
  cancelled: 'cancelled', // 已取消
} as const

// ===== 支付状态（dict_payment_status + 扩展） =====
export const PAYMENT_STATUS = {
  unpaid: 'unpaid', // 未支付
  partial: 'partial', // 部分支付
  paid: 'paid', // 已支付
} as const

// ===== 物流状态码 =====
export const LOGISTICS_STATUS = {
  unshipped: 'unshipped', // 未发货
  shipped: 'shipped', // 已发货
  delivered: 'delivered', // 已送达
} as const

// ===== 售后状态码 =====
export const AFTER_SALE_STATUS_CODE = {
  none: 'none', // 无售后
} as const

// ===== 评价状态码 =====
export const REVIEW_STATUS_CODE = {
  pending: 'pending', // 待评价
  unreviewed: 'unreviewed', // 未审核
} as const

// ===== 订单类型 =====
export const ORDER_TYPES = {
  retail: 'retail', // 零售
  wholesale: 'wholesale', // 批发
  set: 'set', // 套装
} as const

// ===== 订单来源 =====
export const ORDER_SOURCE = {
  manual: 'manual',
} as const

// ===== 支付记录状态 =====
export const PAYMENT_RECORD_STATUS = {
  pending: 'pending',
  paid: 'paid',
} as const

// ===== 物流记录状态 =====
export const SHIPMENT_STATUS = {
  pending: 'pending',
  shipped: 'shipped',
} as const

// ===== 订单行 - 履行类型 =====
export const FULFILLMENT_TYPE = {
  frame_only: 'frame_only',
  lens_and_frame: 'lens_and_frame',
  lens_only: 'lens_only',
} as const

// ===== 订单行 - 镜片状态 =====
export const LENS_STATUS = {
  not_needed: 'not_needed',
  pending: 'pending',
  processing: 'processing',
  completed: 'completed',
  self_supplied: 'self_supplied',
} as const
