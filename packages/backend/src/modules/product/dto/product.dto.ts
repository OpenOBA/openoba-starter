import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  Max,
  IsIn,
  ValidateNested,
} from 'class-validator'
import { Transform } from 'class-transformer'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

// ============ é¢è²å­å ¸ DTO ============

export class CreateColorDto {
  @ApiProperty() @IsString() colorCode: string
  @ApiProperty() @IsString() colorName: string
  @ApiPropertyOptional() @IsOptional() @IsString() colorNameEn?: string
  @ApiPropertyOptional() @IsOptional() @IsString() colorFamily?: string
  @ApiPropertyOptional() @IsOptional() @IsString() colorType?: string
  @ApiPropertyOptional() @IsOptional() @IsString() hexValue?: string
  @ApiPropertyOptional() @IsOptional() @IsString() previewImage?: string
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) trendScore?: number
}

export class UpdateColorDto {
  @ApiPropertyOptional() @IsOptional() @IsString() colorId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() colorCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() colorName?: string
  @ApiPropertyOptional() @IsOptional() @IsString() colorNameEn?: string
  @ApiPropertyOptional() @IsOptional() @IsString() colorFamily?: string
  @ApiPropertyOptional() @IsOptional() @IsString() colorType?: string
  @ApiPropertyOptional() @IsOptional() @IsString() hexValue?: string
  @ApiPropertyOptional() @IsOptional() @IsString() previewImage?: string
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
  @ApiPropertyOptional() @IsOptional() @IsString() pinyinName?: string
  @ApiPropertyOptional() @IsOptional() @IsString() pinyinInitial?: string
  @ApiPropertyOptional() @IsOptional() @IsString() pantoneRef?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) trendScore?: number
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) sortOrder?: number
  @ApiPropertyOptional() @IsOptional() @IsString() createdAt?: string
  @ApiPropertyOptional() @IsOptional() @IsString() updatedAt?: string
}

// ============ åç±» DTO ============

export class CreateCategoryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() categoryCode?: string
  @ApiProperty() @IsString() categoryName: string
  @ApiPropertyOptional() @IsOptional() @IsString() parentId?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) level?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) sortOrder?: number
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
}

export class UpdateCategoryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() categoryCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() categoryName?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) sortOrder?: number
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
}

// ============ SPU DTO ============

export class CreateSpuDto {
  @ApiPropertyOptional() @IsOptional() @IsString() spuCode?: string // V2.0: åç«¯èªå¨çæ
  @ApiPropertyOptional() @IsOptional() @IsString() spuName?: string // V2.0: åç«¯èªå¨çæ
  @ApiProperty() @IsString() structureStandardCode: string
  @ApiPropertyOptional() @IsOptional() @IsString() productTier?: string
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() seriesCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() gender?: string // æ¬¾å¼ï¼female/male/unisex/limited
  @ApiPropertyOptional() @IsOptional() @IsArray() sceneTags?: string[] // V1.5.1
  @ApiPropertyOptional() @IsOptional() @IsArray() seasonTags?: string[] // ["éå¤", "æç §"]
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
  @ApiPropertyOptional() @IsOptional() @IsString() mainImage?: string
  @ApiPropertyOptional() @IsOptional() @IsArray() images?: string[]
  @ApiPropertyOptional() @IsOptional() attributes?: Record<string, unknown>
  @ApiPropertyOptional() @IsOptional() compatibilityLevels?: string[]
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string
}

export class UpdateSpuDto {
  @ApiPropertyOptional() @IsOptional() @IsString() spuId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() spuCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() spuName?: string
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() structureStandardCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() lensStandardCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() productTier?: string
  @ApiPropertyOptional() @IsOptional() @IsString() seriesCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() gender?: string
  @ApiPropertyOptional() @IsOptional() @IsArray() sceneTags?: string[] // V1.5.1
  @ApiPropertyOptional() @IsOptional() @IsArray() seasonTags?: string[]
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
  @ApiPropertyOptional() @IsOptional() @IsString() mainImage?: string
  @ApiPropertyOptional() @IsOptional() @IsArray() images?: string[]
  @ApiPropertyOptional() @IsOptional() attributes?: Record<string, unknown>
  @ApiPropertyOptional() @IsOptional() compatibilityLevels?: string[]
  @ApiPropertyOptional() @IsOptional() category?: Record<string, unknown>
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string
  @ApiPropertyOptional() @IsOptional() @IsString() createdAt?: string
  @ApiPropertyOptional() @IsOptional() @IsString() updatedAt?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDeleted?: boolean
}

// ============ SKU DTO ============

