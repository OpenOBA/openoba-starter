/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'
// TASK-013 Batch 4: 硬编码替换 — Entity enum/default 保持字符串字面值（TypeORM 编译期限制），注释指向常量
import {
  AFTER_SALES_STATUS,
  AFTER_SALES_TYPE,
  AFTER_SALES_REASON,
  REFUND_METHOD,
  APPLICANT_TYPE,
} from '../after-sales.constants'

@Entity('after_sales')
@Index('idx_after_sales_order', ['orderId'])
@Index('idx_after_sales_customer', ['customerId'])
@Index('idx_after_sales_status', ['status'])
export class AfterSales {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ comment: '售后单号', name: 'after_sales_no', length: 36, unique: true })
  afterSalesNo: string

  @Column({ comment: '关联订单ID', name: 'order_id', length: 36 })
  orderId: string

  @Column({ comment: '订单号', name: 'order_no', length: 36, nullable: true })
  orderNo: string

  @Column({ comment: 'customer ID', name: 'customer_id', length: 36, nullable: true })
  customerId: string

  @Column({ comment: '客户姓名', name: 'customer_name', length: 100, nullable: true })
  customerName: string

  /** @see AFTER_SALES_TYPE */
  @Column({
    comment: 'afterSales 类型',
    name: 'after_sales_type',
    type: 'enum',
    enum: ['return', 'exchange', 'refund_only', 'repair'],
  })
  afterSalesType: string

  /** @see AFTER_SALES_REASON */
  @Column({
    name: 'reason_type',
    type: 'enum',
    enum: ['quality', 'wrong_item', 'not_as_described', 'changed_mind', 'other'],
    default: 'other',
  })
  reasonType: string

  @Column({ comment: '详细原因描述', name: 'reason_detail', type: 'text', nullable: true })
  reasonDetail: string

  @Column({ comment: '凭证图片URL列表', name: 'evidence_urls', type: 'json', nullable: true })
  evidenceUrls: string[]

  @Column({ comment: '退款金额', name: 'refund_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  refundAmount: string

  @Column({
    comment: '实际退款金额',
    name: 'actual_refund_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  actualRefundAmount: string

  @Column({ comment: '退货物流单号', name: 'return_tracking_no', length: 64, nullable: true })
  returnTrackingNo: string

  @Column({ comment: '退货物流公司', name: 'return_carrier', length: 64, nullable: true })
  returnCarrier: string

  @Column({ comment: '重发物流单号', name: 'resend_tracking_no', length: 64, nullable: true })
  resendTrackingNo: string

  @Column({ comment: '重发物流公司', name: 'resend_carrier', length: 64, nullable: true })
  resendCarrier: string

  /** @see AFTER_SALES_STATUS — dict_after_sale_status */
  @Column({
    name: 'status',
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'returning', 'received', 'refunded', 'completed', 'closed'],
    default: 'pending',
  })
  status: string

  @Column({ comment: '商品明细JSON', name: 'items', type: 'json', nullable: true })
  items: any[]

  @Column({ comment: '审核人ID', name: 'reviewer_id', length: 36, nullable: true })
  reviewerId: string

  @Column({ comment: '审核备注', name: 'review_note', type: 'text', nullable: true })
  reviewNote: string

  @Column({ comment: '审核时间', name: 'reviewed_at', nullable: true })
  reviewedAt: Date

  /** @see REFUND_METHOD — dict_refund_method */
  @Column({ name: 'refund_method', type: 'enum', enum: ['original', 'balance', 'bank_transfer'], nullable: true })
  refundMethod: string

  @Column({ comment: '退款到账时间', name: 'refunded_at', nullable: true })
  refundedAt: Date

  /** @see APPLICANT_TYPE */
  @Column({
    comment: 'applicant 类型',
    name: 'applicant_type',
    type: 'enum',
    enum: ['customer', 'admin'],
    default: 'customer',
  })
  applicantType: string

  @Column({ comment: '申请人ID', name: 'applicant_id', length: 36, nullable: true })
  applicantId: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @Column({ name: 'is_deleted', type: 'tinyint', default: 0, nullable: false })
  deletedAt: Date
}
