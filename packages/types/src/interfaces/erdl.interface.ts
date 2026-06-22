/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
// @openoba/types — ERDL 引擎层接口
// 来源：erdl-rule-record.entity.ts, erdl-snapshot.entity.ts, erdl-proposal.entity.ts
// V1.4-b M1 Step 4
// 注意：CORE Entity 用 timestamp number，此处匹配

export interface IERDLRuleRecord {
  id: string
  ruleId: string
  namespace: string
  name: string
  description?: string
  trigger: string
  condition?: string
  action: string
  priority: number
  isActive: boolean
  metadata?: Record<string, any>
  createdAt: number
  updatedAt: number
}

export interface IERDLSnapshot {
  id: string
  version: string
  erdlContent: string
  yamlHash: string
  status: string
  createdAt: number
}

export interface IERDLProposal {
  id: string
  title: string
  description: string
  erdlContent: string
  status: string
  proposedBy: string
  votingEndAt?: Date
  createdAt: number
  updatedAt: number
}
