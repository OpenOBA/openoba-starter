/**
 * 秒镜科技 · ERDL 议会模型 — 不可变规则记录 Entity
 *
 * @file RuleRecord Entity
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-01
 * @license BSL-1.1
 *
 * 规则从不修改，只追加新版本。
 * 每个版本通过 contentHash 形成单向链表。
 */

import {
  Entity,
  Column,
  PrimaryColumn,
  Index,
} from 'typeorm'

@Entity('erdl_rule_record')
export class ERDLRuleRecord {
  /** 记录唯一 ID */
  @PrimaryColumn({ type: 'varchar', length: 36 })
  ruleRecordId!: string

  /** 规则逻辑 ID（跨版本不变） */
  @Index()
  @Column({ comment: 'rule ID',  type: 'varchar', length: 64 })
  ruleId!: string

  /** 命名空间 */
  @Index()
  @Column({ comment: '命名空间',  type: 'varchar', length: 128 })
  namespace!: string

  /** 规则名称 */
  @Column({ comment: 'rule 名称',  type: 'varchar', length: 255 })
  ruleName!: string

  /** 规则版本号（同 ruleId 下递增） */
  @Column({ type: 'int', default: 1 })
  version!: number

  /** 规则 YAML 原文 */
  @Column({ comment: '内容JSON',  type: 'longtext' })
  content!: string

  /** SHA256(content) */
  @Column({ type: 'varchar', length: 64 })
  contentHash!: string

  /** 上一版本的 contentHash */
  @Column({ type: 'varchar', length: 64, nullable: true })
  parentHash!: string | null

  /** 所属全局快照 ID */
  @Index()
  @Column({ comment: 'snapshot ID',  type: 'varchar', length: 36 })
  snapshotId!: string

  /** 提案者 */
  @Column({ comment: '创建人',  type: 'varchar', length: 64 })
  createdBy!: string

  /** 关联的提案 ID */
  @Column({ comment: 'proposal ID',  type: 'varchar', length: 36, nullable: true })
  proposalId!: string | null

  /** 创建时间戳 */
  @Index()
  @Column({ comment: '时间',  type: 'bigint' })
  createdAt!: number

  /** 是否激活 */
  @Column({ comment: '是否Active',  type: 'boolean', default: true })
  isActive!: boolean

  /** 软删除时间戳（null 表示未删除） */
  @Column({ type: 'bigint', nullable: true, default: null })
  deletedAt!: number | null
}
