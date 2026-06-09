// @openoba/types — 订单层接口
// 来源：order.entity.ts, order-item.entity.ts, order-payment.entity.ts
// V1.4-b M1 Step 4

import { OrderStatus, PaymentStatus, LogisticsStatus, AfterSaleStatusCode, ReviewStatusCode, OrderType, OrderSource, PaymentRecordStatus, ShipmentStatus, FulfillmentType, LensStatus } from '../enums/order.enum'

// ============================================================
// Order — 订单主表
// ============================================================

export interface IOrder {
  /** UUID 主键 */
  orderId: string
  /** 订单号（OBA-YYYYMMDD-XXXXXXXX） */
  orderNo: string
  /** 关联客户 ID */
  customerId: string
  /** 客户姓名 */
  customerName: string
  /** 客户电话 */
  customerPhone?: string
  /** 客户类型 */
  customerType: string
  /** 订单类型 */
  orderType: OrderType
  /** 是否有处方 */
  hasPrescription: boolean
  /** 是否需要加工 */
  hasProcessing: boolean
  /** 是否批发订单 */
  isWholesale: boolean
  /** 结构标准编码（锚点） */
  structureStandardCode?: string
  /** 批发档位 */
  wholesaleTier?: string
  /** 订单状态 */
  status: OrderStatus
  /** 支付方式 */
  paymentMethod?: string
  /** 支付状态 */
  paymentStatus: PaymentStatus
  /** 支付状态码 */
  paymentStatusCode?: string
  /** 物流状态码 */
  logisticsStatusCode?: string
  /** 售后状态码 */
  afterSaleStatusCode?: string
  /** 评价状态码 */
  reviewStatusCode?: string
  /** 总金额 */
  totalAmount: number
  /** 优惠金额 */
  discountAmount: number
  /** 运费 */
  shippingFee: number
  /** 实付金额 */
  actualAmount: number
  /** 总零售价 */
  totalRetailPrice: number
  /** 总优惠金额 */
  totalDiscount: number
  /** 订单总成本 */
  totalCost: number
  /** 毛利润 */
  grossProfit: number
  /** 毛利率% */
  grossMarginPct: number
  /** 取消退款金额 */
  cancelRefundAmount: number
  /** 售后退款金额 */
  afterSaleRefundAmount: number
  /** 关联处方 ID */
  prescriptionId?: string
  /** 客户备注 */
  remark?: string
  /** 内部备注 */
  internalRemark?: string
  /** 订单来源 */
  source: OrderSource
  /** 创建人 */
  createdBy?: string
  /** 签收时间 */
  receivedAt?: Date
  /** 评价截止时间 */
  reviewDeadline?: Date
  /** 扩展属性 */
  attributes?: Record<string, any>
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
}

// ============================================================
// OrderItem — 订单明细
// ============================================================

export interface IOrderItem {
  /** UUID 主键 */
  itemId: string
  /** 关联订单 ID */
  orderId: string
  /** 商品类型（frame/lens/service） */
  productType: string
  /** 商品 ID */
  productId: string
  /** 商品名称 */
  productName: string
  /** SKU 编码 */
  skuCode?: string
  /** 数量 */
  quantity: number
  /** 单价 */
  unitPrice: number
  /** 零售价 */
  retailPrice?: number
  /** 优惠金额 */
  discountAmount: number
  /** 优惠原因 */
  discountReason?: string
  /** 优惠引用 ID */
  discountRefId?: string
  /** 成本单价 */
  unitCost?: number
  /** 毛利润 */
  grossProfit: number
  /** 小计 */
  subtotal: number
  /** 结构标准编码（交易快照） */
  structureStandardCode: string
  /** 产品层级 */
  productTier?: string
  /** 履行类型 */
  orderFulfillmentType: FulfillmentType
  /** 镜片加工状态 */
  lensStatus: LensStatus
  /** 镜框颜色 */
  frameColor?: string
  /** 镜框尺寸 */
  frameSize?: string
  /** 是否需要处方 */
  prescriptionRequired: boolean
  /** SKU 属性快照 */
  skuAttributes?: Record<string, any>
  /** 评价状态 */
  reviewStatus: string
  /** 售后状态 */
  afterSaleStatus: string
  /** 备注 */
  remark?: string
  /** 创建时间 */
  createdAt: Date
}

// ============================================================
// OrderPayment — 支付记录
// ============================================================

export interface IOrderPayment {
  /** UUID 主键 */
  paymentId: string
  /** 关联订单 ID */
  orderId: string
  /** 支付方式 */
  method: string
  /** 交易单号 */
  transactionNo?: string
  /** 支付金额 */
  amount: number
  /** 支付状态 */
  status: PaymentRecordStatus
  /** 支付时间 */
  paidAt?: Date
  /** 支付通道（wechat/alipay/bank_transfer/cash） */
  channel?: string
  /** 备注 */
  remark?: string
  /** 创建时间 */
  createdAt: Date
}
