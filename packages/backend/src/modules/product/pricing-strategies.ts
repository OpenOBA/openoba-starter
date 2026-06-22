import { Repository } from 'typeorm'
import { ProductSku } from '../product/entity/product-sku.entity'
import { Customer } from '../customer/entity/customer.entity'
import { CustomerTierPricing } from '../customer/entity/customer-tier-pricing.entity'
import { MemberLevel } from './entity/member-level.entity'
import { MemberPricingRule } from './entity/member-pricing-rule.entity'
import { Promotion } from './entity/promotion.entity'
import { PromotionSku } from './entity/promotion-sku.entity'
import { WholesaleTier } from './entity/wholesale-tier.entity'
import { CUSTOMER_TYPES } from '../customer/entity/customer.entity'
import { PROMOTION_STATUS } from './product.constants'

export interface PriceContext {
  sku: ProductSku
  retailPrice: number
  costPrice: number
  minPrice: number
  customerId?: string
  customerType?: string
  quantity: number
  promotionCodes?: string[]
  warnings: string[]
}

export interface PriceStrategyResult {
  finalPrice: number
  discountReason: string
  discountRefId: string | null
}

/**
 * 7 个定价策略实现 — 从 PricingEngineService 提取
 */
export class PricingStrategies {
  constructor(
    private readonly tierPricingRepo: Repository<CustomerTierPricing>,
    private readonly wholesaleRepo: Repository<WholesaleTier>,
    private readonly customerRepo: Repository<Customer>,
    private readonly memberLevelRepo: Repository<MemberLevel>,
    private readonly memberPricingRuleRepo: Repository<MemberPricingRule>,
    private readonly promoRepo: Repository<Promotion>,
    private readonly promoSkuRepo: Repository<PromotionSku>,
  ) {}

