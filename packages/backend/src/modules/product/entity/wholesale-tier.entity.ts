import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm'

@Entity('wholesale_tier')
@Index('idx_code', ['tierCode'])
export class WholesaleTier {
  @PrimaryColumn('varchar', { name: 'tier_id', length: 36 })
  tierId: string

  @Column('varchar', { comment: 'tier 名称', name: 'tier_name', length: 32 })
  tierName: string

  @Column('varchar', { comment: 'tier 编码', name: 'tier_code', length: 16, unique: true })
  tierCode: string

  @Column('int', { comment: '最低数量', name: 'min_quantity' })
  minQuantity: number

  @Column('int', { comment: '最高数量', name: 'max_quantity', nullable: true })
  maxQuantity: number | null

  @Column('decimal', { name: 'discount_rate', precision: 4, scale: 3, comment: '折扣率(手动录入)' })
  discountRate: number

  @Column('varchar', { comment: '描述', name: 'description', length: 256, nullable: true })
  description?: string

  @Column({ comment: '是否启用', name: 'is_active', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
