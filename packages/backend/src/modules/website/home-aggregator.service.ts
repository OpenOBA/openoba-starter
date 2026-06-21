import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProductSpu } from '../product/entity/product-spu.entity'
import { ProductSku } from '../product/entity/product-sku.entity'
import { ProductCategory } from '../product/entity/product-category.entity'
import { ProductSkuImage } from '../product/entity/product-sku-image.entity'
import { Inventory } from '../inventory/entity/inventory.entity'
import { Order } from '../order/entity/order.entity'
import { OrderItem } from '../order/entity/order-item.entity'
import { StructureCompatibility } from '../structure/entity/structure-compatibility.entity'
import { SpuCardDto, SkuCardDto, HomeResponseDto, CategoryNodeDto, WebsiteImageDto } from './website.dto'
import { PRODUCT_STATUS, SKU_STATUS } from '../product/product.constants'
import { ORDER_STATUS } from '../order/order.constants'

// ============================================================
// 首页聚合 & 目录基础 Service
//
// 负责: 首页聚合(getHome)、分类树、精选/爆款/新品列表
//        所有 SPU 卡片映射、库存/销量批量聚合
// ============================================================

const LOW_STOCK_THRESHOLD = 5

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

@Injectable()
export class WebsiteHomeAggregatorService {
  constructor(
    @InjectRepository(ProductSpu) private spuRepo: Repository<ProductSpu>,
    @InjectRepository(ProductSku) private skuRepo: Repository<ProductSku>,
    @InjectRepository(ProductSkuImage) private skuImageRepo: Repository<ProductSkuImage>,
    @InjectRepository(ProductCategory) private catRepo: Repository<ProductCategory>,
    @InjectRepository(Inventory) private invRepo: Repository<Inventory>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private orderItemRepo: Repository<OrderItem>,
    @InjectRepository(StructureCompatibility) private compatRepo: Repository<StructureCompatibility>,
  ) {}

  async getHome(): Promise<HomeResponseDto> {
    const [categories, featured, bestsellers, newArrivals] = await Promise.all([
      this.getCategoryTree(),
      this.getFeaturedProducts(8),
      this.getBestsellers(8),
      this.getNewArrivals(8),
    ])

    const sceneTags = new Set<string>()
    ;[...featured, ...bestsellers, ...newArrivals].forEach((p) => {
      p.sceneTags?.forEach((t) => sceneTags.add(t))
    })

    return {
      categories,
      featured,
      bestsellers,
      newArrivals,
      sceneTags: Array.from(sceneTags).slice(0, 12),
      cdnBaseUrl: process.env.CDN_BASE_URL || '',
    }
  }

