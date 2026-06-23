import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProductSet } from './entity/product-set.entity'
import { Category } from '../../product-category/entity/product-category.entity'

@Injectable()
export class SetService {
  constructor(@InjectRepository(ProductSet) private setRepo: Repository<ProductSet>) {}

  async findSets(query: Record<string, unknown>) {
    const { page = 1, pageSize = 20, keyword, status, categoryId } = query
    const qb = this.setRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.category', 'cat')
      .where('s.isDeleted = :del', { del: false })
    if (keyword) qb.andWhere('(s.set_name LIKE :kw OR s.set_code LIKE :kw)', { kw: `%${keyword}%` })
    if (status) qb.andWhere('s.status = :st', { st: status })
    if (categoryId) qb.andWhere('s.category_id = :cid', { cid: categoryId })
    qb.orderBy('s.createdAt', 'DESC')
    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()
    return { items, total, page: +page, pageSize: +pageSize }
  }

  async findOneSet(id: string) {
    const item = await this.setRepo.findOne({ where: { setId: id, isDeleted: false }, relations: ['category'] })
    if (!item) throw new NotFoundException('套装不存在')
    return item
  }

  async createSet(dto: Record<string, unknown>) {
    const { categoryId, ...rest } = dto
    // 自动生成套装编码 SET + 6位序号
    if (!rest.setCode) {
      rest.setCode = await this.generateSetCode()
    }
    const entity = this.setRepo.create({
      ...rest,
      category: categoryId ? ({ categoryId } as Partial<Category>) : undefined,
      isDeleted: false,
    })
    return this.setRepo.save(entity)
  }

  async generateSetCode(): Promise<string> {
    const [result] = await this.setRepo.query(
      "SELECT CONCAT('SET', LPAD(IFNULL(MAX(CAST(SUBSTRING(set_code, 4) AS UNSIGNED)), 0) + 1, 6, '0')) AS code FROM product_set",
    )
    return result?.code || 'SET000001'
  }

  async updateSet(id: string, dto: Record<string, unknown>) {
    const item = await this.findOneSet(id)
    const { categoryId, ...rest } = dto
    Object.assign(item, rest)
    if (categoryId !== undefined) {
      item.category = categoryId ? ({ categoryId } as Partial<Category>) : null
    }
    return this.setRepo.save(item)
  }

  async deleteSet(id: string) {
    const item = await this.findOneSet(id)
    item.isDeleted = true
    return this.setRepo.save(item)
  }
}
