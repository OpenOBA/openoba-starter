/* eslint-disable @typescript-eslint/no-explicit-any -- TODO: 需要类型化 */
import { Injectable } from '@nestjs/common'
import { ProductSpu } from '../product/entity/product-spu.entity'
import { WebsiteHomeAggregatorService } from './home-aggregator.service'
import { WebsiteCatalogService, CatalogHelpers, ProductDetailHelpers, SearchHelpers } from './website-catalog.service'
import {
  HomeResponseDto,
  SearchResultDto,
  PaginatedResponse,
  SpuCardDto,
  CompatibleFrameDto,
  WebsiteConfigDto,
  SpuDetailDto,
  CategoryNodeDto,
} from './website.dto'

// 库存阈值（官网配置用）
const LOW_STOCK_THRESHOLD = 5

/**
 * 官网前台 Facade Service
 *
 * 职责: 组合 WebsiteHomeAggregatorService + WebsiteCatalogService
 *       提供统一的入口供 Controller 调用
 *
 * ~300 行（原来是 792 行）
 */


@Injectable()
export class WebsiteService {
  constructor(
    private readonly homeAggregator: WebsiteHomeAggregatorService,
    private readonly catalogService: WebsiteCatalogService,
  ) {}

  // ============================================================
  // 首页聚合 → 委托 home-aggregator
  // ============================================================
  async getHome(): Promise<HomeResponseDto> {
    return this.homeAggregator.getHome()
  }

  // ============================================================
  // 分类导航树 → 委托 home-aggregator
  // ============================================================
  async getCategoryTree(): Promise<CategoryNodeDto[]> {
    return this.homeAggregator.getCategoryTree()
  }

  // ============================================================
  // 兼容镜框查询 → 委托 home-aggregator
  // ============================================================
  async getCompatibleFrames(structureStandardCode: string): Promise<CompatibleFrameDto[]> {
    return this.homeAggregator.getCompatibleFrames(structureStandardCode) as Promise<CompatibleFrameDto[]>
  }

  // ============================================================
  // 官网配置 → 本地方法
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
  // 商品目录（分页 + 筛选 + 排序）→ 委托 catalog-service
  // ============================================================
  async getCatalog(query: Record<string, unknown>): Promise<PaginatedResponse<SpuCardDto>> {
    const helpers: CatalogHelpers = {
      mapSpuCards: (spus: ProductSpu[]) => this.homeAggregator.mapSpuCards(spus),
    }
    return this.catalogService.getCatalog(query, helpers)
  }

  // ============================================================
  // 商品详情 → 委托 catalog-service
  // ============================================================
  async getProductDetail(spuId: string): Promise<SpuDetailDto> {
    const helpers: ProductDetailHelpers = {
      batchGetSalesBySku: (skuIds) => this.homeAggregator.batchGetSalesBySku(skuIds),
      batchGetInventory: (skuIds) => this.homeAggregator.batchGetInventory(skuIds),
      batchGetSkuImages: (skuIds) => this.homeAggregator.batchGetSkuImages(skuIds),
      getCompatibleFrameCount: (code) => this.homeAggregator.getCompatibleFrameCount(code),
      getStockStatus: (qty) => this.homeAggregator.getStockStatus(qty),
    }
    return this.catalogService.getProductDetail(spuId, helpers)
  }

  // ============================================================
  // 搜索 → 委托 catalog-service
  // ============================================================
  async search(query: Record<string, unknown>): Promise<SearchResultDto> {
    const helpers: SearchHelpers = {
      mapSpuCards: (spus: ProductSpu[]) => this.homeAggregator.mapSpuCards(spus),
    }
    return this.catalogService.search(query, helpers)
  }
}