  async getCategoryTree(): Promise<CategoryNodeDto[]> {
    const categories = await this.catRepo
      .createQueryBuilder('c')
      .where('c.isActive = :active', { active: true })
      .orderBy('c.sortOrder', 'ASC')
      .getMany()

    const counts = await this.spuRepo
      .createQueryBuilder('s')
      .select('s.category.categoryId', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .where('s.status = :status', { status: PRODUCT_STATUS.on_sale })
      .andWhere('s.isDeleted = :del', { del: false })
      .groupBy('s.category.categoryId')
      .getRawMany()

    const countMap: Record<string, number> = {}
    counts.forEach((c: any) => {
      countMap[c.categoryId] = parseInt(c.count)
    })

    const nodes: CategoryNodeDto[] = categories.map((c) => ({
      categoryId: c.categoryId,
      categoryCode: c.categoryCode,
      categoryName: c.categoryName,
      parentId: c.parentId || null,
      level: c.level,
      sortOrder: c.sortOrder,
      productCount: countMap[c.categoryId] || 0,
      children: [],
    }))

    const rootNodes: CategoryNodeDto[] = []
    const nodeMap = new Map(nodes.map((n) => [n.categoryId, n]))
    nodes.forEach((n) => {
      if (n.parentId && nodeMap.has(n.parentId)) {
        nodeMap.get(n.parentId)!.children.push(n)
      } else {
        rootNodes.push(n)
      }
    })

    return rootNodes
  }

  async getCompatibleFrames(structureStandardCode: string): Promise<any[]> {
    const compatRecords = await this.compatRepo
      .createQueryBuilder('sc')
      .where('sc.structure_standard_code = :code', { code: structureStandardCode })
      .andWhere('sc.isActive = :active', { active: true })
      .getMany()

    if (compatRecords.length === 0) return []

    const skuIds = compatRecords.map((c) => c.productSkuId)

    const skus = await this.skuRepo
      .createQueryBuilder('sku')
      .leftJoin('sku.spu', 'spu')
      .leftJoin('spu.category', 'cat')
      .leftJoin('sku.color', 'c')
      .where('sku.skuId IN (:...ids)', { ids: skuIds })
      .andWhere('sku.isDeleted = :del', { del: false })
      .andWhere('sku.status = :status', { status: SKU_STATUS.active })
      .andWhere('spu.isDeleted = :del2', { del2: false })
      .andWhere('spu.status = :status2', { status2: 'active' })
      .getMany()

    const [salesMap, invMap, imagesMap] = await Promise.all([
      this.batchGetSalesBySku(skuIds),
      this.batchGetInventory(skuIds),
      this.batchGetSkuImages(skuIds),
    ])

    const compatLevelMap = new Map<string, string>()
    compatRecords.forEach((c) => compatLevelMap.set(c.productSkuId, c.compatibilityLevel))

    return skus.map((sku) => {
      const inv = invMap[sku.skuId]
      const availableQty = inv?.availableQuantity ?? 0
      const primaryImg = (imagesMap[sku.skuId]?.main || imagesMap[sku.skuId]?.gallery || [])[0]

      return {
        skuId: sku.skuId,
        skuCode: sku.skuCode,
        spuName: (sku as any).spu?.spuName || '',
        categoryName: (sku as any).spu?.category?.categoryName || '',
        colorName: sku.color?.colorName || '',
        colorHex: sku.color?.hexValue || '',
        price: Number(sku.retailPrice),
        retailPrice: Number(sku.retailPrice),
        compatibilityLevel: compatLevelMap.get(sku.skuId) || '',
        primaryImage: primaryImg?.imageUrl || null,
        stockStatus: this.getStockStatus(availableQty),
      }
    })
  }

  async getCompatibleFrameCount(structureStandardCode: string): Promise<number> {
    return this.compatRepo
      .createQueryBuilder('sc')
      .where('sc.structure_standard_code = :code', { code: structureStandardCode })
      .andWhere('sc.isActive = :active', { active: true })
      .getCount()
  }

  // --- Aggregation helpers used by catalog + detail ---

  async batchGetSales(spuIds: string[]): Promise<Record<string, number>> {
    if (spuIds.length === 0) return {}

    const skus = await this.skuRepo
      .createQueryBuilder('sku')
      .where('sku.spuId IN (:...spuIds)', { spuIds })
      .select(['sku.skuId', 'sku.spuId'])
      .getMany()

    if (skus.length === 0) return {}

    const skuIds = skus.map((s) => s.skuId)
    const spuIdBySkuId = new Map<string, string>()
    skus.forEach((s) => spuIdBySkuId.set(s.skuId, s.spuId))

    const result = await this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin(Order, 'o', 'oi.order_id = o.order_id')
      .select('oi.sku_code', 'skuCode')
      .addSelect('SUM(oi.quantity)', 'totalQty')
      .where('oi.sku_code IN (:...skuIds)', { skuIds })
      .andWhere('o.status IN (:...orderStatuses)')
      .groupBy('oi.sku_code')
      .getRawMany()

    const map: Record<string, number> = {}
    result.forEach((r: any) => {
      const spuId = spuIdBySkuId.get(r.skuCode)
      if (spuId) {
        map[spuId] = (map[spuId] || 0) + parseInt(r.totalQty)
      }
    })
    return map
  }

  async batchGetSalesBySku(skuIds: string[]): Promise<Record<string, number>> {
    if (skuIds.length === 0) return {}

    const result = await this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin(Order, 'o', 'oi.order_id = o.order_id')
      .select('oi.sku_code', 'skuCode')
      .addSelect('SUM(oi.quantity)', 'totalQty')
      .where('oi.sku_code IN (:...skuIds)', { skuIds })
      .andWhere('o.status IN (:...orderStatuses)', {
        orderStatuses: [ORDER_STATUS.paid, ORDER_STATUS.shipped, ORDER_STATUS.delivered, ORDER_STATUS.completed],
      })
      .groupBy('oi.sku_code')
      .getRawMany()

    const map: Record<string, number> = {}
    result.forEach((r: any) => {
      map[r.skuCode] = parseInt(r.totalQty)
    })
    return map
  }

  async batchGetInventory(skuIds: string[]): Promise<Record<string, Inventory>> {
    if (skuIds.length === 0) return {}

    const records = await this.invRepo.createQueryBuilder('i').where('i.skuId IN (:...ids)', { ids: skuIds }).getMany()

    const map: Record<string, Inventory> = {}
    records.forEach((r) => {
      map[r.skuId] = r
    })
    return map
  }

  async batchGetSkuImages(skuIds: string[]): Promise<Record<string, Record<string, WebsiteImageDto[]>>> {
    if (skuIds.length === 0) return {}

    const images = await this.skuImageRepo
      .createQueryBuilder('i')
      .where('i.skuId IN (:...ids)', { ids: skuIds })
      .andWhere('i.isDeleted = :del', { del: false })
      .andWhere('i.isActive = :active', { active: true })
      .orderBy('i.sortOrder', 'ASC')
      .getMany()

    const map: Record<string, Record<string, WebsiteImageDto[]>> = {}
    for (const img of images) {
      if (!map[img.skuId]) map[img.skuId] = {}
      if (!map[img.skuId][img.imageType]) map[img.skuId][img.imageType] = []
      map[img.skuId][img.imageType].push({
        imageId: img.imageId,
        imageUrl: img.imageUrl,
        imageType: img.imageType,
        altText: img.altText || '',
        isPrimary: img.isPrimary,
        sortOrder: img.sortOrder,
      })
    }
    return map
  }

  async mapSpuCards(spus: ProductSpu[]): Promise<SpuCardDto[]> {
    if (spus.length === 0) return []

    const spuIds = spus.map((s) => s.spuId)

    const compatCounts: Record<string, number> = {}
    await Promise.all(
      spus.map(async (spu) => {
        compatCounts[spu.spuId] = await this.getCompatibleFrameCount(spu.structureStandardCode)
      }),
    )

    const allSkus = await this.skuRepo
      .createQueryBuilder('sku')
      .leftJoin('sku.color', 'c')
      .where('sku.spuId IN (:...ids)', { ids: spuIds })
      .andWhere('sku.isDeleted = :del', { del: false })
      .andWhere('sku.status = :status', { status: SKU_STATUS.active })
      .getMany()

    const skusBySpu: Record<string, typeof allSkus> = {}
    allSkus.forEach((sku) => {
      if (!skusBySpu[sku.spuId]) skusBySpu[sku.spuId] = []
      skusBySpu[sku.spuId].push(sku)
    })

    const allSkuIds = allSkus.map((s) => s.skuId)
    const [salesMap, invMap, imagesMap] = await Promise.all([
      this.batchGetSales(spuIds),
      this.batchGetInventory(allSkuIds),
      this.batchGetSkuImages(allSkuIds),
    ])

    return spus.map((spu) => {
      const skus = skusBySpu[spu.spuId] || []
      const totalSales = salesMap[spu.spuId] || 0
      let hasStock = false
      let hasLowStock = false
      let minPrice = Infinity

      const skuCards: SkuCardDto[] = skus.map((sku) => {
        const inv = invMap[sku.skuId]
        const availableQty = inv?.availableQuantity ?? 0
        const stockStatus = this.getStockStatus(availableQty)
        if (stockStatus === 'in_stock') hasStock = true
        if (stockStatus === 'low_stock') hasLowStock = true

        const effectivePrice = sku.retailPrice
        if (effectivePrice < minPrice) minPrice = effectivePrice

        const primaryImg = (imagesMap[sku.skuId]?.main || imagesMap[sku.skuId]?.gallery || [])[0]

        return {
          skuId: sku.skuId,
          skuCode: sku.skuCode,
          skuName: sku.skuName || spu.spuName,
          colorCode: sku.colorCode || '',
          colorName: sku.color?.colorName || '',
          colorHex: sku.color?.hexValue || '',
          price: Number(sku.retailPrice),
          retailPrice: Number(sku.retailPrice),
          stockStatus,
          availableQuantity: availableQty,
          salesVolume: 0,
          primaryImage: primaryImg?.imageUrl || null,
        }
      })

      if (minPrice === Infinity) minPrice = 0

      const frameCount = compatCounts[spu.spuId] || 0
      const tierInfo = resolveTier(spu.productTier || 'color')

      return {
        spuId: spu.spuId,
        spuCode: spu.spuCode,
        spuName: spu.spuName,
        categoryName: (spu as any).category?.categoryName || '',
        gender: spu.gender,
        sceneTags: spu.sceneTags || [],
        description: spu.description || '',
        minPrice,
        minPromoPrice: null,
        totalSales,
        stockStatus: hasStock ? 'in_stock' : hasLowStock ? 'low_stock' : 'out_of_stock',
        mainImage: spu.mainImage || null,
        structureStandardCode: spu.structureStandardCode,
        compatibilityLevels: spu.compatibilityLevels || [],
        compatibleFrameCount: frameCount,
        ctaCompatibleFramesUrl: `/compatible-frames/${spu.structureStandardCode}`,
        productTier: spu.productTier || 'color',
        tierName: tierInfo.name,
        tierIconColor: tierInfo.iconColor,
        skus: skuCards,
      }
    })
  }

  getStockStatus(availableQty: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
    if (availableQty <= 0) return 'out_of_stock'
    if (availableQty <= LOW_STOCK_THRESHOLD) return 'low_stock'
    return 'in_stock'
  }

  // --- Featured / Bestseller / NewArrival for getHome ---

  private async getFeaturedProducts(limit: number): Promise<SpuCardDto[]> {
    const spus = await this.spuRepo
      .createQueryBuilder('s')
      .leftJoin('s.category', 'cat')
      .where('s.status = :status', { status: PRODUCT_STATUS.on_sale })
      .andWhere('s.isDeleted = :del', { del: false })
      .andWhere('s.main_image IS NOT NULL')
      .orderBy('s.updatedAt', 'DESC')
      .limit(limit)
      .getMany()

    return this.mapSpuCards(spus)
  }

  private async getBestsellers(limit: number): Promise<SpuCardDto[]> {
    const spus = await this.spuRepo
      .createQueryBuilder('s')
      .leftJoin('s.category', 'cat')
      .where('s.status = :status', { status: PRODUCT_STATUS.on_sale })
      .andWhere('s.isDeleted = :del', { del: false })
      .limit(50)
      .getMany()

    const spuIds = spus.map((s) => s.spuId)
    const salesMap = await this.batchGetSales(spuIds)

    const sorted = [...spus].sort((a, b) => (salesMap[b.spuId] || 0) - (salesMap[a.spuId] || 0))
    const cards = await this.mapSpuCards(sorted)
    cards.sort((a, b) => b.totalSales - a.totalSales)
    return cards.slice(0, limit)
  }

  private async getNewArrivals(limit: number): Promise<SpuCardDto[]> {
    const spus = await this.spuRepo
      .createQueryBuilder('s')
      .leftJoin('s.category', 'cat')
      .where('s.status = :status', { status: PRODUCT_STATUS.on_sale })
      .andWhere('s.isDeleted = :del', { del: false })
      .orderBy('s.createdAt', 'DESC')
      .limit(limit)
      .getMany()

    return this.mapSpuCards(spus)
  }
}
