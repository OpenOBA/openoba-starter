import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('draft_publish_batch')
export class DraftPublishBatch {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 36 })
  id: string

  @Column({ comment: '发布包名称',  name: 'package_name', type: 'varchar', length: 200 })
  packageName: string

  @Column({ comment: '草稿数量',  name: 'draft_count', type: 'int', default: 0 })
  draftCount: number

  @Column({ comment: 'SKU数量',  name: 'sku_count', type: 'int', default: 0 })
  skuCount: number

  @Column({ comment: '状态',  name: 'status', type: 'varchar', length: 20, default: 'pending' })
  status: string // pending | processing | completed | failed

  @Column({ comment: '发布人',  name: 'published_by', type: 'varchar', length: 50, nullable: true })
  publishedBy: string

  @Column({ comment: '发布时间',  name: 'published_at', type: 'datetime', nullable: true })
  publishedAt: Date

  @Column({ comment: '错误信息JSON',  name: 'error_info', type: 'text', nullable: true })
  errorInfo: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
