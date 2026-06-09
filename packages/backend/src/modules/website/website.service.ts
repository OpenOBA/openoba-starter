import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { ProductSpu } from '../product/entity/product-spu.entity'
import { ProductSku } from '../product/entity/product-sku.entity'
import { ProductSkuImage } from '../product/entity/product-sku-image.entity'
import { ProductCategory } from '../product/entity/product-category.entity'
import { ProductSet } from '../product/entity/product-set.entity'
import { DictSkuColor } from '../product/entity/dict-spu-color.entity'
import { DictFrameMaterial } from '../product/entity/dict-frame-material.entity'
import { DictFrameType } from '../product/entity/dict-frame-type.entity'
import { DictNosePad } from '../product/entity/dict-nose-pad.entity'
import { DictHinge } from '../product/entity/dict-hinge.entity'
import { DictSurfaceTreatment } from '../product/entity/dict-surface-treatment.entity'
import { Inventory } from '../inventory/entity/inventory.entity'
import { Order } from '../order/entity/order.entity'
import { OrderItem } from '../order/entity/order-item.entity'
import { StructureCompatibility } from '../structure/entity/structure-compatibility.entity'
import { StructureStandard } from '../structure/entity/structure-standard.entity'
import {
  SpuCardDto,
  SpuDetailDto,
  SkuCardDto,
  SkuDetailDto,
  WebsiteImageDto,
  HomeResponseDto,
  CategoryNodeDto,
  CompatibleFrameDto,
  WebsiteConfigDto,
  SearchResultDto,
  SearchSuggestionDto,
  PaginatedResponse,
} from './website.dto'
import { PRODUCT_STATUS, SKU_STATUS } from '../product/product.constants'
import { ORDER_STATUS } from '../order/order.constants'

// 库存阈值
const LOW_STOCK_THRESHOLD = 5

// 产品级别映射
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
export class WebsiteService {
  constructor(
    @InjectRepository(ProductSpu) private spuRepo: Repository<ProductSpu>,
    @InjectRepository(ProductSku) private skuRepo: Repository<ProductSku>,
    @InjectRepository(ProductSkuImage) private skuImageRepo: Repository<ProductSkuImage>,
    @InjectRepository(ProductCategory) private catRepo: Repository<ProductCategory>,
    @InjectRepository(ProductSet) private setRepo: Repository<ProductSet>,
    @InjectRepository(DictSkuColor) private colorRepo: Repository<DictSkuColor>,
    @InjectRepository(DictFrameMaterial) private frameMaterialRepo: Repository<DictFrameMaterial>,
    @InjectRepository(DictFrameType) private frameTypeRepo: Repository<DictFrameType>,
    @InjectRepository(DictNosePad) private nosePadRepo: Repository<DictNosePad>,
    @InjectRepository(DictHinge) private hingeRepo: Repository<DictHinge>,
    @InjectRepository(DictSurfaceTreatment) private surfaceTreatmentRepo: Repository<DictSurfaceTreatment>,
    @InjectRepository(Inventory) private invRepo: Repository<Inventory>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private orderItemRepo: Repository<OrderItem>,
    @InjectRepository(StructureCompatibility) private compatRepo: Repository<StructureCompatibility>,
    @InjectRepository(StructureStandard) private structureRepo: Repository<StructureStandard>,
  ) {}

