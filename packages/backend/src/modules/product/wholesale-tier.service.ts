import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { WholesaleTier } from './entity/wholesale-tier.entity'
import { CreateWholesaleTierDto, UpdateWholesaleTierDto } from './dto/pricing.dto'

@Injectable()
export class WholesaleTierService {
  constructor(
    @InjectRepository(WholesaleTier)
    private readonly repo: Repository<WholesaleTier>,
  ) {}

  async findAll() {
    return this.repo.find({ order: { minQuantity: 'ASC' } })
  }

  async findOne(tierId: string) {
    return this.repo.findOneBy({ tierId })
  }

  async create(dto: CreateWholesaleTierDto) {
    const entity = this.repo.create(dto)
    return this.repo.save(entity)
  }

  async update(tierId: string, dto: UpdateWholesaleTierDto) {
    await this.repo.update(tierId, dto)
    return this.repo.findOneBy({ tierId })
  }

  async remove(tierId: string) {
    await this.repo.update(tierId, { isActive: false })
    return { success: true }
  }

  /** 根据购买数量查找适用阶梯 */
  async findByQuantity(quantity: number) {
    return this.repo
      .createQueryBuilder('wt')
      .where('wt.is_active = :active', { active: true })
      .andWhere('wt.min_quantity <= :qty', { qty: quantity })
      .andWhere('(wt.max_quantity IS NULL OR wt.max_quantity >= :qty)', { qty: quantity })
      .orderBy('wt.min_quantity', 'DESC')
      .getOne()
  }
}
