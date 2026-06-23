/* eslint-disable @typescript-eslint/no-explicit-any -- TODO: 需要类型化 */
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, FindOptionsWhere, FindOperator } from 'typeorm'
import { ProductSku } from './entity/product-sku.entity'
import { ProductSpu } from './entity/product-spu.entity'
import { ProductSkuImage } from './entity/product-sku-image.entity'
import { DictSkuColor } from './entity/dict-spu-color.entity'
import { DictEffectTag } from './entity/dict-effect-tag.entity'
import { SkuEffectRecommend } from './entity/sku-effect-recommend.entity'
import { ExternalBarcodeMapping } from './entity/external-barcode-mapping.entity'
import { PriceHistory } from './entity/price-history.entity'
import { StructureStandard } from '../structure/entity/structure-standard.entity'
import { generateInternalBarcode, generateTransitionalEAN13 } from './utils/barcode.generator'
import { NamingEngine, SkuNameInput } from './utils/naming-engine'

// Helper types for where clauses with snake_case columns not matching TypeORM's camelCase entity

interface SkuWhere extends FindOptionsWhere<ProductSku> {
  skuBarcode?: string
}

interface StructWhere extends FindOptionsWhere<StructureStandard> {
  internalCode?: string
  externalCode?: string
}



@Injectable()
export class ProductSkuService {
  private readonly logger = new Logger(ProductSkuService.name)
  private readonly priceFields = [
    { key: 'retailPrice', type: 'number' },
    { key: 'costPrice', type: 'number' },
    { key: 'minPrice', type: 'number' },
    { key: 'wholesalePriceA', type: 'number' },
    { key: 'wholesalePriceB', type: 'number' },
    { key: 'wholesalePriceC', type: 'number' },
  ]

  constructor(
    @InjectRepository(ProductSku) private skuRepo: Repository<ProductSku>,
    @InjectRepository(ProductSpu) private spuRepo: Repository<ProductSpu>,
    @InjectRepository(ProductSkuImage) private skuImageRepo: Repository<ProductSkuImage>,
    @InjectRepository(DictSkuColor) private colorRepo: Repository<DictSkuColor>,
    @InjectRepository(DictEffectTag) private effectTagRepo: Repository<DictEffectTag>,
    @InjectRepository(SkuEffectRecommend) private effectRecRepo: Repository<SkuEffectRecommend>,
    @InjectRepository(ExternalBarcodeMapping) private extBarcodeRepo: Repository<ExternalBarcodeMapping>,
    @InjectRepository(PriceHistory) private priceHistoryRepo: Repository<PriceHistory>,
    @InjectRepository(StructureStandard) private structRepo: Repository<StructureStandard>,
  ) {}

  async findSkus(query: Record<string, unknown>) {
    const page = (query.page as number) || 1
    const pageSize = (query.pageSize as number) || 20
    const spuId = query.spuId as string | undefined
    const keyword = query.keyword as string | undefined
    const status = query.status as string | undefined
    const skuBarcode = query.skuBarcode as string | undefined
    const ean13 = query.ean13 as string | undefined
    const productTier = query.productTier as string | undefined
    const qb = this.skuRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.spu', 'spu')
      .leftJoinAndSelect('s.color', 'c')
      .where('s.isDeleted = :del', { del: false })
    if (spuId) qb.andWhere('s.spu_id = :sid', { sid: spuId })
    if (keyword)
      qb.andWhere('(s.sku_name LIKE :kw OR s.sku_code LIKE :kw OR s.sku_barcode LIKE :kw)', { kw: `%${keyword}%` })
    if (status) qb.andWhere('s.status = :st', { st: status })
    if (skuBarcode) qb.andWhere('s.sku_barcode = :sb', { sb: skuBarcode })
    if (ean13) qb.andWhere('s.ean13 = :e', { e: ean13 })
    if (productTier) qb.andWhere('s.product_tier = :tier', { tier: productTier })
    qb.orderBy('s.createdAt', 'DESC')
    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()
    return { items, total }
  }

  async findOneSku(id: string) {
    const item = await this.skuRepo.findOne({ where: { skuId: id, isDeleted: false }, relations: ['spu', 'color'] })
    if (!item) throw new NotFoundException('SKU 不存在')
    return item
  }

