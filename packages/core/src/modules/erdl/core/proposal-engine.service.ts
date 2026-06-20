/**
 * 秒镜科技 · ERDL 议会模型 — 提案引擎 + 冲突校验
 *
 * @file ProposalEngine + ValidationEngine
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-01
 * @license BSL-1.1
 *
 * 提案生命周期：PROPOSE → VALIDATE → VOTE → ACCEPT/REJECT
 * 冲突校验：循环依赖、优先级冲突、namespace 碰撞、破坏性变更
 */

import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as crypto from 'crypto'
import {
  ERDLProposal,
  ERDLProposalVote,
  ProposalStatus,
  ApprovalLevel,
} from './entity/erdl-proposal.entity'
import { ERDLRuleRecord } from './entity/erdl-rule-record.entity'
import { RuleStoreService } from './rule-store.service'
import { SnapshotManagerService } from './snapshot-manager.service'
import { RuleEventBus } from './rule-event-bus.service'
import { ERDLRegistry } from './erdl-registry'

// ============================================
// 类型定义
// ============================================

export interface ValidationIssue {
  type: 'circular_dependency' | 'priority_conflict' | 'namespace_collision' | 'breaking_change'
  severity: 'error' | 'warning'
  message: string
}

export interface SubmitProposalParams {
  type: 'create' | 'update' | 'delete'
  namespace: string
  ruleId?: string
  ruleName?: string
  content?: string
  proposedBy: string
}

export interface VoteParams {
  proposalId: string
  agentId: string
  verdict: 'approve' | 'reject' | 'abstain'
  reason?: string
}

// ============================================
// ValidationEngine
// ============================================

@Injectable()
export class ValidationEngine {
  /**
   * 校验提案是否会破坏规则空间一致性
   */
  validate(
    proposal: ERDLProposal,
    existingRules: ERDLRuleRecord[],
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // 1. 检查循环依赖
    issues.push(...this.checkCircularDependency(proposal, existingRules))

    // 2. 检查优先级冲突
    issues.push(...this.checkPriorityConflict(proposal, existingRules))

    // 3. 检查 namespace 碰撞
    issues.push(...this.checkNamespaceCollision(proposal, existingRules))

    // 4. 检查破坏性变更
    issues.push(...this.checkBreakingChange(proposal, existingRules))

    return issues
  }

  /**
   * 循环依赖检测
   * TODO(Phase 8): 分析规则 YAML 中的依赖引用 → 构建依赖图 → 检测环
   */
  private checkCircularDependency(
    proposal: ERDLProposal,
    existingRules: ERDLRuleRecord[],
  ): ValidationIssue[] {
    // MVP: 简单引用关系检查
    if (proposal.type === 'update' && proposal.content) {
      const contentRules = existingRules.filter(
        (r) => r.namespace === proposal.targetNamespace && r.ruleId !== proposal.targetRuleId,
      )
      if (contentRules.length > 0 && proposal.content.includes('depends_on')) {
        return [{
          type: 'circular_dependency',
          severity: 'warning',
          message: `提案包含显式依赖声明，请确认不会形成循环引用`,
        }]
      }
    }
    return []
  }

  /** 优先级冲突检测 */
  private checkPriorityConflict(
    proposal: ERDLProposal,
    existingRules: ERDLRuleRecord[],
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    // 同 trigger + 同 priority 的两条规则
    const sameNs = existingRules.filter((r) => r.namespace === proposal.targetNamespace)
    const conflict = sameNs.filter((r) => r.ruleName === proposal.targetRuleName)
    if (conflict.length > 0 && proposal.type === 'create') {
      issues.push({
        type: 'priority_conflict',
        severity: 'warning',
        message: `规则 "${proposal.targetRuleName}" 在 namespace ${proposal.targetNamespace} 已存在，将创建新版本`,
      })
    }
    return issues
  }

  /**
   * namespace 碰撞检测
   * 检查提案是否影响其他 namespace 的规则
   */
  private checkNamespaceCollision(
    proposal: ERDLProposal,
    existingRules: ERDLRuleRecord[],
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    if ((proposal.affectedNamespaces?.length || 0) > 1) {
      issues.push({
        type: 'namespace_collision',
        severity: 'warning',
        message: `提案涉及跨 namespace 影响: ${proposal.affectedNamespaces?.join(', ')}`,
      })
    }
    return issues
  }

