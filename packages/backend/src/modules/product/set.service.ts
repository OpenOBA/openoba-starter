import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProductSet } from './entity/product-set.entity'
import { ProductCategory as Category } from './entity/product-category.entity'



@Injectable()
export class SetService {
  constructor(@InjectRepository(ProductSet) private setRepo: Repository<ProductSet>) {}

  async findSets(query: Record<string, unknown>) {
    const page = (query.page as number) || 1
    const pageSize = (query.pageSize as number) || 20
    const keyword = query.keyword as string | undefined
    const status = query.status as string | undefined
    const categoryId = query.categoryId as string | undefined
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
    const categoryId = dto.categoryId as string | undefined
    const { ...rest } = dto
    // 自动生成套装编码 SET + 6位序号
    if (!rest.setCode) {
      rest.setCode = await this.generateSetCode()
    }
    const entity = this.setRepo.create({
      ...rest,
      category: categoryId ? ({ categoryId } as Category) : undefined,
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
    const categoryId = dto.categoryId as string | undefined
    const { ...rest } = dto
    Object.assign(item, rest)
    if (categoryId !== undefined) {
      item.category = categoryId ? ({ categoryId } as Category) : undefined
    }
    return this.setRepo.save(item)
  }

  async deleteSet(id: string) {
    const item = await this.findOneSet(id)
    item.isDeleted = true
    return this.setRepo.save(item)
  }
}
