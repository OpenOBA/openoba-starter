import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProductSpu } from '../product/entity/product-spu.entity'
import { ProductSku } from '../product/entity/product-sku.entity'
import { DictSkuColor } from '../product/entity/dict-spu-color.entity'
import { DictFrameMaterial } from '../product/entity/dict-frame-material.entity'
import { DictFrameType } from '../product/entity/dict-frame-type.entity'
import { DictNosePad } from '../product/entity/dict-nose-pad.entity'
import { DictHinge } from '../product/entity/dict-hinge.entity'
import { DictSurfaceTreatment } from '../product/entity/dict-surface-treatment.entity'
import {
  SpuDetailDto,
  SkuDetailDto,
  SearchResultDto,
  PaginatedResponse,
  SpuCardDto,
  WebsiteImageDto,
} from './website.dto'
import { PRODUCT_STATUS, SKU_STATUS } from '../product/product.constants'

// ============================================================
// 商品目录 & 搜索 & 详情 Service
//
// 负责: 商品目录分页/筛选/排序、商品详情、搜索、兼容镜框数量
// ============================================================



@Injectable()
export class WebsiteCatalogService {
  constructor(
    @InjectRepository(ProductSpu) private spuRepo: Repository<ProductSpu>,
    @InjectRepository(ProductSku) private skuRepo: Repository<ProductSku>,
    @InjectRepository(DictSkuColor) private colorRepo: Repository<DictSkuColor>,
    @InjectRepository(DictFrameMaterial) private frameMaterialRepo: Repository<DictFrameMaterial>,
    @InjectRepository(DictFrameType) private frameTypeRepo: Repository<DictFrameType>,
    @InjectRepository(DictNosePad) private nosePadRepo: Repository<DictNosePad>,
    @InjectRepository(DictHinge) private hingeRepo: Repository<DictHinge>,
    @InjectRepository(DictSurfaceTreatment) private surfaceTreatmentRepo: Repository<DictSurfaceTreatment>,
  ) {}

