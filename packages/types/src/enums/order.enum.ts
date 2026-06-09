// @openoba/types — 订单层枚举
// 来源：order.constants.ts
// V1.4-b M1 Step 3

/** 订单状态 */
export const ORDER_STATUS = ['pending', 'confirmed', 'paid', 'shipping', 'shipped', 'completed', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUS)[number]

/** 支付状态 */
export const PAYMENT_STATUS = ['unpaid', 'partial', 'paid'] as const
export type PaymentStatus = (typeof PAYMENT_STATUS)[number]

/** 物流状态 */
export const LOGISTICS_STATUS = ['unshipped', 'shipped', 'delivered'] as const
export type LogisticsStatus = (typeof LOGISTICS_STATUS)[number]

/** 售后状态码（订单级标记） */
export const AFTER_SALE_STATUS_CODE = ['none', 'pending', 'processing', 'completed'] as const
export type AfterSaleStatusCode = (typeof AFTER_SALE_STATUS_CODE)[number]

/** 评价状态码（订单级标记） */
export const REVIEW_STATUS_CODE = ['pending', 'unreviewed'] as const
export type ReviewStatusCode = (typeof REVIEW_STATUS_CODE)[number]

/** 订单类型 */
export const ORDER_TYPES = ['retail', 'wholesale', 'set'] as const
export type OrderType = (typeof ORDER_TYPES)[number]

/** 订单来源 */
export const ORDER_SOURCE = ['manual', 'system', 'api'] as const
export type OrderSource = (typeof ORDER_SOURCE)[number]

/** 支付记录状态 */
export const PAYMENT_RECORD_STATUS = ['pending', 'paid'] as const
export type PaymentRecordStatus = (typeof PAYMENT_RECORD_STATUS)[number]

/** 发货状态 */
export const SHIPMENT_STATUS = ['pending', 'shipped'] as const
export type ShipmentStatus = (typeof SHIPMENT_STATUS)[number]

/** 订单履行类型 */
export const FULFILLMENT_TYPE = ['frame_only', 'lens_and_frame', 'lens_only'] as const
export type FulfillmentType = (typeof FULFILLMENT_TYPE)[number]

/** 镜片状态（订单项级） */
export const LENS_STATUS = ['not_needed', 'pending', 'processing', 'completed', 'self_supplied'] as const
export type LensStatus = (typeof LENS_STATUS)[number]
