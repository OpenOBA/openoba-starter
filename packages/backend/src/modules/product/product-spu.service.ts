import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, DataSource } from 'typeorm'
import { ProductSpu } from './entity/product-spu.entity'
import { ProductCategory } from './entity/product-category.entity'
import { StructureStandard } from '../structure/entity/structure-standard.entity'
import { ProductSku } from './entity/product-sku.entity'
import { NamingEngine, SpuNameInput } from './utils/naming-engine'

const VALID_GENDERS = ['female', 'male', 'unisex', 'limited']

@Injectable()
export class ProductSpuService {
  constructor(
    @InjectRepository(ProductSpu) private spuRepo: Repository<ProductSpu>,
    @InjectRepository(StructureStandard) private structRepo: Repository<StructureStandard>,
    @InjectRepository(ProductSku) private skuRepo: Repository<ProductSku>,
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
    const [items, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount()
    return { items, total }
  }

  async findOneSpu(id: string) {
    const item = await this.spuRepo.findOne({ where: { spuId: id, isDeleted: false }, relations: ['category'] })
    if (!item) throw new NotFoundException('SPU 不存在')
    return item
  }

  async createSpu(dto: any) {
    const { gender, structureStandardCode, seriesCode, sceneTags, ...rest } = dto
    if (gender && !VALID_GENDERS.includes(gender)) {
      throw new BadRequestException(`无效的性别值: ${gender}`)
    }
    if (!rest.productTier) rest.productTier = 'color'
    if (structureStandardCode) {
      rest.spuCode = await this.generateSpuCode(structureStandardCode)
      rest.spuName = await this.generateSpuDisplayName(rest)
    }
    if (gender) rest.gender = gender
    if (sceneTags) rest.sceneTags = sceneTags
    if (seriesCode) rest.seriesCode = seriesCode
    // 确保 category 关系
    if (rest.categoryId) {
      rest.category = { categoryId: rest.categoryId } as unknown as ProductCategory
      delete rest.categoryId
    }
    const spu = this.spuRepo.create(rest)
    return this.spuRepo.save(spu)
  }

  async updateSpu(id: string, dto: any) {
    const item = await this.findOneSpu(id)
    const { gender, structureStandardCode, categoryId, seriesCode, sceneTags, ...rest } = dto
    if (gender && !VALID_GENDERS.includes(gender)) {
      throw new BadRequestException(`无效的性别值: ${gender}`)
    }
    if (structureStandardCode && structureStandardCode !== item.structureStandardCode) {
      rest.spuCode = await this.generateSpuCode(structureStandardCode)
      rest.spuName = await this.generateSpuDisplayName({ ...item, ...rest })
    }
    if (gender) item.gender = gender
    if (categoryId !== undefined) {
      item.category = categoryId ? { categoryId } as unknown as ProductCategory : undefined
    }
    if (seriesCode !== undefined) item.seriesCode = seriesCode
    if (sceneTags !== undefined) item.sceneTags = sceneTags
    Object.assign(item, rest)
    return this.spuRepo.save(item)
  }

  async deleteSpu(id: string) {
    const item = await this.findOneSpu(id)
    item.isDeleted = true
    return this.spuRepo.save(item)
  }

  async ensureSpuExists(spuId: string) {
    const count = await this.spuRepo.count({ where: { spuId, isDeleted: false } })
    if (!count) throw new BadRequestException('SPU 不存在')
  }

  async generateSpuCode(structureStandardCode: string): Promise<string> {
    const info = await this.getStructureInfo(structureStandardCode)
    if (!info) {
      const match = structureStandardCode.match(/^([A-Za-z])(\d+)/)
      const extCode = match ? match[2] : structureStandardCode
      return `S${extCode}-0001`
    }
    const spuEntityRepo = this.dataSource.getRepository(ProductSpu)
    // V3.0: SPU编码 = 结构标准对外编码 + 序号（externalCode 已含 S 前缀）
    const prefix = `${info.externalCode}-`
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

  async generateSpuDisplayName(spuData: any): Promise<string> {
    const { structureStandardCode, seriesCode } = spuData
    if (!structureStandardCode) return '???系列'
    const structInfo = await this.getStructureInfo(structureStandardCode)
    if (!structInfo) return '???系列'
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

  private async getStructureInfo(code: string): Promise<{ externalCode: string; shapeCode: string } | null> {
    if (!code) return null
    const repo = this.dataSource.getRepository(StructureStandard)
    const found = await repo.findOne({ where: { externalCode: code } })
    if (found) return { externalCode: found.externalCode, shapeCode: found.shapeCode }
    const found2 = await repo.findOne({ where: { internalCode: code.toLowerCase() } })
    if (found2) return { externalCode: found2.externalCode, shapeCode: found2.shapeCode }
    return null
  }

  private getSeriesChineseName(seriesCode: string): string {
    if (!seriesCode) return ''
    return NamingEngine.getSeriesChineseName(seriesCode)
  }
}
