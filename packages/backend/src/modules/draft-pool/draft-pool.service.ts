import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, IsNull, Like, DataSource } from 'typeorm'
import * as crypto from 'crypto'

import { DraftSpu } from './entities/draft-spu.entity'
import { DraftSku } from './entities/draft-sku.entity'
import { DraftBatch } from './entities/draft-batch.entity'
import { DraftPublishBatch } from './entities/draft-publish-batch.entity'
import { AdvisoryReport } from './entities/advisory-report.entity'
import { DraftTask } from './entities/draft-task.entity'
import { ProductSpu } from '../product/entity/product-spu.entity'
import { ProductSku } from '../product/entity/product-sku.entity'
import { StructureStandard } from '../structure/entity/structure-standard.entity'
import { NamingEngine, SkuNameInput } from '../product/utils/naming-engine'
import {
  CreateDraftSpuDto,
  CreateDraftSkuDto,
  UpdateDraftSpuDto,
  ReviewDraftDto,
  PublishDraftDto,
  QueryDraftDto,
  CreateAdvisoryReportDto,
  PromoteToProductDto,
} from './dto/draft-pool.dto'

function uid(): string {
  return crypto.randomUUID().replace(/-/g, '')
}
function notDeleted(): { deletedAt: ReturnType<typeof IsNull> } {
  return { deletedAt: IsNull() }
}

@Injectable()
export class DraftPoolService {
  private readonly logger = new Logger(DraftPoolService.name)

  constructor(
    @InjectRepository(DraftSpu) private draftSpuRepo: Repository<DraftSpu>,
    @InjectRepository(DraftSku) private draftSkuRepo: Repository<DraftSku>,
    @InjectRepository(DraftBatch) private batchRepo: Repository<DraftBatch>,
    @InjectRepository(DraftPublishBatch) private pkgRepo: Repository<DraftPublishBatch>,
    @InjectRepository(AdvisoryReport) private reportRepo: Repository<AdvisoryReport>,
    @InjectRepository(DraftTask) private taskRepo: Repository<DraftTask>,
    @InjectRepository(ProductSpu) private spuRepo: Repository<ProductSpu>,
    @InjectRepository(ProductSku) private skuRepo: Repository<ProductSku>,
    @InjectRepository(StructureStandard) private structRepo: Repository<StructureStandard>,
    private dataSource: DataSource,
  ) {}

  // ========== Draft SPU ==========

  async createDraftSpu(dto: CreateDraftSpuDto): Promise<DraftSpu> {
    const draft = await this.draftSpuRepo.save({
      draftId: uid(),
      batchId: dto.batchId || undefined,
      gender: dto.gender,
      shapeCode: dto.shapeCode,
      seriesCode: dto.seriesCode,
      structureStandardCode: dto.structureStandardCode,
      spuName: dto.spuName,
      spuDescription: dto.spuDescription || '',
      displayNameTemplate: dto.displayNameTemplate || '',
      source: dto.source || 'manual',
      status: 'draft',
    })
    if (dto.skus && dto.skus.length > 0) {
      await this.createDraftSkus(draft.draftId, dto.skus)
    }
    return draft
  }

  private async createDraftSkus(draftId: string, skus: CreateDraftSkuDto[]): Promise<DraftSku[]> {
    return this.draftSkuRepo.save(
      skus.map((s, i) => ({
        draftSkuId: uid(),
        draftId,
        colorCode: s.colorCode,
        colorName: s.colorName || '',
        skinToneEffect: s.skinToneEffect || '',
        faceShapeEffect: s.faceShapeEffect || '',
        displayName: s.displayName || '',
        sortOrder: s.sortOrder ?? i,
        skuStatus: 'draft',
      })),
    )
  }

