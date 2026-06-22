/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
// @openoba/types — Agent 执行引擎层接口
// 来源：agent-task.entity.ts, agent-registry.entity.ts, cognitive-log.entity.ts,
//        knowledge-entry.entity.ts, skill-registry.entity.ts, skill-key-vault.entity.ts
// V1.4-b M1 Step 4

// ============================================================
// AgentTask — 任务工作流
// ============================================================

export type AgentTaskStatus = 'drafted' | 'proposed' | 'revised' | 'executing' | 'delivered' | 'published' | 'completed' | 'cancelled' | 'aborted' | 'escalated'

export interface IAgentTask {
  id: string
  taskNo: string
  title: string
  type: string
  createdBy: string
  reportTo: string
  escalateTo?: string
  escalationHours: number
  status: AgentTaskStatus
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

// ============================================================
// AgentRegistry — Agent 注册
// ============================================================

export interface IAgentRegistry {
  id: string
  agentName: string
  agentType: string
  role: string
  status: string
  manifestVersion: string
  createdAt: Date
  updatedAt: Date
}

// ============================================================
// CognitiveLog — 认知日志
// ============================================================

export type LogType = 'task_report' | 'approval' | 'rejection' | 'escalation' | 'rule_proposal' | 'event' | 'system'
export type ActorType = 'human' | 'agent' | 'system'

export interface ICognitiveLog {
  id: string
  logType: LogType
  sourceModule: string
  sourceId?: string
  actorType: ActorType
  actorId: string
  summary: string
  detail?: string
  metadata?: Record<string, any>
  createdAt: Date
}

// ============================================================
// KnowledgeEntry — 知识条目
// ============================================================

export type KnowledgeType = 'DOCUMENT' | 'EXPERIENCE' | 'CASE' | 'DATA' | 'FAQ' | 'POLICY' | 'STRATEGY'
export type KnowledgeVisibility = 'public' | 'private'
export type KnowledgeStatus = 'active' | 'archived'

export interface IKnowledgeEntry {
  id: string
  title: string
  visibility: KnowledgeVisibility
  type: KnowledgeType
  status: KnowledgeStatus
  tags: string[]
  content: string
  sourceModule: string
  sourceId?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// ============================================================
// SkillRegistry — Skill 注册
// ============================================================

export interface ISkillRegistry {
  id: string
  skillName: string
  displayName: string
  description: string
  version: string
  status: string
  module: string
  entryPoint: string
  createdAt: Date
  updatedAt: Date
}

// ============================================================
// SkillKeyVault — Skill Key 保管库
// ============================================================

export interface ISkillKeyVault {
  id: string
  skillId: string
  keyName: string
  keyValue: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}
