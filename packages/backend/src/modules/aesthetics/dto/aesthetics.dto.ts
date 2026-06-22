/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { IsOptional, IsString, IsArray, IsObject, IsInt, Min, Max } from 'class-validator'

export class AestheticCheckDto {
  @IsObject()
  spu: {
    shapeCode: string
    seriesCode: string
    gender: string
    productTier?: string
  }

  @IsObject()
  sku: {
    colorCode: string
    skinToneEffect?: string
    faceShapeEffect?: string
  }

  @IsOptional()
  @IsObject()
  context?: {
    season?: string
    launchScene?: string
  }
}

export class AestheticCheckResultDto {
  level: string
  errors: AestheticCheckItem[]
  warnings: AestheticCheckItem[]
  tips: AestheticCheckItem[]
  recommendations: AestheticRecommendation[]
  ruleSetVersion: string
}

export class AestheticCheckItem {
  ruleCode: string
  ruleName: string
  message: string
  severity: 'block' | 'warn' | 'info'
}

export class AestheticRecommendation {
  type: string
  current?: string
  suggested: string
  reason: string
}

export class AestheticFeedbackDto {
  @IsString()
  ruleCode: string

  @IsString()
  action: string

  @IsOptional()
  @IsObject()
  skuContext?: any

  @IsOptional()
  @IsString()
  operatorNote?: string
}

export class AestheticBatchCheckDto {
  @IsObject()
  spu: {
    shapeCode: string
    seriesCode: string
    gender: string
    productTier?: string
  }

  @IsArray()
  skus: Array<{
    colorCode: string
    skinToneEffect?: string
    faceShapeEffect?: string
  }>

  @IsOptional()
  @IsObject()
  context?: {
    season?: string
    launchScene?: string
  }
}
