import { Entity, PrimaryColumn, Column, Index } from 'typeorm'

@Entity('promotion_sku')
@Index('uk_promo_sku', ['promotionId', 'skuId'], { unique: true })
@Index('idx_sku', ['skuId'])
export class PromotionSku {
  @PrimaryColumn('varchar', { name: 'id', length: 36 })
  id: string

  @Column('varchar', { comment: 'promotion ID', name: 'promotion_id', length: 36 })
  promotionId: string

  @Column('varchar', { comment: '关联SKU ID', name: 'sku_id', length: 36 })
  skuId: string

  @Column('decimal', {
    name: 'custom_price',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: '活动专属价(覆盖折扣计算)',
  })
  customPrice: number | null

  @Column('int', { comment: '优先级', default: 0 })
  priority: number
}
