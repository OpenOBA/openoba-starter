import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RuleEngineService } from './rule-engine.service'
import { AestheticRule } from './entities/aesthetic-rule.entity'
import { AestheticCompatMatrix } from './entities/aesthetic-compat-matrix.entity'
import { AestheticFeedback } from './entities/aesthetic-feedback.entity'
import { AestheticCheckDto, AestheticCheckResultDto, AestheticBatchCheckDto } from './dto/aesthetics.dto'

@Injectable()
export class AestheticsService {
  constructor(
    private readonly ruleEngine: RuleEngineService,
    @InjectRepository(AestheticRule)
    private ruleRepo: Repository<AestheticRule>,
    @InjectRepository(AestheticCompatMatrix)
    private matrixRepo: Repository<AestheticCompatMatrix>,
    @InjectRepository(AestheticFeedback)
    private feedbackRepo: Repository<AestheticFeedback>,
  ) {}

  async check(dto: AestheticCheckDto): Promise<AestheticCheckResultDto> {
    const ctx = {
      shapeCode: dto.spu.shapeCode,
      seriesCode: dto.spu.seriesCode,
      gender: dto.spu.gender,
      productTier: dto.spu.productTier,
      colorCode: dto.sku.colorCode,
      skinToneEffect: dto.sku.skinToneEffect || '',
      faceShapeEffect: dto.sku.faceShapeEffect || '',
      season: dto.context?.season || '',
    }

    const result = await this.ruleEngine.check(ctx)

    const level = result.errors.length > 0 ? 'block' : result.warnings.length > 0 ? 'warning' : 'pass'

    return {
      level,
      errors: result.errors.map((e) => ({ ...e, severity: 'block' })),
      warnings: result.warnings.map((w) => ({ ...w, severity: 'warn' })),
      tips: result.tips.map((t) => ({ ...t, severity: 'info' })),
      recommendations: result.recommendations,
      ruleSetVersion: '1.0.0',
    }
  }

  async batchCheck(dto: AestheticBatchCheckDto): Promise<{ results: AestheticCheckResultDto[] }> {
    const results = await Promise.all(
      dto.skus.map((sku) =>
        this.check({
          spu: dto.spu,
          sku,
          context: dto.context,
        }),
      ),
    )
    return { results }
  }

  async recordFeedback(data: {
    ruleCode: string
    action: string
    skuContext?: Record<string, unknown>
    spuContext?: Record<string, unknown>
    operatorNote?: string
  }): Promise<void> {
    const feedback = new AestheticFeedback()
    feedback.ruleCode = data.ruleCode
    feedback.action = data.action
    feedback.skuContext = data.skuContext || null
    feedback.spuContext = data.spuContext || null
    feedback.operatorNote = data.operatorNote || null
    await this.feedbackRepo.save(feedback)
  }

  async getRules(): Promise<AestheticRule[]> {
    return this.ruleRepo.find({ where: { status: 'active' }, order: { ruleLevel: 'ASC', ruleCode: 'ASC' } })
  }

  async getMatrices(matrixType?: string): Promise<AestheticCompatMatrix[]> {
    const where: Record<string, unknown> = {}
    if (matrixType) where.matrixType = matrixType
    return this.matrixRepo.find({ where, order: { matrixType: 'ASC', dimA: 'ASC', dimB: 'ASC' } })
  }
}
