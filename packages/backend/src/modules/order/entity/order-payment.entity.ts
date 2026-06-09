import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Order } from './order.entity'
// TASK-013 Batch 2: 硬编码替换 — Entity default 保持字符串字面值，注释指向常量
import { PAYMENT_RECORD_STATUS } from '../order.constants'

@Entity('order_payment')
export class OrderPayment {
  @PrimaryGeneratedColumn('uuid', { name: 'payment_id' })
  paymentId: string

  @Column({ comment: '关联订单ID',  name: 'order_id', length: 36 })
  orderId: string

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order

  @Column({ comment: '支付流水号',  name: 'payment_no', unique: true, length: 64 })
  paymentNo: string

  @Column({ comment: '支付方式',  name: 'payment_method', length: 32 })
  paymentMethod: string

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number

  /** @see PAYMENT_RECORD_STATUS.pending — dict_payment_status */
  @Column({ comment: '状态',  length: 32, default: 'pending' })
  status: string

  @Column({ comment: '第三方交易号',  name: 'transaction_id', length: 128, nullable: true })
  transactionId?: string

  @Column({ comment: '支付时间',  name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt?: Date

  @Column({ comment: '退款到账时间',  name: 'refunded_at', type: 'timestamp', nullable: true })
  refundedAt?: Date

  @Column({ comment: '退款金额',  name: 'refund_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  refundAmount: number

  @Column({ comment: '备注',  type: 'varchar', length: 512, nullable: true })
  remark?: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
