// @openoba/types — 系统层枚举
// 来源：common/system-status.ts + system/agent + system/audit + system/menu
// V1.4-b M1 Step 3

/** 用户状态 */
export const USER_STATUS = ['active', 'disabled'] as const
export type UserStatus = (typeof USER_STATUS)[number]

/** 角色状态 */
export const ROLE_STATUS = ['active', 'inactive'] as const
export type RoleStatus = (typeof ROLE_STATUS)[number]

/** 权限状态 */
export const PERMISSION_STATUS = ['active', 'inactive'] as const
export type PermissionStatus = (typeof PERMISSION_STATUS)[number]

/** 结构标准状态 */
export const STRUCT_STATUS = ['active', 'inactive'] as const
export type StructStatus = (typeof STRUCT_STATUS)[number]

/** Agent 类型 */
export const AGENT_TYPE = ['internal', 'external'] as const
export type AgentType = (typeof AGENT_TYPE)[number]

/** Agent 状态 */
export const AGENT_STATUS = ['active', 'inactive', 'suspended'] as const
export type AgentStatus = (typeof AGENT_STATUS)[number]

/** 安全等级 */
export const SECURITY_CLEARANCE = ['L1', 'L2', 'L3'] as const
export type SecurityClearance = (typeof SECURITY_CLEARANCE)[number]

/** 菜单类型 */
export const MENU_TYPE = ['menu', 'button', 'api'] as const
export type MenuType = (typeof MENU_TYPE)[number]

/** 审计敏感度 */
export const AUDIT_SENSITIVITY = ['none', 'low', 'medium', 'high', 'critical'] as const
export type AuditSensitivity = (typeof AUDIT_SENSITIVITY)[number]

/** 审计结果 */
export const AUDIT_RESULT = ['success', 'failure', 'error', 'blocked'] as const
export type AuditResult = (typeof AUDIT_RESULT)[number]

/** 美学规则状态 */
export const AESTHETIC_RULE_STATUS = ['active', 'inactive', 'draft'] as const
export type AestheticRuleStatus = (typeof AESTHETIC_RULE_STATUS)[number]
