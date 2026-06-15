/**
 * SOUL 模块 — 类型定义
 *
 * @file soul.types.ts
 * @author OpenOBA
 * @since 2026-05-25
 * @license BSL-1.1
 */

/** Agent 身份信息（从 agent_manifest + sys_user 联合读取） */
export interface AgentIdentity {
  /** agentCode，如 "openoba-main" / "user-xxx" */
  agentCode: string
  /** 显示名称 */
  agentName: string
  /** agentType: main | sub | external | mcp_client */
  agentType: string
  /** Agent 图标（前端用） */
  icon: string
  /** 安全等级 L1-L4 */
  securityClearance: string
  /** 关联的 sys_user.userId（Sub Agent 必有） */
  userId?: string
  /** 人类真实姓名 */
  realName?: string
  /** 角色编码列表 */
  roleCodes: string[]
  /** 角色名称列表 */
  roleNames: string[]
  /** 能力配置 JSON */
  capabilitiesJson?: string
  /** 状态 */
  status: string
}

/** 组织信息 */
export interface OrganizationInfo {
  /** 所有岗位列表 */
  roles: OrgRole[]
  /** 所有活跃 Agent 列表 */
  agents: OrgAgent[]
  /** 主 Agent */
  mainAgent: OrgAgent | null
  /** 总人数 */
  totalAgents: number
  /** 在线人数 */
  onlineCount: number
}

export interface OrgRole {
  roleCode: string
  roleName: string
  memberCount: number
}

export interface OrgAgent {
  agentCode: string
  displayName: string
  agentType: string
  icon: string
  roleName: string
  realName: string
  status: string
}

/** 岗位能力配置 */
export interface RoleCapability {
  /** 可用工具列表 */
  tools: string[]
  /** 是否有写权限 */
  canWrite: boolean
  /** 是否有代码编辑权限 */
  canEditCode: boolean
  /** 安全等级 */
  securityClearance: string
}

/** 铁律配置 */
export interface IronRuleSet {
  /** 铁律来源 */
  source: 'system' | 'role' | 'task'
  /** 角色编码（role级别才有） */
  roleCode?: string
  /** 任务类型（task级别才有） */
  taskType?: string
  /** 铁律文本 */
  rules: string
}