  // ============================================================
  // 首页聚合
  // ============================================================
  async getHome(): Promise<HomeResponseDto> {
    const [categories, featured, bestsellers, newArrivals] = await Promise.all([
      this.getCategoryTree(),
      this.getFeaturedProducts(8),
      this.getBestsellers(8),
      this.getNewArrivals(8),
    ])

    // 收集所有场景标签
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

  // ============================================================
  // 精选商品（手动挑选：status=active 且 main_image 存在的商品）
  // ============================================================
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

  // ============================================================
  // 爆款（按销量排序）
  // ============================================================
  private async getBestsellers(limit: number): Promise<SpuCardDto[]> {
    // 先查所有 active SPU
    const spus = await this.spuRepo
      .createQueryBuilder('s')
      .leftJoin('s.category', 'cat')
      .where('s.status = :status', { status: PRODUCT_STATUS.on_sale })
      .andWhere('s.isDeleted = :del', { del: false })
      .limit(50)
      .getMany()

    // 批量计算销量
    const spuIds = spus.map((s) => s.spuId)
    const salesMap = await this.batchGetSales(spuIds)

    // 按销量排序，取 top N
    const sorted = spus.sort((a, b) => (salesMap[b.spuId] || 0) - (salesMap[a.spuId] || 0))
    const cards = await this.mapSpuCards(sorted)
    // 重新按销量排序
    cards.sort((a, b) => b.totalSales - a.totalSales)
    return cards.slice(0, limit)
  }

  // ============================================================
  // 新品（按创建时间排序）
  // ============================================================
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

  // ============================================================
  // 商品目录（分页 + 筛选 + 排序）
  // ============================================================
  async getCatalog(query: any): Promise<PaginatedResponse<SpuCardDto>> {
    const {
      page = 1,
      pageSize = 20,
      categoryId,
      gender,
      sceneTag,
      productTier,
      minPrice,
      maxPrice,
      sort = 'default', // default | price_asc | price_desc | sales | newest
    } = query

    const qb = this.spuRepo
      .createQueryBuilder('s')
      .leftJoin('s.category', 'cat')
      .where('s.status = :status', { status: PRODUCT_STATUS.on_sale })
      .andWhere('s.isDeleted = :del', { del: false })

    if (categoryId) qb.andWhere('cat.categoryId = :cid', { cid: categoryId })
    if (gender) qb.andWhere('s.gender = :g', { g: gender })
    if (sceneTag) qb.andWhere('JSON_CONTAINS(s.scene_tags, :st)', { st: JSON.stringify(sceneTag) })
    if (productTier) qb.andWhere('s.product_tier = :tier', { tier: productTier })

    // 排序
    switch (sort) {
      case 'price_asc':
        qb.orderBy('s.updatedAt', 'DESC') // 先用 updatedAt 占位，价格排序在后端处理
        break
      case 'price_desc':
        qb.orderBy('s.updatedAt', 'DESC')
        break
      case 'sales':
        qb.orderBy('s.createdAt', 'DESC') // 销量排序在后端处理
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

    let cards = await this.mapSpuCards(items)

    // 价格/销量排序需要在映射后处理
    if (sort === 'price_asc') cards.sort((a, b) => a.minPrice - b.minPrice)
    if (sort === 'price_desc') cards.sort((a, b) => b.minPrice - a.minPrice)
    if (sort === 'sales') cards.sort((a, b) => b.totalSales - a.totalSales)

    // 价格范围过滤
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

  // ============================================================
  // 商品详情
  // ============================================================
  async getProductDetail(spuId: string): Promise<SpuDetailDto> {
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
      this.batchGetSalesBySku(skuIds),
      this.batchGetInventory(skuIds),
      this.batchGetSkuImages(skuIds),
      this.getCompatibleFrameCount(spu.structureStandardCode),
    ])

    let totalSales = 0
    let hasStock = false
    let hasLowStock = false
    let minPrice = Infinity
    const minPromoPrice: number | null = null

    // Phase 8B: 预加载所有字典用于翻译
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

    const skuDetails: SkuDetailDto[] = skus.map((sku) => {
      const sales = salesMap[sku.skuId] || 0
      totalSales += sales
      const inv = invMap[sku.skuId]
      const availableQty = inv?.availableQuantity ?? 0
      const stockStatus = this.getStockStatus(availableQty)
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
        images: imagesMap[sku.skuId] || {},
        displayParams: skuTech.displayParams,
        fullTechSpec: skuTech.fullTechSpec,
      }
    })

    if (minPrice === Infinity) minPrice = 0

    return {
      spuId: spu.spuId,
      spuCode: spu.spuCode,
      spuName: spu.spuName,
      categoryName: (spu as any).category?.categoryName || '',
      categoryId: (spu as any).category?.categoryId || '',
      gender: spu.gender,
      sceneTags: spu.sceneTags || [],
      description: spu.description || '',
      mainImage: spu.mainImage || null,
      images: spu.images || [],
      attributes: spu.attributes || {},
      structureStandardCode: spu.structureStandardCode,
      compatibilityLevels: spu.compatibilityLevels || [],
      minPrice,
      minPromoPrice,
      totalSales,
      stockStatus: hasStock ? 'in_stock' : hasLowStock ? 'low_stock' : 'out_of_stock',
      skus: skuDetails,
      compatibleFrameCount: compatCount,
      ctaCompatibleFramesUrl: `/compatible-frames/${spu.structureStandardCode}`,
      productTier: spu.productTier || 'color',
      tierName: resolveTier(spu.productTier || 'color').name,
      tierIconColor: resolveTier(spu.productTier || 'color').iconColor,
      createdAt: spu.createdAt,
    }
  }

