/**
 * ER-OS Cognitive Log — 统一认知日志 Entity
 */

import { Entity, Column, PrimaryColumn, Index } from 'typeorm'

export type LogType = 'task_report' | 'approval' | 'rejection' | 'escalation' | 'rule_proposal' | 'event' | 'system'
export type ActorType = 'human' | 'agent' | 'system'

@Entity('cognitive_log')
export class CognitiveLog {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 36 })
  id!: string

  @Index()
  @Column({ comment: 'log 类型',  name: 'log_type', type: 'varchar', length: 50 })
  logType!: LogType

  @Index()
  @Column({ comment: '来源模块',  name: 'source_module', type: 'varchar', length: 50 })
  sourceModule!: string

  @Index()
  @Column({ comment: 'source ID',  name: 'source_id', type: 'varchar', length: 36, nullable: true })
  sourceId!: string | null

  @Column({ comment: '等级',  name: 'level', type: 'varchar', length: 20, default: 'info' })
  level!: string

  @Column({ comment: '标题',  name: 'title', type: 'varchar', length: 255, nullable: true })
  title!: string | null

  @Column({ comment: '内容',  name: 'content', type: 'json' })
  content!: Record<string, unknown>

  @Index()
  @Column({ comment: 'Agent ID',  name: 'agent_id', type: 'varchar', length: 100, nullable: true })
  agentId!: string | null

  @Column({ comment: '操作人',  name: 'actor', type: 'varchar', length: 100, nullable: true })
  actor!: string | null

  @Column({ comment: 'actor 类型',  name: 'actor_type', type: 'enum', enum: ['human', 'agent', 'system'], default: 'system' })
  actorType!: ActorType

  @Index()
  @Column({ comment: '创建时间',  name: 'created_at', type: 'bigint' })
  createdAt!: number
}