  async queryDrafts(query: QueryDraftDto): Promise<{ items: DraftSpu[]; total: number }> {
    const qb = this.draftSpuRepo.createQueryBuilder('d').where('d.deleted_at IS NULL')
    if (query.status) qb.andWhere('d.status = :status', { status: query.status })
    if (query.gender) qb.andWhere('d.gender = :gender', { gender: query.gender })
    if (query.shapeCode) qb.andWhere('d.shape_code = :shapeCode', { shapeCode: query.shapeCode })
    if (query.seriesCode) qb.andWhere('d.series_code = :seriesCode', { seriesCode: query.seriesCode })
    if (query.source) qb.andWhere('d.source = :source', { source: query.source })
    if (query.batchId) qb.andWhere('d.batch_id = :batchId', { batchId: query.batchId })

    const page = query.page || 1
    const pageSize = query.pageSize || 20
    const [items, total] = await qb
      .orderBy('d.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()
    return { items, total }
  }

  async getDraftDetail(draftId: string): Promise<{ draft: DraftSpu; skus: DraftSku[] }> {
    const draft = await this.draftSpuRepo.findOneBy({ draftId })
    if (!draft) throw new NotFoundException('草稿不存在')
    const skus = await this.draftSkuRepo.findBy({ draftId, deletedAt: IsNull() })
    skus.sort((a, b) => a.sortOrder - b.sortOrder)
    return { draft, skus }
  }

  async updateDraft(draftId: string, dto: UpdateDraftSpuDto): Promise<DraftSpu> {
    const draft = await this.draftSpuRepo.findOneBy({ draftId })
    if (!draft) throw new NotFoundException('草稿不存在')
    Object.assign(draft, dto)
    return this.draftSpuRepo.save(draft)
  }

  async deleteDraft(draftId: string): Promise<void> {
    const draft = await this.draftSpuRepo.findOneBy({ draftId })
    if (!draft) throw new NotFoundException('草稿不存在')
    draft.deletedAt = new Date()
    await this.draftSpuRepo.save(draft)
    await this.draftSkuRepo.update({ draftId }, { deletedAt: new Date() })
  }

  // ========== Review ==========

  async reviewDraft(draftId: string, dto: ReviewDraftDto): Promise<DraftSpu> {
    const draft = await this.draftSpuRepo.findOneBy({ draftId })
    if (!draft) throw new NotFoundException('草稿不存在')

    if (dto.action === 'approve') {
      draft.status = 'reviewed'
      draft.reviewNotes = dto.reviewNotes || ''
      if (dto.skuIds && dto.skuIds.length > 0) {
        await this.draftSkuRepo.update({ draftId, skuStatus: 'draft' }, { skuStatus: 'rejected' })
        for (const sid of dto.skuIds) {
          await this.draftSkuRepo.update({ draftSkuId: sid, draftId }, { skuStatus: 'approved' })
        }
      } else {
        await this.draftSkuRepo.update({ draftId }, { skuStatus: 'approved' })
      }
    } else if (dto.action === 'reject') {
      draft.status = 'rejected'
      draft.rejectedReason = dto.rejectedReason || ''
      draft.reviewNotes = dto.reviewNotes || ''
    } else {
      throw new BadRequestException(`不支持的动作: ${dto.action}`)
    }
    return this.draftSpuRepo.save(draft)
  }

  async getWaitlistCount(): Promise<{ draft: number; reviewed: number }> {
    const draft = await this.draftSpuRepo.countBy({ status: 'draft' })
    const reviewed = await this.draftSpuRepo.countBy({ status: 'reviewed' })
    return { draft, reviewed }
  }

  // ========== Batch Management ==========

  async createBatch(name: string, generationType = 'ai'): Promise<DraftBatch> {
    return this.batchRepo.save({
      id: uid(),
      batchName: name,
      generationType,
      status: 'generating',
    })
  }

  async completeBatch(batchId: string): Promise<DraftBatch> {
    const batch = await this.batchRepo.findOneBy({ id: batchId })
    if (!batch) throw new NotFoundException('批次不存在')
    const [total, approved, published] = await Promise.all([
      this.draftSpuRepo.countBy({ batchId }),
      this.draftSpuRepo.countBy({ batchId, status: 'reviewed' }),
      this.draftSpuRepo.countBy({ batchId, status: 'published' }),
    ])
    Object.assign(batch, {
      status: 'completed',
      totalCount: total,
      approvedCount: approved,
      publishedCount: published,
      completedAt: new Date(),
    })
    return this.batchRepo.save(batch)
  }

  async queryBatches(): Promise<DraftBatch[]> {
    return this.batchRepo.find({ order: { createdAt: 'DESC' }, take: 50 })
  }

  // ========== Publish / Promote to Product ==========

  /**
   * 草稿入库——将 DraftSpu + DraftSku 转为真正的 ProductSpu + ProductSku
   */
  async promoteToProduct(draftId: string): Promise<{
    spuId: string
    spuCode: string
    spuName: string
    skuIds: string[]
  }> {
    const draft = await this.draftSpuRepo.findOneBy({ draftId })
    if (!draft) throw new NotFoundException('草稿不存在')
    if (draft.status === 'promoted' && draft.publishedSpuId) {
      throw new BadRequestException('该草稿已入库，SPU ID: ' + draft.publishedSpuId)
    }

    const draftSkus = await this.draftSkuRepo.findBy({ draftId, deletedAt: IsNull() })
    const approvedSkus = draftSkus.filter(s => s.skuStatus === 'approved' || s.skuStatus === 'draft')

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      // 1. 获取结构标准信息（用于生成 SPU 编码）
      const structInfo = await this.getStructureInfo(draft.structureStandardCode)
      const spuCode = await this.generateSpuCode(draft.structureStandardCode, structInfo)
      const spuDisplayName = await this.generateSpuDisplayName(draft, structInfo)

      // 2. 创建 ProductSpu
      const spuId = uid()
      const spuRecord = queryRunner.manager.create(ProductSpu, {
        spuId,
        spuCode,
        spuName: draft.spuName,
        description: draft.spuDescription || '',
        gender: draft.gender,
        seriesCode: draft.seriesCode,
        structureStandardCode: draft.structureStandardCode,
        productTier: 'color',
        mainImage: spuDisplayName, // placeholder; images managed separately
        status: 'draft',
      })
      await queryRunner.manager.save(spuRecord)

      // 3. 创建 ProductSku（每个 DraftSku → 一个 ProductSku）
      const skuIds: string[] = []
      // V3.0: 预取色彩名称映射
      const structExternalCode = structInfo?.externalCode || draft.structureStandardCode || ''
      const shapeName = NamingEngine.getShapeName(structInfo?.shapeCode)
      const seriesChineseName = this.getSeriesChineseName(draft.seriesCode || '')
      for (let i = 0; i < approvedSkus.length; i++) {
        const ds = approvedSkus[i]
        const skuId = uid()
        const skuCode = `${spuCode}-${String(i + 1).padStart(3, '0')}`
        // V3.0: 使用 NamingEngine 生成展示名
        const colorName = ds.colorName || ds.colorCode || '未知色'
        const skuNameInput: SkuNameInput = {
          spuName: draft.spuName,
          externalCode: structExternalCode,
          shapeName,
          seriesChineseName,
          gender: draft.gender,
          colorName,
          skinToneEffect: ds.skinToneEffect,
          faceShapeEffect: ds.faceShapeEffect,
        }
        const skuName = ds.displayName || NamingEngine.generateSkuName(skuNameInput)

        const skuRecord = queryRunner.manager.create(ProductSku, {
          skuId,
          skuCode,
          spuId,
          skuName,
          colorCode: ds.colorCode,
          skinToneEffect: ds.skinToneEffect || '',
          faceShapeEffect: ds.faceShapeEffect || '',
          displayName: skuName,
          structureStandardCode: draft.structureStandardCode,
          productTier: 'color',
          retailPrice: 0, // 入库后由定价流程设置
        })
        await queryRunner.manager.save(skuRecord)
        skuIds.push(skuId)

        // 回写 draft_sku.published_sku_id
        await queryRunner.manager.update(DraftSku, { draftSkuId: ds.draftSkuId }, {
          skuStatus: 'promoted',
          publishedSkuId: skuId,
        })
      }

      // 4. 回写 draft_spu
      await queryRunner.manager.update(DraftSpu, { draftId }, {
        status: 'promoted',
        publishedSpuId: spuId,
        publishedAt: new Date(),
      })

      await queryRunner.commitTransaction()

      this.logger.log(`✅ 草稿入库完成: ${draft.spuName} → SPU ${spuCode} (${skuIds.length} SKUs)`)

      return { spuId, spuCode, spuName: draft.spuName, skuIds }
    } catch (e: unknown) {
      await queryRunner.rollbackTransaction()
      this.logger.error(`草稿入库失败 draftId=${draftId}: ${(e as Error).message}`)
      throw new BadRequestException(`草稿入库失败: ${(e as Error).message}`)
    } finally {
      await queryRunner.release()
    }
  }

