import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean, IsEmail, Min, Max, IsArray, Matches } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { CUSTOMER_TYPES, CUSTOMER_LEVELS, CUSTOMER_STATUS } from '../entity/customer.entity'
import { PRICING_TIERS } from '../entity/customer-tier-pricing.entity'

export class CreateCustomerDto {
  @ApiProperty({ enum: CUSTOMER_TYPES })
  @IsOptional()
  @IsEnum(CUSTOMER_TYPES)
  customerType?: string // P1-10: nullable for FK
  @ApiPropertyOptional({ enum: CUSTOMER_LEVELS, default: 'normal' })
  @IsOptional()
  @IsEnum(CUSTOMER_LEVELS)
  customerLevel?: string
  @ApiPropertyOptional({ enum: CUSTOMER_STATUS })
  @IsOptional()
  @IsEnum(CUSTOMER_STATUS)
  status?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subscriptionStatus?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string
  @ApiProperty()
  @IsString()
  contactName: string
  @ApiProperty()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wechat?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nickname?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string
  // B 端字段
  @ApiPropertyOptional({ enum: PRICING_TIERS })
  @IsOptional()
  @IsString()
  wholesaleTier?: string
  // C 端会员字段
  @ApiPropertyOptional()
  @IsOptional()
  memberDiscountRate?: number
  @ApiPropertyOptional()
  @IsOptional()
  pointsBalance?: number
  // 合作伙伴字段
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  partnerServices?: string[]
  // 前端额外字段
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wechatId?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referralSource?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preferredStyle?: string
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ enum: CUSTOMER_LEVELS })
  @IsOptional()
  @IsEnum(CUSTOMER_LEVELS)
  customerLevel?: string

  @ApiPropertyOptional({ enum: CUSTOMER_TYPES })
  @IsOptional()
  @IsEnum(CUSTOMER_TYPES)
  customerType?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactName?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wechat?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nickname?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string
  @ApiPropertyOptional({ enum: CUSTOMER_STATUS })
  @IsOptional()
  @IsEnum(CUSTOMER_STATUS)
  status?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subscriptionStatus?: string
  @ApiPropertyOptional({ enum: PRICING_TIERS })
  @IsOptional()
  @IsString()
  wholesaleTier?: string
  @ApiPropertyOptional()
  @IsOptional()
  memberDiscountRate?: number
  @ApiPropertyOptional()
  @IsOptional()
  pointsBalance?: number
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  partnerServices?: string[]
  // 前端额外字段
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wechatId?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referralSource?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preferredStyle?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastContactAt?: string
}

export class QueryCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string
  @ApiPropertyOptional({ enum: CUSTOMER_TYPES })
  @IsOptional()
  @IsEnum(CUSTOMER_TYPES)
  customerType?: string
  @ApiPropertyOptional({ enum: CUSTOMER_LEVELS })
  @IsOptional()
  @IsEnum(CUSTOMER_LEVELS)
  customerLevel?: string
  @ApiPropertyOptional({ enum: CUSTOMER_STATUS })
  @IsOptional()
  @IsEnum(CUSTOMER_STATUS)
  status?: string
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number
  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number
}

export class CreateContactDto {
  @ApiProperty()
  @IsString()
  customerId: string
  @ApiProperty()
  @IsString()
  contactName: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wechat?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean
}

export class UpdateContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactName?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wechat?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean
}

export class CreateAddressDto {
  @ApiProperty()
  @IsString()
  customerId: string
  @ApiProperty()
  @IsString()
  province: string
  @ApiProperty()
  @IsString()
  city: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string
  @ApiProperty()
  @IsString()
  detailAddress: string
  @ApiProperty()
  @IsString()
  receiverName: string
  @ApiProperty()
  @IsString()
  receiverPhone: string
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean
}

export class UpdateAddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  detailAddress?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiverName?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiverPhone?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean
}

export class CreateTierPricingDto {
  @ApiProperty()
  @IsString()
  customerId: string
  @ApiPropertyOptional({ enum: PRICING_TIERS })
  @IsOptional()
  @IsEnum(PRICING_TIERS)
  tier?: string // 协议价场景可选，不传默认 'A'
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productSkuId?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  discountRate?: number
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minQuantity?: number
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxQuantity?: number
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  effectiveFrom?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  effectiveTo?: string
  // 协议价扩展
  @ApiPropertyOptional({ description: 'discount/fixed' })
  @IsOptional()
  @IsString()
  pricingMode?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedPrice?: number
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agreementNo?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agreementStart?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agreementEnd?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  salesRep?: string
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class UpdateTierPricingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  discountRate?: number
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  minQuantity?: number
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxQuantity?: number
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  effectiveFrom?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  effectiveTo?: string
  // 协议价扩展
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pricingMode?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedPrice?: number
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agreementNo?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agreementStart?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agreementEnd?: string
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  salesRep?: string
}

// =====================================================
// Phase 5: 客户核心资产 DTO
// =====================================================

export class CreatePrescriptionDto {
  @ApiProperty()
  @IsString()
  customerId: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  odSphere?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  odCylinder?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  odAxis?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  odAdd?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  osSphere?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  osCylinder?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  osAxis?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  osAdd?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pdValue?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceType?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  prescriptionDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expireDate?: string

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prescriptionImages?: string[]
}

export class CreateCustomerLensDto {
  @ApiProperty()
  @IsString()
  customerId: string

  @ApiProperty()
  @IsString()
  structureStandardCode: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  prescriptionId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purchaseDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderId?: string

  @ApiPropertyOptional()
  @IsOptional()
  attributes?: Record<string, any>
}

export class CreateConsumptionProfileDto {
  @ApiProperty()
  @IsString()
  customerLensId: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productSkuCode?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purchaseDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  useStatus?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  useFrequency?: string

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sceneTags?: string[]

  @ApiPropertyOptional()
  @IsOptional()
  attributes?: Record<string, any>
}
