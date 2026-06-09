import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { MemberLevel } from './member-level.entity'

@Entity('member_pricing_rule')
export class MemberPricingRule {
  @PrimaryColumn('varchar', { name: 'rule_id', length: 36 })
  ruleId: string

  @Column('varchar', { name: 'level_code', length: 16 })
  levelCode: string

  @Column('varchar', { name: 'sku_id', length: 36 })
  skuId: string

  @Column('varchar', { name: 'rule_type', length: 16, default: 'discount' })
  ruleType: string

  @Column('decimal', { name: 'discount_rate', precision: 4, scale: 3, nullable: true })
  discountRate: number | null

  @Column('decimal', { name: 'fixed_price', precision: 10, scale: 2, nullable: true })
  fixedPrice: number | null

  @Column('decimal', { name: 'extra_discount', precision: 4, scale: 3, nullable: true })
  extraDiscount: number | null

  @Column('int', { default: 0 })
  priority: number

  @Column('int', { name: 'min_quantity', default: 1 })
  minQuantity: number

  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean

  @Column('timestamp', { name: 'start_time', nullable: true })
  startTime: Date | null

  @Column('timestamp', { name: 'end_time', nullable: true })
  endTime: Date | null

  @Column('varchar', { length: 512, nullable: true })
  notes: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @ManyToOne(() => MemberLevel)
  @JoinColumn({ name: 'level_code', referencedColumnName: 'levelCode' })
  memberLevel: MemberLevel
}
