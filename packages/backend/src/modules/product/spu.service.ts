import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, DataSource } from 'typeorm'
import { StructureStandard } from '../structure/entity/structure-standard.entity'
import { ProductSpu } from './entity/product-spu.entity'
import { ProductCategory } from './entity/product-category.entity'
import { ProductSku } from './entity/product-sku.entity'
import { NamingEngine, SpuNameInput } from './utils/naming-engine'

// SPU 款式（gender）合法值
const VALID_GENDERS = ['female', 'male', 'unisex', 'limited']

@Injectable()
export class SpuService {
  constructor(
    @InjectRepository(ProductSpu) private spuRepo: Repository<ProductSpu>,
    private dataSource: DataSource,
  ) {}

  async findSpus(query: any) {
    const { page = 1, pageSize = 20, keyword, categoryId, status, seriesCode, gender, sceneTag, productTier } = query
    const qb = this.spuRepo.createQueryBuilder('s').leftJoinAndSelect('s.category', 'cat').where('s.isDeleted = :del', { del: false })
    if (keyword) qb.andWhere('(s.spu_name LIKE :kw OR s.spu_code LIKE :kw)', { kw: `%${keyword}%` })
    if (categoryId) qb.andWhere('cat.categoryId = :cid', { cid: categoryId })
    if (status) qb.andWhere('s.status = :st', { st: status })
    if (seriesCode) qb.andWhere('s.series_code = :sc', { sc: seriesCode })
    if (gender && VALID_GENDERS.includes(gender)) qb.andWhere('s.gender = :g', { g: gender })
    if (sceneTag) qb.andWhere('JSON_CONTAINS(s.scene_tags, :st)', { st: JSON.stringify(sceneTag) })
    if (productTier) qb.andWhere('s.product_tier = :tier', { tier: productTier })
    qb.orderBy('s.createdAt', 'DESC')
    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()
    return { items, total, page: +page, pageSize: +pageSize }
  }

  async findOneSpu(id: string) {
    const item = await this.spuRepo.findOne({ where: { spuId: id, isDeleted: false }, relations: ['category', 'skus'] })
    if (!item) throw new NotFoundException('SPU不存在')
    return item
  }

  async createSpu(dto: any) {
    const { categoryId, gender, spuCode, spuName, ...rest } = dto
    if (gender && !VALID_GENDERS.includes(gender)) {
      throw new BadRequestException(`款式必须是以下值之一: ${VALID_GENDERS.join(', ')}`)
    }
    if (!rest.productTier) rest.productTier = 'color'

    // V2.0: 强制后端自动生成 SPU 编码
    if (rest.structureStandardCode) {
      rest.spuCode = await this.generateSpuCode(rest.structureStandardCode)
    }
    // V2.0: 强制后端自动生成 SPU 展示名
    rest.spuName = await this.generateSpuDisplayName(rest)

    const entity = this.spuRepo.create({
      ...rest,
      gender: gender || 'unisex',
      category: categoryId ? { categoryId } as unknown as ProductCategory : undefined,
    })
    return this.spuRepo.save(entity)
  }

  async updateSpu(id: string, dto: any) {
    const item = await this.findOneSpu(id)
    const { categoryId, gender, ...rest } = dto
    if (gender && !VALID_GENDERS.includes(gender)) {
      throw new BadRequestException(`款式必须是以下值之一: ${VALID_GENDERS.join(', ')}`)
    }

    // V2.0: 如果结构标准变化，重新生成 spu_code
    if (rest.structureStandardCode && rest.structureStandardCode !== item.structureStandardCode) {
      rest.spuCode = await this.generateSpuCode(rest.structureStandardCode)
    }
    // V2.0: 如果结构标准或系列变化，重新生成展示名
    if (rest.structureStandardCode || rest.seriesCode !== undefined) {
      rest.spuName = await this.generateSpuDisplayName({ ...item, ...rest })
    }

    Object.assign(item, rest)
    if (gender) item.gender = gender
    if (categoryId !== undefined) {
      item.category = categoryId ? { categoryId } as unknown as ProductCategory : undefined
    }
    return this.spuRepo.save(item)
  }

  async deleteSpu(id: string) {
    await this.findOneSpu(id)
    const skuEntityRepo = this.dataSource.getRepository(ProductSku)
    await skuEntityRepo.delete({ spuId: id })
    await this.spuRepo.delete(id)
    return { message: '已删除' }
  }

  // ========================================
  // V2.0 命名规范：编码自动生成
  // ========================================

  async generateSpuCode(structureStandardCode: string): Promise<string> {
    const info = await this.getStructureInfo(structureStandardCode)
    if (!info) {
      const match = structureStandardCode.match(/^([A-Za-z])(\d+)/)
      const extCode = match ? match[2] : structureStandardCode
      return `MJ${extCode}-0001`
    }
    const spuEntityRepo = this.dataSource.getRepository(ProductSpu)
    const prefix = `MJ${info.externalCode}-`
    const existing = await spuEntityRepo.find({
      where: { spuCode: Like(`${prefix}%`), isDeleted: false },
      order: { spuCode: 'DESC' },
    })
    let next = 1
    if (existing.length > 0) {
      const parts = existing[0].spuCode.split('-')
      const last = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(last)) next = last + 1
    }
    return `${prefix}${String(next).padStart(4, '0')}`
  }

  // ========================================
  // V2.0 命名规范：展示名自动生成
  // ========================================

  private async getStructureInfo(internalCode: string): Promise<{ externalCode: string; shapeCode: string } | null> {
    if (!internalCode) return null
    const repo = this.dataSource.getRepository(StructureStandard)

    const found1 = await repo.findOne({
      where: { internalCode: internalCode.toLowerCase() },
    })
    if (found1) {
      return { externalCode: found1.externalCode, shapeCode: found1.shapeCode }
    }

    const match = internalCode.match(/^([A-Za-z])(\d+)/)
    if (match) {
      const extCode = match[2]
      const found2 = await repo.findOne({ where: { externalCode: extCode } })
      if (found2) {
        return { externalCode: found2.externalCode, shapeCode: found2.shapeCode }
      }
    }

    if (/^[A-Za-z]\d+$/.test(internalCode)) {
      return { externalCode: internalCode.toUpperCase(), shapeCode: '' }
    }

    return null
  }

  private getSeriesChineseName(seriesCode: string): string {
    if (!seriesCode) return ''
    return NamingEngine.getSeriesChineseName(seriesCode)
  }

  async generateSpuDisplayName(spuData: any): Promise<string> {
    const { structureStandardCode, seriesCode } = spuData
    if (!structureStandardCode) return '秒镜 ???'

    const structInfo = await this.getStructureInfo(structureStandardCode)
    if (!structInfo) return '秒镜 ???'

    const seriesName = this.getSeriesChineseName(seriesCode)

    const input: SpuNameInput = {
      structureStandardCode,
      seriesCode,
      externalCode: structInfo.externalCode,
      shapeCode: structInfo.shapeCode,
      seriesChineseName: seriesName,
    }
    return NamingEngine.generateSpuName(input)
  }
}