  /** 破坏性变更检测 */
  private checkBreakingChange(
    proposal: ERDLProposal,
    existingRules: ERDLRuleRecord[],
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    if (proposal.type === 'delete') {
      const target = existingRules.find((r) => r.ruleId === proposal.targetRuleId)
      if (target) {
        issues.push({
          type: 'breaking_change',
          severity: 'error',
          message: `删除规则 "${target.ruleName}" 可能影响依赖它的计算`,
        })
      }
    }
    return issues
  }

  /**
   * 确定审批级别
   */
  determineApprovalLevel(issues: ValidationIssue[]): ApprovalLevel {
    const hasErrors = issues.some((i) => i.severity === 'error')
    const hasCrossNamespace = issues.some((i) => i.type === 'namespace_collision')
    const hasBreaking = issues.some((i) => i.type === 'breaking_change')

    if (hasBreaking) return 'multi_human'
    if (hasErrors && hasCrossNamespace) return 'human'
    if (hasErrors) return 'agent_check'
    return 'auto'
  }
}

// ============================================
// ProposalEngine
// ============================================

@Injectable()
export class ProposalEngine {
  private readonly logger = new Logger(ProposalEngine.name)

  constructor(
    @InjectRepository(ERDLProposal)
    private readonly proposalRepo: Repository<ERDLProposal>,
    @InjectRepository(ERDLProposalVote)
    private readonly voteRepo: Repository<ERDLProposalVote>,
    private readonly ruleStore: RuleStoreService,
    private readonly snapshotMgr: SnapshotManagerService,
    private readonly validationEngine: ValidationEngine,
    private readonly eventBus: RuleEventBus,
    private readonly registry: ERDLRegistry,
  ) {}

  /**
   * 提交提案
   */
  async submit(params: SubmitProposalParams): Promise<ERDLProposal> {
    const proposal = this.proposalRepo.create({
      proposalId: `prop-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      type: params.type,
      targetNamespace: params.namespace,
      targetRuleId: params.ruleId || null,
      targetRuleName: params.ruleName || null,
      content: params.content || null,
      proposedBy: params.proposedBy,
      proposedAt: Date.now(),
      status: 'pending',
      approvalLevel: 'agent_check',
      affectedNamespaces: [params.namespace],
      affectedAgents: [],
    })

    // 计算影响范围
    const existingRules = await this.ruleStore.getAllLatest()
    const issues = this.validationEngine.validate(proposal, existingRules)
    proposal.validationErrors = issues as unknown as Record<string, unknown>[]
    proposal.approvalLevel = this.validationEngine.determineApprovalLevel(issues)

    const saved = await this.proposalRepo.save(proposal)

    // 发布事件
    this.eventBus.emit('proposal:created', {
      proposalId: saved.proposalId,
      type: saved.type,
      namespace: saved.targetNamespace,
      proposedBy: saved.proposedBy,
      affectedAgents: saved.affectedAgents || [],
      timestamp: saved.proposedAt,
    })

    this.logger.log(
      `[Parliament] Proposal ${saved.proposalId} submitted by ${params.proposedBy} (${params.type}) [${saved.approvalLevel}]`,
    )

    // 自动通过 L0
    if (saved.approvalLevel === 'auto') {
      return this.accept(saved.proposalId, 'system')
    }

    return saved
  }

  /**
   * 对提案投票
   */
  async vote(params: VoteParams): Promise<ERDLProposalVote> {
    const proposal = await this.proposalRepo.findOne({
      where: { proposalId: params.proposalId },
    })
    if (!proposal) throw new Error(`Proposal ${params.proposalId} not found`)

    const vote = this.voteRepo.create({
      voteId: `vote-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      proposalId: params.proposalId,
      agentId: params.agentId,
      verdict: params.verdict,
      reason: params.reason || null,
      votedAt: Date.now(),
    })

    await this.voteRepo.save(vote)

    // 变更提案状态
    proposal.status = 'voting'
    proposal.updatedAt = Date.now()
    await this.proposalRepo.save(proposal)

    this.logger.log(
      `[Parliament] Vote on ${params.proposalId}: ${params.agentId} → ${params.verdict}`,
    )

    return vote
  }

