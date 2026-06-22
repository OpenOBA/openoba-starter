/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'
import { Customer } from './customer.entity'
import { VisionPrescription } from './vision-prescription.entity'
import { CustomerConsumptionProfile } from './customer-consumption-profile.entity'

@Entity('customer_lens')
@Index('idx_customer', ['customerId'])
@Index('idx_structure_standard', ['structureStandardCode'])
export class CustomerLens {
  @PrimaryColumn('varchar', { name: 'customer_lens_id', length: 36 })
  customerLensId: string

  @Column('varchar', {comment: 'customer ID',  name: 'customer_id', length: 36 })
  customerId: string

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer

  @Column('varchar', { name: 'structure_standard_code', length: 64, comment: '结构标准锚点（如5147）' })
  structureStandardCode: string

  @Column('varchar', { name: 'prescription_id', length: 36, nullable: true, comment: '可选：下单时引用的处方' })
  prescriptionId: string | null

  @ManyToOne(() => VisionPrescription, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'prescription_id' })
  prescription: VisionPrescription | null

  @Column('date', { name: 'purchase_date', nullable: true, comment: '购买日期' })
  purchaseDate: Date | null

  @Column('varchar', { name: 'order_id', length: 36, nullable: true, comment: '来源订单ID' })
  orderId: string | null

  @Column('varchar', { length: 32, default: 'active', comment: 'active/discontinued' }) // @see STRUCT_STATUS
  status: string

  @Column({ type: 'json', nullable: true, comment: '扩展属性' })
  attributes: Record<string, any> | null

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @OneToMany(() => CustomerConsumptionProfile, (p) => p.customerLens)
  consumptionProfiles: CustomerConsumptionProfile[]
}
