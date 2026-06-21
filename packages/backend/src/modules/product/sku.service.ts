import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import * as crypto from 'crypto'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, DataSource } from 'typeorm'
import { ProductSku } from './entity/product-sku.entity'
import { ProductSpu } from './entity/product-spu.entity'
import { ProductSkuImage } from './entity/product-sku-image.entity'
import { PriceHistory } from './entity/price-history.entity'
import { ExternalBarcodeMapping } from './entity/external-barcode-mapping.entity'
import { DictSkuColor } from './entity/dict-spu-color.entity'
import { DictEffectTag } from './entity/dict-effect-tag.entity'
import { SkuEffectRecommend } from './entity/sku-effect-recommend.entity'
import { generateInternalBarcode, generateTransitionalEAN13 } from './utils/barcode.generator'
import { NamingEngine, SkuNameInput } from './utils/naming-engine'
import { StructureStandard } from '../structure/entity/structure-standard.entity'

@Injectable()
export class SkuService {
  private readonly logger = new Logger(SkuService.name)

  constructor(
    @InjectRepository(ProductSku) private skuRepo: Repository<ProductSku>,
    @InjectRepository(ProductSkuImage) private skuImageRepo: Repository<ProductSkuImage>,
    @InjectRepository(PriceHistory) private priceHistoryRepo: Repository<PriceHistory>,
    @InjectRepository(ExternalBarcodeMapping) private extBarcodeRepo: Repository<ExternalBarcodeMapping>,
    @InjectRepository(DictEffectTag) private effectTagRepo: Repository<DictEffectTag>,
    @InjectRepository(SkuEffectRecommend) private effectRecRepo: Repository<SkuEffectRecommend>,
    @InjectRepository(DictSkuColor) private colorRepo: Repository<DictSkuColor>,
    @InjectRepository(ProductSpu) private spuRepo: Repository<ProductSpu>,
    private dataSource: DataSource,
  ) {}

  async findSkus(query: any) {
    const { page = 1, pageSize = 20, spuId, keyword, status, skuBarcode, ean13, productTier, skinToneEffect, faceShapeEffect } = query
    const qb = this.skuRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.spu', 'spu')
      .leftJoinAndSelect('s.color', 'c')
      .where('s.isDeleted = :del', { del: false })
    if (spuId) qb.andWhere('s.spu_id = :sid', { sid: spuId })
    if (keyword) qb.andWhere('(s.sku_name LIKE :kw OR s.sku_code LIKE :kw OR s.sku_barcode LIKE :kw)', { kw: `%${keyword}%` })
    if (status) qb.andWhere('s.status = :st', { st: status })
    if (skuBarcode) qb.andWhere('s.sku_barcode = :sb', { sb: skuBarcode })
    if (ean13) qb.andWhere('s.ean13 = :e', { e: ean13 })
    if (productTier) qb.andWhere('s.product_tier = :tier', { tier: productTier })
    if (skinToneEffect) qb.andWhere('s.skin_tone_effect = :se', { se: skinToneEffect })
    if (faceShapeEffect) qb.andWhere('s.face_shape_effect = :fe', { fe: faceShapeEffect })
    qb.orderBy('s.createdAt', 'DESC')
    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()

    // 批量加载每个 SKU 的主图（用于列表缩略图）
    const skuIds = items.map((s) => s.skuId)
    const primaryImages =
      skuIds.length > 0
        ? await this.skuImageRepo.find({
            where: skuIds.map((sid) => ({ skuId: sid, isPrimary: true, isDeleted: false })),
          })
        : []
    const result = items.map((item) => ({
      ...item,
      primaryImage: primaryImages.find((img) => img.skuId === item.skuId) || null,
    }))
    return { items: result, total, page: +page, pageSize: +pageSize }
  }

  async findOneSku(id: string) {
    const item = await this.skuRepo.findOne({ where: { skuId: id, isDeleted: false }, relations: ['spu', 'color'] })
    if (!item) throw new NotFoundException('SKU不存在')
    // 附加图片信息
    const images = await this.findSkuImages({ skuId: id })
    return { ...item, images }
  }

