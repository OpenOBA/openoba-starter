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
  // ===== 镜片锚点原则：价格结果携带结构标准编�?=====
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
    // ERDL 规则引擎注入（可选，ERDL 模块未加载时 fallback 到原有逻辑�?
    @Inject(forwardRef(() => ERDLRuleEngine))
    private readonly erdlRuleEngine?: ERDLRuleEngine,
  ) {}

  /**
   * 核心价格计算：统一零售�?�?应用规则 �?最终价
   *
   * B 端逻辑�?
   *   有协�?�?协议价（fixed_price �?retail_price × 协议折扣率）
   *   无协�?�?阶梯�?= retail_price × 阶梯折扣�?
   *
   * C 端逻辑（TASK-010 重构）：
   *   Step 1: 促销匹配（全 scope 支持：all/category/spu/sku�?
   *   Step 2: 会员评估（独立步骤，与促销取最优，不叠加）
   *   Step 3: 优惠券（stackable 判断，满减门槛用原价算）
   *   Step 4: 价格保护�? min_price 抛错拦截�?
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

    // ===== 判断 B 端还�?C �?=====
    let customerType = req.customerType
    let customer: { customerId?: string; customerType?: string; customerLevel?: string } | null = null
    if (req.customerId) {
      customer = await this.customerRepo.findOne({
        where: { customerId: req.customerId },
        select: ['customerId', 'customerType', 'customerLevel'],
      })
      customerType = customer?.customerType || CUSTOMER_TYPES[0]
    }

    // ===== ERDL 规则前置评估（Wow Moment 2: 改规则不重启�?====
    // ERDL 规则优先�?> 硬编码逻辑；ERDL 未命�?�?自动降级到原有逻辑
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
          this.logger.log(`[Pricing] ERDL rule matched: ${erdlResult.ruleName} �?¥${erdlPrice.toFixed(2)}`)
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
        this.logger.warn(`[Pricing] ERDL rule evaluation failed, falling back to hardcoded logic: ${error.message}`)
      }
    }

    // ===== 原有硬编码逻辑（ERDL fallback�?====
    if (customerType === CUSTOMER_TYPES[1] || customerType === CUSTOMER_TYPES[2]) {
      return this.calcB2BPrice(retailPrice, costPrice, minPrice, req, sku, warnings)
    }

    return this.calcB2CPrice(retailPrice, costPrice, minPrice, req, sku, warnings)
  }

  /** B 端价格计�?*/
  private async calcB2BPrice(
    retailPrice: number,
    costPrice: number,
    minPrice: number,
    req: PriceRequest,
    sku: ProductSku,
    warnings: string[],
  ): Promise<PriceResult> {
    let finalPrice = retailPrice
    let discountReason = 'none'
    let discountRefId: string | null = null
    const now = new Date()

    // 1. 查找客户协议价（区分全部 SKU vs 特定 SKU，检查有效期�?
    if (req.customerId) {
      let pricing = await this.tierPricingRepo.findOne({
        where: {
          customerId: req.customerId,
          productSkuId: req.skuId,
          isActive: true,
          isDeleted: false,
        },
        order: { createdAt: 'DESC' },
      })

      if (!pricing) {
        pricing = await this.tierPricingRepo
          .createQueryBuilder('tp')
          .where('tp.customer_id = :cid', { cid: req.customerId })
          .andWhere('tp.product_sku_id IS NULL')
          .andWhere('tp.is_active = 1')
          .andWhere('tp.is_deleted = 0')
          .orderBy('tp.created_at', 'DESC')
          .getOne()
      }

      if (pricing) {
        const isInRange =
          (!pricing.agreementStart || new Date(pricing.agreementStart) <= now) &&
          (!pricing.agreementEnd || new Date(pricing.agreementEnd) >= now)

        if (isInRange) {
          if (pricing.pricingMode === 'fixed' && pricing.fixedPrice) {
            finalPrice = Number(pricing.fixedPrice)
            discountReason = 'agreement'
            discountRefId = pricing.pricingId
          } else if (pricing.discountRate) {
            finalPrice = retailPrice * Number(pricing.discountRate)
            discountReason = 'agreement'
            discountRefId = pricing.pricingId
          }
        }
      }
    }

    // 2. 无协�?�?按客�?wholesale_tier 匹配阶梯�?
    if (discountReason === 'none' && req.customerId) {
      const customer = await this.customerRepo.findOne({
        where: { customerId: req.customerId },
        select: ['customerId', 'wholesaleTier'],
      })
      if (customer?.wholesaleTier) {
        const tier = await this.wholesaleRepo
          .createQueryBuilder('wt')
          .where('wt.tier_code = :tier', { tier: customer.wholesaleTier })
          .andWhere('wt.is_active = 1')
          .getOne()
        if (tier) {
          finalPrice = retailPrice * Number(tier.discountRate)
          discountReason = 'wholesale'
          discountRefId = tier.tierId
        }
      }
    }

    // 3. 无协议且�?wholesale_tier �?按数量匹配阶梯价
    if (discountReason === 'none') {
      const tier = await this.matchWholesaleTier(req.quantity)
      if (tier) {
        finalPrice = retailPrice * Number(tier.discountRate)
        discountReason = 'wholesale'
        discountRefId = tier.tierId
      }
    }

    // 4. 最低价保护
    if (minPrice > 0 && finalPrice < minPrice) {
      warnings.push(`B 端价�?¥${finalPrice.toFixed(2)} 低于最低售�?¥${minPrice.toFixed(2)}`)
    }

    return this.buildResult(
      retailPrice,
      finalPrice,
      costPrice,
      discountReason,
      discountRefId,
      warnings,
      sku.structureStandardCode,
      sku.productTier || null,
    )
  }

  /**
   * C 端价格计�?�?TASK-010 重构�?
   * C 端价格计�?�?TASK-010 重构�?
   * Step 1: 促销匹配 �?Step 2: 会员评估 �?Step 3: 优惠�?�?Step 4: 价格保护
   */
  private async calcB2CPrice(
    retailPrice: number,
    costPrice: number,
    minPrice: number,
    req: PriceRequest,
    sku: ProductSku,
    warnings: string[],
  ): Promise<PriceResult> {
    const now = new Date()

    // ===== Step 1: 查找有效促销活动 =====
    let promoPrice: number | null = null
    let bestPromo: Promotion | null = null

    const activePromos = await this.findActivePromotions(req.skuId, sku.spuId, now)
    const eligiblePromos = activePromos.filter((p) => !p.minAmount || retailPrice * req.quantity >= Number(p.minAmount))

    if (eligiblePromos.length > 0) {
      // 取最优促销�?
      let bestPrice = retailPrice
      for (const p of eligiblePromos) {
        let price = this.calcPromoPrice(p, retailPrice)
        if (p.maxDiscount) {
          price = Math.max(price, retailPrice - Number(p.maxDiscount))
        }
        if (price < bestPrice) {
          bestPrice = price
          bestPromo = p
        }
      }
      if (bestPromo) {
        promoPrice = bestPrice
      }
    }

    // ===== Step 2: 会员评估（独立步骤，B 端不享受会员价） =====
    let memberPrice: number | null = null
    let memberLevel: MemberLevel | null = null

    if (req.customerId && sku) {
      memberLevel = await this.findMemberLevel(req.customerId)
      if (memberLevel) {
        // 方案 C：优先查询会员定价规则（等级×SKU 特殊折扣�?
        const memberRulePrice = await this.findMemberPricingForSku(
          sku.skuId,
          memberLevel.levelCode,
          retailPrice,
          req.quantity,
        )
        if (memberRulePrice) {
          memberPrice = memberRulePrice.price
        } else {
          // Fallback：使用等级默认折�?
          memberPrice = retailPrice * Number(memberLevel.discountRate)
        }
      }
    }

    // 促销价和会员价取最优（不叠加）
    let bestBasePrice = retailPrice
    let discountReason = 'none'
    let discountRefId: string | null = null

    if (promoPrice !== null && memberPrice !== null) {
      // 两者都有，取更�?
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

    // ===== Step 3: 优惠�?=====
    if (req.promotionCodes && req.promotionCodes.length > 0) {
      const coupon = await this.findBestCoupon(req.promotionCodes, retailPrice, req.quantity, now)
      if (coupon) {
        let couponPrice = bestBasePrice
        if (coupon.discountType === 'fixed_amount') {
          couponPrice = bestBasePrice - Number(coupon.discountValue)
        } else if (coupon.discountType === 'percent') {
          // H4：当前基�?bestBasePrice（可能已有促销折扣），如需基于原价改为 retailPrice
          // TODO-PRODUCT: 确认业务规则 �?percent优惠应在原价还是当前最优价上计�?
          couponPrice = bestBasePrice * (Number(coupon.discountValue) / 100)
        }

        // max_discount 上限
        if (coupon.maxDiscount) {
          couponPrice = Math.max(couponPrice, bestBasePrice - Number(coupon.maxDiscount))
        }

        if (couponPrice > 0 && couponPrice < bestBasePrice) {
          // stackable 判断
          if (bestPromo?.stackable || discountReason === 'member') {
            // 可叠加：直接在当前价格上应用�?
            bestBasePrice = couponPrice
            discountReason = discountReason === 'none' ? 'coupon' : `${discountReason}+coupon`
            discountRefId = coupon.promotionId
          } else {
            // 不可叠加：取最�?
            if (couponPrice < bestBasePrice) {
              bestBasePrice = couponPrice
              discountReason = 'coupon'
              discountRefId = coupon.promotionId
            }
          }
        }
      }
    }

    const finalPrice = bestBasePrice

    // ===== Step 4: 价格保护 =====
    if (minPrice > 0 && finalPrice < minPrice) {
      throw new BadRequestException(
        `价格低于最低售价：计算�?¥${finalPrice.toFixed(2)} < 最低价 ¥${minPrice.toFixed(2)}（SKU: ${req.skuId}）`,
      )
    }

    if (finalPrice < 0.01) {
      return this.buildResult(
        retailPrice,
        0.01,
        costPrice,
        discountReason,
        discountRefId,
        warnings,
        sku.structureStandardCode,
        sku.productTier || null,
      )
    }

    return this.buildResult(
      retailPrice,
      finalPrice,
      costPrice,
      discountReason,
      discountRefId,
      warnings,
      sku.structureStandardCode,
      sku.productTier || null,
    )
  }

  /** 计算促销价格 */
  private calcPromoPrice(promo: Promotion, retailPrice: number): number {
    // 如果�?sku 级别且有 custom_price，直接用 custom_price
    // （custom_price �?findActivePromotions 中已注入�?extra 字段�?
    if (promo.extra?.customPrice) {
      return Number(promo.extra.customPrice)
    }

    if (promo.discountType === 'percent') {
      return retailPrice * (Number(promo.discountValue) / 100)
    }
    // fixed_amount
    return retailPrice - Number(promo.discountValue)
  }

  /** 查找当前有效的促销活动（全 scope 支持 + custom_price�?*/
  private async findActivePromotions(skuId: string, spuId: string | undefined, now: Date) {
    // 查询所有有效促销（status=active 且在有效期内�?
    const promos = await this.promoRepo
      .createQueryBuilder('p')
      .where('p.status = :status', { status: PROMOTION_STATUS.active })
      .andWhere('p.start_time <= :now', { now })
      .andWhere('p.end_time >= :now', { now })
      .andWhere('(p.total_limit IS NULL OR p.used_count < p.total_limit)')
      .orderBy('p.priority', 'DESC')
      .getMany()

    // H07修复：移除只读查询中的副作用（过期标记应由定时任务处理）
    // 不在查询中修改促销状态，保持读写分离

    // 获取 SKU 对应�?promotion_sku custom_price
    const promoSkus = await this.promoSkuRepo.find({
      where: { skuId },
    })
    const customPriceMap = new Map<string, number>()
    for (const ps of promoSkus) {
      if (ps.customPrice) {
        customPriceMap.set(ps.promotionId, Number(ps.customPrice))
      }
    }

    // 过滤出适用于当�?SKU 的促销
    return promos.filter((p) => {
      if (p.scope === 'all') {
        if (customPriceMap.has(p.promotionId)) {
          p.extra = { ...(p.extra || {}), customPrice: customPriceMap.get(p.promotionId) }
        }
        return true
      }
      if (p.scope === 'sku' && p.scopeIds) {
        if (p.scopeIds.includes(skuId)) {
          if (customPriceMap.has(p.promotionId)) {
            p.extra = { ...(p.extra || {}), customPrice: customPriceMap.get(p.promotionId) }
          }
          return true
        }
        return false
      }
      if (p.scope === 'spu' && p.scopeIds && spuId) {
        return p.scopeIds.includes(spuId)
      }
      // category scope 需要通过 SPU �?categoryId 判断
      if (p.scope === 'category' && p.scopeIds) {
        // category scope 依赖 SPU �?category，这里简化处理：
        // 通过 SPU relation 已经加载�?spu.category，可以在调用方处�?
        return false // 留空，由 findActivePromotionsWithCategory 扩展
      }
      return false
    })
  }

  /** 查找会员等级 */
  private async findMemberLevel(customerId: string): Promise<MemberLevel | null> {
    const customer = await this.customerRepo.findOne({
      where: { customerId },
      select: ['customerId', 'customerLevel', 'customerType'],
    })
    if (!customer?.customerLevel) return null

    // B 端客户不享受 C 端会员价
    if (customer.customerType && customer.customerType !== CUSTOMER_TYPES[0]) return null

    return this.memberLevelRepo.findOne({
      where: {
        levelCode: customer.customerLevel,
        isActive: true,
      },
    })
  }

  /**
   * 查找会员定价规则（优先于等级默认折扣�?
   * 返回规则中计算的会员价，若有规则则用规则，无规则返回 null
   */
  async findMemberPricingForSku(skuId: string, levelCode: string, retailPrice: number, quantity: number): Promise<{ price: number; reason: string; ruleId: string } | null> {
    const now = new Date()
    const rules = await this.memberPricingRuleRepo
      .createQueryBuilder('r')
      .where('r.level_code = :levelCode', { levelCode })
      .andWhere('r.sku_id = :skuId', { skuId })
      .andWhere('r.is_active = TRUE')
      .andWhere('r.min_quantity <= :qty', { qty: quantity })
      .andWhere('(r.start_time IS NULL OR r.start_time <= :now)', { now })
      .andWhere('(r.end_time IS NULL OR r.end_time >= :now)', { now })
      .orderBy('r.priority', 'DESC')
      .getMany()

    if (!rules.length) return null

    const rule = rules[0] // 优先级最高的
    let price = retailPrice

    switch (rule.ruleType) {
      case 'fixed_price':
        if (rule.fixedPrice !== null && rule.fixedPrice > 0) {
          price = Number(rule.fixedPrice)
          return { price, reason: 'member', ruleId: rule.ruleId }
        }
        break
      case 'discount':
        if (rule.discountRate !== null && rule.discountRate > 0) {
          price = retailPrice * Number(rule.discountRate)
          return { price, reason: 'member', ruleId: rule.ruleId }
        }
        break
      case 'extra_discount':
        if (rule.extraDiscount !== null && rule.extraDiscount > 0) {
          // 额外折扣：在等级默认折扣基础上再打折
          const defaultLevel = await this.memberLevelRepo.findOne({ where: { levelCode, isActive: true } })
          if (defaultLevel) {
            price = retailPrice * Number(defaultLevel.discountRate) * Number(rule.extraDiscount)
            return { price, reason: 'member', ruleId: rule.ruleId }
          }
        }
        break
    }

    return null
  }

  /** 查找最优可用优惠券 */
  private async findBestCoupon(codes: string[], retailPrice: number, quantity: number, now: Date): Promise<Promotion | null> {
    if (!codes.length) return null

    const coupons = await this.promoRepo
      .createQueryBuilder('p')
      .where('p.status = :status', { status: PROMOTION_STATUS.active })
      .andWhere('p.type = :type', { type: 'coupon' })
      .andWhere('p.start_time <= :now', { now })
      .andWhere('p.end_time >= :now', { now })
      .andWhere('(p.total_limit IS NULL OR p.used_count < p.total_limit)')
      .getMany()

    // 匹配 code（不区分大小写）
    const upperCodes = codes.map((c) => c.toUpperCase())
    const matched = coupons.filter((c) => {
      if (!c.promotionCode) return false
      return upperCodes.includes(c.promotionCode.toUpperCase())
    })
    if (!matched.length) return null

    // 校验满减门槛：用 retailPrice × quantity（原价算门槛�?
    const meetsThreshold = matched.filter((c) => !c.minAmount || retailPrice * quantity >= Number(c.minAmount))
    if (!meetsThreshold.length) return null

    // 取优惠力度最大的
    return meetsThreshold.sort((a, b) => {
      const priceA =
        a.discountType === 'fixed_amount' ? retailPrice - Number(a.discountValue) : retailPrice * (Number(a.discountValue) / 100)
      const priceB =
        b.discountType === 'fixed_amount' ? retailPrice - Number(b.discountValue) : retailPrice * (Number(b.discountValue) / 100)
      return priceA - priceB // 价格越低越优�?
    })[0]
  }

  /** 匹配批发阶梯 */
  private async matchWholesaleTier(quantity: number) {
    return this.wholesaleRepo
      .createQueryBuilder('wt')
      .where('wt.is_active = 1')
      .andWhere('wt.min_quantity <= :qty', { qty: quantity })
      .andWhere('(wt.max_quantity IS NULL OR wt.max_quantity >= :qty)', { qty: quantity })
      .orderBy('wt.min_quantity', 'DESC')
      .getOne()
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
    // H10修复：价格不低于成本价，低于时发出警�?
    if (roundedFinal < costPrice && costPrice > 0) {
      warnings.push(`价格 ¥${roundedFinal.toFixed(2)} 低于成本�?¥${costPrice.toFixed(2)}，请人工审核`)
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