/**
 * 秒镜科技 · ERDL 议会模型 — 全局快照 Entity
 *
 * @file ERDLSnapshot Entity
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-01
 * @license AGPL-3.0
 *
 * 每次规则变更生成新快照，形成单向链表。
 * 计算请求绑定快照 ID，保证规则一致性。
 */

import {
  Entity,
  Column,
  PrimaryColumn,
  Index,
} from 'typeorm'

@Entity('erdl_snapshot')
export class ERDLSnapshot {
  /** 快照唯一 ID */
  @PrimaryColumn({ type: 'varchar', length: 36 })
  snapshotId!: string

  /** 单调递增序列号 */
  @Column({ type: 'int', unique: true })
  snapshotSeq!: number

  /** 上一个快照 ID */
  @Index()
  @Column({ comment: 'predecessor ID',  type: 'varchar', length: 36, nullable: true })
  predecessorId!: string | null

  /** 快照内规则数量 */
  @Column({ comment: 'rule 数量',  type: 'int', default: 0 })
  ruleCount!: number

  /** 创建者 */
  @Column({ comment: '创建人',  type: 'varchar', length: 64 })
  createdBy!: string

  /** 创建时间戳 */
  @Index()
  @Column({ comment: '时间',  type: 'bigint' })
  createdAt!: number

  /** 快照元数据 */
  @Column({ type: 'json', nullable: true })
  metadata!: Record<string, unknown> | null
}
