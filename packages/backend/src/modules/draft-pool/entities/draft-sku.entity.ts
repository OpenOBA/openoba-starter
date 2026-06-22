import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('draft_sku')
export class DraftSku {
  @PrimaryColumn({ name: 'draft_sku_id', type: 'varchar', length: 36 })
  draftSkuId: string

  @Column({ comment: '关联草稿ID', name: 'draft_id', type: 'varchar', length: 36 })
  draftId: string

  @Column({ comment: 'color 编码', name: 'color_code', type: 'varchar', length: 20 })
  colorCode: string

  @Column({ comment: 'color 名称', name: 'color_name', type: 'varchar', length: 100, nullable: true })
  colorName: string

  @Column({ comment: '肤色效果词(如黄皮增白)', name: 'skin_tone_effect', type: 'varchar', length: 50, nullable: true })
  skinToneEffect: string

  @Column({ comment: '脸型效果词(如圆脸显瘦)', name: 'face_shape_effect', type: 'varchar', length: 50, nullable: true })
  faceShapeEffect: string

  @Column({ comment: 'display 名称', name: 'display_name', type: 'varchar', length: 500, nullable: true })
  displayName: string

  @Column({ comment: 'sku 状态', name: 'sku_status', type: 'varchar', length: 20, default: 'draft' })
  skuStatus: string // draft | approved | rejected | published

  @Column({ comment: '美学评分', name: 'aesthetic_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  aestheticScore: number

  @Column({
    comment: '美学等级(pass/warn/block)',
    name: 'aesthetic_level',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  aestheticLevel: string

  @Column({ comment: '审核备注', name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string

  @Column({ comment: '驳回原因', name: 'rejected_reason', type: 'text', nullable: true })
  rejectedReason: string

  @Column({ comment: '排序序号', name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number

  @Column({ comment: 'publishedSku ID', name: 'published_sku_id', type: 'varchar', length: 36, nullable: true })
  publishedSkuId: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date
}
