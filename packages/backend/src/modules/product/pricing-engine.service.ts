import { Injectable, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common'
import * as crypto from 'crypto'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { ERDLRuleEngine } from '@openoba/core/dist/modules/erdl/core/erdl-rule-engine'
import { ProductSku } from '../product/entity/product-sku.entity'
import { ProductSpu } from '../product/entity/product-spu.entity'
import { CustomerTierPricing } from '../customer/entity/customer-tier-pricing.entity'
import { PriceHistory } from '../product/entity/price-history.entity'
import { MemberLevel } from './entity/member-level.entity'
import { MemberPricingRule } from './entity/member-pricing-rule.entity'
import { Promotion } from '../product/entity/promotion.entity'
import { PromotionSku } from '../product/entity/promotion-sku.entity'
import { ProductTierPricing } from '../product/entity/product-tier-pricing.entity'
import { WholesaleTier } from '../product/entity/wholesale-tier.entity'
import { Customer, CUSTOMER_TYPES } from '../customer/entity/customer.entity'
import { PROMOTION_STATUS } from './product.constants'
import { PricingStrategies, PriceContext, PriceStrategyResult } from './pricing-strategies'

export interface PriceRequest {
  skuId: string
  customerId?: string
  customerType?: string // 'retail' | 'business' | 'partner'
  quantity: number
  promotionCodes?: string[]
}

export interface PriceResult {
  retailPrice: number
  finalPrice: number
  discountAmount: number
  discountReason: string
  discountRefId: string | null
  profitPerUnit: number
  marginPct: number
  warnings: string[]
  // ===== 镜片锚点原则：价格结果携带结构标准编码 =====
  structureStandardCode: string
  productTier: string | null
}

@Injectable()
export class PricingEngineService {
  private readonly logger = new Logger(PricingEngineService.name)

  constructor(
    @InjectRepository(ProductSku) private skuRepo: Repository<ProductSku>,
    @InjectRepository(ProductSpu) private spuRepo: Repository<ProductSpu>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(CustomerTierPricing) private tierPricingRepo: Repository<CustomerTierPricing>,
    @InjectRepository(WholesaleTier) private wholesaleRepo: Repository<WholesaleTier>,
    @InjectRepository(MemberLevel) private memberLevelRepo: Repository<MemberLevel>,
    @InjectRepository(MemberPricingRule) private memberPricingRuleRepo: Repository<MemberPricingRule>,
    @InjectRepository(Promotion) private promoRepo: Repository<Promotion>,
    @InjectRepository(PromotionSku) private promoSkuRepo: Repository<PromotionSku>,
    @InjectRepository(PriceHistory) private priceHistoryRepo: Repository<PriceHistory>,
    @Inject(forwardRef(() => ERDLRuleEngine))
    private readonly erdlRuleEngine?: ERDLRuleEngine,
  ) {
    this.strategies = new PricingStrategies(
      tierPricingRepo,
      wholesaleRepo,
      customerRepo,
      memberLevelRepo,
      memberPricingRuleRepo,
      promoRepo,
      promoSkuRepo,
    )
  }

  private strategies: PricingStrategies

  /**
   * 核心价格计算：统一零售价 → 应用规则 → 最终价
   *
   * B 端逻辑：
   *   有协议价 → 协议价（fixed_price 或 retail_price × 协议折扣率）
   *   无协议价 → 阶梯价 = retail_price × 阶梯折扣率
   *
   * C 端逻辑（TASK-010 重构）：
   *   Step 1: 促销匹配（全 scope 支持：all/category/spu/sku）
   *   Step 2: 会员评估（独立步骤，与促销取最优，不叠加）
   *   Step 3: 优惠券（stackable 判断，满减门槛用原价算）
   *   Step 4: 价格保护（min_price 抛错拦截）
   */
  async calculatePrice(req: PriceRequest): Promise<PriceResult> {
    const sku = await this.skuRepo.findOne({
      where: { skuId: req.skuId, isDeleted: false },
      relations: ['spu'],
    })
    if (!sku) throw new Error(`SKU ${req.skuId} 不存在`)

    const retailPrice = Number(sku.retailPrice)
    const costPrice = sku.costPrice ? Number(sku.costPrice) : 0
    const minPrice = sku.minPrice ? Number(sku.minPrice) : 0
    const warnings: string[] = []

    // ===== 判断 B 端还是 C 端 =====
    let customerType = req.customerType
    let customer: { customerId?: string; customerType?: string; customerLevel?: string } | null = null
    if (req.customerId) {
      customer = await this.customerRepo.findOne({
        where: { customerId: req.customerId },
        select: ['customerId', 'customerType', 'customerLevel'],
      })
      customerType = customer?.customerType || CUSTOMER_TYPES[0]
    }

    // ===== ERDL 规则前置评估（Wow Moment 2: 改规则不重启） =====
    if (this.erdlRuleEngine && process.env.ERDL_ENABLED !== 'false') {
      const erdlContext: Record<string, unknown> = {
        skuId: req.skuId,
        customerId: req.customerId,
        quantity: req.quantity,
        retailPrice,
        costPrice,
        minPrice,
        customer: customer
          ? { tier: customer.customerLevel || 'normal', type: customer.customerType }
          : { tier: 'normal', type: customerType },
      }

      try {
        const erdlResult = await this.erdlRuleEngine.evaluate('Product.price.calculate', erdlContext)
        if (erdlResult.matched && erdlResult.result !== null && erdlResult.result !== undefined) {
          const erdlPrice = typeof erdlResult.result === 'number' ? erdlResult.result : retailPrice
          this.logger.log(`[Pricing] ERDL rule matched: ${erdlResult.ruleName} → ¥${erdlPrice.toFixed(2)}`)
          return this.buildResult(
            retailPrice,
            erdlPrice,
            costPrice,
            `erdl:${erdlResult.ruleName}`,
            null,
            warnings,
            sku.structureStandardCode,
            sku.productTier || null,
          )
        }
      } catch (error) {
        this.logger.warn(
          `[Pricing] ERDL rule evaluation failed, falling back to hardcoded logic: ${(error as Error).message}`,
        )
      }
    }

    // ===== 原有硬编码逻辑（ERDL fallback） =====
    if (customerType === CUSTOMER_TYPES[1] || customerType === CUSTOMER_TYPES[2]) {
      return this.calcB2BPrice(retailPrice, costPrice, minPrice, req, sku, warnings)
    }

    return this.calcB2CPrice(retailPrice, costPrice, minPrice, req, sku, warnings)
  }

  /** B 端价格计算 — 策略链委托 */
  private async calcB2BPrice(
    retailPrice: number,
    costPrice: number,
    minPrice: number,
    req: PriceRequest,
    sku: ProductSku,
    warnings: string[],
  ): Promise<PriceResult> {
    const ctx: PriceContext = {
      sku,
      retailPrice,
      costPrice,
      minPrice,
      customerId: req.customerId,
      customerType: req.customerType,
      quantity: req.quantity,
      warnings,
    }

    // 策略 1: BasePrice (协议价)
    let result = await this.strategies.calcB2BBasePrice(ctx)

    // 策略 2: TierDiscount (客户 wholesale_tier)
    if (result.discountReason === 'none') {
      result = await this.strategies.calcB2BTierDiscount(ctx, result)
    }

    // 策略 3: BulkDiscount (数量阶梯)
    if (result.discountReason === 'none') {
      result = await this.strategies.calcB2BBulkDiscount(ctx, result)
    }

    // 策略 7: FloorCheck (最低价保护)
    const floorCheck = this.strategies.applyFloorCheck(result.finalPrice, minPrice, costPrice, warnings)

    return this.buildResult(
      retailPrice,
      floorCheck.finalPrice,
      costPrice,
      result.discountReason,
      result.discountRefId,
      warnings,
      sku.structureStandardCode,
      sku.productTier || null,
    )
  }

  /**
   * C 端价格计算 — 策略链委托
   * Step 1: 促销匹配 → Step 2: 会员评估 → Step 3: 优惠券 → Step 4: 价格保护
   */
  private async calcB2CPrice(
    retailPrice: number,
    costPrice: number,
    minPrice: number,
    req: PriceRequest,
    sku: ProductSku,
    warnings: string[],
  ): Promise<PriceResult> {
    const ctx: PriceContext = {
      sku,
      retailPrice,
      costPrice,
      minPrice,
      customerId: req.customerId,
      customerType: req.customerType,
      quantity: req.quantity,
      promotionCodes: req.promotionCodes,
      warnings,
    }
    const now = new Date()

    // ===== Step 1: 查找有效促销活动 =====
    const { promoPrice, bestPromo } = await this.strategies.findPromotionPrice(ctx, now)

    // ===== Step 2: 会员评估（独立步骤，B 端不享受会员价） =====
    const { memberPrice, memberLevel } = await this.strategies.calcMemberDiscount(ctx, retailPrice)

    // 促销价和会员价取最优（不叠加）
    let bestBasePrice = retailPrice
    let discountReason = 'none'
    let discountRefId: string | null = null

    if (promoPrice !== null && memberPrice !== null) {
      if (promoPrice <= memberPrice) {
        bestBasePrice = promoPrice
        discountReason = 'promotion'
        discountRefId = bestPromo!.promotionId
      } else {
        bestBasePrice = memberPrice
        discountReason = 'member'
        discountRefId = memberLevel!.levelId
      }
    } else if (promoPrice !== null) {
      bestBasePrice = promoPrice
      discountReason = 'promotion'
      discountRefId = bestPromo!.promotionId
    } else if (memberPrice !== null) {
      bestBasePrice = memberPrice
      discountReason = 'member'
      discountRefId = memberLevel!.levelId
    }

    // ===== Step 3: 优惠券 =====
    const couponResult = await this.strategies.applyCoupon(
      bestBasePrice,
      bestPromo,
      discountReason,
      discountRefId,
      ctx,
      now,
    )
    bestBasePrice = couponResult.finalPrice
    discountReason = couponResult.discountReason
    discountRefId = couponResult.discountRefId

    const finalPrice = bestBasePrice

    // ===== Step 4: 价格保护 =====
    if (minPrice > 0 && finalPrice < minPrice) {
      throw new BadRequestException(
        `价格低于最低售价：计算价 ¥${finalPrice.toFixed(2)} < 最低价 ¥${minPrice.toFixed(2)}（SKU: ${req.skuId}）`,
      )
    }

    const floorCheck = this.strategies.applyFloorCheck(finalPrice, minPrice, costPrice, warnings)

    return this.buildResult(
      retailPrice,
      floorCheck.finalPrice,
      costPrice,
      discountReason,
      discountRefId,
      warnings,
      sku.structureStandardCode,
      sku.productTier || null,
    )
  }

  /** 构建价格结果 */
  private buildResult(
    retailPrice: number,
    finalPrice: number,
    costPrice: number,
    discountReason: string,
    discountRefId: string | null,
    warnings: string[],
    structureStandardCode: string,
    productTier: string | null,
  ): PriceResult {
    const roundedFinal = parseFloat(finalPrice.toFixed(2))
    if (roundedFinal < costPrice && costPrice > 0) {
      warnings.push(`价格 ¥${roundedFinal.toFixed(2)} 低于成本价 ¥${costPrice.toFixed(2)}，请人工审核`)
    }
    const discountAmount = parseFloat((retailPrice - roundedFinal).toFixed(2))
    const profitPerUnit = parseFloat((roundedFinal - costPrice).toFixed(2))
    const marginPct = roundedFinal > 0 ? parseFloat(((profitPerUnit / roundedFinal) * 100).toFixed(2)) : 0

    return {
      retailPrice,
      finalPrice: roundedFinal,
      discountAmount,
      discountReason,
      discountRefId,
      profitPerUnit,
      marginPct,
      warnings,
      structureStandardCode,
      productTier,
    }
  }

  /** 价格变更历史记录 */
  async recordPriceChange(
    skuId: string,
    priceType: string,
    oldValue: number | null,
    newValue: number,
    reason?: string,
    changedBy?: string,
  ) {
    const history = this.priceHistoryRepo.create({
      historyId: `ph-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`,
      skuId,
      priceType,
      oldValue,
      newValue,
      changeReason: reason,
      changedBy,
    })
    return this.priceHistoryRepo.save(history)
  }

  /** TASK-010: 获取会员等级列表 */
  async getMemberLevels() {
    return this.memberLevelRepo.find({ order: { sortOrder: 'ASC' } })
  }
}
