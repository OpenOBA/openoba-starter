import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AestheticRule } from './entities/aesthetic-rule.entity'
import { AestheticCompatMatrix } from './entities/aesthetic-compat-matrix.entity'

interface RuleResult {
  ruleCode: string
  ruleName: string
  message: string
  severity: 'block' | 'warn' | 'info'
}

interface CompatibilityRecommendation {
  type: string
  current: string
  suggested: string
  reason: string
}

interface CheckContext {
  shapeCode: string
  seriesCode: string
  gender: string
  colorCode: string
  skinToneEffect: string
  faceShapeEffect: string
  productTier?: string
  season?: string
}

@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name)
  private rulesCache: AestheticRule[] | null = null
  private matricesCache = new Map<string, Map<string, Map<string, { compatibility: string; reason: string }>>>()
  private lastCacheTime = 0
  private readonly CACHE_TTL = 60000

  constructor(
    @InjectRepository(AestheticRule)
    private ruleRepo: Repository<AestheticRule>,
    @InjectRepository(AestheticCompatMatrix)
    private matrixRepo: Repository<AestheticCompatMatrix>,
  ) {}

  async check(context: CheckContext): Promise<{
    errors: RuleResult[]
    warnings: RuleResult[]
    tips: RuleResult[]
    recommendations: CompatibilityRecommendation[]
  }> {
    await this.ensureCache()
    const errors: RuleResult[] = []
    const warnings: RuleResult[] = []
    const tips: RuleResult[] = []
    const recommendations: CompatibilityRecommendation[] = []

    // Execute rules in order: L4 (validate) → L1 (block) → L2 (warn) → L3 (suggest)
    const rules = this.rulesCache!

    // L4: Validate rules
    for (const rule of rules.filter((r) => r.ruleLevel === 'L4')) {
      const result = await this.executeValidateRule(rule, context)
      if (result) {
        errors.push(result)
      }
    }

    // L1: Block rules
    for (const rule of rules.filter((r) => r.ruleLevel === 'L1')) {
      const result = await this.executeBlockRule(rule, context)
      if (result) {
        errors.push(result)
      }
    }

    // L2: Warning rules
    for (const rule of rules.filter((r) => r.ruleLevel === 'L2')) {
      const result = await this.executeWarnRule(rule, context)
      if (result) {
        warnings.push(result)
      }
    }

    // L3: Suggest rules
    for (const rule of rules.filter((r) => r.ruleLevel === 'L3')) {
      const result = this.executeSuggestRule(rule, context)
      if (result) {
        tips.push(result)
      }
      // Check for recommendations
      const recs = this.generateRecommendations(rule, context)
      recommendations.push(...recs)
    }

    return { errors, warnings, tips, recommendations }
  }

  private async ensureCache(): Promise<void> {
    const now = Date.now()
    if (this.rulesCache && this.matricesCache.size > 0 && now - this.lastCacheTime < this.CACHE_TTL) {
      return
    }

    this.rulesCache = await this.ruleRepo.find({ where: { status: 'active' } })
    const matrices = await this.matrixRepo.find()

    this.matricesCache.clear()
    for (const m of matrices) {
      if (!this.matricesCache.has(m.matrixType)) {
        this.matricesCache.set(m.matrixType, new Map())
      }
      const dimAMap = this.matricesCache.get(m.matrixType)!
      if (!dimAMap.has(m.dimA)) {
        dimAMap.set(m.dimA, new Map())
      }
      const dimBMap = dimAMap.get(m.dimA)!
      dimBMap.set(m.dimB, {
        compatibility: m.compatibility,
        reason: m.reason,
      })
    }

    this.lastCacheTime = now
  }

  private async executeValidateRule(rule: AestheticRule, ctx: CheckContext): Promise<RuleResult | null> {
    const config = (rule.config || {}) as Record<string, unknown>
    const required = (config.required as string[]) || []
    for (const field of required) {
      const value = ctx[field as keyof CheckContext] as string
      if (!value || value.trim() === '') {
        return {
          ruleCode: rule.ruleCode,
          ruleName: rule.ruleName,
          message: `"${field}"不能为空`,
          severity: 'block',
        }
      }
    }
    return null
  }

  private async executeBlockRule(rule: AestheticRule, ctx: CheckContext): Promise<RuleResult | null> {
    const config = (rule.config || {}) as Record<string, unknown>

    // R001: shape_face incompatible check
    if (config.matrix === 'shape_face' && config.check === 'shape_face') {
      return this.checkMatrix('shape_face', ctx.shapeCode, ctx.faceShapeEffect, rule, 'incompatible')
    }

    // R002: color_skin incompatible check
    if (config.matrix === 'color_skin' && config.check === 'color_skin') {
      return this.checkMatrix('color_skin', ctx.colorCode, ctx.skinToneEffect, rule, 'incompatible')
    }

    // R003: shape-gender conflict
    if (config.check === 'shape_face' && rule.ruleCode === 'R003') {
      const incompatiblePairs = (config.incompatible as Array<{ shape: string; gender: string }>) || []
      for (const pair of incompatiblePairs) {
        if (ctx.shapeCode === pair.shape && ctx.gender === pair.gender) {
          return {
            ruleCode: rule.ruleCode,
            ruleName: rule.ruleName,
            message: `"${ctx.shapeCode}"形状不推荐"${ctx.gender}"款式`,
            severity: 'block',
          }
        }
      }
    }

    // R004: shape_series incompatible
    if (config.matrix === 'shape_series') {
      return this.checkMatrix('shape_series', ctx.shapeCode, ctx.seriesCode, rule, 'incompatible')
    }

    // R005: color_series incompatible
    if (config.matrix === 'color_series') {
      return this.checkMatrix('color_series', ctx.colorCode, ctx.seriesCode, rule, 'incompatible')
    }

    return null
  }

  private async executeWarnRule(rule: AestheticRule, ctx: CheckContext): Promise<RuleResult | null> {
    const config = rule.config || {}

    if (config.matrix === 'shape_face' && config.warn_on === 'warning') {
      return this.checkMatrix('shape_face', ctx.shapeCode, ctx.faceShapeEffect, rule, 'warning')
    }

    if (config.matrix === 'color_series' && config.warn_on === 'warning') {
      return this.checkMatrix('color_series', ctx.colorCode, ctx.seriesCode, rule, 'warning')
    }

    return null
  }

  private executeSuggestRule(rule: AestheticRule, ctx: CheckContext): RuleResult | null {
    return {
      ruleCode: rule.ruleCode,
      ruleName: rule.ruleName,
      message: `建议：${rule.description}`,
      severity: 'info',
    }
  }

  private generateRecommendations(rule: AestheticRule, ctx: CheckContext): CompatibilityRecommendation[] {
    const config = rule.config || {}
    const recs: CompatibilityRecommendation[] = []

    // R020: Best effect recommendation
    if (config.source === 'sku_effect_recommend') {
      const betterShapes = this.findBetterAlternatives('shape_face', ctx.shapeCode, ctx.faceShapeEffect)
      if (betterShapes.length > 0) {
        recs.push({
          type: 'face_shape_effect',
          current: ctx.faceShapeEffect,
          suggested: betterShapes[0],
          reason: `推荐替换效果词以获得更好搭配`,
        })
      }
    }

    return recs
  }

  private checkMatrix(
    matrixType: string,
    dimA: string,
    dimB: string,
    rule: AestheticRule,
    targetCompat: string,
  ): RuleResult | null {
    if (!dimA || !dimB) return null

    const dimAMap = this.matricesCache.get(matrixType)
    if (!dimAMap) return null

    const dimBMap = dimAMap.get(dimA)
    if (!dimBMap) return null

    const entry = dimBMap.get(dimB)
    if (!entry) return null

    if (entry.compatibility === targetCompat) {
      return {
        ruleCode: rule.ruleCode,
        ruleName: rule.ruleName,
        message: `${entry.reason || `"${dimA}"与"${dimB}"${targetCompat === 'incompatible' ? '不兼容' : '非最优'}`}`,
        severity: targetCompat === 'incompatible' ? 'block' : 'warn',
      }
    }

    return null
  }

  private findBetterAlternatives(matrixType: string, dimA: string, dimB: string): string[] {
    if (!dimA || !dimB) return []

    const dimAMap = this.matricesCache.get(matrixType)
    if (!dimAMap) return []

    const results: string[] = []
    const dimBMap2 = dimAMap.get(dimA)
    if (!dimBMap2) return []
    for (const [altB, entry] of dimBMap2.entries()) {
      if (altB !== dimB && entry.compatibility === 'compatible') {
        results.push(altB)
      }
    }
    return results
  }
}
