/**
 * ER-OS Agent Task Engine — 任务工作流引擎 Entity
 */

import {
  Entity, Column, PrimaryColumn, Index, CreateDateColumn, UpdateDateColumn, VersionColumn,
} from 'typeorm'

export type AgentTaskStatus = 'drafted' | 'proposed' | 'revised' | 'executing' | 'delivered' | 'published' | 'completed' | 'cancelled' | 'aborted' | 'escalated'
export type ReportFrequency = 'every_step' | 'per_phase' | 'daily_digest' | 'on_exception'

@Entity('agent_task')
export class AgentTask {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 36 })
  id!: string

  @Index()
  @Column({ comment: '任务编号',  name: 'task_no', type: 'varchar', length: 50, unique: true })
  taskNo!: string

  @Column({ comment: '标题',  name: 'title', type: 'varchar', length: 200 })
  title!: string

  @Index()
  @Column({ comment: '类型',  name: 'type', type: 'varchar', length: 50 })
  type!: string

  @Column({ comment: '创建人',  name: 'created_by', type: 'varchar', length: 36 })
  createdBy!: string

  @Index()
  @Column({ comment: '汇报对象',  name: 'report_to', type: 'varchar', length: 36 })
  reportTo!: string

  @Column({ comment: '升级目标Agent',  name: 'escalate_to', type: 'varchar', length: 36, nullable: true })
  escalateTo!: string | null

  @Column({ comment: '升级超时(小时)',  name: 'escalation_hours', type: 'int', default: 48 })
  escalationHours!: number

  @Index()
  @Column({ comment: '状态',  name: 'status', type: 'enum', enum: ['drafted', 'proposed', 'revised', 'executing', 'delivered', 'published', 'completed', 'cancelled', 'aborted', 'escalated'], default: 'drafted' })
  status!: AgentTaskStatus

  @Column({ comment: '当前阶段',  name: 'current_phase', type: 'int', default: 0 })
  currentPhase!: number

  @Column({ comment: '总阶段数',  name: 'total_phases', type: 'int', default: 0 })
  totalPhases!: number

  @Column({ comment: '汇报频率(daily/weekly/on_complete)',  name: 'report_frequency', type: 'enum', enum: ['every_step', 'per_phase', 'daily_digest', 'on_exception'], default: 'every_step' })
  reportFrequency!: ReportFrequency

  @Column({ comment: '上下文JSON',  name: 'context', type: 'json', nullable: true })
  context!: Record<string, unknown> | null

  @Column({ comment: '提案列表JSON',  name: 'proposals', type: 'json', nullable: true })
  proposals!: Array<{ version: number; content: string; timestamp: string; status: string }> | null

  @Column({ comment: '交付物列表JSON',  name: 'deliverables', type: 'json', nullable: true })
  deliverables!: Array<{ type: string; url: string; status: string }> | null

  @Index()
  @Column({ comment: 'Agent ID',  name: 'agent_id', type: 'varchar', length: 100, nullable: true })
  agentId!: string | null

  @Column({ comment: '重试次数',  name: 'retry_count', type: 'int', default: 0 })
  retryCount!: number

  @Column({ comment: '最大重试次数',  name: 'max_retries', type: 'int', default: 3 })
  maxRetries!: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date

  /** 乐观锁 — TypeORM 自动管理，防止并发覆盖 */
  @VersionColumn({ name: 'version' })
  version!: number
}
