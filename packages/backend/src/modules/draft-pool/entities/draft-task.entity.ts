/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('draft_task')
export class DraftTask {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 36 })
  id: string

  @Column({ comment: 'task 类型', name: 'task_type', type: 'varchar', length: 30 })
  taskType: string // draft_generation | aesthetics_check | advisory_report | publish

  @Column({ comment: '关联引用ID', name: 'reference_id', type: 'varchar', length: 36, nullable: true })
  referenceId: string

  @Column({ comment: '输入上下文JSON', name: 'input_context', type: 'json', nullable: true })
  inputContext: any

  @Column({ comment: '输出结果JSON', name: 'output_result', type: 'json', nullable: true })
  outputResult: any

  @Column({ comment: '状态', name: 'status', type: 'varchar', length: 20, default: 'pending' })
  status: string // pending | processing | completed | failed

  @Column({ comment: '进度(%)', name: 'progress', type: 'int', default: 0 })
  progress: number

  @Column({ comment: '错误信息JSON', name: 'error_info', type: 'text', nullable: true })
  errorInfo: string

  @Column({ comment: '重试次数', name: 'retry_count', type: 'int', default: 0 })
  retryCount: number

  @Column({ comment: '完成时间', name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
