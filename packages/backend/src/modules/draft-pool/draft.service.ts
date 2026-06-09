/**
 * 通用草稿池 Service
 *
 * 支持任意类型草稿的 CRUD + 状态流转 + 发布。
 * 与旧的 DraftPoolService（draft_spu 专属）并行运行，逐步迁移。
 *
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-18
 */

import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, IsNull, DataSource } from 'typeorm'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { Draft, DraftStatus } from './entities/draft.entity'
import { ProductSpu } from '../product/entity/product-spu.entity'
import { ProductSku } from '../product/entity/product-sku.entity'
import type {
  CreateDraftDto, UpdateDraftDto, UpdateDraftStatusDto, PublishDraftDto, QueryDraftDto,
} from './dto/draft.dto'

function uid(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

function genDraftNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `DFT-${date}-${rand}`
}

@Injectable()
export class DraftService {
  private readonly logger = new Logger(DraftService.name)

  constructor(
    @InjectRepository(Draft) private draftRepo: Repository<Draft>,
    @InjectRepository(ProductSpu) private spuRepo: Repository<ProductSpu>,
    @InjectRepository(ProductSku) private skuRepo: Repository<ProductSku>,
    private dataSource: DataSource,
  ) {}

  // ── CRUD ──

  async create(dto: CreateDraftDto): Promise<Draft> {
    const draft = new Draft()
    draft.id = uid()
    draft.draftNo = genDraftNo()
    draft.status = 'editing'
    if (dto.title) draft.title = dto.title
    if (dto.draftType) draft.draftType = dto.draftType as any
    if (dto.bodyText) draft.bodyText = dto.bodyText
    if (dto.bodyJson) draft.bodyJson = dto.bodyJson
    if (dto.attachments) draft.attachments = dto.attachments
    if (dto.tags) draft.tags = dto.tags
    if (dto.sourceTaskId) draft.sourceTaskId = dto.sourceTaskId
    if (dto.sourceSessionId) draft.sourceSessionId = dto.sourceSessionId
    if (dto.sourceAgent) draft.sourceAgent = dto.sourceAgent
    if (dto.sourceModel) draft.sourceModel = dto.sourceModel
    if (dto.sourcePrompt) draft.sourcePrompt = dto.sourcePrompt
    return this.draftRepo.save(draft)
  }

