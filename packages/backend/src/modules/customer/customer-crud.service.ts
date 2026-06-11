import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Customer, CUSTOMER_TYPES } from './entity/customer.entity'
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  QueryCustomerDto,
} from './dto/customer.dto'

@Injectable()
export class CustomerCrudService {
  constructor(
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
  ) {}

  escapeLikePattern(keyword: string): string {
    return keyword.replace(/[%_]/g, '\\$&')
  }

  private async generateCustomerCode(customerType: string): Promise<string> {
    const prefixMap: Record<string, string> = { retail: 'OBA-CUS', business: 'OBA-BUS', partner: 'OBA-PTN' }
    const prefix = prefixMap[customerType] || 'OBA-CUS'

    const result = await this.customerRepo
      .createQueryBuilder('c')
      .select('MAX(CAST(SUBSTRING(c.customer_code, LENGTH(:prefix) + 2) AS UNSIGNED))', 'maxSeq')
      .setParameter('prefix', prefix)
      .where('c.customer_code LIKE :pattern', { pattern: `${prefix}-%` })
      .getRawOne()

    const nextSeq = ((result?.maxSeq || 0) + 1).toString().padStart(6, '0')
    return `${prefix}-${nextSeq}`
  }

  async findAll(query: QueryCustomerDto) {
    const { keyword, customerType, customerLevel, status, page = 1, pageSize = 20 } = query
    const qb = this.customerRepo.createQueryBuilder('c').where('c.is_deleted = :deleted', { deleted: false })
    if (keyword) {
      qb.andWhere('(c.contact_name LIKE :kw OR c.phone LIKE :kw OR c.company_name LIKE :kw OR c.email LIKE :kw)', { kw: `%${this.escapeLikePattern(keyword)}%` })
    }
    if (customerType) qb.andWhere('c.customer_type = :type', { type: customerType })
    if (customerLevel) qb.andWhere('c.customer_level = :level', { level: customerLevel })
    if (status) qb.andWhere('c.status = :status', { status })
    const [items, total] = await qb.orderBy('c.created_at', 'DESC').skip((page - 1) * pageSize).take(pageSize).getManyAndCount()
    return { items, total, page, pageSize }
  }

  async findOne(id: string) {
    const item = await this.customerRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.contacts', 'ct')
      .leftJoinAndSelect('c.addresses', 'a')
      .leftJoinAndSelect('c.tierPricings', 'p')
      .leftJoinAndSelect('c.prescriptions', 'rx')
      .leftJoinAndSelect('c.lenses', 'l')
      .where('c.customer_id = :id AND c.is_deleted = :deleted', { id, deleted: false })
      .getOne()
    if (!item) throw new NotFoundException(`客户 ${id} 不存在`)
    return item
  }

  async create(dto: CreateCustomerDto & { wechatId?: string; referralSource?: string; preferredStyle?: string }) {
    const id = `cust-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 6)}`
    const type = dto.customerType || CUSTOMER_TYPES[0]
    const customerCode = await this.generateCustomerCode(type)
    const wechat = dto.wechatId || dto.wechat || null
    return this.customerRepo.save(
      this.customerRepo.create({
        ...dto, customerId: id, customerCode, customerType: type, wechat,
        isDeleted: false, totalOrders: 0, totalAmount: 0,
        subscriptionStatus: 'none', wholesaleTier: dto.wholesaleTier || null,
        memberDiscountRate: dto.memberDiscountRate || 1.0,
        pointsBalance: dto.pointsBalance || 0, partnerServices: dto.partnerServices || null,
      }),
    )
  }

  async update(id: string, dto: UpdateCustomerDto & { wechatId?: string; referralSource?: string; preferredStyle?: string }) {
    const existing = await this.customerRepo.findOne({ where: { customerId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`客户 ${id} 不存在`)
    Object.assign(existing, dto)
    if (dto.wechatId !== undefined) existing.wechat = dto.wechatId
    if (dto.wechat !== undefined) existing.wechat = dto.wechat
    if (dto.referralSource !== undefined) existing.referralSource = dto.referralSource
    if (dto.preferredStyle !== undefined) existing.preferredStyle = dto.preferredStyle
    if (dto.lastContactAt !== undefined) existing.lastContactAt = dto.lastContactAt ? new Date(dto.lastContactAt) : null
    return this.customerRepo.save(existing)
  }

  async remove(id: string) {
    const existing = await this.customerRepo.findOne({ where: { customerId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`客户 ${id} 不存在`)
    existing.isDeleted = true
    return this.customerRepo.save(existing)
  }
}
