import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CustomerTierPricing } from './entity/customer-tier-pricing.entity'
import { CreateTierPricingDto, UpdateTierPricingDto } from './dto/customer.dto'

/**
 * 客户阶梯定价子 Service
 */
@Injectable()
export class CustomerPricingService {
  constructor(@InjectRepository(CustomerTierPricing) private pricingRepo: Repository<CustomerTierPricing>) {}

  async addTierPricing(dto: CreateTierPricingDto) {
    const id = `price-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 6)}`
    return this.pricingRepo.save(
      this.pricingRepo.create({
        ...dto,
        pricingId: id,
        isDeleted: false,
        isActive: dto.isActive !== false,
        tier: dto.tier || 'A',
        minQuantity: dto.minQuantity ?? 1,
        discountRate: dto.discountRate ?? null,
        fixedPrice: dto.fixedPrice ?? null,
        pricingMode: dto.pricingMode || 'discount',
        agreementNo: dto.agreementNo || null,
        agreementStart: dto.agreementStart ? new Date(dto.agreementStart) : null,
        agreementEnd: dto.agreementEnd ? new Date(dto.agreementEnd) : null,
        salesRep: dto.salesRep || null,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      }),
    )
  }

  async updateTierPricing(id: string, dto: UpdateTierPricingDto) {
    const existing = await this.pricingRepo.findOne({ where: { pricingId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`定价 ${id} 不存在`)
    if (dto.effectiveFrom) existing.effectiveFrom = new Date(dto.effectiveFrom)
    if (dto.effectiveTo) existing.effectiveTo = new Date(dto.effectiveTo)
    if (dto.agreementStart) existing.agreementStart = new Date(dto.agreementStart)
    if (dto.agreementEnd) existing.agreementEnd = new Date(dto.agreementEnd)
    if (dto.fixedPrice !== undefined) existing.fixedPrice = dto.fixedPrice
    if (dto.pricingMode) existing.pricingMode = dto.pricingMode
    if (dto.agreementNo !== undefined) existing.agreementNo = dto.agreementNo
    if (dto.salesRep !== undefined) existing.salesRep = dto.salesRep
    if (dto.discountRate !== undefined) existing.discountRate = dto.discountRate
    Object.assign(existing, dto)
    return this.pricingRepo.save(existing)
  }

  async removeTierPricing(id: string) {
    const existing = await this.pricingRepo.findOne({ where: { pricingId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`定价 ${id} 不存在`)
    existing.isDeleted = true
    return this.pricingRepo.save(existing)
  }

  async getTierPricings(customerId: string) {
    return this.pricingRepo.find({
      where: { customerId, isDeleted: false },
      order: { tier: 'ASC', minQuantity: 'ASC' },
    })
  }
}
