import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { ProductService } from './product.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import {
  CreateColorDto,
  UpdateColorDto,
  CreateSpuDto,
  UpdateSpuDto,
  CreateSkuDto,
  UpdateSkuDto,
  CreateSetDto,
  UpdateSetDto,
  CreateSkuImageDto,
  UpdateSkuImageDto,
  QuerySkuImageDto,
  BatchCreateSkuImageDto,
  QueryProductDto,
  ReorderSkuImagesDto,
} from './dto/product.dto'
import { MCPCapable } from '../../common/decorators/mcp-capable.decorator'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('商品管理')
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin', 'operator')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // ===== 颜色字典 =====
  @ApiOperation({ summary: '颜色列表' })
  @Get('colors')
  @MCPCapable({
    tool: 'product.colors',
    description: '查询颜色字典列表',
    category: 'product',
    readOnly: true,
    industryScoped: true,
  })
  async colors(@Query() q: Record<string, string | number>) {
    return this.productService.findColors(q)
  }

  @ApiOperation({ summary: '颜色详情' })
  @Get('colors/:id')
  @MCPCapable({
    tool: 'product.color',
    description: '查询颜色详情',
    category: 'product',
    readOnly: true,
    industryScoped: true,
  })
  async color(@Param('id') id: string) {
    return this.productService.findOneColor(id)
  }

  @ApiOperation({ summary: '创建颜色' })
  @Post('colors')
  @MCPCapable({ tool: 'product.createColor', description: '创建颜色字典', category: 'product', industryScoped: true })
  async createColor(@Body() dto: CreateColorDto) {
    return this.productService.createColor(dto as unknown as Record<string, unknown>)
  }

  @ApiOperation({ summary: '更新颜色' })
  @Put('colors/:id')
  @MCPCapable({ tool: 'product.updateColor', description: '更新颜色字典', category: 'product', industryScoped: true })
  async updateColor(@Param('id') id: string, @Body() dto: UpdateColorDto) {
    return this.productService.updateColor(id, dto as unknown as Record<string, unknown>)
  }

  @ApiOperation({ summary: '删除颜色' })
  @Delete('colors/:id')
  @MCPCapable({ tool: 'product.deleteColor', description: '删除颜色字典', category: 'product', industryScoped: true })
  async deleteColor(@Param('id') id: string) {
    return this.productService.deleteColor(id)
  }

  // ===== SPU =====
  @ApiOperation({ summary: 'SPU 列表' })
  @Get('spus')
  @MCPCapable({
    tool: 'product.spus',
    description: '查询SPU列表（支持分页+筛选）',
    category: 'product',
    readOnly: true,
    industryScoped: true,
  })
  async spus(@Query() q: QueryProductDto) {
    return this.productService.findSpus(q as unknown as Record<string, unknown>)
  }

  @ApiOperation({ summary: 'SPU 详情' })
  @Get('spus/:id')
  @MCPCapable({
    tool: 'product.spu',
    description: '查询SPU详情（含关联SKU）',
    category: 'product',
    readOnly: true,
    industryScoped: true,
  })
  async spu(@Param('id') id: string) {
    return this.productService.findOneSpu(id)
  }

  @ApiOperation({ summary: '创建 SPU' })
  @Post('spus')
  @MCPCapable({ tool: 'product.createSpu', description: '创建SPU', category: 'product', industryScoped: true })
  async createSpu(@Body() dto: CreateSpuDto) {
    return this.productService.createSpu(dto as unknown as Record<string, unknown>)
  }

  @ApiOperation({ summary: '更新 SPU' })
  @Put('spus/:id')
  @MCPCapable({ tool: 'product.updateSpu', description: '更新SPU信息', category: 'product', industryScoped: true })
  async updateSpu(@Param('id') id: string, @Body() dto: UpdateSpuDto) {
    return this.productService.updateSpu(id, dto as unknown as Record<string, unknown>)
  }

  @ApiOperation({ summary: '删除 SPU' })
  @Delete('spus/:id')
  @MCPCapable({ tool: 'product.deleteSpu', description: '删除SPU', category: 'product', industryScoped: true })
  async deleteSpu(@Param('id') id: string) {
    return this.productService.deleteSpu(id)
  }

  // ===== SKU =====
  @ApiOperation({ summary: 'SKU 列表' })
  @Get('skus')
  @MCPCapable({
    tool: 'product.skus',
    description: '查询SKU列表（支持分页+筛选）',
    category: 'product',
    readOnly: true,
    industryScoped: true,
  })
  async skus(@Query() q: QueryProductDto) {
    return this.productService.findSkus(q)
  }

  @ApiOperation({ summary: 'SKU 详情' })
  @Get('skus/:id')
  @MCPCapable({
    tool: 'product.sku',
    description: '查询SKU详情（含条码/库存）',
    category: 'product',
    readOnly: true,
    industryScoped: true,
  })
  async sku(@Param('id') id: string) {
    return this.productService.findOneSku(id)
  }

  @ApiOperation({ summary: '创建 SKU' })
  @Post('skus')
  @MCPCapable({ tool: 'product.createSku', description: '创建SKU', category: 'product', industryScoped: true })
  async createSku(@Body() dto: CreateSkuDto) {
    return this.productService.createSku(dto)
  }

  @ApiOperation({ summary: '更新 SKU' })
  @Put('skus/:id')
  @MCPCapable({ tool: 'product.updateSku', description: '更新SKU信息', category: 'product', industryScoped: true })
  async updateSku(@Param('id') id: string, @Body() dto: UpdateSkuDto) {
    return this.productService.updateSku(id, dto)
  }

  @ApiOperation({ summary: '删除 SKU' })
  @Delete('skus/:id')
  @MCPCapable({ tool: 'product.deleteSku', description: '删除SKU', category: 'product', industryScoped: true })
  async deleteSku(@Param('id') id: string) {
    return this.productService.deleteSku(id)
  }

  @ApiOperation({ summary: '根据条码查找（内部条码/EAN-13/外部条码）' })
  @Get('barcodes/:barcode')
  @MCPCapable({ tool: 'product.findByBarcode', description: '按条码查找SKU', category: 'product', readOnly: true })
  async findByBarcode(@Param('barcode') barcode: string) {
    return this.productService.findOneByBarcode(barcode)
  }

  // ===== 套装 =====
  @ApiOperation({ summary: '套装列表' })
  @Get('sets')
  @MCPCapable({
    tool: 'product.sets',
    description: '查询套装列表',
    category: 'product',
    readOnly: true,
    industryScoped: true,
  })
  async sets(@Query() q: Record<string, string | number>) {
    return this.productService.findSets(q)
  }

  @ApiOperation({ summary: '套装详情' })
  @Get('sets/:id')
  @MCPCapable({
    tool: 'product.set',
    description: '查询套装详情（含内件）',
    category: 'product',
    readOnly: true,
    industryScoped: true,
  })
  async set(@Param('id') id: string) {
    return this.productService.findOneSet(id)
  }

  @ApiOperation({ summary: '创建套装' })
  @Post('sets')
  @MCPCapable({ tool: 'product.createSet', description: '创建套装', category: 'product', industryScoped: true })
  async createSet(@Body() dto: CreateSetDto) {
    return this.productService.createSet(dto as unknown as Record<string, unknown>)
  }

  @ApiOperation({ summary: '更新套装' })
  @Put('sets/:id')
  @MCPCapable({ tool: 'product.updateSet', description: '更新套装信息', category: 'product', industryScoped: true })
  async updateSet(@Param('id') id: string, @Body() dto: UpdateSetDto) {
    return this.productService.updateSet(id, dto as unknown as Record<string, unknown>)
  }

  @ApiOperation({ summary: '删除套装' })
  @Delete('sets/:id')
  @MCPCapable({ tool: 'product.deleteSet', description: '删除套装', category: 'product', industryScoped: true })
  async deleteSet(@Param('id') id: string) {
    return this.productService.deleteSet(id)
  }

  // ===== SKU 图片管理 =====
  @ApiOperation({ summary: 'SKU 图片列表' })
  @Get('sku-images')
  @MCPCapable({
    tool: 'product.skuImages',
    description: '查询SKU图片列表',
    category: 'product',
    readOnly: true,
    industryScoped: true,
  })
  async skuImages(@Query() q: QuerySkuImageDto) {
    return this.productService.findSkuImages(q)
  }

  @ApiOperation({ summary: '单张图片详情' })
  @Get('sku-images/:id')
  @MCPCapable({
    tool: 'product.skuImage',
    description: '查询单张SKU图片详情',
    category: 'product',
    readOnly: true,
    industryScoped: true,
  })
  async skuImage(@Param('id') id: string) {
    return this.productService.findOneSkuImage(id)
  }

  @ApiOperation({ summary: 'SKU 图片分组（官网 API）' })
  @Get('sku-images-grouped/:sku-id')
  @MCPCapable({
    tool: 'product.skuImagesGrouped',
    description: 'SKU图片按类型分组（官网用）',
    category: 'product',
    readOnly: true,
  })
  async skuImagesGrouped(@Param('sku-id') skuId: string) {
    return this.productService.getSkuImagesGrouped(skuId)
  }

  @ApiOperation({ summary: '创建 SKU 图片' })
  @Post('sku-images')
  @MCPCapable({
    tool: 'product.createSkuImage',
    description: '创建SKU图片记录',
    category: 'product',
    industryScoped: true,
  })
  async createSkuImage(@Body() dto: CreateSkuImageDto) {
    return this.productService.createSkuImage(dto)
  }

  @ApiOperation({ summary: '批量上传 SKU 图片' })
  @Post('sku-images/batch')
  @MCPCapable({
    tool: 'product.batchCreateSkuImages',
    description: '批量上传SKU图片',
    category: 'product',
    industryScoped: true,
  })
  async batchCreateSkuImages(@Body() dto: BatchCreateSkuImageDto) {
    return this.productService.batchCreateSkuImages(dto)
  }

  @ApiOperation({ summary: '更新 SKU 图片' })
  @Put('sku-images/:id')
  @MCPCapable({
    tool: 'product.updateSkuImage',
    description: '更新SKU图片信息',
    category: 'product',
    industryScoped: true,
  })
  async updateSkuImage(@Param('id') id: string, @Body() dto: UpdateSkuImageDto) {
    return this.productService.updateSkuImage(id, dto)
  }

  @ApiOperation({ summary: '删除 SKU 图片' })
  @Delete('sku-images/:id')
  @MCPCapable({ tool: 'product.deleteSkuImage', description: '删除SKU图片', category: 'product', industryScoped: true })
  async deleteSkuImage(@Param('id') id: string) {
    return this.productService.deleteSkuImage(id)
  }

  @ApiOperation({ summary: '批量重排 SKU 图片' })
  @Post('sku-images/reorder')
  @MCPCapable({
    tool: 'product.reorderSkuImages',
    description: '批量重排SKU图片顺序',
    category: 'product',
    industryScoped: true,
  })
  async reorderSkuImages(@Body() dto: ReorderSkuImagesDto) {
    return this.productService.reorderSkuImages(dto.skuId, dto.imageType, dto.orderedIds)
  }

  // ===== V2.0 命名规范：效果词库 =====
  @ApiOperation({ summary: '获取效果词库（按类型）' })
  @Get('effects/:type')
  @MCPCapable({
    tool: 'product.effects',
    description: '获取效果词库（肤色/脸型）',
    category: 'product',
    readOnly: true,
    industryScoped: true,
  })
  async getEffectTags(@Param('type') type: 'skin_tone' | 'face_shape') {
    return this.productService.getEffectTags(type)
  }

  @ApiOperation({ summary: '获取色彩效果推荐' })
  @Post('effects/recommend')
  @MCPCapable({
    tool: 'product.effectRecommend',
    description: '获取色彩效果推荐组合',
    category: 'product',
    readOnly: true,
    industryScoped: true,
  })
  async getEffectRecommend(@Body() body: { colorCode: string }) {
    return this.productService.getEffectRecommendation(body.colorCode)
  }
}
