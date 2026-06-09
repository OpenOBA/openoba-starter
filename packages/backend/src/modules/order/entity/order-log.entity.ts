import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Order } from './order.entity'

@Entity('order_log')
export class OrderLog {
  @PrimaryGeneratedColumn('uuid', { name: 'log_id' })
  logId: string

  @Column({ comment: '关联订单ID',  name: 'order_id', length: 36 })
  orderId: string

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order

  @Column({ comment: '操作动作',  length: 64 })
  action: string

  @Column({ comment: '旧状态',  name: 'old_status', length: 32, nullable: true })
  oldStatus?: string

  @Column({ comment: '新状态',  name: 'new_status', length: 32, nullable: true })
  newStatus?: string

  @Column({ comment: '操作人',  length: 64, nullable: true })
  operator?: string

  @Column({ comment: '备注',  type: 'varchar', length: 512, nullable: true })
  remark?: string

  // P1-12: Extra data (JSON for flexibility)
  @Column({ name: 'extra_data', type: 'json', nullable: true })
  extraData?: Record<string, any>

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