export class CreateSkuDto {
  @ApiPropertyOptional() @IsOptional() @IsString() skuCode?: string // V2.0: åç«¯èªå¨çæ
  @ApiProperty() @IsString() spuId: string
  @ApiPropertyOptional() @IsOptional() @IsString() structureStandardCode?: string // V2.0: ä» SPU ç»§æ¿
  @ApiPropertyOptional() @IsOptional() @IsString() productTier?: string
  @ApiPropertyOptional() @IsOptional() @IsString() skuName?: string
  @ApiProperty({ description: '⚠️ V3.0 必填：色彩代码' }) @IsString() @IsNotEmpty() colorCode: string
  // V3.0 命名规范：效果字段
  @ApiPropertyOptional() @IsOptional() @IsString() skinToneEffect?: string
  @ApiPropertyOptional() @IsOptional() @IsString() faceShapeEffect?: string
  @ApiPropertyOptional() @IsOptional() skuAttributes?: Record<string, unknown>
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) costPrice?: number
  @ApiProperty() @IsNumber() @Type(() => Number) @Min(0) retailPrice: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) @Min(0) minPrice?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) stockQuantity?: number
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() skuBarcode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() ean13?: string
  // V2.0: å±ç¤ºåï¼åç«¯èªå¨çæï¼åç«¯å¯éä¼ å ¥ï¼
  @ApiPropertyOptional() @IsOptional() @IsString() displayName?: string

  // Phase 8B: ææ¯åæ°ï¼å°ºå¯¸ï¼
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(28) @Max(70) @Type(() => Number) lensWidth?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(12) @Max(30) @Type(() => Number) bridgeWidth?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(120) @Max(160) @Type(() => Number) templeLength?: number
  // â ï¸ 2026-04-24ï¼éæ¡é«åº¦å·²åºå¼ï¼ä¿çä» ç¨äºååå ¼å®¹ï¼åç«¯å·²éè
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(100) @Max(180) @Type(() => Number) totalWidth?: number
  // Phase 8B: ææ¯åæ°ï¼æè´¨/ç±»åï¼
  @ApiPropertyOptional() @IsOptional() @IsString() frameMaterial?: string
  @ApiPropertyOptional() @IsOptional() @IsString() templeMaterial?: string
  @ApiPropertyOptional() @IsOptional() @IsString() frameType?: string
  @ApiPropertyOptional() @IsOptional() @IsString() nosePadType?: string
  @ApiPropertyOptional() @IsOptional() @IsString() hingeType?: string
  // Phase 8B: ææ¯åæ°ï¼å ¶ä»ï¼
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) weightG?: number
  @ApiPropertyOptional() @IsOptional() @IsString() surfaceTreatment?: string
  @ApiPropertyOptional() @IsOptional() @IsArray() suitableFaceShapes?: string[]
  // Phase 8B: ææ¯åæ°ï¼åè½ï¼
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === 1 || value === '1')
  @IsBoolean()
  hasBlueLightFilter?: boolean
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === 1 || value === '1')
  @IsBoolean()
  hasPhotochromic?: boolean
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === 1 || value === '1')
  @IsBoolean()
  hasPolarized?: boolean
  @ApiPropertyOptional() @IsOptional() @IsString() uvProtection?: string
  // Phase 8B: æ©å±åæ°é¢ç
  @ApiPropertyOptional() @IsOptional() techSpecExtra?: Record<string, unknown>
}

export class UpdateSkuDto {
  @ApiPropertyOptional() @IsOptional() @IsString() skuId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() spuId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() lensStandardCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() skuCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() skuName?: string
  @ApiPropertyOptional({ description: '更新色彩时传入，非空则触发展示名重新生成' })
  @IsOptional()
  @IsString()
  colorCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() structureStandardCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() productTier?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) warningQuantity?: number
  // åè¡¨æ°æ®åå¡«æ¶çåªè¯»å­æ®µï¼åç«¯å¿½ç¥ï¼
  @ApiPropertyOptional() @IsOptional() @IsString() createdAt?: string
  @ApiPropertyOptional() @IsOptional() @IsString() updatedAt?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDeleted?: boolean
  @ApiPropertyOptional() @IsOptional() spu?: Record<string, unknown>
  @ApiPropertyOptional() @IsOptional() color?: Record<string, unknown>
  @ApiPropertyOptional() @IsOptional() primaryImage?: Record<string, unknown>
  // V2.0 å½åè§èï¼ææå­æ®µ
  @ApiPropertyOptional() @IsOptional() @IsString() skinToneEffect?: string
  @ApiPropertyOptional() @IsOptional() @IsString() faceShapeEffect?: string
  @ApiPropertyOptional() @IsOptional() @IsString() displayName?: string
  @ApiPropertyOptional() @IsOptional() skuAttributes?: Record<string, unknown>
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) costPrice?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) retailPrice?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) @Min(0) minPrice?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) stockQuantity?: number
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() skuBarcode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() ean13?: string
  // Phase 8B: ææ¯åæ°ï¼å°ºå¯¸ï¼
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(28) @Max(70) @Type(() => Number) lensWidth?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(12) @Max(30) @Type(() => Number) bridgeWidth?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(120) @Max(160) @Type(() => Number) templeLength?: number
  // â ï¸ 2026-04-24ï¼éæ¡é«åº¦å·²åºå¼ï¼ä¿çä» ç¨äºååå ¼å®¹ï¼åç«¯å·²éè
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(100) @Max(180) @Type(() => Number) totalWidth?: number
  @ApiPropertyOptional() @IsOptional() @IsString() frameMaterial?: string
  @ApiPropertyOptional() @IsOptional() @IsString() templeMaterial?: string
  @ApiPropertyOptional() @IsOptional() @IsString() frameType?: string
  @ApiPropertyOptional() @IsOptional() @IsString() nosePadType?: string
  @ApiPropertyOptional() @IsOptional() @IsString() hingeType?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) weightG?: number
  @ApiPropertyOptional() @IsOptional() @IsArray() suitableFaceShapes?: string[]
  @ApiPropertyOptional() @IsOptional() @IsString() surfaceTreatment?: string
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === 1 || value === '1')
  @IsBoolean()
  hasBlueLightFilter?: boolean
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === 1 || value === '1')
  @IsBoolean()
  hasPhotochromic?: boolean
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === 1 || value === '1')
  @IsBoolean()
  hasPolarized?: boolean
  @ApiPropertyOptional() @IsOptional() @IsString() uvProtection?: string
  @ApiPropertyOptional() @IsOptional() techSpecExtra?: Record<string, unknown>
}