  /**
   * 批量入库——支持 DraftTask 关联
   */
  async promoteDraftsToProducts(dto: PromoteToProductDto): Promise<{
    results: Array<{ draftId: string; spuId: string; spuCode: string; spuName: string; skuIds: string[] }>
    pkgId: string
    totalSpus: number
    totalSkus: number
    taskId?: string
  }> {
    // 更新关联的 DraftTask
    if (dto.taskId) {
      await this.taskRepo.update({ id: dto.taskId }, { status: 'processing', progress: 0 })
    }

    // 创建发布批次
    const pkg = await this.pkgRepo.save({
      id: uid(),
      packageName: dto.packageName || `${new Date().toISOString().slice(0, 10)} 入库批次`,
      draftCount: dto.draftIds.length,
      skuCount: 0,
      status: 'processing',
      publishedBy: 'agent',
    })

    const results: Array<{ draftId: string; spuId: string; spuCode: string; spuName: string; skuIds: string[] }> = []
    let totalSkus = 0
    const errors: Array<string> = []

    for (let i = 0; i < dto.draftIds.length; i++) {
      const draftId = dto.draftIds[i]
      try {
        const result = await this.promoteToProduct(draftId)
        results.push({ draftId, ...result })
        totalSkus += result.skuIds.length

        // 更新任务进度
        if (dto.taskId) {
          await this.taskRepo.update({ id: dto.taskId }, {
            progress: Math.round(((i + 1) / dto.draftIds.length) * 100),
          })
        }
      } catch (e: unknown) {
        errors.push(`${draftId}: ${(e as Error).message}`)
        this.logger.warn(`跳过失败的草稿 ${draftId}: ${(e as Error).message}`)
      }
    }

    // 完成批次
    pkg.skuCount = totalSkus
    pkg.status = errors.length === dto.draftIds.length ? 'failed' : 'completed'
    pkg.errorInfo = errors.length > 0 ? errors.join('; ') : ''
    pkg.publishedAt = new Date()
    await this.pkgRepo.save(pkg)

    // 完成 DraftTask
    if (dto.taskId) {
      const taskStatus = errors.length === 0 ? 'completed' : 'completed'
      await this.taskRepo.update({ id: dto.taskId }, {
        status: taskStatus,
        outputResult: { results: results.map(r => ({ spuId: r.spuId, spuCode: r.spuCode, spuName: r.spuName })), errors: errors.length > 0 ? errors : undefined },
        errorInfo: errors.length > 0 ? errors.join('; ') : undefined,
        completedAt: new Date(),
      })
    }

    this.logger.log(`📦 批量入库完成: ${results.length}/${dto.draftIds.length} 个 SPU, ${totalSkus} 个 SKU${errors.length > 0 ? `, ${errors.length} 个失败` : ''}`)

    return { results, pkgId: pkg.id, totalSpus: results.length, totalSkus, taskId: dto.taskId }
  }

