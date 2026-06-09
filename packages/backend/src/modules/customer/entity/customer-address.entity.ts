import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'
import { Customer } from './customer.entity'

@Entity('customer_address')
@Index('idx_customer', ['customerId'])
@Index('idx_default', ['isDefault'])
export class CustomerAddress {
  @PrimaryColumn('varchar', { name: 'address_id', length: 36 })
  addressId: string

  @Column('varchar', {comment: 'customer ID',  name: 'customer_id', length: 36 })
  customerId: string

  @ManyToOne(() => Customer, (c) => c.addresses)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer

  @Column('varchar', { length: 128, comment: '省份' })
  province: string

  @Column('varchar', { length: 128, comment: '城市' })
  city: string

  @Column('varchar', { length: 128, nullable: true, comment: '区县' })
  district: string | null

  @Column('varchar', { name: 'detail_address', length: 512, comment: '详细地址' })
  detailAddress: string

  @Column('varchar', { name: 'receiver_name', length: 128, comment: '收货人' })
  receiverName: string

  @Column('varchar', { name: 'receiver_phone', length: 32, comment: '收货人电话' })
  receiverPhone: string

  @Column({ name: 'is_default', default: false, comment: '是否默认地址' })
  isDefault: boolean

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
