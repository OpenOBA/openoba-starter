import { Injectable } from '@nestjs/common'
import { ColorService } from './color.service'
import { SpuService } from './spu.service'
import { SkuService } from './sku.service'
import { SetService } from './set.service'
import type { QuerySkuDto, CreateSkuDto, UpdateSkuDto, QuerySkuImageDto, CreateSkuImageDto } from './dto/product.dto'
import type { CreateSetDto, UpdateSetDto } from './dto/product.dto'
import type { SkuDisplayNameInput } from './interfaces/sku.interface'

/** Product Facade Service — 委托调用 domain services */


@Injectable()
export class ProductService {
  constructor(
    private readonly colorService: ColorService,
    private readonly spuService: SpuService,
    private readonly skuService: SkuService,
    private readonly setService: SetService,
  ) {}

  // ===== 颜色字典 =====
  async findColors(query: unknown): Promise<unknown> {
    return this.colorService.findColors(query)
  }
  async findOneColor(id: string): Promise<unknown> {
    return this.colorService.findOneColor(id)
  }
  async createColor(dto: Record<string, unknown>): Promise<unknown> {
    return this.colorService.createColor(dto)
  }
  async updateColor(id: string, dto: Record<string, unknown>): Promise<unknown> {
    return this.colorService.updateColor(id, dto)
  }
  async deleteColor(id: string): Promise<unknown> {
    return this.colorService.deleteColor(id)
  }

  // ===== SPU =====
  async findSpus(query: Record<string, unknown>): Promise<unknown> {
    return this.spuService.findSpus(query as Record<string, unknown>)
  }
  async findOneSpu(id: string): Promise<unknown> {
    return this.spuService.findOneSpu(id)
  }
  async createSpu(dto: Record<string, unknown>): Promise<unknown> {
    return this.spuService.createSpu(dto as Record<string, unknown>)
  }
  async updateSpu(id: string, dto: Record<string, unknown>): Promise<unknown> {
    return this.spuService.updateSpu(id, dto as Record<string, unknown>)
  }
  async deleteSpu(id: string): Promise<unknown> {
    return this.spuService.deleteSpu(id)
  }

  // ===== SKU =====
  async findSkus(query: QuerySkuDto): Promise<unknown> {
    return this.skuService.findSkus(query as unknown as Record<string, unknown>)
  }
  async findOneSku(id: string): Promise<unknown> {
    return this.skuService.findOneSku(id)
  }
  async createSku(dto: CreateSkuDto): Promise<unknown> {
    return this.skuService.createSku(dto as unknown as Record<string, unknown>)
  }
  async updateSku(id: string, dto: UpdateSkuDto): Promise<unknown> {
    return this.skuService.updateSku(id, dto as unknown as Record<string, unknown>)
  }
  async deleteSku(id: string): Promise<unknown> {
    return this.skuService.deleteSku(id)
  }

  // ===== 条码查询 =====
  async findOneByBarcode(barcode: string): Promise<unknown> {
    return this.skuService.findOneByBarcode(barcode)
  }

  // ===== 套装 =====
  async findSets(query: Record<string, unknown>): Promise<unknown> {
    return this.setService.findSets(query as Record<string, unknown>)
  }
  async findOneSet(id: string): Promise<unknown> {
    return this.setService.findOneSet(id)
  }
  async createSet(dto: Record<string, unknown>): Promise<unknown> {
    return this.setService.createSet(dto as Record<string, unknown>)
  }
  async updateSet(id: string, dto: Record<string, unknown>): Promise<unknown> {
    return this.setService.updateSet(id, dto as Record<string, unknown>)
  }
  async deleteSet(id: string): Promise<unknown> {
    return this.setService.deleteSet(id)
  }

  // ===== SKU 图片管理 =====
  async findSkuImages(query: QuerySkuImageDto): Promise<unknown> {
    return this.skuService.findSkuImages(query)
  }
  async findOneSkuImage(id: string): Promise<unknown> {
    return this.skuService.findOneSkuImage(id)
  }
  async getSkuImagesGrouped(skuId: string): Promise<unknown> {
    return this.skuService.getSkuImagesGrouped(skuId)
  }
  async createSkuImage(dto: CreateSkuImageDto): Promise<unknown> {
    return this.skuService.createSkuImage(dto)
  }
  async batchCreateSkuImages(dto: { skuId: string; images: CreateSkuImageDto[] }): Promise<unknown> {
    return this.skuService.batchCreateSkuImages(dto)
  }
  async updateSkuImage(id: string, dto: Partial<CreateSkuImageDto>): Promise<unknown> {
    return this.skuService.updateSkuImage(id, dto)
  }
  async deleteSkuImage(id: string): Promise<unknown> {
    return this.skuService.deleteSkuImage(id)
  }
  async reorderSkuImages(skuId: string, imageType: string, orderedIds: string[]): Promise<unknown> {
    return this.skuService.reorderSkuImages(skuId, imageType, orderedIds)
  }

  // ===== V2.0 命名规范 =====
  async generateSpuCode(structureStandardCode: string): Promise<unknown> {
    return this.spuService.generateSpuCode(structureStandardCode)
  }
  async generateSkuCode(spuCode: string): Promise<unknown> {
    return this.skuService.generateSkuCode(spuCode)
  }
  async generateSpuDisplayName(spuData: unknown): Promise<unknown> {
    return this.spuService.generateSpuDisplayName(spuData)
  }
  async generateSkuDisplayName(skuData: SkuDisplayNameInput): Promise<unknown> {
    return this.skuService.generateSkuDisplayName(skuData)
  }

  // ===== V2.0 效果词推荐 =====
  async getEffectRecommendation(colorCode: string): Promise<unknown> {
    return this.skuService.getEffectRecommendation(colorCode)
  }
  async getEffectTags(type: 'skin_tone' | 'face_shape'): Promise<unknown> {
    return this.skuService.getEffectTags(type)
  }

  // ===== 辅助 =====
  async ensureSkuExists(skuId: string): Promise<unknown> {
    return this.skuService.ensureSkuExists(skuId)
  }
}
