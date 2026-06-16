import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'
import { Customer } from './customer.entity'

export const PRICING_TIERS = ['A', 'B', 'C'] as const

@Entity('customer_tier_pricing')
@Index('idx_customer', ['customerId'])
@Index('idx_tier', ['tier'])
@Index('idx_active', ['isActive'])
export class CustomerTierPricing {
  @PrimaryColumn('varchar', { name: 'pricing_id', length: 36 })
  pricingId: string

  @Column('varchar', { name: 'customer_id', length: 36, comment: '关联客户' })
  customerId: string

  @ManyToOne(() => Customer, (c) => c.tierPricings)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer

  @Column('varchar', { length: 16, comment: '档位: A/B/C' })
  tier: string

  @Column('varchar', { name: 'product_sku_id', length: 36, nullable: true, comment: '商品SKU（NULL表示全局折扣）' })
  productSkuId: string | null

  @Column({
    name: 'discount_rate',
    type: 'decimal',
    precision: 4,
    scale: 3,
    nullable: true,
    comment: '折扣率: 0.85=85折（fixed 模式可为空）',
  })
  discountRate: number | null

  @Column({ name: 'min_quantity', type: 'int', default: 1, comment: '最低起订量' })
  minQuantity: number

  @Column({ name: 'max_quantity', type: 'int', nullable: true, comment: '最高数量（NULL表示无上限）' })
  maxQuantity: number | null

  @Column({ name: 'effective_from', type: 'date', nullable: true, comment: '生效起始日期' })
  effectiveFrom: Date | null

  @Column({ name: 'effective_to', type: 'date', nullable: true, comment: '生效结束日期' })
  effectiveTo: Date | null

  @Column({ comment: '是否Active',  name: 'is_active', default: true })
  isActive: boolean

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  // ===== Phase 9B: 协议价 =====
  @Column({ name: 'pricing_mode', length: 16, default: 'discount', comment: 'discount/fixed' })
  pricingMode: string

  @Column({ name: 'fixed_price', type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '固定协议价' })
  fixedPrice: number | null

  @Column('varchar', { name: 'agreement_no', length: 64, nullable: true, comment: '协议编号' })
  agreementNo: string | null

  @Column({ name: 'agreement_start', type: 'date', nullable: true, comment: '协议生效日' })
  agreementStart: Date | null

  @Column({ name: 'agreement_end', type: 'date', nullable: true, comment: '协议到期日' })
  agreementEnd: Date | null

  @Column('varchar', { name: 'sales_rep', length: 64, nullable: true, comment: '负责销售' })
  salesRep: string | null
}