// ============ å¥è£  DTO ============

export class CreateSetDto {
  @ApiPropertyOptional() @IsOptional() @IsString() setCode?: string
  @ApiProperty() @IsString() setName: string
  @ApiProperty() @IsArray() skuList: string[]
  @ApiProperty() @IsNumber() @Type(() => Number) setPrice: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) originalTotalPrice?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) discountRate?: number
  // P1-5: new fields
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) retailPrice?: number
  @ApiPropertyOptional() @IsOptional() @IsString() mainImage?: string
}

export class UpdateSetDto {
  @ApiPropertyOptional() @IsOptional() @IsString() setName?: string
  @ApiPropertyOptional() @IsOptional() @IsArray() skuList?: string[]
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) setPrice?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) originalTotalPrice?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) discountRate?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) retailPrice?: number
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() mainImage?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDeleted?: boolean
}

// ============ æ¥è¯¢ DTO ============

export class QueryProductDto {
  @ApiPropertyOptional() @IsOptional() @IsString() keyword?: string
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string
  @ApiPropertyOptional() @IsOptional() @IsString() seriesCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() gender?: string // æ¬¾å¼
  @ApiPropertyOptional() @IsOptional() @IsString() productTier?: string
  @ApiPropertyOptional() @IsOptional() @IsString() structureStandardCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() colorCode?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) page?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) pageSize?: number
}

// ============ SKU ? DTO ============

export class QuerySkuDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) page?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) pageSize?: number
  @ApiPropertyOptional() @IsOptional() @IsString() spuId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() keyword?: string
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string
  @ApiPropertyOptional() @IsOptional() @IsString() skuBarcode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() ean13?: string
  @ApiPropertyOptional() @IsOptional() @IsString() productTier?: string
  @ApiPropertyOptional() @IsOptional() @IsString() skinToneEffect?: string
  @ApiPropertyOptional() @IsOptional() @IsString() faceShapeEffect?: string
}

// ============ SKU å¾ç DTO ============

// åæ³å¾çç±»åæä¸¾
const VALID_IMAGE_TYPES = ['main', 'gallery', 'detail', 'lifestyle', '360view', 'website_banner']

export class CreateSkuImageDto {
  @ApiPropertyOptional() @IsOptional() @IsString() imageId?: string
  @ApiProperty() @IsString() skuId: string
  @ApiProperty() @IsString() imageUrl: string
  @ApiPropertyOptional() @IsOptional() @IsIn(VALID_IMAGE_TYPES) imageType?: string // main/gallery/detail/lifestyle/360view/website_banner
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) sortOrder?: number
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean
  @ApiPropertyOptional() @IsOptional() @IsString() altText?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) width?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) height?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) fileSize?: number
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
}

export class UpdateSkuImageDto {
  @ApiPropertyOptional() @IsOptional() @IsString() imageId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string
  @ApiPropertyOptional() @IsOptional() @IsIn(VALID_IMAGE_TYPES) imageType?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) sortOrder?: number
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
  @ApiPropertyOptional() @IsOptional() @IsString() altText?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) width?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) height?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) fileSize?: number
}

export class QuerySkuImageDto {
  @ApiPropertyOptional() @IsOptional() @IsString() imageType?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
  @ApiPropertyOptional() @IsOptional() @IsString() skuCode?: string // å®ç½ï¿½?SKU ç¼ç æ¥è¯¢
  @ApiPropertyOptional() @IsOptional() @IsString() skuId?: string
}

export class BatchCreateSkuImageDto {
  @ApiProperty() @IsString() skuId: string
  @ApiProperty({ type: [CreateSkuImageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSkuImageDto)
  images: CreateSkuImageDto[]
}

export class ReorderSkuImagesDto {
  @ApiProperty() @IsString() skuId: string
  @ApiProperty() @IsString() imageType: string
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  orderedIds: string[]
}
