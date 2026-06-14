// OpenOBA Core — 统一导出入口（Barrel Export）
// V1.4-b M2: Created 2026-06-09 for ERP/CORE decoupling
// 
// 用法：import { ERDLRuleRecord, AgentTask, ... } from '@openoba/core'
// 替代之前的深层路径导入 @openoba/core/dist/modules/...

export { ERDLRuleRecord } from './modules/erdl/core/entity/erdl-rule-record.entity'
export { ERDLSnapshot } from './modules/erdl/core/entity/erdl-snapshot.entity'
export { ERDLProposal, ERDLProposalVote } from './modules/erdl/core/entity/erdl-proposal.entity'
export { ERDLRuleEngine } from './modules/erdl/core/erdl-rule-engine'

export { CognitiveLog } from './modules/eros/task/cognitive-log.entity'
export { AgentTask } from './modules/eros/task/agent-task.entity'
export { AgentRegistry } from './modules/eros/task/agent-registry.entity'
export { KnowledgeEntry } from './modules/eros/task/knowledge-entry.entity'
export { ReportTarget } from './modules/eros/task/report-target.entity'

export { SkillRegistry } from './modules/eros/skill/skill-registry.entity'
export { SkillKeyVault } from './modules/eros/skill/skill-key-vault.entity'
export { DraftSpu } from './modules/draft-pool/entities/draft-spu.entity'
export { DeliverableManifest } from './modules/eros/deliverable/deliverable-manifest.entity'

export { ModelKey } from './modules/system/model-key.entity'
export { ModelKeyModels } from './modules/system/model-key-models.entity'
export { ModelRegistry } from './modules/system/model-registry.entity'
export { ModelProvider } from './modules/system/model-provider.entity'
export { ModelConnectionLog } from './modules/system/model-connection-log.entity'
export { TokenUsage } from './modules/system/token-usage.entity'
