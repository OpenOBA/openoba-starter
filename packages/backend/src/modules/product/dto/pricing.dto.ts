/* eslint-disable @typescript-eslint/no-explicit-any -- TypeORM DeepPartial 不兼容 Record<string,unknown> */
import { IsString, IsOptional, IsNumber, IsBoolean, IsInt, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

// ============ 产品分级 DTO ============

export class CreateProductTierDto {
  @ApiProperty() @IsString() tierId: string
  @ApiProperty() @IsString() tierName: string
  @ApiProperty() @IsString() tierCode: string
  @ApiPropertyOptional() @IsOptional() @IsString() positioning?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) sortOrder?: number
}

export class UpdateProductTierDto {
  @ApiPropertyOptional() @IsOptional() @IsString() tierName?: string
  @ApiPropertyOptional() @IsOptional() @IsString() positioning?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) sortOrder?: number
  @ApiPropertyOptional() @IsOptional() extra?: Record<string, any>
}

// ============ 批发阶梯 DTO ============

export class CreateWholesaleTierDto {
  @ApiProperty() @IsString() tierId: string
  @ApiProperty() @IsString() tierName: string
  @ApiProperty() @IsString() tierCode: string
  @ApiProperty() @IsInt() @Min(1) minQuantity: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxQuantity?: number
  @ApiProperty() @IsNumber() @Min(0) @Max(1) @Type(() => Number) discountRate: number
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
}

export class UpdateWholesaleTierDto {
  @ApiPropertyOptional() @IsOptional() @IsString() tierName?: string
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) minQuantity?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxQuantity?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) @Type(() => Number) discountRate?: number
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
}

// ============ 价格历史 DTO ============

export class PriceHistoryDto {
  historyId: string
  skuId: string
  priceType: string
  oldValue: number | null
  newValue: number
  changeReason?: string
  changedBy?: string
  changedAt: Date
}

export class QueryPriceHistoryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() skuId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() priceType?: string
}

// ============ 促销管理 DTO ============

export class CreatePromotionDto {
  @ApiProperty() @IsString() promotionId: string
  @ApiProperty() @IsString() promotionCode: string
  @ApiProperty() @IsString() name: string
  @ApiProperty({ enum: ['discount', 'flash_sale', 'bundle', 'coupon', 'member_exclusive'] })
  @IsString()
  type: string
  @ApiProperty({ enum: ['all', 'category', 'spu', 'sku'] })
  @IsString()
  scope: string
  @ApiPropertyOptional() @IsOptional() scopeIds?: string[]
  @ApiProperty({ enum: ['percent', 'fixed_amount'] })
  @IsString()
  discountType: string
  @ApiProperty() @IsNumber() @Type(() => Number) discountValue: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) minAmount?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) maxDiscount?: number
  @ApiProperty() @IsString() startTime: string
  @ApiProperty() @IsString() endTime: string
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) userLimit?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) totalLimit?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) priority?: number
  @ApiPropertyOptional() @IsOptional() @IsBoolean() stackable?: boolean
  @ApiPropertyOptional() @IsOptional() extra?: Record<string, any>
}

export class UpdatePromotionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string
  @ApiPropertyOptional() @IsOptional() @IsString() scope?: string
  @ApiPropertyOptional() @IsOptional() scopeIds?: string[]
  @ApiPropertyOptional() @IsOptional() @IsString() discountType?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) discountValue?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) minAmount?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) maxDiscount?: number
  @ApiPropertyOptional() @IsOptional() @IsString() startTime?: string
  @ApiPropertyOptional() @IsOptional() @IsString() endTime?: string
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) userLimit?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) totalLimit?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) priority?: number
  @ApiPropertyOptional() @IsOptional() @IsBoolean() stackable?: boolean
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string
  @ApiPropertyOptional() @IsOptional() extra?: Record<string, any>
}

export class QueryPromotionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string
}

// ============ 会员等级 DTO ============

export class CreateMemberLevelDto {
  @ApiProperty() @IsString() levelName: string
  @ApiProperty() @IsString() levelCode: string
  @ApiProperty() @IsNumber() @Min(0) @Max(1) @Type(() => Number) discountRate: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) upgradeThreshold?: number
  @ApiPropertyOptional() @IsOptional() benefits?: Record<string, any>
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) sortOrder?: number
}

export class UpdateMemberLevelDto {
  @ApiPropertyOptional() @IsOptional() @IsString() levelName?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) @Type(() => Number) discountRate?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) upgradeThreshold?: number
  @ApiPropertyOptional() @IsOptional() benefits?: Record<string, any>
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) sortOrder?: number
}

// ============ 会员定价规则 DTO ============

export class CreateMemberPricingRuleDto {
  @ApiProperty() @IsString() levelCode: string
  @ApiProperty() @IsString() skuId: string
  @ApiProperty({ enum: ['discount', 'fixed_price', 'extra_discount'] }) @IsString() ruleType: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) @Type(() => Number) discountRate?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) fixedPrice?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) @Type(() => Number) extraDiscount?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) priority?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number) minQuantity?: number
  @ApiPropertyOptional() @IsOptional() @IsString() startTime?: string
  @ApiPropertyOptional() @IsOptional() @IsString() endTime?: string
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string
}

export class UpdateMemberPricingRuleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() ruleType?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) @Type(() => Number) discountRate?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) fixedPrice?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) @Type(() => Number) extraDiscount?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) priority?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number) minQuantity?: number
  @ApiPropertyOptional() @IsOptional() @IsString() startTime?: string
  @ApiPropertyOptional() @IsOptional() @IsString() endTime?: string
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
}

export class QueryMemberPricingRuleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() levelCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() skuId?: string
}
