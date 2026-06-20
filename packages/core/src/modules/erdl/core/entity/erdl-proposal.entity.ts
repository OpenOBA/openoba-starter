/**
 * 秒镜科技 · ERDL 议会模型 — 规则提案 Entity
 *
 * @file RuleProposal Entity
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-01
 * @license BSL-1.1
 */

import {
  Entity,
  Column,
  PrimaryColumn,
  Index,
} from 'typeorm'

export type ProposalType = 'create' | 'update' | 'delete'
export type ProposalStatus = 'pending' | 'validating' | 'voting' | 'accepted' | 'rejected'
export type ApprovalLevel = 'auto' | 'agent_check' | 'human' | 'multi_human'

@Entity('erdl_proposal')
export class ERDLProposal {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  proposalId!: string

  @Column({ comment: '类型',  type: 'enum', enum: ['create', 'update', 'delete'] })
  type!: ProposalType

  @Index()
  @Column({ comment: '目标命名空间',  type: 'varchar', length: 128 })
  targetNamespace!: string

  @Column({ comment: 'targetRule ID',  type: 'varchar', length: 64, nullable: true })
  targetRuleId!: string | null

  @Column({ comment: 'targetRule 名称',  type: 'varchar', length: 255, nullable: true })
  targetRuleName!: string | null

  @Column({ comment: '内容JSON',  type: 'longtext', nullable: true })
  content!: string | null

  @Index()
  @Column({ comment: '执行人',  type: 'varchar', length: 64 })
  proposedBy!: string

  @Index()
  @Column({ comment: '时间',  type: 'bigint' })
  proposedAt!: number

  @Index()
  @Column({ comment: '状态',  type: 'enum', enum: ['pending', 'validating', 'voting', 'accepted', 'rejected'], default: 'pending' })
  status!: ProposalStatus

  @Column({ comment: '审批级别',  type: 'enum', enum: ['auto', 'agent_check', 'human', 'multi_human'], default: 'agent_check' })
  approvalLevel!: ApprovalLevel

  @Column({ comment: '影响的命名空间列表',  type: 'json', nullable: true })
  affectedNamespaces!: string[] | null

  @Column({ comment: '影响的Agent列表',  type: 'json', nullable: true })
  affectedAgents!: string[] | null

  @Column({ comment: '校验错误JSON',  type: 'json', nullable: true })
  validationErrors!: Record<string, unknown>[] | null

  @Column({ comment: '驳回原因',  type: 'text', nullable: true })
  rejectReason!: string | null

  @Column({ comment: 'resultSnapshot ID',  type: 'varchar', length: 36, nullable: true })
  resultSnapshotId!: string | null

  @Column({ comment: '时间',  type: 'bigint', nullable: true })
  updatedAt!: number | null
}

@Entity('erdl_proposal_vote')
export class ERDLProposalVote {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  voteId!: string

  @Index()
  @Column({ comment: 'proposal ID',  type: 'varchar', length: 36 })
  proposalId!: string

  @Column({ comment: 'agent ID',  type: 'varchar', length: 64 })
  agentId!: string

  @Column({ type: 'enum', enum: ['approve', 'reject', 'abstain'] })
  verdict!: 'approve' | 'reject' | 'abstain'

  @Column({ comment: '原因',  type: 'text', nullable: true })
  reason!: string | null

  @Index()
  @Column({ comment: '时间',  type: 'bigint' })
  votedAt!: number
}
