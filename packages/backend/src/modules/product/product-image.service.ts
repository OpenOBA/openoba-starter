import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProductSkuImage } from './entity/product-sku-image.entity'
import { ProductSku } from './entity/product-sku.entity'

@Injectable()
export class ProductImageService {
  private readonly VALID_IMAGE_TYPES = ['main', 'gallery', 'detail', 'lifestyle', '360view', 'website_banner'];

  constructor(
    @InjectRepository(ProductSkuImage) private skuImageRepo: Repository<ProductSkuImage>,
    @InjectRepository(ProductSku) private skuRepo: Repository<ProductSku>,
  ) {}

  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const fs = require('fs')
    const path = require('path')
    /* eslint-enable @typescript-eslint/no-require-imports */
    const uploadsDir = path.join(process.cwd(), 'uploads', 'images')
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
    const timestamp = Date.now()
    const ext = path.extname(file.originalname) || '.jpg'
    const filename = `${timestamp}${ext}`
    const filePath = path.join(uploadsDir, filename)
    fs.writeFileSync(filePath, file.buffer)
    return { url: `/uploads/images/${filename}` }
  }

  validateImageUrl(url: string): string {
    if (!url) throw new BadRequestException('imageUrl 不能为空')
    const trimmed = url.trim()
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/uploads/')) {
      throw new BadRequestException('imageUrl 格式无效，需以 http/https 开头')
    }
    return trimmed
  }

  async findSkuImages(query: { skuId?: string; skuCode?: string; imageType?: string; page?: number; pageSize?: number }) {
    const { skuId, skuCode, imageType, page = 1, pageSize = 50 } = query
    const qb = this.skuImageRepo.createQueryBuilder('i').leftJoinAndSelect('i.sku', 'sku')
    if (skuId) qb.andWhere('i.sku_id = :sid', { sid: skuId })
    if (skuCode) {
      const sku = await this.skuRepo.findOne({ where: { skuCode } })
      if (sku) qb.andWhere('i.sku_id = :sid', { sid: sku.skuId })
    }
    if (imageType) qb.andWhere('i.image_type = :type', { type: imageType })
    qb.orderBy('i.sort_order', 'ASC')
    const [items, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount()
    return { items, total }
  }

  async findOneSkuImage(id: string) {
    const image = await this.skuImageRepo.findOne({ where: { imageId: id }, relations: ['sku'] })
    if (!image) throw new NotFoundException('图片不存在')
    return image
  }

  async createSkuImage(dto: { skuId: string; imageUrl: string; imageType: string; sortOrder?: number; isPrimary?: boolean; isActive?: boolean; altText?: string; width?: number; height?: number }) {
    if (dto.isPrimary) {
      await this.skuImageRepo.update({ skuId: dto.skuId, isPrimary: true }, { isPrimary: false })
    }
    return this.skuImageRepo.save({ ...dto, imageId: undefined })
  }

  async batchCreateSkuImages(dto: { skuId: string; images: { imageUrl: string; imageType?: string; sortOrder?: number; isPrimary?: boolean }[] }) {
    if (!dto.images || dto.images.length === 0) throw new BadRequestException('images 不能为空')
    if (dto.images.length > 20) throw new BadRequestException('单次最多上传 20 张图片')
    for (const imgDto of dto.images) {
      if (!imgDto.imageUrl) throw new BadRequestException('imageUrl 不能为空')
      if (imgDto.isPrimary) {
        await this.skuImageRepo.update({ skuId: dto.skuId, isPrimary: true }, { isPrimary: false })
      }
    }
    const images = dto.images.map((img, idx) => ({
      skuId: dto.skuId,
      imageUrl: img.imageUrl,
      imageType: img.imageType || 'gallery',
      sortOrder: img.sortOrder ?? idx + 1,
      isPrimary: img.isPrimary ?? false,
      isActive: true,
    }))
    return this.skuImageRepo.save(images)
  }

  async updateSkuImage(id: string, dto: { imageUrl?: string; imageType?: string; sortOrder?: number; isPrimary?: boolean; isActive?: boolean; altText?: string; width?: number; height?: number }) {
    const image = await this.findOneSkuImage(id)
    if (dto.imageUrl) image.imageUrl = this.validateImageUrl(dto.imageUrl)
    if (dto.imageType) image.imageType = dto.imageType
    if (dto.sortOrder != null) image.sortOrder = dto.sortOrder
    if (dto.isPrimary != null) {
      if (dto.isPrimary && !image.isPrimary) {
        await this.skuImageRepo.update({ skuId: image.skuId, isPrimary: true }, { isPrimary: false })
      }
      image.isPrimary = dto.isPrimary
    }
    if (dto.isActive != null) image.isActive = dto.isActive
    if (dto.altText != null) image.altText = dto.altText
    if (dto.width != null) image.width = dto.width
    if (dto.height != null) image.height = dto.height
    return this.skuImageRepo.save(image)
  }

  async deleteSkuImage(id: string) {
    const image = await this.findOneSkuImage(id)
    return this.skuImageRepo.remove(image)
  }

  async reorderSkuImages(orderedImages: { imageId: string; sortOrder: number }[]) {
    for (const { imageId, sortOrder } of orderedImages) {
      await this.skuImageRepo.update(imageId, { sortOrder })
    }
    return { success: true }
  }
}
