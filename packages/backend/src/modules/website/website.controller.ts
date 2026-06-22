import { Controller, Get, Param, Query, UseInterceptors, CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { WebsiteService } from './website.service'
import { SkipTransform } from '../../common/interceptors/transform.interceptor'
import { Public } from '../../common/decorators/public.decorator'

/**
 * 官网 API 拦截器 — 绕过全局 TransformInterceptor
 * 返回扁平 JSON，不做 {code, message, data, timestamp} 包装
 */
class WebsiteInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle()
  }
}

@ApiTags('官网前台')
@Public()
@Controller('website')
@SkipTransform()
export class WebsiteController {
  constructor(private readonly websiteService: WebsiteService) {}

  // ============================================================
  // 首页聚合
  // ============================================================
  @ApiOperation({ summary: '首页数据聚合 — 分类导航 + 推荐 + 爆款 + 新品' })
  @Get('home')
  async home() {
    return this.websiteService.getHome()
  }

  // ============================================================
  // 商品目录
  // ============================================================
  @ApiOperation({ summary: '商品目录 — 分页列表 + 筛选 + 排序' })
  @Get('catalog')
  async catalog(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('categoryId') categoryId?: string,
    @Query('gender') gender?: string,
    @Query('sceneTag') sceneTag?: string,
    @Query('productTier') productTier?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sort') sort = 'default',
  ) {
    return this.websiteService.getCatalog({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      categoryId,
      gender,
      sceneTag,
      productTier,
      minPrice,
      maxPrice,
      sort,
    })
  }

  // ============================================================
  // 商品详情
  // ============================================================
  @ApiOperation({ summary: '商品详情 — SPU + SKU + 库存 + 销量 + 图片分组 + 兼容镜框数量' })
  @Get('product/:spu-id')
  async productDetail(@Param('spu-id') spuId: string) {
    return this.websiteService.getProductDetail(spuId)
  }

  // ============================================================
  // 搜索
  // ============================================================
  @ApiOperation({ summary: '商品搜索 — 关键词搜索 + 自动补全' })
  @Get('search')
  async search(@Query('keyword') keyword: string, @Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.websiteService.search({ keyword, page: parseInt(page), pageSize: parseInt(pageSize) })
  }

  // ============================================================
  // 分类导航
  // ============================================================
  @ApiOperation({ summary: '分类导航树' })
  @Get('categories')
  async categories() {
    return this.websiteService.getCategoryTree()
  }

  // ============================================================
  // 兼容镜框查询（核心差异化！）
  // ============================================================
  @ApiOperation({ summary: '查看兼容镜框 — 根据镜片标准查询所有兼容镜框（CTA 按钮的核心 API）' })
  @Get('compatible-frames/:structure-standard-code')
  async compatibleFrames(@Param('structure-standard-code') structureStandardCode: string) {
    return this.websiteService.getCompatibleFrames(structureStandardCode)
  }

  // ============================================================
  // 官网配置
  // ============================================================
  @ApiOperation({ summary: '官网配置 — CDN 地址 + 货币 + 图片类型' })
  @Get('config')
  async config() {
    return this.websiteService.getConfig()
  }
}
