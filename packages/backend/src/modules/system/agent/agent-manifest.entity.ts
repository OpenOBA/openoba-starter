import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

/**
 * Agent 自主声明注册表
 *
 * 每个 AI Agent（SubAgent/外部 Agent/MCP 客户端）启动时向系统注册，
 * 自声明其能力范围和安全等级。系统信任声明并全量审计行为。
 *
 * 设计原则：Agent 自主管理权限，系统不预设限制，但每一步都记录。
 */
@Entity('sys_agent_manifest')
export class AgentManifest {
  @PrimaryGeneratedColumn('uuid', { name: 'agent_id' })
  agentId: string

  /** Agent 唯一标识（如 "tanghaoran" / "agent-content"） */
  @Column({ comment: 'agent 编码', name: 'agent_code', unique: true, length: 64 })
  agentCode: string

  /** Agent 显示名称（如 "唐浩然" / "内容创作 Agent"） */
  @Column({ comment: 'Agent名称', name: 'agent_name', length: 128 })
  agentName: string

  /** Agent 类型：internal / external / mcp_client */
  @Column({ comment: 'Agent类型', name: 'agent_type', length: 32, default: 'internal' })
  agentType: string

  /** 安全等级：L1（公开数据）/ L2（运营数据）/ L3（全部数据含 PII）/ L4（全部含财务） */
  @Column({ name: 'security_clearance', length: 8, default: 'L2' })
  securityClearance: string

  /**
   * Agent 自声明能力范围（JSON）
   *
   * 格式：
   * {
   *   "capabilities": ["customer:read", "order:read", "product:write"],
   *   "externalAllowlist": ["product.public", "marketing.content"],
   *   "externalDenylist": ["customer.pii", "financial"]
   * }
   */
  @Column({ comment: '能力配置JSON', name: 'capabilities_json', type: 'text', nullable: true })
  capabilitiesJson: string

  /** 关联的系统用户 ID（Agent 以哪个用户身份调 API） */
  @Column({ comment: '用户ID', name: 'user_id', length: 36, nullable: true })
  userId: string

  /** 状态：active / inactive / suspended */
  @Column({ comment: '状态', length: 32, default: 'active' })
  status: string

  /** 最后活跃时间 */
  @Column({ comment: 'last_active 时间', name: 'last_active_at', type: 'datetime', nullable: true })
  lastActiveAt: Date

  /** 行为统计（JSON）：{ totalActions, sensitiveAccesses, externalCalls } */
  @Column({ comment: 'JSON数据', name: 'stats_json', type: 'text', nullable: true })
  statsJson: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
