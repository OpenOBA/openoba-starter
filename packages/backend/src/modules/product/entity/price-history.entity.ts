import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm'

@Entity('price_history')
@Index('idx_sku', ['skuId'])
@Index('idx_time', ['changedAt'])
export class PriceHistory {
  @PrimaryColumn('varchar', { name: 'history_id', length: 36 })
  historyId: string

  @Column('varchar', {comment: '关联SKU ID',  name: 'sku_id', length: 36 })
  skuId: string

  @Column('varchar', { name: 'price_type', length: 32, comment: 'cost/retail/min' })
  priceType: string

  @Column('decimal', {comment: '旧值JSON',  name: 'old_value', precision: 10, scale: 2, nullable: true })
  oldValue: number | null

  @Column('decimal', {comment: '新值JSON',  name: 'new_value', precision: 10, scale: 2 })
  newValue: number

  @Column('varchar', {comment: '变更原因',  name: 'change_reason', length: 256, nullable: true })
  changeReason?: string

  @Column('varchar', {comment: '变更人',  name: 'changed_by', length: 64, nullable: true })
  changedBy?: string

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date
}