  /**
   * 查询待入库草稿列表（status=reviewed 或 draft，供 Agent 和前端使用）
   */
  async getPendingPromotion(): Promise<{ drafts: DraftSpu[]; total: number }> {
    const drafts = await this.draftSpuRepo.find({
      where: { status: 'reviewed', deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: 50,
    })
    return { drafts, total: drafts.length }
  }

  /** 保留旧 publishDrafts 兼容性：仅改状态，不创建真正 Product */
  /** @deprecated 保留旧接口兼容，实际委托 promoteDraftsToProducts */
  async publishDrafts(dto: PublishDraftDto): Promise<unknown> {
    return this.promoteDraftsToProducts({
      draftIds: dto.draftIds,
      packageName: dto.packageName,
    })
  }

  // ── 内部辅助方法 ──

  private async getStructureInfo(code: string): Promise<{ externalCode: string; shapeCode: string } | null> {
    if (!code) return null
    // 直接按 external_code 查询（新格式: S4844-RND）
    const found = await this.structRepo.findOne({
      where: { externalCode: code },
    })
    if (found) {
      return { externalCode: found.externalCode, shapeCode: found.shapeCode }
    }
    // 尝试 internal_code（旧格式兼容）
    const found2 = await this.structRepo.findOne({
      where: { internalCode: code.toLowerCase() },
    })
    if (found2) {
      return { externalCode: found2.externalCode, shapeCode: found2.shapeCode }
    }
    // 解析 S{宽}{高}-{造型} 格式
    const m = code.match(/^S(\d{2})(\d{2})-(\w+)/)
    if (m) return { externalCode: code, shapeCode: m[3] }
    // 旧格式兼容：S4844R
    const m2 = code.match(/^([A-Za-z])(\d+)/)
    if (m2) return { externalCode: m2[2], shapeCode: '' }
    return { externalCode: code, shapeCode: '' }
  }

  private async generateSpuCode(structureStandardCode: string, structInfo: { externalCode: string; shapeCode: string } | null): Promise<string> {
    // SPU编码 = S{结构标准编码}-{4位序号}，如 S-S4844-RND-0001
    const extCode = structInfo?.externalCode || structureStandardCode
    const prefix = `S-${extCode}-`
    const existing = await this.spuRepo.find({
      where: { spuCode: Like(`${prefix}%`), isDeleted: false },
      order: { spuCode: 'DESC' as const },
    })
    let next = 1
    if (existing.length > 0) {
      const parts = existing[0].spuCode.split('-')
      const last = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(last)) next = last + 1
    }
    return `${prefix}${String(next).padStart(4, '0')}`
  }

