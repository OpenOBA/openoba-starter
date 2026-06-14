/**
 * ER-OS Agent Registry — Agent 注册表 Entity
 */

import { Entity, Column, PrimaryColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export type AgentRegistryStatus = 'active' | 'inactive' | 'maintenance'

@Entity('agent_registry')
export class AgentRegistry {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 36 })
  id!: string

  @Index({ unique: true })
  @Column({ comment: 'Agent名称',  name: 'agent_name', type: 'varchar', length: 100 })
  agentName!: string

  @Column({ comment: 'Agent类型',  name: 'agent_type', type: 'varchar', length: 50 })
  agentType!: string

  @Column({ comment: '展示名称',  name: 'display_name', type: 'varchar', length: 128, nullable: true })
  displayName!: string | null

  @Column({ comment: '平台(OpenClaw/WorkBuddy/API)',  name: 'platform', type: 'varchar', length: 50, nullable: true })
  platform!: string | null

  @Column({ comment: '能力列表JSON',  name: 'capabilities', type: 'json', nullable: true })
  capabilities!: string[] | null

  @Column({ comment: '默认汇报对象ID',  name: 'default_report_to', type: 'varchar', length: 36, nullable: true })
  defaultReportTo!: string | null

  @Column({ comment: '允许的操作列表',  name: 'allowed_actions', type: 'json', nullable: true })
  allowedActions!: string[] | null

  @Column({ comment: '状态',  name: 'status', type: 'enum', enum: ['active', 'inactive', 'maintenance'], default: 'active' })
  status!: AgentRegistryStatus

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
