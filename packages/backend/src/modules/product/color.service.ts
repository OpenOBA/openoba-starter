/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DictSkuColor } from './entity/dict-spu-color.entity'
import { ProductSku } from './entity/product-sku.entity'

@Injectable()
export class ColorService {
  constructor(
    @InjectRepository(DictSkuColor) private colorRepo: Repository<DictSkuColor>,
    @InjectRepository(ProductSku) private skuRepo: Repository<ProductSku>,
  ) {}

  async findColors(query: Record<string, unknown>) {
    const { page = 1, pageSize = 20, keyword, colorFamily, colorType } = query
    const qb = this.colorRepo.createQueryBuilder('c').where('1=1')
    if (keyword)
      qb.andWhere(
        '(c.color_name LIKE :kw OR c.color_code LIKE :kw OR c.color_name_en LIKE :kw OR c.pinyin_name LIKE :kw OR c.pinyin_initial LIKE :kw OR c.hex_value LIKE :kw)',
        { kw: `%${keyword}%` },
      )
    if (colorFamily) qb.andWhere('c.color_family = :cf', { cf: colorFamily })
    if (colorType) qb.andWhere('c.color_type = :ct', { ct: colorType })
    qb.orderBy('c.trend_score', 'DESC').addOrderBy('c.sort_order', 'ASC')
    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()
    return { items, total, page: +page, pageSize: +pageSize }
  }

  async findOneColor(id: string) {
    const item = await this.colorRepo.findOne({ where: { colorId: id } })
    if (!item) throw new NotFoundException('颜色不存在')
    return item
  }

  async createColor(dto: Record<string, unknown>) {
    return this.colorRepo.save(this.colorRepo.create(dto))
  }

  async updateColor(id: string, dto: Record<string, unknown>) {
    const item = await this.findOneColor(id)
    Object.assign(item, dto)
    return this.colorRepo.save(item)
  }

  async deleteColor(id: string) {
    const item = await this.findOneColor(id)
    const skuCount = await this.skuRepo.count({ where: { colorCode: item.colorCode } })
    if (skuCount > 0) {
      throw new BadRequestException(`色彩 "${item.colorName}" 正被 ${skuCount} 个 SKU 引用，无法删除`)
    }
    await this.colorRepo.delete({ colorId: id })
    return { message: '已删除' }
  }
}
