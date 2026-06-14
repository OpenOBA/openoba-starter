/**
 * ER-OS Knowledge Service — 标签驱动的知识管理
 * 
 * 人类操作：加知识 + 搜知识
 * Agent 操作：按标签检索 + 引用计数
 */

import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In, Like } from 'typeorm'
import * as crypto from 'crypto'
import { KnowledgeEntry, KnowledgeType, KnowledgeVisibility, KnowledgeStatus } from './knowledge-entry.entity'

function uid() { return crypto.randomUUID().replace(/-/g, '') }

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(KnowledgeEntry)
    private repo: Repository<KnowledgeEntry>,
  ) {}

  // ══════════════════════════════════════════════
  // 人类操作
  // ══════════════════════════════════════════════

  /** 添加知识 */
  async create(dto: {
    title: string
    visibility?: KnowledgeVisibility
    type?: KnowledgeType
    tags: string[]
    content: string
    contributor?: string
    attachments?: Array<{ name: string; type: string; url: string; size?: number }>
  }): Promise<KnowledgeEntry> {
    const entry = this.repo.create({
      id: dto.visibility === 'private' ? `kp-${uid().substring(0, 8)}` : `kb-${uid().substring(0, 8)}`,
      visibility: dto.visibility || 'public',
      type: dto.type || 'EXPERIENCE',
      weight: 0.3,
      status: 'active' as KnowledgeStatus,
      ...dto,
    })
    return this.repo.save(entry)
  }

  /** 知识列表（分页 + 标签过滤 + 全文搜索 + visibility 过滤） */
  async query(params: {
    keyword?: string
    tags?: string
    type?: string
    visibility?: string
    status?: string
    page?: number
    pageSize?: number
  }): Promise<{ items: KnowledgeEntry[]; total: number }> {
    const qb = this.repo.createQueryBuilder('k')
      .where('k.status = :status', { status: params.status || 'active' })

    if (params.visibility) {
      qb.andWhere('k.visibility = :visibility', { visibility: params.visibility })
    }

    if (params.type) {
      qb.andWhere('k.type = :type', { type: params.type })
    }

    if (params.keyword) {
      // P2修复：转义 LIKE 通配符 % 和 _，防止用户输入的特殊字符影响搜索
      const escapedKw = String(params.keyword).replace(/[%_]/g, '\\$&')
      qb.andWhere('(k.title LIKE :kw OR k.content LIKE :kw)', { kw: `%${escapedKw}%` })
    }

    // 标签过滤：JSON_CONTAINS 匹配任一标签
    if (params.tags) {
      const tagList = params.tags.split(',').map(t => t.trim()).filter(Boolean)
      if (tagList.length > 0) {
        const conditions = tagList.map((_, i) => `JSON_CONTAINS(k.tags, :tag${i})`)
        qb.andWhere(`(${conditions.join(' OR ')})`)
        tagList.forEach((t, i) => { qb.setParameter(`tag${i}`, JSON.stringify(t)) })
      }
    }

    const page = params.page || 1
    const pageSize = params.pageSize || 20

    qb.orderBy('k.weight', 'DESC')
      .addOrderBy('k.updated_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [items, total] = await qb.getManyAndCount()
    return { items, total }
  }

  /** 知识详情 */
  async findOne(id: string): Promise<KnowledgeEntry> {
    const e = await this.repo.findOneBy({ id })
    if (!e) throw new NotFoundException('知识条目不存在')
    return e
  }

  /** 编辑知识 */
  async update(id: string, dto: {
    title?: string
    visibility?: KnowledgeVisibility
    type?: KnowledgeType
    tags?: string[]
    content?: string
    contributor?: string
    attachments?: Array<{ name: string; type: string; url: string; size?: number }> | null
  }): Promise<KnowledgeEntry> {
    const e = await this.findOne(id)
    if (dto.title !== undefined) e.title = dto.title
    if (dto.visibility !== undefined) e.visibility = dto.visibility
    if (dto.type !== undefined) e.type = dto.type
    if (dto.tags !== undefined) e.tags = dto.tags
    if (dto.content !== undefined) e.content = dto.content
    if (dto.attachments !== undefined) e.attachments = dto.attachments
    if (dto.contributor !== undefined) e.contributor = dto.contributor
    return this.repo.save(e)
  }

  /** 归档知识 */
  async archive(id: string): Promise<KnowledgeEntry> {
    const e = await this.findOne(id)
    e.status = 'archived'
    return this.repo.save(e)
  }

  /** 删除知识（管理员） */
  async remove(id: string): Promise<{ deleted: boolean }> {
    await this.findOne(id)
    await this.repo.delete(id)
    return { deleted: true }
  }

  /** 获取标签云（按使用频次排序） */
  async getTagCloud(): Promise<Array<{ tag: string; count: number }>> {
    const entries = await this.repo.find({
      where: { status: 'active' },
      select: ['tags'],
    })

    const countMap = new Map<string, number>()
    for (const e of entries) {
      if (e.tags && Array.isArray(e.tags)) {
        for (const tag of e.tags) {
          countMap.set(tag, (countMap.get(tag) || 0) + 1)
        }
      }
    }

    return Array.from(countMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
  }

  // ══════════════════════════════════════════════
  // Agent 操作
  // ══════════════════════════════════════════════

  /**
   * Agent 知识检索
   * 
   * 流程：
   * 1. 按标签匹配公开 + 私有知识
   * 2. 公开知识：返回全文，用于注入 System Prompt
   * 3. 私有知识：仅返回标题 + 类型 + 权重，提示人类参考
   * 4. 按权重降序，取 topK 条
   */
  async searchForAgent(params: {
    tags: string[]
    topk?: number
  }): Promise<{
    publicEntries: KnowledgeEntry[]     // 全文注入
    privateEntries: Pick<KnowledgeEntry, 'id' | 'title' | 'type' | 'tags' | 'weight'>[]  // 标题提醒
  }> {
    const topk = params.topk || 10
    const tagList = params.tags.filter(Boolean)

    if (tagList.length === 0) {
      // 无标签时返回高权重公开知识
      const publicEntries = await this.repo.find({
        where: { status: 'active', visibility: 'public' },
        order: { weight: 'DESC' },
        take: topk,
      })
      return { publicEntries, privateEntries: [] }
    }

    // 构建 JSON_CONTAINS 条件
    const qb = this.repo.createQueryBuilder('k')
      .where('k.status = :status', { status: 'active' })

    const conditions = tagList.map((_, i) => `JSON_CONTAINS(k.tags, :tag${i})`)
    qb.andWhere(`(${conditions.join(' OR ')})`)
    tagList.forEach((t, i) => { qb.setParameter(`tag${i}`, JSON.stringify(t)) })

    qb.orderBy('k.weight', 'DESC').take(topk * 2) // 多取一些用于分割
    const all = await qb.getMany()

    const publicEntries = all.filter(e => e.visibility === 'public').slice(0, topk)
    const privateEntries = all
      .filter(e => e.visibility === 'private')
      .slice(0, 5)
      .map(e => ({
        id: e.id as string,
        title: e.title as string,
        type: e.type as KnowledgeType,
        tags: e.tags as string[],
        weight: e.weight as number,
      }))

    return { publicEntries, privateEntries }
  }

  /**
   * Agent 引用知识 → 权重自动累积
   * new_weight = old_weight + (1 - old_weight) × 0.05
   */
  async cite(id: string): Promise<{ weight: number }> {
    const e = await this.findOne(id)
    const newWeight = Math.min(e.weight + (1 - e.weight) * 0.05, 0.999)
    e.weight = Math.round(newWeight * 1000) / 1000
    await this.repo.save(e)
    return { weight: e.weight }
  }
}
