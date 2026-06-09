import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('draft_batch')
export class DraftBatch {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 36 })
  id: string

  @Column({ comment: '批次名称',  name: 'batch_name', type: 'varchar', length: 200 })
  batchName: string

  @Column({ comment: 'generation 类型',  name: 'generation_type', type: 'varchar', length: 20 })
  generationType: string // ai | manual

  @Column({ comment: '总数',  name: 'total_count', type: 'int', default: 0 })
  totalCount: number

  @Column({ comment: '已通过数',  name: 'approved_count', type: 'int', default: 0 })
  approvedCount: number

  @Column({ comment: '已驳回数',  name: 'rejected_count', type: 'int', default: 0 })
  rejectedCount: number

  @Column({ comment: '已发布数',  name: 'published_count', type: 'int', default: 0 })
  publishedCount: number

  @Column({ comment: '状态',  name: 'status', type: 'varchar', length: 20, default: 'generating' })
  status: string // generating | completed | cancelled

  @Column({ comment: 'Prompt上下文JSON',  name: 'prompt_context', type: 'text', nullable: true })
  promptContext: string

  @Column({ comment: '错误信息JSON',  name: 'error_info', type: 'text', nullable: true })
  errorInfo: string

  @Column({ comment: '完成时间',  name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
