import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProductTierPricing } from './entity/product-tier-pricing.entity'
import { CreateProductTierDto, UpdateProductTierDto } from './dto/pricing.dto'

@Injectable()
export class ProductTierPricingService {
  constructor(
    @InjectRepository(ProductTierPricing)
    private readonly repo: Repository<ProductTierPricing>,
  ) {}

  async findAll() {
    return this.repo.find({ order: { sortOrder: 'ASC' } })
  }

  async findOne(tierId: string) {
    return this.repo.findOneBy({ tierId })
  }

  async create(dto: CreateProductTierDto) {
    const entity = this.repo.create(dto)
    return this.repo.save(entity)
  }

  async update(tierId: string, dto: UpdateProductTierDto) {
    await this.repo.update(tierId, dto as unknown as Parameters<typeof this.repo.update>[1])
    return this.repo.findOneBy({ tierId })
  }

  async remove(tierId: string) {
    await this.repo.update(tierId, { isActive: false })
    return { success: true }
  }
}
