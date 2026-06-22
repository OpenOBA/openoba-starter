/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('product_tier_pricing')
export class ProductTierPricing {
  @PrimaryColumn('varchar', { name: 'tier_id', length: 36 })
  tierId: string

  @Column('varchar', { comment: 'tier 名称', name: 'tier_name', length: 32 })
  tierName: string

  @Column('varchar', { comment: 'tier 编码', name: 'tier_code', length: 16, unique: true })
  tierCode: string

  @Column('varchar', { comment: '定位', name: 'positioning', length: 256, nullable: true })
  positioning?: string

  @Column({ comment: '是否启用', name: 'is_active', default: true })
  isActive: boolean

  @Column({ comment: '扩展数据JSON', name: 'extra', type: 'json', nullable: true })
  extra?: Record<string, any>

  @Column({ comment: '排序序号', name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