  async createSku(dto: Record<string, unknown>) {
    try {
      const spuId = dto.spuId as string | undefined
      const colorCode = dto.colorCode as string | undefined
      const { ...rest } = dto
      if (!spuId) throw new BadRequestException('spuId 不能为空')
      // V3.0: colorCode 为必填字段
      if (!colorCode) throw new BadRequestException('SKU 色彩为必填项（V3.0）')
      const spu = await this.spuRepo.findOne({ where: { spuId, isDeleted: false } })
      if (!spu) throw new BadRequestException('SPU 不存在')

      rest.spuId = spuId
      rest.skuCode = await this.generateSkuCode(spu.spuCode)
      rest.skuBarcode = generateInternalBarcode(rest.skuCode, '')

      if (!rest.productTier) {
        const typedSpu = spu as Partial<ProductSpu> & { productTier?: string }
        rest.productTier = typedSpu.productTier || 'color'
      }

      const rec = await this.getEffectRecommendation(colorCode)
      if (rec) {
        if (!rest.skinToneEffect) rest.skinToneEffect = rec.skinToneEffect
        if (!rest.faceShapeEffect) rest.faceShapeEffect = rec.faceShapeEffect
      }

      if (colorCode) rest.colorCode = colorCode

      const sku = this.skuRepo.create(rest)
      const saved = (await this.skuRepo.save(sku)) as unknown as ProductSku

      // V3.0: 自动生成展示名
      const displayName = await this.generateSkuDisplayName({ ...rest, spu })
      if (displayName && displayName !== '??? · ???系列') {
        await this.skuRepo.update(saved.skuId, { skuName: displayName })
      }

      return this.findOneSku(saved.skuId)
    } catch (err: unknown) {
      const e = err as Error
      this.logger.error(`createSku failed: ${e?.message}`, e?.stack)
      throw err
    }
  }

  async updateSku(id: string, dto: Record<string, unknown>) {
    const item = await this.findOneSku(id)
    const { spuId, productTier: newTier, colorCode, ...rest } = dto
    const typedItem = item as Partial<ProductSku> & { productTier?: string; spu?: { productTier?: string } }
    const resolvedTier = newTier || typedItem.productTier || typedItem.spu?.productTier || 'color'

    // V3.0: 如果 spuId 变更，重新生成 SKU 编码
    if (spuId && spuId !== item.spuId) {
      const newSpu = await this.spuRepo.findOne({ where: { spuId, isDeleted: false } })
      if (!newSpu) throw new BadRequestException('切换的 SPU 不存在')
      rest.skuCode = await this.generateSkuCode(newSpu.spuCode)
      delete rest.skuBarcode // 旧条码也需废弃
      item.spuId = spuId
      item.spu = newSpu
    }

    if (colorCode) {
      ;(item as Partial<ProductSku> & { colorCode?: string }).colorCode = colorCode
      dto.colorCode = colorCode
    }

    // 自动生成展示名
    const typedItem2 = item as Partial<ProductSku> & { skinToneEffect?: string; faceShapeEffect?: string }
    if (!dto.skinToneEffect) dto.skinToneEffect = typedItem2.skinToneEffect
    if (!dto.faceShapeEffect) dto.faceShapeEffect = typedItem2.faceShapeEffect
    const needRegen = dto.skinToneEffect || dto.faceShapeEffect || colorCode
    const mergedForName = { ...item, ...rest, productTier: resolvedTier, spu: item.spu }
    if (needRegen) {
      const displayName = await this.generateSkuDisplayName(mergedForName)
      if (displayName && displayName !== '??? · ???系列') {
        rest.skuName = displayName
      }
    }

    // 构建纯列更新对象：只传需要的列，排除 skuId/createdAt/isDeleted 等
    const updateData: Record<string, unknown> = { ...rest, productTier: resolvedTier }
    if (spuId) updateData.spuId = spuId
    if (colorCode) updateData.colorCode = colorCode

    // 防御：删除不应更新的字段（前端可能回填了全量 entity 数据）
    delete updateData.skuId
    delete updateData.createdAt
    delete updateData.updatedAt
    delete updateData.isDeleted
    delete updateData.spu
    delete updateData.color
    delete updateData.primaryImage
    delete updateData.skuImages

    await this.skuRepo.update(id, updateData)
    return this.findOneSku(id)
  }

