/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('member_level')
export class MemberLevel {
  @PrimaryColumn('varchar', { name: 'level_id', length: 36 })
  levelId: string

  @Column('varchar', { comment: 'level 名称', name: 'level_name', length: 32 })
  levelName: string

  @Column('varchar', { comment: 'level 编码', name: 'level_code', length: 16 })
  levelCode: string

  @Column('decimal', { name: 'discount_rate', precision: 4, scale: 3, comment: '会员折扣率(基于统一零售价)' })
  discountRate: number

  @Column('decimal', {
    name: 'upgrade_threshold',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: '升级门槛(累计消费)',
  })
  upgradeThreshold: number | null

  @Column({ type: 'json', nullable: true, comment: '权益描述' })
  benefits: Record<string, unknown> | null

  @Column({ comment: '是否启用', name: 'is_active', default: true })
  isActive: boolean

  @Column({ comment: '排序序号', name: 'sort_order', default: 0 })
  sortOrder: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