  // ===== 策略 1: B 端基础价格 (BasePrice) =====
  async calcB2BBasePrice(ctx: PriceContext): Promise<PriceStrategyResult> {
    let finalPrice = ctx.retailPrice
    let discountReason = 'none'
    let discountRefId: string | null = null
    const now = new Date()

    if (ctx.customerId) {
      let pricing = await this.tierPricingRepo.findOne({
        where: {
          customerId: ctx.customerId,
          productSkuId: ctx.sku.skuId,
          isActive: true,
          isDeleted: false,
        },
        order: { createdAt: 'DESC' },
      })

      if (!pricing) {
        pricing = await this.tierPricingRepo
          .createQueryBuilder('tp')
          .where('tp.customer_id = :cid', { cid: ctx.customerId })
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
            finalPrice = ctx.retailPrice * Number(pricing.discountRate)
            discountReason = 'agreement'
            discountRefId = pricing.pricingId
          }
        }
      }
    }

    return { finalPrice, discountReason, discountRefId }
  }

  // ===== 策略 2: B 端批发阶梯价 (TierDiscount) =====
  async calcB2BTierDiscount(ctx: PriceContext, baseResult: PriceStrategyResult): Promise<PriceStrategyResult> {
    if (baseResult.discountReason !== 'none' || !ctx.customerId) return baseResult

    const customer = await this.customerRepo.findOne({
      where: { customerId: ctx.customerId },
      select: ['customerId', 'wholesaleTier'],
    })
    if (customer?.wholesaleTier) {
      const tier = await this.wholesaleRepo
        .createQueryBuilder('wt')
        .where('wt.tier_code = :tier', { tier: customer.wholesaleTier })
        .andWhere('wt.is_active = 1')
        .getOne()
      if (tier) {
        return {
          finalPrice: ctx.retailPrice * Number(tier.discountRate),
          discountReason: 'wholesale',
          discountRefId: tier.tierId,
        }
      }
    }
    return baseResult
  }

  // ===== 策略 3: B 端数量阶梯价 (BulkDiscount) =====
  async calcB2BBulkDiscount(ctx: PriceContext, baseResult: PriceStrategyResult): Promise<PriceStrategyResult> {
    if (baseResult.discountReason !== 'none') return baseResult

    const tier = await this.matchWholesaleTier(ctx.quantity)
    if (tier) {
      return {
        finalPrice: ctx.retailPrice * Number(tier.discountRate),
        discountReason: 'wholesale',
        discountRefId: tier.tierId,
      }
    }
    return baseResult
  }

  // ===== 策略 4: C 端会员价 (MemberDiscount) =====
  async calcMemberDiscount(
    ctx: PriceContext,
    basePrice: number,
  ): Promise<{ memberPrice: number | null; memberLevel: MemberLevel | null }> {
    if (!ctx.customerId) return { memberPrice: null, memberLevel: null }

    const customer = await this.customerRepo.findOne({
      where: { customerId: ctx.customerId },
      select: ['customerId', 'customerLevel', 'customerType'],
    })
    if (!customer?.customerLevel) return { memberPrice: null, memberLevel: null }
    if (customer.customerType && customer.customerType !== CUSTOMER_TYPES[0])
      return { memberPrice: null, memberLevel: null }

    const memberLevel = await this.memberLevelRepo.findOne({
      where: { levelCode: customer.customerLevel, isActive: true },
    })
    if (!memberLevel) return { memberPrice: null, memberLevel: null }

    const memberRulePrice = await this.findMemberPricingForSku(
      ctx.sku.skuId,
      memberLevel.levelCode,
      ctx.retailPrice,
      ctx.quantity,
    )
    if (memberRulePrice) {
      return { memberPrice: memberRulePrice.price, memberLevel }
    }
    return { memberPrice: ctx.retailPrice * Number(memberLevel.discountRate), memberLevel }
  }

  // ===== 策略 5: C 端促销价 (SceneCoupon / Promotion) =====
  async findPromotionPrice(
    ctx: PriceContext,
    now: Date,
  ): Promise<{ promoPrice: number | null; bestPromo: Promotion | null }> {
    const activePromos = await this.findActivePromotions(ctx.sku.skuId, ctx.sku.spuId, now)
    const eligiblePromos = activePromos.filter(
      (p) => !p.minAmount || ctx.retailPrice * ctx.quantity >= Number(p.minAmount),
    )

    if (eligiblePromos.length === 0) return { promoPrice: null, bestPromo: null }

    let bestPrice = ctx.retailPrice
    let bestPromo: Promotion | null = null
    for (const p of eligiblePromos) {
      let price = this.calcPromoPrice(p, ctx.retailPrice)
      if (p.maxDiscount) price = Math.max(price, ctx.retailPrice - Number(p.maxDiscount))
      if (price < bestPrice) {
        bestPrice = price
        bestPromo = p
      }
    }
    return bestPromo ? { promoPrice: bestPrice, bestPromo } : { promoPrice: null, bestPromo: null }
  }

  // ===== 策略 6: 优惠券叠加 (SceneCoupon) =====
  async applyCoupon(
    bestBasePrice: number,
    bestPromo: Promotion | null,
    discountReason: string,
    discountRefId: string | null,
    ctx: PriceContext,
    now: Date,
  ): Promise<{ finalPrice: number; discountReason: string; discountRefId: string | null }> {
    if (!ctx.promotionCodes || ctx.promotionCodes.length === 0) {
      return { finalPrice: bestBasePrice, discountReason, discountRefId }
    }

    const coupon = await this.findBestCoupon(ctx.promotionCodes, ctx.retailPrice, ctx.quantity, now)
    if (!coupon) return { finalPrice: bestBasePrice, discountReason, discountRefId }

    let couponPrice = bestBasePrice
    if (coupon.discountType === 'fixed_amount') {
      couponPrice = bestBasePrice - Number(coupon.discountValue)
    } else if (coupon.discountType === 'percent') {
      couponPrice = bestBasePrice * (Number(coupon.discountValue) / 100)
    }
    if (coupon.maxDiscount) couponPrice = Math.max(couponPrice, bestBasePrice - Number(coupon.maxDiscount))

    if (couponPrice > 0 && couponPrice < bestBasePrice) {
      if (bestPromo?.stackable || discountReason === 'member') {
        return {
          finalPrice: couponPrice,
          discountReason: discountReason === 'none' ? 'coupon' : `${discountReason}+coupon`,
          discountRefId: coupon.promotionId,
        }
      }
      if (couponPrice < bestBasePrice) {
        return { finalPrice: couponPrice, discountReason: 'coupon', discountRefId: coupon.promotionId }
      }
    }
    return { finalPrice: bestBasePrice, discountReason, discountRefId }
  }

  // ===== 策略 7: 最低价保护 (FloorCheck) =====
  applyFloorCheck(
    finalPrice: number,
    minPrice: number,
    costPrice: number,
    warnings: string[],
  ): { finalPrice: number; warnings: string[] } {
    let price = finalPrice
    if (minPrice > 0 && price < minPrice) {
      warnings.push(`B 端价格 ¥${price.toFixed(2)} 低于最低售价 ¥${minPrice.toFixed(2)}`)
    }
    if (price < costPrice && costPrice > 0) {
      warnings.push(`价格 ¥${price.toFixed(2)} 低于成本价 ¥${costPrice.toFixed(2)}，请人工审核`)
    }
    if (price < 0.01) price = 0.01
    return { finalPrice: price, warnings }
  }

  // ===== 内部辅助方法 =====

  private calcPromoPrice(promo: Promotion, retailPrice: number): number {
    if (promo.extra?.customPrice) return Number(promo.extra.customPrice)
    if (promo.discountType === 'percent') return retailPrice * (Number(promo.discountValue) / 100)
    return retailPrice - Number(promo.discountValue)
  }

  private async findActivePromotions(skuId: string, spuId: string | undefined, now: Date): Promise<Promotion[]> {
    const promos = await this.promoRepo
      .createQueryBuilder('p')
      .where('p.status = :status', { status: PROMOTION_STATUS.active })
      .andWhere('p.start_time <= :now', { now })
      .andWhere('p.end_time >= :now', { now })
      .andWhere('(p.total_limit IS NULL OR p.used_count < p.total_limit)')
      .orderBy('p.priority', 'DESC')
      .getMany()

    const promoSkus = await this.promoSkuRepo.find({ where: { skuId } })
    const customPriceMap = new Map<string, number>()
    for (const ps of promoSkus) {
      if (ps.customPrice) customPriceMap.set(ps.promotionId, Number(ps.customPrice))
    }

    return promos.filter((p) => {
      if (p.scope === 'all') {
        if (customPriceMap.has(p.promotionId))
          p.extra = { ...(p.extra || {}), customPrice: customPriceMap.get(p.promotionId) }
        return true
      }
      if (p.scope === 'sku' && p.scopeIds) {
        if (p.scopeIds.includes(skuId)) {
          if (customPriceMap.has(p.promotionId))
            p.extra = { ...(p.extra || {}), customPrice: customPriceMap.get(p.promotionId) }
          return true
        }
        return false
      }
      if (p.scope === 'spu' && p.scopeIds && spuId) return p.scopeIds.includes(spuId)
      return false
    })
  }

  private async findMemberPricingForSku(
    skuId: string,
    levelCode: string,
    retailPrice: number,
    quantity: number,
  ): Promise<{ price: number; reason: string; ruleId: string } | null> {
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
    const rule = rules[0]

    switch (rule.ruleType) {
      case 'fixed_price':
        if (rule.fixedPrice !== null && rule.fixedPrice > 0)
          return { price: Number(rule.fixedPrice), reason: 'member', ruleId: rule.ruleId }
        break
      case 'discount':
        if (rule.discountRate !== null && rule.discountRate > 0)
          return { price: retailPrice * Number(rule.discountRate), reason: 'member', ruleId: rule.ruleId }
        break
      case 'extra_discount':
        if (rule.extraDiscount !== null && rule.extraDiscount > 0) {
          const defaultLevel = await this.memberLevelRepo.findOne({ where: { levelCode, isActive: true } })
          if (defaultLevel)
            return {
              price: retailPrice * Number(defaultLevel.discountRate) * Number(rule.extraDiscount),
              reason: 'member',
              ruleId: rule.ruleId,
            }
        }
        break
    }
    return null
  }

  private async findBestCoupon(
    codes: string[],
    retailPrice: number,
    quantity: number,
    now: Date,
  ): Promise<Promotion | null> {
    if (!codes.length) return null
    const coupons = await this.promoRepo
      .createQueryBuilder('p')
      .where('p.status = :status', { status: PROMOTION_STATUS.active })
      .andWhere('p.type = :type', { type: 'coupon' })
      .andWhere('p.start_time <= :now', { now })
      .andWhere('p.end_time >= :now', { now })
      .andWhere('(p.total_limit IS NULL OR p.used_count < p.total_limit)')
      .getMany()

    const upperCodes = codes.map((c) => c.toUpperCase())
    const matched = coupons.filter((c) => c.promotionCode && upperCodes.includes(c.promotionCode!.toUpperCase()))
    if (!matched.length) return null

    const meetsThreshold = matched.filter((c) => !c.minAmount || retailPrice * quantity >= Number(c.minAmount))
    if (!meetsThreshold.length) return null

    return meetsThreshold.sort((a, b) => {
      const priceA =
        a.discountType === 'fixed_amount'
          ? retailPrice - Number(a.discountValue)
          : retailPrice * (Number(a.discountValue) / 100)
      const priceB =
        b.discountType === 'fixed_amount'
          ? retailPrice - Number(b.discountValue)
          : retailPrice * (Number(b.discountValue) / 100)
      return priceA - priceB
    })[0]
  }

  private async matchWholesaleTier(quantity: number) {
    return this.wholesaleRepo
      .createQueryBuilder('wt')
      .where('wt.is_active = 1')
      .andWhere('wt.min_quantity <= :qty', { qty: quantity })
      .andWhere('(wt.max_quantity IS NULL OR wt.max_quantity >= :qty)', { qty: quantity })
      .orderBy('wt.min_quantity', 'DESC')
      .getOne()
  }
}
