/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import * as crypto from 'crypto'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProductTierPricing } from './entity/product-tier-pricing.entity'
import { WholesaleTier } from './entity/wholesale-tier.entity'
import { PriceHistory } from './entity/price-history.entity'
import { ProductSku } from './entity/product-sku.entity'
import { Promotion } from './entity/promotion.entity'
import { MemberLevel } from './entity/member-level.entity'
import { MemberPricingRule } from './entity/member-pricing-rule.entity'
import {
  CreateProductTierDto,
  UpdateProductTierDto,
  CreateWholesaleTierDto,
  UpdateWholesaleTierDto,
  QueryPriceHistoryDto,
  CreatePromotionDto,
  UpdatePromotionDto,
  QueryPromotionDto,
  CreateMemberLevelDto,
  UpdateMemberLevelDto,
  CreateMemberPricingRuleDto,
  UpdateMemberPricingRuleDto,
  QueryMemberPricingRuleDto,
} from './dto/pricing.dto'
import { PROMOTION_STATUS } from './product.constants'

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(ProductTierPricing)
    private readonly tierRepo: Repository<ProductTierPricing>,
    @InjectRepository(WholesaleTier)
    private readonly wholesaleRepo: Repository<WholesaleTier>,
    @InjectRepository(PriceHistory)
    private readonly historyRepo: Repository<PriceHistory>,
    @InjectRepository(ProductSku)
    private readonly skuRepo: Repository<ProductSku>,
    @InjectRepository(Promotion)
    private readonly promoRepo: Repository<Promotion>,
    @InjectRepository(MemberLevel)
    private readonly memberLevelRepo: Repository<MemberLevel>,
    @InjectRepository(MemberPricingRule)
    private readonly memberPricingRuleRepo: Repository<MemberPricingRule>,
  ) {}

  // ====== 产品分级 ======

  async findAllTiers() {
    return this.tierRepo.find({ order: { sortOrder: 'ASC' } })
  }

  async createTier(dto: CreateProductTierDto) {
    const entity = this.tierRepo.create(dto)
    return this.tierRepo.save(entity)
  }

  async updateTier(tierId: string, dto: UpdateProductTierDto) {
    await this.tierRepo.update(tierId, dto)
    return this.tierRepo.findOneBy({ tierId })
  }

  async deleteTier(tierId: string) {
    await this.tierRepo.update(tierId, { isActive: false })
    return { success: true }
  }

  // ====== 批发阶梯 ======

  async findAllWholesaleTiers() {
    return this.wholesaleRepo.find({ order: { minQuantity: 'ASC' } })
  }

  async createWholesaleTier(dto: CreateWholesaleTierDto) {
    const entity = this.wholesaleRepo.create(dto)
    return this.wholesaleRepo.save(entity)
  }

  async updateWholesaleTier(tierId: string, dto: UpdateWholesaleTierDto) {
    await this.wholesaleRepo.update(tierId, dto)
    return this.wholesaleRepo.findOneBy({ tierId })
  }

  async deleteWholesaleTier(tierId: string) {
    await this.wholesaleRepo.update(tierId, { isActive: false })
    return { success: true }
  }

  /** 根据数量匹配批发阶梯 */
  async matchWholesaleTier(quantity: number) {
    return this.wholesaleRepo
      .createQueryBuilder('wt')
      .where('wt.is_active = 1')
      .andWhere('wt.min_quantity <= :quantity', { quantity })
      .andWhere('(wt.max_quantity IS NULL OR wt.max_quantity >= :quantity)', { quantity })
      .orderBy('wt.min_quantity', 'DESC')
      .getOne()
  }

  // ====== 价格历史 ======

  async findPriceHistory(query: QueryPriceHistoryDto) {
    const qb = this.historyRepo.createQueryBuilder('ph').orderBy('ph.changedAt', 'DESC').limit(100)
    if (query.skuId) qb.andWhere('ph.sku_id = :skuId', { skuId: query.skuId })
    if (query.priceType) qb.andWhere('ph.price_type = :priceType', { priceType: query.priceType })
    const items = await qb.getMany()

    // 批量查询 SKU 信息
    const skuIds = [...new Set(items.map((i) => i.skuId))]
    const skuMap = new Map<string, Record<string, unknown>>()
    if (skuIds.length > 0) {
      const skus = await this.skuRepo.find({
        where: skuIds.map((id) => ({ skuId: id })),
        select: ['skuId', 'skuCode', 'skuName', 'skuBarcode'],
      })
      skus.forEach((s) => skuMap.set(s.skuId, s))
    }

    return items.map((item) => {
      const sku = skuMap.get(item.skuId)
      return {
        ...item,
        skuCode: sku?.skuCode || null,
        skuName: sku?.skuName || null,
        skuBarcode: sku?.skuBarcode || null,
      }
    })
  }

  /** 记录价格变更 */
  async recordPriceChange(
    skuId: string,
    priceType: string,
    oldValue: number | null,
    newValue: number,
    reason?: string,
    changedBy?: string,
  ) {
    const history = this.historyRepo.create({
      historyId: this.generateId(),
      skuId,
      priceType,
      oldValue,
      newValue,
      changeReason: reason,
      changedBy,
    })
    return this.historyRepo.save(history)
  }

  private generateId() {
    return `ph-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`
  }

  // ====== 促销管理 ======

  async findAllPromotions(query: QueryPromotionDto) {
    const qb = this.promoRepo.createQueryBuilder('p').orderBy('p.priority', 'DESC').addOrderBy('p.created_at', 'DESC')
    if (query.status) qb.andWhere('p.status = :status', { status: query.status })
    if (query.type) qb.andWhere('p.type = :type', { type: query.type })
    return qb.getMany()
  }

  async findPromotionById(id: string) {
    const promo = await this.promoRepo.findOne({ where: { promotionId: id } })
    if (!promo) throw new NotFoundException(`促销 ${id} 不存在`)
    return promo
  }

  async createPromotion(dto: CreatePromotionDto) {
    const entity = this.promoRepo.create({
      ...dto,
      scopeIds: dto.scopeIds || null,
      minAmount: dto.minAmount || null,
      maxDiscount: dto.maxDiscount || null,
      userLimit: dto.userLimit || null,
      totalLimit: dto.totalLimit || null,
      priority: dto.priority || 0,
      stackable: dto.stackable || false,
      status: PROMOTION_STATUS.draft,
      usedCount: 0,
    })
    return this.promoRepo.save(entity)
  }

  async updatePromotion(id: string, dto: UpdatePromotionDto) {
    const existing = await this.promoRepo.findOne({ where: { promotionId: id } })
    if (!existing) throw new NotFoundException(`促销 ${id} 不存在`)
    if (dto.startTime) existing.startTime = new Date(dto.startTime)
    if (dto.endTime) existing.endTime = new Date(dto.endTime)
    Object.assign(existing, dto)
    return this.promoRepo.save(existing)
  }

  async deletePromotion(id: string) {
    await this.promoRepo.update(id, { status: PROMOTION_STATUS.expired })
    return { success: true }
  }

  async updatePromotionStatus(id: string, status: string) {
    const existing = await this.promoRepo.findOne({ where: { promotionId: id } })
    if (!existing) throw new NotFoundException(`促销 ${id} 不存在`)
    existing.status = status
    return this.promoRepo.save(existing)
  }

  // ====== 会员等级 CRUD ======

  async findAllMemberLevels() {
    return this.memberLevelRepo.find({ order: { sortOrder: 'ASC' } })
  }

  async createMemberLevel(dto: CreateMemberLevelDto) {
    const existing = await this.memberLevelRepo.findOne({ where: { levelCode: dto.levelCode } })
    if (existing) throw new ConflictException(`等级编码 ${dto.levelCode} 已存在`)
    const entity = this.memberLevelRepo.create({
      levelId: dto.levelCode,
      ...dto,
    })
    return this.memberLevelRepo.save(entity)
  }

  async updateMemberLevel(levelCode: string, dto: UpdateMemberLevelDto) {
    const existing = await this.memberLevelRepo.findOne({ where: { levelCode } })
    if (!existing) throw new NotFoundException(`会员等级 ${levelCode} 不存在`)
    Object.assign(existing, dto)
    return this.memberLevelRepo.save(existing)
  }

  async deleteMemberLevel(levelCode: string) {
    const existing = await this.memberLevelRepo.findOne({ where: { levelCode } })
    if (!existing) throw new NotFoundException(`会员等级 ${levelCode} 不存在`)
    existing.isActive = false
    return this.memberLevelRepo.save(existing)
  }

  // ====== 会员定价规则 CRUD ======

  async findAllMemberPricingRules(query: QueryMemberPricingRuleDto) {
    const qb = this.memberPricingRuleRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.memberLevel', 'ml')
      .orderBy('r.levelCode', 'ASC')
      .addOrderBy('r.priority', 'DESC')
    if (query.levelCode) qb.andWhere('r.level_code = :levelCode', { levelCode: query.levelCode })
    if (query.skuId) qb.andWhere('r.sku_id = :skuId', { skuId: query.skuId })
    return qb.getMany()
  }

  async createMemberPricingRule(dto: CreateMemberPricingRuleDto) {
    const entity = this.memberPricingRuleRepo.create({
      ruleId: `mpr-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 6)}`,
      ...dto,
    })
    return this.memberPricingRuleRepo.save(entity)
  }

  async updateMemberPricingRule(ruleId: string, dto: UpdateMemberPricingRuleDto) {
    const existing = await this.memberPricingRuleRepo.findOne({ where: { ruleId } })
    if (!existing) throw new NotFoundException(`定价规则 ${ruleId} 不存在`)
    if (dto.startTime) existing.startTime = new Date(dto.startTime)
    if (dto.endTime) existing.endTime = new Date(dto.endTime)
    Object.assign(existing, dto)
    return this.memberPricingRuleRepo.save(existing)
  }

  async deleteMemberPricingRule(ruleId: string) {
    const existing = await this.memberPricingRuleRepo.findOne({ where: { ruleId } })
    if (!existing) throw new NotFoundException(`定价规则 ${ruleId} 不存在`)
    existing.isActive = false
    return this.memberPricingRuleRepo.save(existing)
  }
}