  async createSku(dto: any) {
    const { skuBarcode, ean13, ...rest } = dto

    // V2.0: 获取 SPU 信息
    const spu = await this.spuRepo.findOne({ where: { spuId: rest.spuId } })
    if (!spu) throw new BadRequestException('SPU不存在')

    // V2.0: 自动生成 SKU 编码
    if (!rest.skuCode) {
      rest.skuCode = await this.generateSkuCode(spu.spuCode)
    }
    // V2.0: 继承 SPU 的结构标准
    if (!rest.structureStandardCode) {
      rest.structureStandardCode = spu.structureStandardCode
    }

    // V2.0: 自动推荐效果词
    if (dto.colorCode && (!dto.skinToneEffect || !dto.faceShapeEffect)) {
      const rec = await this.getEffectRecommendation(dto.colorCode)
      rest.skinToneEffect = rest.skinToneEffect || rec.skinToneEffect
      rest.faceShapeEffect = rest.faceShapeEffect || rec.faceShapeEffect
    }

    // SKU 级别继承：如果未设置 productTier，从 SPU 继承
    if (!rest.productTier) {
      rest.productTier = spu.productTier || 'color'
    }
    // Phase 8B: 尺寸校验
    this.validateTechSpecSizes(rest)

    // V2.0: 自动生成展示名
    rest.displayName = await this.generateSkuDisplayName({ ...rest, spu })

    // 自动生成内部条码（如未提供）
    const autoSkuBarcode = skuBarcode || generateInternalBarcode(rest.skuCode, rest.structureStandardCode, 1, rest.productTier)
    // 自动生成 EAN-13 过渡码（如未提供）
    const autoEan13 = ean13 || generateTransitionalEAN13(rest.skuCode)
    const entity = this.skuRepo.create({
      ...rest,
      skuBarcode: autoSkuBarcode,
      ean13: autoEan13,
    })
    return this.skuRepo.save(entity)
  }

  async updateSku(id: string, dto: any) {
    const item = await this.findOneSku(id)
    // SKU 级别继承：如果显式设为 null，从 SPU 继承
    let resolvedTier = dto.productTier
    if (resolvedTier === null || resolvedTier === undefined) {
      resolvedTier = (item.spu as any)?.productTier || 'color'
    }
    dto.productTier = resolvedTier
    // Phase 8B: 尺寸校验
    this.validateTechSpecSizes(dto)

    // V2.0: 如果色彩变化，重新推荐效果
    if (dto.colorCode && dto.colorCode !== item.colorCode) {
      const rec = await this.getEffectRecommendation(dto.colorCode)
      if (!dto.skinToneEffect) dto.skinToneEffect = rec.skinToneEffect
      if (!dto.faceShapeEffect) dto.faceShapeEffect = rec.faceShapeEffect
    }

    // V2.0: 重新生成展示名
    const merged = { ...item, ...dto }
    dto.displayName = await this.generateSkuDisplayName(merged)

    // 如果修改了 sku_code、structure_standard_code 或 product_tier，重新生成条码
    const needRegen =
      (dto.skuCode && dto.skuCode !== item.skuCode) ||
      (dto.structureStandardCode && dto.structureStandardCode !== item.structureStandardCode) ||
      (dto.productTier && dto.productTier !== item.productTier)
    if (needRegen) {
      const finalSkuCode = dto.skuCode || item.skuCode
      const finalLensCode = dto.structureStandardCode || item.structureStandardCode
      const finalTier = dto.productTier || item.productTier
      dto.skuBarcode = generateInternalBarcode(finalSkuCode, finalLensCode, 1, finalTier)
      dto.ean13 = generateTransitionalEAN13(finalSkuCode)
    }
    // Phase 9A: 价格变更历史记录
    await this.recordPriceChanges(id, item, dto)

    Object.assign(item, dto)
    return this.skuRepo.save(item)
  }

  async deleteSku(id: string) {
    const item = await this.findOneSku(id)
    item.isDeleted = true
    return this.skuRepo.save(item)
  }

  // ===== Phase 9A: 价格历史记录 =====
  private async recordPriceChanges(skuId: string, current: ProductSku, dto: any) {
    const priceFields: { key: string; type: string }[] = [
      { key: 'costPrice', type: 'cost' },
      { key: 'retailPrice', type: 'retail' },
      { key: 'minPrice', type: 'min' },
    ]
    for (const { key, type } of priceFields) {
      if (dto[key] !== undefined && dto[key] !== (current as any)[key]) {
        const oldVal = (current as any)[key] ?? null
        const newVal = dto[key]
        const history = this.priceHistoryRepo.create({
          historyId: `ph-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`,
          skuId,
          priceType: type,
          oldValue: oldVal,
          newValue: newVal,
        })
        await this.priceHistoryRepo.save(history)
      }
    }
  }

