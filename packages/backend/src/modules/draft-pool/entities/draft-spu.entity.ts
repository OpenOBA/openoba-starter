import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('draft_spu')
export class DraftSpu {
  @PrimaryColumn({ name: 'draft_id', type: 'varchar', length: 36 })
  draftId: string

  @Column({ comment: '关联批次ID',  name: 'batch_id', type: 'varchar', length: 36, nullable: true })
  batchId: string

  @Column({ comment: '性别(female/male/unisex/limited)',  name: 'gender', type: 'varchar', length: 20 })
  gender: string

  @Column({ comment: 'shape 编码',  name: 'shape_code', type: 'varchar', length: 20 })
  shapeCode: string

  @Column({ comment: 'series 编码',  name: 'series_code', type: 'varchar', length: 20 })
  seriesCode: string

  @Column({ comment: 'structureStandard 编码',  name: 'structure_standard_code', type: 'varchar', length: 20 })
  structureStandardCode: string

  @Column({ comment: 'SPU名称',  name: 'spu_name', type: 'varchar', length: 200 })
  spuName: string

  @Column({ comment: 'SPU描述',  name: 'spu_description', type: 'text', nullable: true })
  spuDescription: string

  @Column({ comment: '展示名模板',  name: 'display_name_template', type: 'varchar', length: 500, nullable: true })
  displayNameTemplate: string

  @Column({ name: 'source', type: 'varchar', length: 20, default: 'ai' })
  source: string // ai | manual

  @Column({ comment: '状态',  name: 'status', type: 'varchar', length: 20, default: 'draft' })
  status: string // draft | reviewed | approved | published | rejected

  @Column({ comment: '美学评分',  name: 'aesthetic_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  aestheticScore: number

  @Column({ comment: '美学等级(pass/warn/block)',  name: 'aesthetic_level', type: 'varchar', length: 10, nullable: true })
  aestheticLevel: string // pass | warn | block

  @Column({ comment: '审核备注',  name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string

  @Column({ comment: '驳回原因',  name: 'rejected_reason', type: 'text', nullable: true })
  rejectedReason: string

  @Column({ comment: '已发布的SPU ID',  name: 'published_spu_id', type: 'varchar', length: 36, nullable: true })
  publishedSpuId: string

  @Column({ comment: '发布时间',  name: 'published_at', type: 'datetime', nullable: true })
  publishedAt: Date

  @Column({ comment: '审核人',  name: 'reviewed_by', type: 'varchar', length: 50, nullable: true })
  reviewedBy: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date
}