  async query(q: QueryDraftDto): Promise<{ items: Draft[]; total: number }> {
    const { draftType, status, sourceTaskId, search, page = 1, pageSize = 20 } = q

    const qb = this.draftRepo.createQueryBuilder('d').where('d.deletedAt IS NULL')

    if (draftType) qb.andWhere('d.draftType = :draftType', { draftType })
    if (status) qb.andWhere('d.status = :status', { status })
    if (sourceTaskId) qb.andWhere('d.sourceTaskId = :sourceTaskId', { sourceTaskId })
    if (search) {
      qb.andWhere('(d.title LIKE :s OR d.bodyText LIKE :s)', { s: `%${search}%` })
    }

    qb.orderBy('d.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [items, total] = await qb.getManyAndCount()
    return { items, total }
  }

  async findOne(id: string): Promise<Draft> {
    const draft = await this.draftRepo.findOne({
      where: { id, deletedAt: IsNull() },
    })
    if (!draft) throw new NotFoundException(`草稿不存在: ${id}`)
    return draft
  }

  async update(id: string, dto: UpdateDraftDto): Promise<Draft> {
    const draft = await this.findOne(id)
    if (draft.status === 'published' || draft.status === 'archived') {
      throw new Error(`草稿已 ${draft.status}，不可编辑。请先撤回状态。`)
    }
    Object.assign(draft, dto)
    return this.draftRepo.save(draft)
  }

  async softDelete(id: string): Promise<void> {
    const draft = await this.findOne(id)
    await this.draftRepo.softRemove(draft)
  }

  // ── 状态流转 ──

  async updateStatus(id: string, dto: UpdateDraftStatusDto): Promise<Draft> {
    const draft = await this.findOne(id)
    const validTransitions: Record<DraftStatus, DraftStatus[]> = {
      editing: ['ready', 'archived'],
      ready: ['editing', 'published', 'archived'],
      published: ['archived'],
      archived: ['editing'],
    }

    const allowed = validTransitions[draft.status] || []
    if (!allowed.includes(dto.status)) {
      throw new Error(`不允许从 ${draft.status} 转为 ${dto.status}。允许: ${allowed.join(', ')}`)
    }

    draft.status = dto.status
    if (dto.status === 'published') {
      draft.publishedAt = new Date()
    }
    return this.draftRepo.save(draft)
  }

  // ── 发布 ──

  async publish(id: string, dto: PublishDraftDto): Promise<Draft> {
    const draft = await this.findOne(id)
    if (draft.status !== 'ready') {
      throw new Error(`草稿状态为 ${draft.status}，需先置为 ready 再发布`)
    }

    const targets: Array<{ id?: string; type: string; name: string }> = []

    try {
      if (draft.draftType === 'spu' && draft.bodyJson) {
        // ── SPU 草稿 → 创建 product_spu + product_sku ──
        const bj = draft.bodyJson as any
        const spuCode = `S-${(bj.shapeCode || 'GEN').substring(0, 3)}-${Date.now().toString(36).toUpperCase()}`
        const spuName = bj.spuName || draft.title || draft.draftNo

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        let spuId = ''
        try {
          // 创建 SPU
          const spu = await queryRunner.manager.save(ProductSpu, {
            spuCode,
            spuName,
            structureStandardCode: bj.structureStandardCode || 'SL-001',
            seriesCode: bj.seriesCode || null,
            gender: bj.gender || 'unisex',
            description: draft.bodyText || '',
            status: 'draft',
          } as any)
          spuId = spu.spuId

          // 创建 SKU（如果有）
          const skus = bj.skus || bj.skuList || []
          const createdSkuIds: string[] = []
          for (const sku of skus) {
            const s = await queryRunner.manager.save(ProductSku, {
              spuId,
              skuCode: `${spuCode}-${(sku.colorCode || 'DEF').substring(0, 8)}`,
              colorCode: sku.colorCode || null,
              skinToneEffect: sku.skinToneEffect || null,
              faceShapeEffect: sku.faceShapeEffect || null,
              retailPrice: sku.retailPrice || 299,
              status: 'active',
            } as any)
            createdSkuIds.push(s.skuId)
          }

          await queryRunner.commitTransaction()

          targets.push({ id: spuId, type: 'product_spu', name: `${spuCode} ${spuName}` })
          for (const sid of createdSkuIds) {
            targets.push({ id: sid, type: 'product_sku', name: sid })
          }
        } catch (err) {
          await queryRunner.rollbackTransaction()
          throw err
        } finally {
          await queryRunner.release()
        }
      } else {
        // ── 非 SPU 类型 → 导出文件 ──
        const exportDir = path.join(process.cwd(), 'uploads', 'drafts', draft.id)
        fs.mkdirSync(exportDir, { recursive: true })

        const content = draft.bodyText || JSON.stringify(draft.bodyJson, null, 2) || ''
        const fileName = `${draft.draftNo}_${new Date().toISOString().slice(0, 10)}.md`
        fs.writeFileSync(path.join(exportDir, fileName), content, 'utf-8')

        targets.push({ type: 'file', name: fileName })
      }

      // 记录发布
      draft.publishAction = {
        action: dto.action as any,
        entity: dto.entity,
        targets: targets as any,
        snapshot_before: {},
        executed_by: 'human',
        executed_at: new Date().toISOString(),
      }
      draft.publishSnapshot = JSON.stringify(targets)
      draft.status = 'published'
      draft.publishedAt = new Date()
      return this.draftRepo.save(draft)

    } catch (error: unknown) {
      this.logger.error(`发布失败: ${draft.draftNo} - ${(error as Error).message}`)
      throw error
    }
  }

  // ── 批量操作 ──

  async getStats(): Promise<{
    total: number; editing: number; ready: number; published: number;
    byType: Record<string, number>;
  }> {
    const [total, editing, ready, published] = await Promise.all([
      this.draftRepo.count({ where: { deletedAt: IsNull() } }),
      this.draftRepo.count({ where: { status: 'editing', deletedAt: IsNull() } }),
      this.draftRepo.count({ where: { status: 'ready', deletedAt: IsNull() } }),
      this.draftRepo.count({ where: { status: 'published', deletedAt: IsNull() } }),
    ])

    const typeRows = await this.draftRepo
      .createQueryBuilder('d')
      .select('d.draftType', 'type')
      .addSelect('COUNT(*)', 'cnt')
      .where('d.deletedAt IS NULL')
      .andWhere('d.draftType IS NOT NULL')
      .groupBy('d.draftType')
      .getRawMany()

    const byType: Record<string, number> = {}
    for (const row of typeRows) {
      if (row.type) byType[row.type] = Number(row.cnt)
    }

    return { total, editing, ready, published, byType }
  }
}