  // ===== 条码查询 =====
  async findOneByBarcode(barcode: string) {
    // 先查内部条码
    const sku = await this.skuRepo.findOne({
      where: [{ skuBarcode: barcode }, { barcode }, { ean13: barcode }, { skuCode: barcode }],
      relations: ['spu', 'color'],
    })
    if (sku) return { type: 'sku', item: sku }
    // 再查外部条码映射
    const ext = await this.extBarcodeRepo.findOne({ where: { externalBarcode: barcode } })
    if (ext) return { type: 'external_mapping', item: ext }
    throw new NotFoundException(`条码 ${barcode} 不存在`)
  }

  // ===== SKU 图片管理 =====

  // 合法图片类型
  private readonly VALID_IMAGE_TYPES = ['main', 'gallery', 'detail', 'lifestyle', '360view', 'website_banner']

  // URL 格式校验
  validateImageUrl(url: string) {
    if (!url) throw new BadRequestException('imageUrl 不能为空')
    const trimmed = url.trim()
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
      throw new BadRequestException('imageUrl 必须是 http/https 开头的 URL 或以 / 开头的相对路径')
    }
    return trimmed
  }

  // 图片类型校验
  validateImageType(type: string) {
    if (type && !this.VALID_IMAGE_TYPES.includes(type)) {
      throw new BadRequestException(`imageType 必须是: ${this.VALID_IMAGE_TYPES.join(', ')}`)
    }
    return type || 'gallery'
  }

  // Phase 8B: 技术参数尺寸校验
  validateTechSpecSizes(dto: any) {
    const errors: string[] = []
    const warnMsgs: string[] = []

    // 范围校验
    if (dto.lensWidth != null) {
      if (dto.lensWidth < 28 || dto.lensWidth > 70) errors.push('镜片宽度必须在 28-70mm 之间')
    }
    if (dto.bridgeWidth != null) {
      if (dto.bridgeWidth < 12 || dto.bridgeWidth > 30) errors.push('鼻梁宽度必须在 12-30mm 之间')
    }
    if (dto.templeLength != null) {
      if (dto.templeLength < 120 || dto.templeLength > 160) errors.push('镜腿长度必须在 120-160mm 之间')
    }
    // ⚠️ 2026-04-24：镜框高度已废弃，不再校验
    if (dto.totalWidth != null) {
      if (dto.totalWidth < 100 || dto.totalWidth > 180) errors.push('总宽度必须在 100-180mm 之间')
    }

    // 公式校验：total_width ≈ lens_width × 2 + bridge_width ± 8mm
    if (dto.lensWidth != null && dto.bridgeWidth != null && dto.totalWidth != null) {
      const expected = dto.lensWidth * 2 + dto.bridgeWidth
      const diff = Math.abs(dto.totalWidth - expected)
      if (diff > 8) {
        warnMsgs.push(`尺寸校验: 总宽度 ${dto.totalWidth}mm 与预期 ${expected}mm 偏差 ${diff}mm（允许 ±8mm），请确认数据准确性`)
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '))
    }
    // Warning 仅记录日志，不阻断保存
    if (warnMsgs.length > 0) {
      this.logger.warn('[TechSpec Warning]', ...warnMsgs)
    }
  }

  // 校验 SKU 是否存在
  async ensureSkuExists(skuId: string) {
    const sku = await this.skuRepo.findOne({ where: { skuId, isDeleted: false } })
    if (!sku) throw new NotFoundException(`SKU ${skuId} 不存在`)
    return sku
  }

  // 设为主图：先将同 SKU 同类型的其他图片取消 primary
  private async clearPrimaryForType(skuId: string, imageType: string, excludeId?: string) {
    const primaryImages = await this.skuImageRepo.find({ where: { skuId, imageType, isPrimary: true, isDeleted: false } })
    for (const img of primaryImages) {
      if (img.imageId !== excludeId) {
        img.isPrimary = false
        await this.skuImageRepo.save(img)
      }
    }
  }

  // 查询 SKU 图片列表（按 skuId 或 skuCode）
  async findSkuImages(query: any) {
    const { skuId, skuCode, imageType, isActive } = query
    const qb = this.skuImageRepo
      .createQueryBuilder('i')
      .where('i.isDeleted = :del', { del: false })
    // isActive 可选过滤：明确传了才过滤，默认返回全部（管理后台需看到禁用图片）
    if (isActive !== undefined && isActive !== null) {
      qb.andWhere('i.isActive = :active', { active: isActive })
    }
    if (skuId) qb.andWhere('i.sku_id = :sid', { sid: skuId })
    if (skuCode) {
      qb.innerJoin('i.sku', 'sku').andWhere('sku.sku_code = :code', { code: skuCode })
    }
    if (imageType) qb.andWhere('i.image_type = :type', { type: imageType })
    qb.orderBy('i.sortOrder', 'ASC').addOrderBy('i.createdAt', 'ASC')
    return qb.getMany()
  }

  // 单张图片详情
  async findOneSkuImage(id: string) {
    const image = await this.skuImageRepo.findOne({ where: { imageId: id, isDeleted: false } })
    if (!image) throw new NotFoundException('图片不存在')
    return image
  }

  // 按类型分组返回 SKU 图片（官网 API 专用）— 仅返回 active 的图片
  async getSkuImagesGrouped(skuId: string) {
    const images = await this.findSkuImages({ skuId, isActive: true })
    const grouped: Record<string, typeof images> = {}
    for (const img of images) {
      if (!grouped[img.imageType]) grouped[img.imageType] = []
      grouped[img.imageType].push(img)
    }
    return grouped
  }

  // 创建 SKU 图片
  async createSkuImage(dto: any) {
    // P0: SKU 存在性校验
    await this.ensureSkuExists(dto.skuId)
    // P0: URL 校验
    dto.imageUrl = this.validateImageUrl(dto.imageUrl)
    // P0: imageType 枚举校验
    dto.imageType = this.validateImageType(dto.imageType)
    // 如果设为主图，取消同类型其他主图
    if (dto.isPrimary) {
      await this.clearPrimaryForType(dto.skuId, dto.imageType)
    }
    // 防御：删除非数据库列和主键（防止 TypeORM create() 误用空字符串主键）
    delete dto.imageId
    delete dto.createdAt
    delete dto.updatedAt
    delete dto.sku
    const entity = this.skuImageRepo.create(dto)
    return this.skuImageRepo.save(entity)
  }

  // 批量上传 SKU 图片
  async batchCreateSkuImages(dto: { skuId: string; images: any[] }) {
    // SKU 存在性校验
    await this.ensureSkuExists(dto.skuId)
    if (!dto.images || dto.images.length === 0) {
      throw new BadRequestException('图片列表不能为空')
    }
    if (dto.images.length > 20) {
      throw new BadRequestException('单次最多上传 20 张图片')
    }
    // 批量设主图：先汇总需设 primary 的类型，统一清一次旧数据，避免批次内多张 primary 冲突
    const primaryTypes = new Set(dto.images.filter(i => i.isPrimary).map(i => this.validateImageType(i.imageType)))
    for (const imgType of primaryTypes) {
      await this.clearPrimaryForType(dto.skuId, imgType)
    }

    const results: any[] = []
    for (const imgDto of dto.images) {
      imgDto.skuId = dto.skuId
      // URL 校验
      imgDto.imageUrl = this.validateImageUrl(imgDto.imageUrl)
      // imageType 校验
      imgDto.imageType = this.validateImageType(imgDto.imageType)
      // 防御：删除非数据库列和主键
      delete (imgDto as any).imageId
      delete (imgDto as any).createdAt
      delete (imgDto as any).updatedAt
      delete (imgDto as any).sku
      const entity = this.skuImageRepo.create(imgDto)
      const saved = await this.skuImageRepo.save(entity)
      results.push(saved)
    }
    return { created: results.length, images: results }
  }

  // 更新 SKU 图片
  async updateSkuImage(id: string, dto: any) {
    const image = await this.skuImageRepo.findOne({ where: { imageId: id, isDeleted: false } })
    if (!image) throw new NotFoundException('图片不存在')

    // URL 校验
    if (dto.imageUrl) {
      dto.imageUrl = this.validateImageUrl(dto.imageUrl)
    }
    // imageType 校验
    if (dto.imageType) {
      dto.imageType = this.validateImageType(dto.imageType)
    }

    // 如果设为主图，先将同类型其他图片取消 primary
    if (dto.isPrimary && !image.isPrimary) {
      await this.clearPrimaryForType(image.skuId, dto.imageType || image.imageType, id)
    }

    Object.assign(image, dto)
    return this.skuImageRepo.save(image)
  }

  // 删除 SKU 图片（软删除）
  async deleteSkuImage(id: string) {
    const image = await this.skuImageRepo.findOne({ where: { imageId: id, isDeleted: false } })
    if (!image) throw new NotFoundException('图片不存在')
    image.isDeleted = true
    return this.skuImageRepo.save(image)
  }

  // 批量更新排序
  async reorderSkuImages(skuId: string, imageType: string, orderedIds: string[]) {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.skuImageRepo.update({ imageId: orderedIds[i], skuId, imageType }, { sortOrder: i })
    }
    return this.findSkuImages({ skuId, imageType })
  }

  // ========================================
  // V2.0 命名规范：编码自动生成
  // ========================================

  /**
   * 生成 SKU 编码：{spuCode} + - + 3位序号
   * 例：MJ5440-0001 → MJ5440-0001-001
   */
  async generateSkuCode(spuCode: string): Promise<string> {
    const skuEntityRepo = this.dataSource.getRepository(ProductSku)
    const existing = await skuEntityRepo.find({
      where: { skuCode: Like(`${spuCode}-%`), isDeleted: false },
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

  // ========================================
  // V2.0 命名规范：展示名自动生成
  // ========================================

  /**
   * 辅助：通过结构标准 internal_code 获取对外编号和造型代码
   */
  private async getStructureInfo(internalCode: string): Promise<{ externalCode: string; shapeCode: string } | null> {
    if (!internalCode) return null
    const repo = this.dataSource.getRepository(StructureStandard)

    // First try: exact match on internal_code (case-insensitive)
    const found1 = await repo.findOne({
      where: { internalCode: internalCode.toLowerCase() as any },
    })
    if (found1) {
      return { externalCode: found1.externalCode, shapeCode: found1.shapeCode }
    }

    // Fallback: extract extCode from old-format code like "S5147-157-18-200C"
    const match = internalCode.match(/^([A-Za-z])(\d+)/)
    if (match) {
      const extCode = match[2]
      const found2 = await repo.findOne({ where: { externalCode: extCode } })
      if (found2) {
        return { externalCode: found2.externalCode, shapeCode: found2.shapeCode }
      }
    }

    // Last resort: treat as externalCode directly
    if (/^[A-Za-z]\d+$/.test(internalCode)) {
      return { externalCode: internalCode.toUpperCase(), shapeCode: '' }
    }

    return null
  }

  private getShapeName(shapeCode: string): string {
    return NamingEngine.getShapeName(shapeCode)
  }

  private getSeriesChineseName(seriesCode: string): string {
    if (!seriesCode) return ''
    return NamingEngine.getSeriesChineseName(seriesCode)
  }

  /**
   * V2.0: 生成 SKU 展示名（通过 NamingEngine）
   * 公式：秒镜 S{对外编号} · {肤色效果} · {脸型效果} · {色彩} · {造型}{系列}系列 · {款式}
   * ⚠️ 字段顺序严格按 V2.0 规范，不可随意打乱
   */
  async generateSkuDisplayName(skuData: any): Promise<string> {
    const spu = skuData.spu || (await this.spuRepo.findOne({ where: { spuId: skuData.spuId } }))
    if (!spu) return '秒镜 ???'

    const { structureStandardCode, seriesCode, gender } = spu
    const { colorCode, skinToneEffect, faceShapeEffect } = skuData

    // 获取色彩名
    let colorName = '未知色'
    if (colorCode) {
      const color = await this.colorRepo.findOne({ where: { colorCode } })
      if (color) colorName = color.colorName
    }

    const structInfo = await this.getStructureInfo(structureStandardCode)
    if (!structInfo) return '秒镜 ???'

    const seriesName = this.getSeriesChineseName(seriesCode)
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

  // ========================================
  // V2.0 命名规范：效果词推荐与词库
  // ========================================

  /**
   * 获取效果词推荐（根据色彩）
   */
  async getEffectRecommendation(colorCode: string): Promise<{
    skinToneEffect: string
    faceShapeEffect: string
  }> {
    const rec = await this.effectRecRepo.findOne({
      where: { colorCode, isPrimary: true },
      order: { sortOrder: 'ASC' },
    })
    if (rec) return { skinToneEffect: rec.skinToneEffect, faceShapeEffect: rec.faceShapeEffect }
    return { skinToneEffect: '中性百搭', faceShapeEffect: '鹅蛋脸万能' }
  }

  /**
   * 获取效果词库（供前端弹窗展示）
   */
  async getEffectTags(type: 'skin_tone' | 'face_shape'): Promise<DictEffectTag[]> {
    return this.effectTagRepo.find({
      where: { effectType: type, isActive: true },
      order: { sortOrder: 'ASC' },
    })
  }
}
