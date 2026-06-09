import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Order } from './order.entity'
// TASK-013 Batch 2: 硬编码替换 — Entity default 保持字符串字面值，注释指向常量
import { SHIPMENT_STATUS } from '../order.constants'

@Entity('order_shipment')
export class OrderShipment {
  @PrimaryGeneratedColumn('uuid', { name: 'shipment_id' })
  shipmentId: string

  @Column({ comment: '关联订单ID',  name: 'order_id', length: 36 })
  orderId: string

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order

  @Column({ comment: '物流单号',  name: 'tracking_no', length: 128, nullable: true })
  trackingNo?: string

  @Column({ comment: '物流公司',  length: 64, nullable: true })
  carrier?: string

  @Column({ comment: '发货时间',  name: 'shipped_at', type: 'timestamp', nullable: true })
  shippedAt?: Date

  @Column({ comment: '签收时间',  name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt?: Date

  /** @see SHIPMENT_STATUS.pending — dict_logistics_status */
  @Column({ comment: '状态',  length: 32, default: 'pending' })
  status: string

  @Column({ comment: '发货人',  length: 64, nullable: true })
  shipper?: string

  @Column({ comment: '备注',  type: 'varchar', length: 512, nullable: true })
  remark?: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
