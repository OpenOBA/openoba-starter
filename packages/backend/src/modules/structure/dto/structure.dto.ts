import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  Min,
  Max,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { STRUCT_STATUS } from '../../../common/system-status'

export const SURFACE_TYPES = ['SPH', 'ASP', 'DAS', 'FRM'] as const
// STRUCT_STATUS 从 common/system-status.ts 统一导入

export class CreateStructureStandardDto {
  // externalCode 由系统自动生成，不在 API 文档中暴露，但 DTO 需要接收（controller 传入）
  @ApiProperty({ required: false, deprecated: true })
  @IsOptional()
  @IsString()
  externalCode?: string

  @ApiProperty({ example: 'L-CLS-510-471-600-V1.0', description: '对内编号' })
  @IsOptional()
  @IsString()
  internalCode?: string

  @ApiProperty({ example: 'OVL' })
  @IsString()
  shapeCode: string

  @ApiPropertyOptional({ example: 'CLS', description: '系列代码（可选，同一标准可用于不同系列）' })
  @IsOptional()
  @IsString()
  seriesCode?: string

  @ApiProperty({ example: 51.0 })
  @IsNumber()
  @Min(40)
  @Max(60)
  width: number

  @ApiProperty({ example: 47.1 })
  @IsNumber()
  @Min(25)
  @Max(55)
  height: number

  @ApiPropertyOptional({ example: 18, description: '鼻梁宽度mm' })
  @IsOptional()
  @IsNumber()
  @Min(12)
  @Max(25)
  bridgeWidth?: number

  @ApiProperty({ example: 157.2 })
  @IsNumber()
  @Min(140)
  @Max(180)
  circumference: number

  @ApiPropertyOptional({ example: 200, description: '基弧-曲率半径mm (BASE 200C = 200mm)' })
  @IsOptional()
  @IsNumber()
  baseCurve?: number

  @ApiProperty({ description: '球面类型（多选）', enum: SURFACE_TYPES, isArray: true })
  @IsArray()
  @IsEnum(SURFACE_TYPES, { each: true })
  @ArrayMinSize(1)
  surfaceTypes: string[]

  @ApiProperty({ description: '折射率（多选）', example: [1.56, 1.6, 1.67], isArray: true })
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  refractiveIndexes: number[]

  @ApiPropertyOptional({ example: '经典椭圆造型，百搭基础款' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ example: 'active', enum: STRUCT_STATUS })
  @IsOptional()
  @IsEnum(STRUCT_STATUS)
  status?: string
}

export class UpdateStructureStandardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shapeCode?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seriesCode?: string | null

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(40)
  @Max(60)
  width?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(25)
  @Max(55)
  height?: number

  @ApiPropertyOptional({ example: 18, description: '鼻梁宽度mm' })
  @IsOptional()
  @IsNumber()
  @Min(12)
  @Max(25)
  bridgeWidth?: number | null

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  circumference?: number

  @ApiPropertyOptional({ example: 200, description: '基弧-曲率半径mm' })
  @IsOptional()
  @IsNumber()
  baseCurve?: number | null

  @ApiPropertyOptional({ description: '球面类型（多选）', enum: SURFACE_TYPES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(SURFACE_TYPES, { each: true })
  surfaceTypes?: string[]

  @ApiPropertyOptional({ description: '折射率（多选）', example: [1.56, 1.6], isArray: true })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  refractiveIndexes?: number[]

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ enum: STRUCT_STATUS })
  @IsOptional()
  @IsEnum(STRUCT_STATUS)
  status?: string
}

export class CreateAttachmentDto {
  @ApiProperty()
  @IsString()
  structureId: string

  @ApiProperty({ enum: ['image', 'pdf', 'dwg', '3d'] })
  @IsString()
  fileType: string

  @ApiProperty()
  @IsString()
  fileName: string

  @ApiProperty()
  @IsString()
  fileUrl: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  fileSize?: number

  @ApiPropertyOptional()
  @IsOptional()
  mimeType?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number
}

export class CreateCompatibilityDto {
  @ApiProperty({ example: '5147', description: '结构标准锚点（统一使用external_code）' })
  @IsString()
  structureStandardCode: string

  @ApiProperty()
  @IsString()
  productSkuId: string

  @ApiProperty({ enum: ['color', 'style', 'texture', 'smart'] })
  @IsString()
  compatibilityLevel: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string
}

export class QueryStructureDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shapeCode?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seriesCode?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
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