  async getCatalog(query: { [key: string]: unknown }, helpers: CatalogHelpers): Promise<PaginatedResponse<SpuCardDto>> {
    const page = (query.page as number) || 1
    const pageSize = (query.pageSize as number) || 20
    const categoryId = query.categoryId as string | undefined
    const gender = query.gender as string | undefined
    const sceneTag = query.sceneTag as string | undefined
    const productTier = query.productTier as string | undefined
    const minPrice = query.minPrice as number | undefined
    const maxPrice = query.maxPrice as number | undefined
    const sort = (query.sort as string) || 'default'

    const qb = this.spuRepo
      .createQueryBuilder('s')
      .leftJoin('s.category', 'cat')
      .where('s.status = :status', { status: PRODUCT_STATUS.on_sale })
      .andWhere('s.isDeleted = :del', { del: false })

    if (categoryId) qb.andWhere('cat.categoryId = :cid', { cid: categoryId })
    if (gender) qb.andWhere('s.gender = :g', { g: gender })
    if (sceneTag) qb.andWhere('JSON_CONTAINS(s.scene_tags, :st)', { st: JSON.stringify(sceneTag) })
    if (productTier) qb.andWhere('s.product_tier = :tier', { tier: productTier })

    switch (sort) {
      case 'price_asc':
      case 'price_desc':
      case 'sales':
        qb.orderBy('s.updatedAt', 'DESC')
        break
      case 'newest':
        qb.orderBy('s.createdAt', 'DESC')
        break
      default:
        qb.orderBy('s.updatedAt', 'DESC')
    }

    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()

    let cards = await helpers.mapSpuCards(items)

    if (sort === 'price_asc') cards.sort((a, b) => a.minPrice - b.minPrice)
    if (sort === 'price_desc') cards.sort((a, b) => b.minPrice - a.minPrice)
    if (sort === 'sales') cards.sort((a, b) => b.totalSales - a.totalSales)

    if (minPrice) cards = cards.filter((c) => c.minPrice >= Number(minPrice))
    if (maxPrice) cards = cards.filter((c) => c.minPrice <= Number(maxPrice))

    return {
      items: cards,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  async getProductDetail(spuId: string, helpers: ProductDetailHelpers): Promise<SpuDetailDto> {
    const spu = await this.spuRepo
      .createQueryBuilder('s')
      .leftJoin('s.category', 'cat')
      .where('s.spuId = :id', { id: spuId })
      .andWhere('s.isDeleted = :del', { del: false })
      .getOne()

    if (!spu) throw new Error('商品不存在')

    const skus = await this.skuRepo
      .createQueryBuilder('sku')
      .leftJoin('sku.color', 'c')
      .where('sku.spuId = :spuId', { spuId })
      .andWhere('sku.isDeleted = :del', { del: false })
      .andWhere('sku.status = :status', { status: SKU_STATUS.active })
      .getMany()

    const skuIds = skus.map((s) => s.skuId)
    const [salesMap, invMap, imagesMap, compatCount] = await Promise.all([
      helpers.batchGetSalesBySku(skuIds),
      helpers.batchGetInventory(skuIds),
      helpers.batchGetSkuImages(skuIds),
      helpers.getCompatibleFrameCount(spu.structureStandardCode),
    ])

    const [frameMaterials, frameTypes, nosePads, hinges, surfaceTreatments] = await Promise.all([
      this.frameMaterialRepo.find({ where: { isActive: 1 } }),
      this.frameTypeRepo.find({ where: { isActive: 1 } }),
      this.nosePadRepo.find({ where: { isActive: 1 } }),
      this.hingeRepo.find({ where: { isActive: 1 } }),
      this.surfaceTreatmentRepo.find({ where: { isActive: 1 } }),
    ])
    const matMap = new Map(frameMaterials.map((m) => [m.materialCode, m]))
    const typeMap = new Map(frameTypes.map((t) => [t.typeCode, t]))
    const noseMap = new Map(nosePads.map((n) => [n.padCode, n]))
    const hingeMap = new Map(hinges.map((h) => [h.hingeCode, h]))
    const surfMap = new Map(surfaceTreatments.map((s) => [s.treatmentCode, s]))

    let totalSales = 0
    let hasStock = false
    let hasLowStock = false
    let minPrice = Infinity

    const skuDetails: SkuDetailDto[] = skus.map((sku) => {
      const sales = salesMap[sku.skuId] || 0
      totalSales += sales
      const inv = invMap[sku.skuId]
      const availableQty = ((inv as Record<string, unknown> | undefined)?.availableQuantity as number) ?? 0
      const stockStatus = helpers.getStockStatus(availableQty)
      if (stockStatus === 'in_stock') hasStock = true
      if (stockStatus === 'low_stock') hasLowStock = true

      const effectivePrice = sku.retailPrice
      if (effectivePrice < minPrice) minPrice = effectivePrice

      const skuTech = this.buildTechSpec(sku, matMap, typeMap, noseMap, hingeMap, surfMap)

      return {
        skuId: sku.skuId,
        skuCode: sku.skuCode,
        skuName: sku.skuName || spu.spuName,
        colorCode: sku.colorCode || '',
        colorName: sku.color?.colorName || '',
        colorHex: sku.color?.hexValue || '',
        colorPreviewImage: sku.color?.previewImage || null,
        price: Number(sku.retailPrice),
        retailPrice: Number(sku.retailPrice),
        stockStatus,
        availableQuantity: availableQty,
        salesVolume: sales,
        skuAttributes: sku.skuAttributes || {},
        images: (imagesMap[sku.skuId] || {}) as Record<string, WebsiteImageDto[]>,
        displayParams: skuTech.displayParams,
        fullTechSpec: skuTech.fullTechSpec as SkuDetailDto['fullTechSpec'],
      }
    })

    if (minPrice === Infinity) minPrice = 0

    const tierCode = spu.productTier || 'color'
    const tierInfo = resolveTier(tierCode)

    return {
      spuId: spu.spuId,
      spuCode: spu.spuCode,
      spuName: spu.spuName,
      categoryName: ((spu.category as Record<string, unknown> | undefined)?.categoryName as string) || '',
      categoryId: ((spu.category as Record<string, unknown> | undefined)?.categoryId as string) || '',
      gender: spu.gender,
      sceneTags: spu.sceneTags || [],
      description: spu.description || '',
      mainImage: spu.mainImage || null,
      images: spu.images || [],
      attributes: spu.attributes || {},
      structureStandardCode: spu.structureStandardCode,
      compatibilityLevels: spu.compatibilityLevels || [],
      minPrice,
      minPromoPrice: null,
      totalSales,
      stockStatus: hasStock ? 'in_stock' : hasLowStock ? 'low_stock' : 'out_of_stock',
      skus: skuDetails,
      compatibleFrameCount: compatCount,
      ctaCompatibleFramesUrl: `/compatible-frames/${spu.structureStandardCode}`,
      productTier: spu.productTier || 'color',
      tierName: tierInfo.name,
      tierIconColor: tierInfo.iconColor,
      createdAt: spu.createdAt,
    }
  }

  async search(query: Record<string, unknown>, helpers: SearchHelpers): Promise<SearchResultDto> {
    const keyword = (query.keyword as string) || ''
    const page = (query.page as number) || 1
    const pageSize = (query.pageSize as number) || 20

    if (!keyword.trim()) {
      return { products: [], suggestions: [], total: 0 }
    }

    const kw = `%${keyword.trim()}%`

    const spus = await this.spuRepo
      .createQueryBuilder('s')
      .leftJoin('s.category', 'cat')
      .where('s.isDeleted = :del', { del: false })
      .andWhere(
        '(s.spu_name LIKE :kw OR s.description LIKE :kw OR s.spu_code LIKE :kw OR cat.category_name LIKE :kw)',
        { kw },
      )
      .orderBy('s.updatedAt', 'DESC')
      .limit(50)
      .getMany()

    const cards = await helpers.mapSpuCards(spus)

    const colorSuggestions = await this.colorRepo
      .createQueryBuilder('c')
      .select('c.color_name')
      .where('c.color_name LIKE :kw', { kw })
      .limit(5)
      .getRawMany()

    const suggestions = [
      ...colorSuggestions.map((c: Record<string, unknown>) => c.color_name as string),
      keyword.trim(),
    ].slice(0, 8)

    return {
      products: cards.slice(0, pageSize),
      suggestions,
      total: cards.length,
    }
  }

  private buildTechSpec(
    sku: Record<string, unknown>,
    matMap: Map<string, unknown>,
    typeMap: Map<string, unknown>,
    noseMap: Map<string, unknown>,
    hingeMap: Map<string, unknown>,
    surfMap: Map<string, unknown>,
  ) {
    const sizeLabelFormatted =
      sku.lensWidth && sku.bridgeWidth && sku.templeLength
        ? `${sku.lensWidth}□${sku.bridgeWidth}-${sku.templeLength}`
        : ''

    const mat = sku.frameMaterial ? (matMap.get(sku.frameMaterial) as Record<string, unknown> | undefined) : null
    const ft = sku.frameType ? (typeMap.get(sku.frameType) as Record<string, unknown> | undefined) : null
    const np = sku.nosePadType ? (noseMap.get(sku.nosePadType) as Record<string, unknown> | undefined) : null
    const hg = sku.hingeType ? (hingeMap.get(sku.hingeType) as Record<string, unknown> | undefined) : null
    const st = sku.surfaceTreatment ? (surfMap.get(sku.surfaceTreatment) as Record<string, unknown> | undefined) : null

    const weight = sku.weightG as number | undefined
    const weightLabel =
      weight == null ? '' : weight < 15 ? '超轻' : weight < 25 ? '轻盈' : weight < 35 ? '标准' : '偏重'

    const faceShapeMap: Record<string, string> = {
      round: '圆脸',
      oval: '椭圆脸',
      square: '方脸',
      diamond: '菱形脸',
      heart: '心形脸',
      oblong: '长脸',
    }
    const faceShapes = Array.isArray(sku.suitableFaceShapes)
      ? sku.suitableFaceShapes.map((s: string) => faceShapeMap[s] || s)
      : []

    const displayParams = {
      sizeLabel: sizeLabelFormatted,
      frameMaterial: mat?.materialName || sku.frameMaterial || '',
      frameType: ft?.typeName || sku.frameType || '',
      nosePad: np?.padName || sku.nosePadType || '',
      weight: weight != null ? `${weight}g` : '',
      weightLabel,
      suitableFaceShapes: faceShapes,
      surfaceTreatment: st?.treatmentName || sku.surfaceTreatment || '',
    }

    const fullTechSpec: Record<string, unknown> = {
      lensWidth: sku.lensWidth || null,
      bridgeWidth: sku.bridgeWidth || null,
      templeLength: sku.templeLength || null,
      totalWidth: sku.totalWidth || null,
      frameMaterial: mat ? { code: mat.materialCode as string, name: mat.materialName as string } : null,
      frameType: ft ? { code: ft.typeCode as string, name: ft.typeName as string } : null,
      nosePad: np ? { code: np.padCode as string, name: np.padName as string } : null,
      hingeType: hg ? { code: hg.hingeCode as string, name: hg.hingeName as string } : null,
      weightGrams: sku.weightG || null,
      surfaceTreatment: st ? { code: st.treatmentCode as string, name: st.treatmentName as string } : null,
      suitableFaceShapes: faceShapes,
      hasBlueLightFilter: !!sku.hasBlueLightFilter,
      hasPhotochromic: !!sku.hasPhotochromic,
      hasPolarized: !!sku.hasPolarized,
      uvProtection: sku.uvProtection || 'UV400',
    }

    return { displayParams, fullTechSpec }
  }
}

// ============================================================
// 产品级别映射 & 工具函数
// ============================================================

const TIER_MAP: Record<string, { name: string; iconColor: string }> = {
  color: { name: '色彩级', iconColor: '#4CAF50' },
  style: { name: '风格级', iconColor: '#2196F3' },
  texture: { name: '质感级', iconColor: '#FF9800' },
  light_luxury: { name: '轻奢级', iconColor: '#E91E63' },
  smart: { name: '智能级', iconColor: '#9C27B0' },
  luxury: { name: '奢华级', iconColor: '#1a1a1a' },
}

function resolveTier(tierCode: string): { name: string; iconColor: string } {
  return TIER_MAP[tierCode] || { name: tierCode || '', iconColor: '#999' }
}

// ============================================================
// 注入依赖接口 (website.service.ts 通过 helper 对象提供)
// ============================================================

export interface CatalogHelpers {
  mapSpuCards(spus: unknown[]): Promise<SpuCardDto[]>
}

export interface ProductDetailHelpers {
  batchGetSalesBySku(skuIds: string[]): Promise<Record<string, number>>
  batchGetInventory(skuIds: string[]): Promise<Record<string, unknown>>
  batchGetSkuImages(skuIds: string[]): Promise<Record<string, Record<string, unknown[]>>>
  getCompatibleFrameCount(structureStandardCode: string): Promise<number>
  getStockStatus(availableQty: number): 'in_stock' | 'low_stock' | 'out_of_stock'
}

export interface SearchHelpers {
  mapSpuCards(spus: unknown[]): Promise<SpuCardDto[]>
}
