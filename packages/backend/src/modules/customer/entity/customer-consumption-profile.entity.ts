/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'
import { CustomerLens } from './customer-lens.entity'

@Entity('customer_consumption_profile')
@Index('idx_customer_lens', ['customerLensId'])
@Index('idx_use_status', ['useStatus'])
export class CustomerConsumptionProfile {
  @PrimaryColumn('varchar', { name: 'consumption_profile_id', length: 36 })
  consumptionProfileId: string

  @Column('varchar', {comment: '关联镜片档案ID',  name: 'customer_lens_id', length: 36 })
  customerLensId: string

  @ManyToOne(() => CustomerLens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_lens_id' })
  customerLens: CustomerLens

  @Column('varchar', { name: 'product_sku_code', length: 128, nullable: true, comment: '关联商品SKU编码' })
  productSkuCode: string | null

  @Column('varchar', { name: 'product_name', length: 256, nullable: true, comment: '镜框名称快照' })
  productName: string | null

  @Column('date', { name: 'purchase_date', nullable: true, comment: '购买日期' })
  purchaseDate: Date | null

  @Column('varchar', { name: 'order_id', length: 36, nullable: true, comment: '来源订单ID' })
  orderId: string | null

  @Column('varchar', { name: 'use_status', length: 32, default: 'active', comment: 'active/standby/disabled' })
  useStatus: string

  @Column('varchar', { name: 'use_frequency', length: 32, nullable: true, comment: 'high/medium/low' })
  useFrequency: string | null

  @Column({ type: 'json', name: 'scene_tags', nullable: true, comment: '场景标签' })
  sceneTags: string[] | null

  @Column({ type: 'json', nullable: true, comment: '扩展属性' })
  attributes: Record<string, any> | null

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
