import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Order } from './order.entity'

@Entity('order_address')
export class OrderAddress {
  @PrimaryGeneratedColumn('uuid', { name: 'address_id' })
  addressId: string

  @Column({ comment: '关联订单ID',  name: 'order_id', length: 36 })
  orderId: string

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order

  @Column({ comment: '收货人姓名',  name: 'receiver_name', length: 64 })
  receiverName: string

  @Column({ comment: '收货人电话',  name: 'receiver_phone', length: 32 })
  receiverPhone: string

  @Column({ length: 64 })
  province: string

  @Column({ length: 64 })
  city: string

  @Column({ length: 64, nullable: true })
  district?: string

  @Column({ comment: '详细地址',  name: 'address_detail', type: 'varchar', length: 512 })
  addressDetail: string

  @Column({ comment: '邮政编码',  name: 'postal_code', length: 16, nullable: true })
  postalCode?: string

  @Column({ comment: '是否默认',  name: 'is_default', default: false })
  isDefault: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