  async deleteSku(id: string) {
    const item = await this.findOneSku(id)
    ;(item as Partial<ProductSku> & { isDeleted: boolean }).isDeleted = true
    return this.skuRepo.save(item)
  }

  async findOneByBarcode(barcode: string) {
    // Try SKU barcode
    const sku = await this.skuRepo.findOne({ where: { skuBarcode: barcode } as SkuWhere })
    if (sku) return { type: 'sku', item: sku }
    // Try external barcode mapping
    const ext = await this.extBarcodeRepo.findOne({ where: { externalBarcode: barcode } })
    if (ext) return { type: 'external_mapping', item: ext }
    return null
  }

  async parseInternalBarcode(internalCode: string) {
    if (!internalCode) return null
    const f1 = await this.skuRepo.findOne({ where: { skuBarcode: internalCode } as SkuWhere })
    if (f1) return f1
    return null
  }

  // ===== 编码生成 =====
  async generateSkuCode(spuCode: string): Promise<string> {
    interface SkuCodeWhere extends FindOptionsWhere<ProductSku> {
      skuCode?: FindOperator<string>
    }
    const existing = await this.skuRepo.find({
      where: { skuCode: Like(`${spuCode}-%`), isDeleted: false } as unknown as SkuCodeWhere,
      order: { skuCode: 'DESC' },
    })
    let next = 1
    if (existing.length > 0) {
      const parts = existing[0].skuCode.split('-')
      const last = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(last)) next = last + 1
    }
    return `${spuCode}-${String(next).padStart(3, '0')}`
  }

  async generateSkuDisplayName(skuData: Record<string, unknown>): Promise<string> {
    const spu = skuData.spu || (await this.spuRepo.findOne({ where: { spuId: skuData.spuId } }))
    if (!spu) return '??? · ???系列'
    const typedSpu = spu as Partial<ProductSpu> & {
      structureStandardCode?: string
      seriesCode?: string
      gender?: string
    }
    const { structureStandardCode, seriesCode, gender } = typedSpu
    const { colorCode, skinToneEffect, faceShapeEffect } = skuData

    let colorName = '未知色'
    if (colorCode) {
      const color = await this.colorRepo.findOne({ where: { colorCode } })
      if (color) colorName = (color as Partial<DictSkuColor> & { colorName?: string }).colorName || '未知色'
    }

    const structInfo = await this.getStructureInfo(structureStandardCode || '')
    if (!structInfo) return '??? · ???系列'

    const seriesName = this.getSeriesChineseName(seriesCode || '')
    const shapeName = NamingEngine.getShapeName(structInfo.shapeCode)

    const input: SkuNameInput = {
      spuName: '',
      externalCode: structInfo.externalCode,
      shapeName,
      seriesChineseName: seriesName,
      gender,
      colorName,
      skinToneEffect,
      faceShapeEffect,
    }
    return NamingEngine.generateSkuName(input)
  }

  async getEffectRecommendation(
    colorCode: string,
  ): Promise<{ skinToneEffect: string; faceShapeEffect: string } | null> {
    const rec = await this.effectRecRepo.findOne({
      where: { colorCode, isPrimary: true },
      order: { sortOrder: 'ASC' },
    })
    if (rec) return { skinToneEffect: rec.skinToneEffect, faceShapeEffect: rec.faceShapeEffect }
    return null
  }

  async getEffectTags(type: 'skin_tone' | 'face_shape'): Promise<DictEffectTag[]> {
    return this.effectTagRepo.find({
      where: { effectType: type, isActive: true },
      order: { sortOrder: 'ASC' },
    })
  }

  private async getStructureInfo(internalCode: string): Promise<{ externalCode: string; shapeCode: string } | null> {
    if (!internalCode) return null
    const repo = this.structRepo
    const found1 = await repo.findOne({
      where: { internalCode: internalCode.toLowerCase() } as unknown as StructWhere,
    })
    if (found1) {
      return { externalCode: found1.externalCode, shapeCode: found1.shapeCode }
    }
    const match = internalCode.match(/^([A-Za-z])(\d+)/)
    if (match) {
      const extCode = match[2]
      const found2 = await repo.findOne({ where: { externalCode: extCode } as unknown as StructWhere })
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
}