  // ============================================================
  // 分类导航树
  // ============================================================
  async getCategoryTree(): Promise<CategoryNodeDto[]> {
    const categories = await this.catRepo
      .createQueryBuilder('c')
      .where('c.isActive = :active', { active: true })
      .orderBy('c.sortOrder', 'ASC')
      .getMany()

    // 批量统计每个分类的商品数
    const catIds = categories.map((c) => c.categoryId)
    const counts = await this.spuRepo
      .createQueryBuilder('s')
      .select('s.category.categoryId', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .where('s.status = :status', { status: PRODUCT_STATUS.on_sale })
      .andWhere('s.isDeleted = :del', { del: false })
      .groupBy('s.category.categoryId')
      .getRawMany()

    const countMap: Record<string, number> = {}
    counts.forEach((c) => {
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

    // 构建树
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

  // ============================================================
  // 搜索
  // ============================================================
  async search(query: any): Promise<SearchResultDto> {
    const { keyword = '', page = 1, pageSize = 20 } = query

    if (!keyword.trim()) {
      return { products: [], suggestions: [], total: 0 }
    }

    const kw = `%${keyword.trim()}%`

    // 搜索 SPU 名称、描述、分类名称
    const spus = await this.spuRepo
      .createQueryBuilder('s')
      .leftJoin('s.category', 'cat')
      .where('s.isDeleted = :del', { del: false })
      .andWhere('(s.spu_name LIKE :kw OR s.description LIKE :kw OR s.spu_code LIKE :kw OR cat.category_name LIKE :kw)', { kw })
      .orderBy('s.updatedAt', 'DESC')
      .limit(50)
      .getMany()

    const cards = await this.mapSpuCards(spus)

    // 搜索建议（从颜色名称、分类名称中获取）
    const colorSuggestions = await this.colorRepo
      .createQueryBuilder('c')
      .select('c.color_name')
      .where('c.color_name LIKE :kw', { kw })
      .limit(5)
      .getRawMany()

    const suggestions = [...colorSuggestions.map((c: any) => c.color_name), keyword.trim()].slice(0, 8)

    return {
      products: cards.slice(0, pageSize),
      suggestions,
      total: cards.length,
    }
  }

  // ============================================================
  // 兼容镜框查询（核心差异化！）
  // ============================================================
  async getCompatibleFrames(structureStandardCode: string): Promise<CompatibleFrameDto[]> {
    // 查询所有兼容该结构标准的镜框 SKU
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

    const skuIdMap = new Map(skuIds.map((id) => [id, null as any]))
    const [salesMap, invMap, imagesMap] = await Promise.all([
      this.batchGetSalesBySku(skuIds),
      this.batchGetInventory(skuIds),
      this.batchGetSkuImages(skuIds),
    ])

    // 构建 compat level 映射
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

  // ============================================================
  // 官网配置
  // ============================================================
  getConfig(): WebsiteConfigDto {
    return {
      cdnBaseUrl: process.env.CDN_BASE_URL || '',
      currency: 'CNY',
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      imageTypes: ['main', 'gallery', 'detail', 'lifestyle', '360view', 'website_banner'],
    }
  }

  // ============================================================
  // 工具方法
  // ============================================================

  /** 批量计算 SPU 维度销量（从已完成/已发货订单聚合） */
  private async batchGetSales(spuIds: string[]): Promise<Record<string, number>> {
    if (spuIds.length === 0) return {}

    // 先查这些 SPU 下的所有 SKU
    const skus = await this.skuRepo
      .createQueryBuilder('sku')
      .where('sku.spuId IN (:...spuIds)', { spuIds })
      .select(['sku.skuId', 'sku.spuId'])
      .getMany()

    if (skus.length === 0) return {}

    const skuIds = skus.map((s) => s.skuId)
    const spuIdBySkuId = new Map<string, string>()
    skus.forEach((s) => spuIdBySkuId.set(s.skuId, s.spuId))

    // 通过 order_item.sku_code 匹配 SKU ID（sku_code 存储的就是 skuId）
    const result = await this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin(Order, 'o', 'oi.order_id = o.order_id')
      .select('oi.sku_code', 'skuCode')
      .addSelect('SUM(oi.quantity)', 'totalQty')
      .where('oi.sku_code IN (:...skuIds)', { skuIds })
      .andWhere('o.status IN (:...orderStatuses)')
      .groupBy('oi.sku_code')
      .getRawMany()

    // 聚合到 SPU 维度
    const map: Record<string, number> = {}
    result.forEach((r: any) => {
      const spuId = spuIdBySkuId.get(r.skuCode)
      if (spuId) {
        map[spuId] = (map[spuId] || 0) + parseInt(r.totalQty)
      }
    })
    return map
  }

  /** 批量计算 SKU 维度销量 */
  private async batchGetSalesBySku(skuIds: string[]): Promise<Record<string, number>> {
    if (skuIds.length === 0) return {}

    // order_item.sku_code 存储的是 skuId（UUID）
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

  /** 批量获取库存 */
  private async batchGetInventory(skuIds: string[]): Promise<Record<string, Inventory>> {
    if (skuIds.length === 0) return {}

    // 注意：inventory 表用的是 sku_id（UUID），不是 sku_code
    const records = await this.invRepo.createQueryBuilder('i').where('i.skuId IN (:...ids)', { ids: skuIds }).getMany()

    const map: Record<string, Inventory> = {}
    records.forEach((r) => {
      map[r.skuId] = r
    })
    return map
  }

  /** 批量获取 SKU 图片（按类型分组） */
  private async batchGetSkuImages(skuIds: string[]): Promise<Record<string, Record<string, WebsiteImageDto[]>>> {
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

  /** 获取兼容镜框数量 */
  private async getCompatibleFrameCount(structureStandardCode: string): Promise<number> {
    const count = await this.compatRepo
      .createQueryBuilder('sc')
      .where('sc.structure_standard_code = :code', { code: structureStandardCode })
      .andWhere('sc.isActive = :active', { active: true })
      .getCount()
    return count
  }

  /** 映射 SPU 卡片列表 */
  private async mapSpuCards(spus: ProductSpu[]): Promise<SpuCardDto[]> {
    if (spus.length === 0) return []

    const spuIds = spus.map((s) => s.spuId)

    // 批量查询兼容镜框数量
    const compatCounts: Record<string, number> = {}
    await Promise.all(
      spus.map(async (spu) => {
        compatCounts[spu.spuId] = await this.getCompatibleFrameCount(spu.structureStandardCode)
      }),
    )

    // 批量查询 SKU
    const allSkus = await this.skuRepo
      .createQueryBuilder('sku')
      .leftJoin('sku.color', 'c')
      .where('sku.spuId IN (:...ids)', { ids: spuIds })
      .andWhere('sku.isDeleted = :del', { del: false })
      .andWhere('sku.status = :status', { status: SKU_STATUS.active })
      .getMany()

    // 按 SPU 分组
    const skusBySpu: Record<string, typeof allSkus> = {}
    allSkus.forEach((sku) => {
      if (!skusBySpu[sku.spuId]) skusBySpu[sku.spuId] = []
      skusBySpu[sku.spuId].push(sku)
    })

    // 批量查询库存
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
      const minPromoPrice: number | null = null

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
          salesVolume: 0, // SKU 维度销量暂时用 0，SPU 维度有总量
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
        minPromoPrice,
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

  /** 库存状态判断 */
  private getStockStatus(availableQty: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
    if (availableQty <= 0) return 'out_of_stock'
    if (availableQty <= LOW_STOCK_THRESHOLD) return 'low_stock'
    return 'in_stock'
  }

  /** Phase 8B: 构建技术参数（展示版 + 完整版） */
  private buildTechSpec(
    sku: any,
    matMap: Map<string, any>,
    typeMap: Map<string, any>,
    noseMap: Map<string, any>,
    hingeMap: Map<string, any>,
    surfMap: Map<string, any>,
  ) {
    // 尺寸标注
    const sizeLabel = [sku.lensWidth, sku.bridgeWidth, sku.templeLength].filter((v) => v != null).join('□')
    const sizeLabelFormatted =
      sku.lensWidth && sku.bridgeWidth && sku.templeLength ? `${sku.lensWidth}\u25a1${sku.bridgeWidth}-${sku.templeLength}` : ''

    // 字典翻译
    const mat = sku.frameMaterial ? matMap.get(sku.frameMaterial) : null
    const ft = sku.frameType ? typeMap.get(sku.frameType) : null
    const np = sku.nosePadType ? noseMap.get(sku.nosePadType) : null
    const hg = sku.hingeType ? hingeMap.get(sku.hingeType) : null
    const st = sku.surfaceTreatment ? surfMap.get(sku.surfaceTreatment) : null

    // 重量标签
    const weight = sku.weightG
    const weightLabel = weight == null ? '' : weight < 15 ? '超轻' : weight < 25 ? '轻盈' : weight < 35 ? '标准' : '偏重'

    // 适合脸型翻译
    const faceShapeMap: Record<string, string> = {
      round: '圆脸',
      oval: '椭圆脸',
      square: '方脸',
      diamond: '菱形脸',
      heart: '心形脸',
      oblong: '长脸',
    }
    const faceShapes = Array.isArray(sku.suitableFaceShapes) ? sku.suitableFaceShapes.map((s: string) => faceShapeMap[s] || s) : []

    // 展示版（官网/电商 8 项精选）
    const displayParams = {
      sizeLabel: sizeLabelFormatted,
      frameMaterial: mat?.materialName || sku.frameMaterial || '',
      frameType: ft?.typeName || sku.frameType || '',
      nosePad: np?.padName || sku.nosePadType || '',
      weight: weight != null ? `${weight}g` : '',
      weightLabel,
      // ⚠️ 2026-04-24：镜框高度已废弃，返回空字符串
      suitableFaceShapes: faceShapes,
      surfaceTreatment: st?.treatmentName || sku.surfaceTreatment || '',
    }

    // 完整版（ERP/详情展开）
    const fullTechSpec = {
      lensWidth: sku.lensWidth || null,
      bridgeWidth: sku.bridgeWidth || null,
      templeLength: sku.templeLength || null,
      // ⚠️ 2026-04-24：镜框高度已废弃，返回 null
      totalWidth: sku.totalWidth || null,
      frameMaterial: mat ? { code: mat.materialCode, name: mat.materialName } : null,
      frameType: ft ? { code: ft.typeCode, name: ft.typeName } : null,
      nosePad: np ? { code: np.padCode, name: np.padName } : null,
      hingeType: hg ? { code: hg.hingeCode, name: hg.hingeName } : null,
      weightGrams: sku.weightG || null,
      surfaceTreatment: st ? { code: st.treatmentCode, name: st.treatmentName } : null,
      suitableFaceShapes: faceShapes,
      hasBlueLightFilter: !!sku.hasBlueLightFilter,
      hasPhotochromic: !!sku.hasPhotochromic,
      hasPolarized: !!sku.hasPolarized,
      uvProtection: sku.uvProtection || 'UV400',
    }

    return { displayParams, fullTechSpec }
  }
}
