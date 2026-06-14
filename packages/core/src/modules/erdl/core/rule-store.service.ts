/**
 * 秒镜科技 · ERDL 议会模型 — 不可变规则存储 Service
 *
 * @file RuleStore Service
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-01
 * @license AGPL-3.0
 *
 * 规则从不被修改，只追加新版本。
 * 每次写入生成 contentHash，形成单向版本链表。
 */

import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as crypto from 'crypto'
import { ERDLRuleRecord } from './entity/erdl-rule-record.entity'
import { CreateRuleDto, UpdateRuleDto } from '../dto/erdl.dto'

/** 追加规则参数 */
export interface AppendRuleParams {
  ruleId: string
  namespace: string
  ruleName: string
  content: string
  snapshotId: string
  createdBy: string
  proposalId?: string
}

@Injectable()
export class RuleStoreService {
  constructor(
    @InjectRepository(ERDLRuleRecord)
    private readonly ruleRepo: Repository<ERDLRuleRecord>,
  ) {}

  /**
   * 追加一条规则的新版本（不可变写）
   *
   * 1. 查找该 ruleId 的最新版本
   * 2. 计算新版本的 contentHash
   * 3. parentHash 指向旧版本的 contentHash
   * 4. INSERT 新记录
   */
  async append(params: AppendRuleParams): Promise<ERDLRuleRecord> {
    // 查找上一版本
    const latest = await this.getLatest(params.ruleId)
    const version = latest ? latest.version + 1 : 1
    const parentHash = latest ? latest.contentHash : null
    const contentHash = this.hashContent(params.content)

    const record = this.ruleRepo.create({
      ruleRecordId: this.generateId(),
      ruleId: params.ruleId,
      namespace: params.namespace,
      ruleName: params.ruleName,
      version,
      content: params.content,
      contentHash,
      parentHash,
      snapshotId: params.snapshotId,
      createdBy: params.createdBy,
      proposalId: params.proposalId || null,
      createdAt: Date.now(),
    })

    return this.ruleRepo.save(record)
  }

  /**
   * 获取指定 ruleId 的最新版本
   */
  async getLatest(ruleId: string): Promise<ERDLRuleRecord | null> {
    return this.ruleRepo.findOne({
      where: { ruleId },
      order: { version: 'DESC' },
    })
  }

  /**
   * 获取指定快照内的所有规则
   */
  async getBySnapshot(snapshotId: string): Promise<ERDLRuleRecord[]> {
    return this.ruleRepo.find({
      where: { snapshotId },
      order: { namespace: 'ASC' },
    })
  }

  /**
   * 按 namespace 获取最新规则
   */
  async getLatestByNamespace(namespace: string): Promise<ERDLRuleRecord[]> {
    // 子查询：每个 ruleId 的最大 version
    const subQuery = this.ruleRepo
      .createQueryBuilder('r2')
      .select('r2.rule_id', 'rule_id')
      .addSelect('MAX(r2.version)', 'max_ver')
      .where('r2.namespace = :ns', { ns: namespace })
      .groupBy('r2.rule_id')

    // 主查询匹配最新版本
    return this.ruleRepo
      .createQueryBuilder('r')
      .innerJoin(
        `(${subQuery.getQuery()})`,
        'latest',
        'r.rule_id = latest.rule_id AND r.version = latest.max_ver',
      )
      .setParameters(subQuery.getParameters())
      .getMany()
  }

  /**
   * 获取所有 namespace 的最新规则
   */
  async getAllLatest(): Promise<ERDLRuleRecord[]> {
    const subQuery = this.ruleRepo
      .createQueryBuilder('r2')
      .select('r2.rule_id', 'rule_id')
      .addSelect('MAX(r2.version)', 'max_ver')
      .groupBy('r2.rule_id')

    return this.ruleRepo
      .createQueryBuilder('r')
      .innerJoin(
        `(${subQuery.getQuery()})`,
        'latest',
        'r.rule_id = latest.rule_id AND r.version = latest.max_ver',
      )
      .setParameters(subQuery.getParameters())
      .getMany()
  }

  /**
   * 获取规则的完整版本历史
   */
  async getHistory(ruleId: string): Promise<ERDLRuleRecord[]> {
    return this.ruleRepo.find({
      where: { ruleId },
      order: { version: 'DESC' },
    })
  }