  /**
   * 通过提案 → 写入规则 + 生成快照
   */
  async accept(proposalId: string, acceptedBy: string): Promise<ERDLProposal> {
    const proposal = await this.proposalRepo.findOne({
      where: { proposalId },
    })
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`)

    // 写入 RuleStore
    if (proposal.type !== 'delete' && proposal.content) {
      await this.ruleStore.append({
        ruleId: proposal.targetRuleId || `rule-${Date.now()}`,
        namespace: proposal.targetNamespace,
        ruleName: proposal.targetRuleName || 'unnamed',
        content: proposal.content,
        snapshotId: proposalId, // 临时，下一步快照会覆盖
        createdBy: proposal.proposedBy,
        proposalId,
      })
    }

    // 生成新快照
    const snapshot = await this.snapshotMgr.createSnapshot(
      [proposalId],
      acceptedBy,
      `Accepted proposal ${proposalId}`,
    )

    // 更新提案
    proposal.status = 'accepted'
    proposal.resultSnapshotId = snapshot.snapshotId
    proposal.updatedAt = Date.now()
    await this.proposalRepo.save(proposal)

    // 发布事件
    this.eventBus.emit('proposal:accepted', {
      proposalId,
      snapshotId: snapshot.snapshotId,
      acceptedBy: [acceptedBy],
      timestamp: Date.now(),
    })
    this.eventBus.emit('snapshot:created', {
      snapshotId: snapshot.snapshotId,
      snapshotSeq: snapshot.snapshotSeq,
      ruleCount: snapshot.ruleCount,
      predecessorId: snapshot.predecessorId,
      proposalIds: [proposalId],
      timestamp: snapshot.createdAt,
    })

    this.logger.log(
      `[Parliament] Proposal ${proposalId} ACCEPTED → Snapshot #${snapshot.snapshotSeq}`,
    )

    return proposal
  }

  /**
   * 驳回提案
   */
  async reject(
    proposalId: string,
    rejectedBy: string,
    reason?: string,
  ): Promise<ERDLProposal> {
    const proposal = await this.proposalRepo.findOne({
      where: { proposalId },
    })
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`)

    proposal.status = 'rejected'
    proposal.rejectReason = reason || 'Rejected'
    proposal.updatedAt = Date.now()
    await this.proposalRepo.save(proposal)

    this.eventBus.emit('proposal:rejected', {
      proposalId,
      reason,
      rejectedBy,
      timestamp: Date.now(),
    })

    this.logger.log(
      `[Parliament] Proposal ${proposalId} REJECTED by ${rejectedBy}: ${reason || '(no reason)'}`,
    )

    return proposal
  }

  /**
   * 查询提案
   */
  async getProposal(proposalId: string): Promise<ERDLProposal | null> {
    return this.proposalRepo.findOne({ where: { proposalId } })
  }

  /**
   * 按状态查询提案列表
   */
  async listByStatus(status: ProposalStatus): Promise<ERDLProposal[]> {
    return this.proposalRepo.find({
      where: { status },
      order: { proposedAt: 'DESC' },
    })
  }

  /**
   * 获取提案的所有投票
   */
  async getVotes(proposalId: string): Promise<ERDLProposalVote[]> {
    return this.voteRepo.find({
      where: { proposalId },
      order: { votedAt: 'ASC' },
    })
  }

  /**
   * 检查提案是否可以自动通过
   */
  async checkAutoApprove(proposalId: string): Promise<boolean> {
    const proposal = await this.getProposal(proposalId)
    if (!proposal) return false

    const allVotes = await this.getVotes(proposalId)
    const hasRejections = allVotes.some((v) => v.verdict === 'reject')
    const hasApprovals = allVotes.some((v) => v.verdict === 'approve')

    return !hasRejections && hasApprovals
  }
}
