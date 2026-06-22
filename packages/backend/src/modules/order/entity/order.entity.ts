/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'
// TASK-013 Batch 2: 硬编码替换 — Entity default 保持字符串字面值（TypeORM 编译期限制），注释指向常量
import {
  ORDER_TYPES,
  ORDER_STATUS,
  PAYMENT_STATUS,
  LOGISTICS_STATUS,
  AFTER_SALE_STATUS_CODE,
  REVIEW_STATUS_CODE,
  ORDER_SOURCE,
} from '../order.constants'

@Entity('order')
export class Order {
  @PrimaryGeneratedColumn('uuid', { name: 'order_id' })
  orderId: string

  @Column({ comment: '订单号', name: 'order_no', unique: true, length: 64 })
  orderNo: string

  @Column({ comment: 'customer ID', name: 'customer_id', length: 36 })
  customerId: string

  @Column({ comment: '客户姓名', name: 'customer_name', length: 128 })
  customerName: string

  @Column({ comment: '客户电话', name: 'customer_phone', length: 32, nullable: true })
  customerPhone?: string

  /** @see ORDER_TYPES.retail — dict_customer_type */
  @Column({ comment: 'customer 类型', name: 'customer_type', length: 16, default: 'retail' })
  customerType: string

  /** @see ORDER_TYPES.retail — dict_order_type */
  @Column({ comment: 'order 类型', name: 'order_type', length: 16, default: 'retail' })
  orderType: string

  // 消费场景标识（V3.0 电商化）
  @Column({ name: 'has_prescription', default: false, comment: '是否有处方' })
  hasPrescription: boolean

  @Column({ name: 'has_processing', default: false, comment: '是否需要加工' })
  hasProcessing: boolean

  @Column({ name: 'is_wholesale', default: false, comment: '是否批发订单' })
  isWholesale: boolean

  // 关联结构标准（复购场景锚点）— 结构锚点原则：每笔订单必须携带结构标准
  @Column({
    name: 'structure_standard_code',
    length: 64,
    nullable: true,
    comment: '关联结构标准编码（复购场景锚点，引用external_code）',
  })
  structureStandardCode?: string

  // 批发阶梯档位
  @Column({ name: 'wholesale_tier', length: 16, nullable: true, comment: '批发档位 A/B/C' })
  wholesaleTier?: string

  /** @see ORDER_STATUS.pending — dict_order_status */
  @Column({ comment: '状态', length: 32, default: 'pending' })
  status: string

  @Column({ comment: '支付方式', name: 'payment_method', length: 32, nullable: true })
  paymentMethod?: string

  @Column({ comment: '支付状态', name: 'payment_status', length: 32, default: 'unpaid' })
  paymentStatus: string

  // 状态码（P1: FK nullable for SET NULL）
  @Column({ name: 'payment_status_code', length: 64, nullable: true, default: 'unpaid', comment: '支付状态码' })
  paymentStatusCode?: string

  @Column({ name: 'logistics_status_code', length: 64, nullable: true, default: 'unshipped', comment: '物流状态码' })
  logisticsStatusCode?: string

  @Column({ name: 'after_sale_status_code', length: 64, nullable: true, default: 'none', comment: '售后状态码' })
  afterSaleStatusCode?: string

  /** @see REVIEW_STATUS_CODE.pending — dict_review_status */
  @Column({ name: 'review_status_code', length: 64, nullable: true, default: 'pending', comment: '评价状态码' })
  reviewStatusCode?: string

  @Column({ comment: '总金额', name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number

  @Column({ comment: '优惠金额', name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount: number

  @Column({ comment: '运费', name: 'shipping_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingFee: number

  @Column({ comment: '实付金额', name: 'actual_amount', type: 'decimal', precision: 12, scale: 2 })
  actualAmount: number

  // ===== Phase 9A: 利润核算 =====
  @Column({
    name: 'total_retail_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    comment: '总零售价（按统一零售价计算）',
  })
  totalRetailPrice: number

  @Column({ name: 'total_discount', type: 'decimal', precision: 12, scale: 2, default: 0, comment: '总优惠金额' })
  totalDiscount: number

  @Column({ name: 'total_cost', type: 'decimal', precision: 12, scale: 2, default: 0, comment: '订单总成本' })
  totalCost: number

  @Column({ name: 'gross_profit', type: 'decimal', precision: 12, scale: 2, default: 0, comment: '毛利润' })
  grossProfit: number

  @Column({ name: 'gross_margin_pct', type: 'decimal', precision: 5, scale: 2, default: 0, comment: '毛利率%' })
  grossMarginPct: number

  // 退款区分
  @Column({
    name: 'cancel_refund_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    comment: '取消退款金额',
  })
  cancelRefundAmount: number

  @Column({
    name: 'after_sale_refund_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    comment: '售后退款金额',
  })
  afterSaleRefundAmount: number

  @Column({ comment: '关联处方ID', name: 'prescription_id', length: 36, nullable: true })
  prescriptionId?: string

  // 备注区分
  @Column({ type: 'text', nullable: true, comment: '客户备注' })
  remark?: string

  @Column({ name: 'internal_remark', type: 'text', nullable: true, comment: '内部备注' })
  internalRemark?: string

  @Column({ length: 32, default: 'manual' })
  source: string

  @Column({ comment: '创建人', name: 'created_by', length: 36, nullable: true })
  createdBy?: string

  // 收货与评价
  @Column({ name: 'received_at', type: 'timestamp', nullable: true, comment: '签收时间' })
  receivedAt?: Date

  @Column({ name: 'review_deadline', type: 'timestamp', nullable: true, comment: '评价截止时间' })
  reviewDeadline?: Date

  // 扩展属性
  @Column({ type: 'json', nullable: true, comment: '扩展属性' })
  attributes?: Record<string, any>

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
