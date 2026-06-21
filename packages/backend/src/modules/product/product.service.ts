import { Injectable } from '@nestjs/common'
import { ColorService } from './color.service'
import { SpuService } from './spu.service'
import { SkuService } from './sku.service'
import { SetService } from './set.service'

/**
 * Product Facade Service
 * Delegates to domain-specific services: Color, SPU, SKU, Set
 */
@Injectable()
export class ProductService {
  constructor(
    private readonly colorService: ColorService,
    private readonly spuService: SpuService,
    private readonly skuService: SkuService,
    private readonly setService: SetService,
  ) {}

  // ===== 颜色字典 =====
  async findColors(query: any) {
    return this.colorService.findColors(query)
  }
  async findOneColor(id: string) {
    return this.colorService.findOneColor(id)
  }
  async createColor(dto: any) {
    return this.colorService.createColor(dto)
  }
  async updateColor(id: string, dto: any) {
    return this.colorService.updateColor(id, dto)
  }
  async deleteColor(id: string) {
    return this.colorService.deleteColor(id)
  }

  // ===== SPU =====
  async findSpus(query: any) {
    return this.spuService.findSpus(query)
  }
  async findOneSpu(id: string) {
    return this.spuService.findOneSpu(id)
  }
  async createSpu(dto: any) {
    return this.spuService.createSpu(dto)
  }
  async updateSpu(id: string, dto: any) {
    return this.spuService.updateSpu(id, dto)
  }
  async deleteSpu(id: string) {
    return this.spuService.deleteSpu(id)
  }

  // ===== SKU =====
  async findSkus(query: any) {
    return this.skuService.findSkus(query)
  }
  async findOneSku(id: string) {
    return this.skuService.findOneSku(id)
  }
  async createSku(dto: any) {
    return this.skuService.createSku(dto)
  }
  async updateSku(id: string, dto: any) {
    return this.skuService.updateSku(id, dto)
  }
  async deleteSku(id: string) {
    return this.skuService.deleteSku(id)
  }

  // ===== 条码查询 =====
  async findOneByBarcode(barcode: string) {
    return this.skuService.findOneByBarcode(barcode)
  }

  // ===== 套装 =====
  async findSets(query: any) {
    return this.setService.findSets(query)
  }
  async findOneSet(id: string) {
    return this.setService.findOneSet(id)
  }
  async createSet(dto: any) {
    return this.setService.createSet(dto)
  }
  async updateSet(id: string, dto: any) {
    return this.setService.updateSet(id, dto)
  }
  async deleteSet(id: string) {
    return this.setService.deleteSet(id)
  }

  // ===== SKU 图片管理 =====
  async findSkuImages(query: any) {
    return this.skuService.findSkuImages(query)
  }
  async findOneSkuImage(id: string) {
    return this.skuService.findOneSkuImage(id)
  }
  async getSkuImagesGrouped(skuId: string) {
    return this.skuService.getSkuImagesGrouped(skuId)
  }
  async createSkuImage(dto: any) {
    return this.skuService.createSkuImage(dto)
  }
  async batchCreateSkuImages(dto: { skuId: string; images: any[] }) {
    return this.skuService.batchCreateSkuImages(dto)
  }
  async updateSkuImage(id: string, dto: any) {
    return this.skuService.updateSkuImage(id, dto)
  }
  async deleteSkuImage(id: string) {
    return this.skuService.deleteSkuImage(id)
  }
  async reorderSkuImages(skuId: string, imageType: string, orderedIds: string[]) {
    return this.skuService.reorderSkuImages(skuId, imageType, orderedIds)
  }

  // ===== V2.0 命名规范 =====
  async generateSpuCode(structureStandardCode: string): Promise<string> {
    return this.spuService.generateSpuCode(structureStandardCode)
  }
  async generateSkuCode(spuCode: string): Promise<string> {
    return this.skuService.generateSkuCode(spuCode)
  }
  async generateSpuDisplayName(spuData: any): Promise<string> {
    return this.spuService.generateSpuDisplayName(spuData)
  }
  async generateSkuDisplayName(skuData: any): Promise<string> {
    return this.skuService.generateSkuDisplayName(skuData)
  }

  // ===== V2.0 效果词推荐 =====
  async getEffectRecommendation(colorCode: string) {
    return this.skuService.getEffectRecommendation(colorCode)
  }
  async getEffectTags(type: 'skin_tone' | 'face_shape') {
    return this.skuService.getEffectTags(type)
  }

  // ===== 辅助 =====
  async ensureSkuExists(skuId: string) {
    return this.skuService.ensureSkuExists(skuId)
  }
}