  /**
   * 验证版本链的完整性
   */
  verifyChain(records: ERDLRuleRecord[]): boolean {
    const sorted = records.sort((a, b) => a.version - b.version)
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].parentHash !== sorted[i - 1].contentHash) {
        return false
      }
    }
    return true
  }

  // ============================================
  // Private
  // ============================================

  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex')
  }

  private generateId(): string {
    return `rr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  }

  private generateRuleId(): string {
    return `rule-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  }

  // ============================================
  // 规则 CRUD（管理端操作）
  // ============================================

  /**
   * 创建新规则
   *
   * 生成新的 ruleId，写入初始版本。
   */
  async createRule(dto: CreateRuleDto): Promise<ERDLRuleRecord> {
    const ruleId = this.generateRuleId()
    const content = JSON.stringify({
      name: dto.name,
      trigger: dto.trigger,
      namespace: dto.namespace,
      entity: dto.entity,
      tier: dto.tier,
      priority: dto.priority,
      isActive: dto.isActive ?? true,
      condition: dto.condition,
      actions: dto.actions,
    })
    const contentHash = this.hashContent(content)

    const record = this.ruleRepo.create({
      ruleRecordId: this.generateId(),
      ruleId,
      namespace: dto.namespace,
      ruleName: dto.name,
      version: 1,
      content,
      contentHash,
      parentHash: null,
      snapshotId: 'manual',
      createdBy: 'admin',
      isActive: dto.isActive ?? true,
      deletedAt: null,
      createdAt: Date.now(),
    })

    return this.ruleRepo.save(record)
  }

  /**
   * 更新现有规则
   *
   * 采用不可变模式：找到最新版本，追加新版本（version+1），
   * 同时更新 isActive 状态。
   */
  async updateRule(id: string, dto: UpdateRuleDto): Promise<ERDLRuleRecord> {
    const latest = await this.getLatest(id)
    if (!latest) {
      throw new NotFoundException(`Rule ${id} not found`)
    }

    // 合并更新内容
    const prevContent = this.tryParseContent(latest.content)
    const updatedContent = JSON.stringify({
      ...prevContent,
      name: dto.name ?? prevContent.name,
      trigger: dto.trigger ?? prevContent.trigger,
      namespace: dto.namespace ?? prevContent.namespace,
      entity: dto.entity ?? prevContent.entity,
      tier: dto.tier ?? prevContent.tier,
      priority: dto.priority ?? prevContent.priority,
      isActive: dto.isActive ?? prevContent.isActive,
      condition: dto.condition ?? prevContent.condition,
      actions: dto.actions ?? prevContent.actions,
    })

    const contentHash = this.hashContent(updatedContent)

    const record = this.ruleRepo.create({
      ruleRecordId: this.generateId(),
      ruleId: id,
      namespace: dto.namespace ?? latest.namespace,
      ruleName: dto.name ?? latest.ruleName,
      version: latest.version + 1,
      content: updatedContent,
      contentHash,
      parentHash: latest.contentHash,
      snapshotId: 'manual',
      createdBy: 'admin',
      isActive: dto.isActive ?? latest.isActive,
      deletedAt: null,
      createdAt: Date.now(),
    })

    return this.ruleRepo.save(record)
  }

  /**
   * 软删除规则
   *
   * 标记最新版本为已删除。
   */
  async deleteRule(id: string): Promise<{ message: string }> {
    const latest = await this.getLatest(id)
    if (!latest) {
      throw new NotFoundException(`Rule ${id} not found`)
    }

    await this.ruleRepo.update(
      { ruleRecordId: latest.ruleRecordId },
      { deletedAt: Date.now(), isActive: false },
    )

    return { message: `Rule ${id} has been soft-deleted` }
  }

  /**
   * 切换规则的启用/禁用状态
   *
   * 找到最新版本，切换 isActive 并追加新版本。
   */
  async toggleRule(id: string): Promise<ERDLRuleRecord> {
    const latest = await this.getLatest(id)
    if (!latest) {
      throw new NotFoundException(`Rule ${id} not found`)
    }

    const prevContent = this.tryParseContent(latest.content)
    const newIsActive = !latest.isActive
    const updatedContent = JSON.stringify({ ...prevContent, isActive: newIsActive })
    const contentHash = this.hashContent(updatedContent)

    const record = this.ruleRepo.create({
      ruleRecordId: this.generateId(),
      ruleId: id,
      namespace: latest.namespace,
      ruleName: latest.ruleName,
      version: latest.version + 1,
      content: updatedContent,
      contentHash,
      parentHash: latest.contentHash,
      snapshotId: 'manual',
      createdBy: 'admin',
      isActive: newIsActive,
      deletedAt: null,
      createdAt: Date.now(),
    })

    return this.ruleRepo.save(record)
  }

  // ============================================
  // Private helpers
  // ============================================

  private tryParseContent(content: string): Record<string, unknown> {
    try {
      return JSON.parse(content)
    } catch {
      return {}
    }
  }
}
