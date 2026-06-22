/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'
import { PROMOTION_STATUS } from '../product.constants'

@Entity('promotion')
@Index('idx_status_time', ['status', 'startTime', 'endTime'])
export class Promotion {
  @PrimaryColumn('varchar', { name: 'promotion_id', length: 36 })
  promotionId: string

  @Column('varchar', { comment: '促销编码', name: 'promotion_code', length: 32, unique: true })
  promotionCode: string

  @Column('varchar', { comment: '名称', length: 128 })
  name: string

  @Column('varchar', { length: 32, comment: 'discount/flash_sale/bundle/coupon/member_exclusive' })
  type: string

  @Column('varchar', { length: 32, comment: 'all/category/spu/sku' })
  scope: string

  @Column({ name: 'scope_ids', type: 'json', nullable: true, comment: '适用范围ID列表' })
  scopeIds: string[] | null

  @Column('varchar', { name: 'discount_type', length: 16, comment: 'percent/fixed_amount' })
  discountType: string

  @Column('decimal', { comment: '优惠值', name: 'discount_value', precision: 10, scale: 2 })
  discountValue: number

  @Column('decimal', { comment: 'min 金额', name: 'min_amount', precision: 10, scale: 2, nullable: true })
  minAmount: number | null

  @Column('decimal', { comment: '最大折扣', name: 'max_discount', precision: 10, scale: 2, nullable: true })
  maxDiscount: number | null

  @Column({ comment: '开始时间', name: 'start_time', type: 'datetime' })
  startTime: Date

  @Column({ comment: '结束时间', name: 'end_time', type: 'datetime' })
  endTime: Date

  @Column({ comment: '每人限用次数', name: 'user_limit', type: 'int', nullable: true })
  userLimit: number | null

  @Column({ comment: '总量限制', name: 'total_limit', type: 'int', nullable: true })
  totalLimit: number | null

  @Column({ comment: '已使用次数', name: 'used_count', type: 'int', default: 0 })
  usedCount: number

  /** @see PROMOTION_STATUS */
  @Column('varchar', { length: 16, default: 'draft', comment: 'draft/active/paused/expired' })
  status: string

  @Column('int', { comment: '优先级', default: 0 })
  priority: number

  @Column({ comment: '是否可叠加', default: false })
  stackable: boolean

  @Column({ comment: '扩展数据JSON', type: 'json', nullable: true })
  extra: Record<string, unknown> | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
