/**
 * 秒镜科技 · ERDL 议会模型 — 全局快照管理器
 *
 * @file SnapshotManager Service
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-01
 * @license BSL-1.1
 *
 * 管理规则世界的"快照版本"。
 * 每次规则变更生成新快照，计算请求绑定快照 ID。
 */

import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThan } from 'typeorm'
import * as crypto from 'crypto'
import { ERDLSnapshot } from './entity/erdl-snapshot.entity'
import { RuleStoreService } from './rule-store.service'

@Injectable()
export class SnapshotManagerService {
  constructor(
    @InjectRepository(ERDLSnapshot)
    private readonly snapRepo: Repository<ERDLSnapshot>,
    private readonly ruleStore: RuleStoreService,
  ) {}

  /**
   * 获取最新快照
   */
  async getLatest(): Promise<ERDLSnapshot | null> {
    return this.snapRepo.findOne({
      order: { snapshotSeq: 'DESC' },
    })
  }

  /**
   * 获取指定快照
   */
  async getById(snapshotId: string): Promise<ERDLSnapshot | null> {
    return this.snapRepo.findOne({ where: { snapshotId } })
  }

  /**
   * 创建新快照（合并多个提案）
   *
   * @param proposalIds 合并到此快照的提案 ID 列表
   * @param createdBy 创建者
   * @param description 快照描述
   */
  async createSnapshot(
    proposalIds: string[],
    createdBy: string,
    description?: string,
  ): Promise<ERDLSnapshot> {
    const latest = await this.getLatest()
    const seq = latest ? latest.snapshotSeq + 1 : 1
    const predecessorId = latest ? latest.snapshotId : null

    // 统计当前所有最新规则数量
    const allLatest = await this.ruleStore.getAllLatest()
    const ruleCount = allLatest.length

    const snapshot = this.snapRepo.create({
      snapshotId: `snap-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      snapshotSeq: seq,
      predecessorId,
      ruleCount,
      createdBy,
      createdAt: Date.now(),
      metadata: {
        description: description || `Snapshot #${seq}`,
        proposalIds,
      },
    })

    return this.snapRepo.save(snapshot)
  }

  /**
   * 获取快照链（用于审计/回溯）
   *
   * @param fromSeq 从某序列号开始
   * @param limit 最多返回条数
   */
  async getChain(fromSeq?: number, limit = 50): Promise<ERDLSnapshot[]> {
    const qb = this.snapRepo
      .createQueryBuilder('s')
      .orderBy('s.snapshotSeq', 'DESC')
      .take(limit)

    if (fromSeq !== undefined) {
      qb.where('s.snapshotSeq <= :seq', { seq: fromSeq })
    }

    return qb.getMany()
  }

  /**
   * 查找指定时间点对应的快照
   * @deprecated 精确时间戳匹配不可靠，请使用 getSnapshotNotAfter
   */
  async getSnapshotAt(timestamp: number): Promise<ERDLSnapshot | null> {
    return this.getSnapshotNotAfter(timestamp)
  }

  /**
   * 获取稍早于指定时间的最新快照
   */
  async getSnapshotBefore(timestamp: number): Promise<ERDLSnapshot | null> {
    // P2修复：使用 timestamp 参数过滤，而非返回最新快照
    return this.snapRepo.findOne({
      where: { createdAt: LessThan(timestamp) },
      order: { createdAt: 'DESC' },
    })
  }

  /**
   * 获取不晚于指定时间的最新快照
   */
  async getSnapshotNotAfter(timestamp: number): Promise<ERDLSnapshot | null> {
    return this.snapRepo
      .createQueryBuilder('s')
      .where('s.createdAt <= :ts', { ts: timestamp })
      .orderBy('s.snapshotSeq', 'DESC')
      .getOne()
  }

  /**
   * 快照间差异对比
   */
  async diff(
    snapA: string,
    snapB: string,
  ): Promise<{ added: string[]; modified: string[]; removed: string[] }> {
    const rulesA = await this.ruleStore.getBySnapshot(snapA)
    const rulesB = await this.ruleStore.getBySnapshot(snapB)

    const mapA = new Map(rulesA.map((r) => [r.ruleId, r]))
    const mapB = new Map(rulesB.map((r) => [r.ruleId, r]))

    const added: string[] = []
    const modified: string[] = []
    const removed: string[] = []

    for (const [id, rB] of mapB) {
      const rA = mapA.get(id)
      if (!rA) {
        added.push(id)
      } else if (rA.contentHash !== rB.contentHash) {
        modified.push(id)
      }
    }

    for (const id of mapA.keys()) {
      if (!mapB.has(id)) {
        removed.push(id)
      }
    }

    return { added, modified, removed }
  }
}
