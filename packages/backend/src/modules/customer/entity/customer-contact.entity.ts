import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'
import { Customer } from './customer.entity'

@Entity('customer_contact')
@Index('idx_customer', ['customerId'])
export class CustomerContact {
  @PrimaryColumn('varchar', { name: 'contact_id', length: 36 })
  contactId: string

  @Column('varchar', { comment: 'customer ID', name: 'customer_id', length: 36 })
  customerId: string

  @ManyToOne(() => Customer, (c) => c.contacts)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer

  @Column('varchar', { comment: '联系人姓名', name: 'contact_name', length: 128 })
  contactName: string

  @Column('varchar', { comment: '联系电话', length: 32, nullable: true })
  phone: string | null

  @Column('varchar', { comment: '电子邮箱', length: 128, nullable: true })
  email: string | null

  @Column('varchar', { length: 128, nullable: true, comment: '微信号' })
  wechat: string | null

  @Column('varchar', { length: 64, nullable: true, comment: '角色: 采购/财务/收货人' })
  role: string | null

  @Column({ name: 'is_primary', default: false, comment: '是否主要联系人' })
  isPrimary: boolean

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
