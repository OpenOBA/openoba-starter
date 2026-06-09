import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * 全量行为审计日志
 *
 * 记录所有 Agent 和人类用户的关键操作，包括：
 * - 内网 API 调用
 * - 数据查询/修改
 * - 外网数据流出
 * - 敏感操作
 *
 * 设计原则：不拦截行为，但全量记录，Henry 随时可审查。
 */
@Entity('sys_audit_log')
@Index(['actorType', 'actorId'])
@Index(['actionTime'])
@Index(['category'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid', { name: 'log_id' })
  logId: string

  /** 操作者类型：human / agent / system */
  @Column({ comment: 'actor 类型',  name: 'actor_type', length: 32 })
  actorType: string

  /** 操作者 ID（用户 ID 或 Agent ID） */
  @Column({ comment: 'actor ID',  name: 'actor_id', length: 64 })
  actorId: string

  /** 操作者名称 */
  @Column({ comment: 'actor 名称',  name: 'actor_name', length: 128, nullable: true })
  actorName: string

  /** 操作时间（精确到毫秒） */
  @Column({ name: 'action_time', type: 'datetime', precision: 3 })
  @Index()
  actionTime: Date

  /** 操作类别：api_call / data_access / data_export / llm_call / external_api / file_access */
  @Column({ comment: '分类',  length: 32 })
  category: string

  /** 具体操作：GET /orders、calculatePrice、read customer 等 */
  @Column({ comment: '操作',  length: 256 })
  action: string

  /** 目标资源（API 路径、数据表、文件路径等） */
  @Column({ comment: '资源',  length: 512, nullable: true })
  resource: string

  /** 操作详情（JSON） */
  @Column({ type: 'text', nullable: true })
  detail: string

  /** 涉及的数据域：customer / order / product / financial / system */
  @Column({ name: 'data_domain', length: 64, nullable: true })
  dataDomain: string

  /** 敏感级别：none / pii / financial / confidential */
  @Column({ name: 'sensitivity', length: 32, default: 'none' })
  sensitivity: string

  /** 是否经过脱敏处理 */
  @Column({ name: 'was_masked', default: false })
  wasMasked: boolean

  /** 数据出口目标（如果是外部调用）：deepseek / openai / taobao / 等 */
  @Column({ name: 'export_target', length: 128, nullable: true })
  exportTarget: string

  /** 请求来源 IP */
  @Column({ name: 'source_ip', length: 64, nullable: true })
  sourceIp: string

  /** 操作结果：success / failure / blocked */
  @Column({ length: 32, default: 'success' })
  result: string

  /** 错误信息（如果失败） */
  @Column({ comment: '错误信息',  name: 'error_message', type: 'text', nullable: true })
  errorMessage: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