  private async generateSpuDisplayName(draft: DraftSpu, structInfo: { externalCode: string; shapeCode: string } | null): Promise<string> {
    if (!structInfo) return draft.spuName
    const seriesName = this.getSeriesChineseName(draft.seriesCode)
    const shapeName = NamingEngine.getShapeName(structInfo.shapeCode)
    return `秒镜 S${structInfo.externalCode} · ${shapeName}${seriesName}系列`
  }

  private getSeriesChineseName(seriesCode?: string): string {
    if (!seriesCode) return ''
    return NamingEngine.getSeriesChineseName(seriesCode)
  }

  async queryPackages(): Promise<DraftPublishBatch[]> {
    return this.pkgRepo.find({ order: { createdAt: 'DESC' }, take: 20 })
  }

  // ========== Advisory Reports ==========

  async createReport(dto: CreateAdvisoryReportDto): Promise<AdvisoryReport> {
    return this.reportRepo.save({
      id: uid(),
      reportName: dto.reportName,
      reportType: dto.reportType,
      queryContext: dto.queryContext || '',
      status: 'pending',
    })
  }

  async queryReports(): Promise<AdvisoryReport[]> {
    return this.reportRepo.find({ order: { createdAt: 'DESC' }, take: 20 })
  }

  // ========== Draft Tasks ==========

  async createTask(taskType: string, referenceId?: string, inputContext?: Record<string, unknown>): Promise<DraftTask> {
    return this.taskRepo.save({
      id: uid(),
      taskType,
      referenceId,
      inputContext,
      status: 'pending',
    })
  }

  async updateTaskStatus(taskId: string, status: string, outputResult?: Record<string, unknown>, errorInfo?: string): Promise<DraftTask> {
    const task = await this.taskRepo.findOneBy({ id: taskId })
    if (!task) throw new NotFoundException('任务不存在')
    Object.assign(task, {
      status,
      outputResult,
      errorInfo,
      completedAt: ['completed', 'failed'].includes(status) ? new Date() : undefined,
    })
    return this.taskRepo.save(task)
  }

  async queryTasks(taskType?: string, status?: string): Promise<DraftTask[]> {
    const where: Record<string, unknown> = {}
    if (taskType) where.taskType = taskType
    if (status) where.status = status
    return this.taskRepo.find({ where, order: { createdAt: 'DESC' }, take: 50 })
  }
}
