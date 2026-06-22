/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional, IsInt, IsBoolean, IsNumber, IsJSON } from 'class-validator'

export class CreateSubSkuDto {
  @ApiProperty({ description: '系统编号' })
  @IsString()
  code: string

  @ApiProperty({ description: '展示名' })
  @IsString()
  name: string

  @ApiProperty({ description: '分类ID' })
  @IsString()
  categoryId: string

  @ApiPropertyOptional({ description: '规格模板ID' })
  @IsOptional() @IsString()
  specTemplateId?: string

  @ApiPropertyOptional({ description: '规格参数值 JSON' })
  @IsOptional()
  specValues?: Record<string, any>

  @ApiPropertyOptional({ description: '结构标准ID' })
  @IsOptional() @IsString()
  standardId?: string

  @ApiProperty({ description: '售价', default: 0 })
  @IsNumber()
  price: number

  @ApiPropertyOptional({ description: '成本价', default: 0 })
  @IsOptional() @IsNumber()
  costPrice?: number

  @ApiPropertyOptional({ description: '单位', default: '副' })
  @IsOptional() @IsString()
  unit?: string

  @ApiPropertyOptional({ description: '库存', default: 0 })
  @IsOptional() @IsInt()
  stock?: number

  @ApiPropertyOptional({ description: '图片列表' })
  @IsOptional()
  images?: string[]

  @ApiPropertyOptional({ description: '排序', default: 0 })
  @IsOptional() @IsInt()
  sortOrder?: number

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional({ description: '品牌' })
  @IsOptional() @IsString()
  brand?: string

  @ApiPropertyOptional({ description: '型号' })
  @IsOptional() @IsString()
  model?: string
}

export class UpdateSubSkuDto {
  @ApiPropertyOptional({ description: '系统编号（一般不修改）' })
  @IsOptional() @IsString()
  code?: string

  @ApiPropertyOptional({ description: '展示名' })
  @IsOptional() @IsString()
  name?: string

  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional() @IsString()
  categoryId?: string

  @ApiPropertyOptional({ description: '规格模板ID' })
  @IsOptional() @IsString()
  specTemplateId?: string

  @ApiPropertyOptional({ description: '规格参数值' })
  @IsOptional()
  specValues?: Record<string, any>

  @ApiPropertyOptional({ description: '结构标准ID' })
  @IsOptional() @IsString()
  standardId?: string

  @ApiPropertyOptional({ description: '售价' })
  @IsOptional() @IsNumber()
  price?: number

  @ApiPropertyOptional({ description: '成本价' })
  @IsOptional() @IsNumber()
  costPrice?: number

  @ApiPropertyOptional({ description: '单位' })
  @IsOptional() @IsString()
  unit?: string

  @ApiPropertyOptional({ description: '库存' })
  @IsOptional() @IsInt()
  stock?: number

  @ApiPropertyOptional({ description: '图片列表' })
  @IsOptional()
  images?: string[]

  @ApiPropertyOptional({ description: '排序' })
  @IsOptional() @IsInt()
  sortOrder?: number

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional() @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional({ description: '品牌' })
  @IsOptional() @IsString()
  brand?: string

  @ApiPropertyOptional({ description: '型号' })
  @IsOptional() @IsString()
  model?: string
}

export class CreateSubSkuCategoryDto {
  @ApiProperty({ description: '分类编码' })
  @IsString()
  code: string

  @ApiProperty({ description: '分类名称' })
  @IsString()
  name: string

  @ApiPropertyOptional({ description: '父级分类ID' })
  @IsOptional() @IsString()
  parentId?: string

  @ApiPropertyOptional({ description: '排序', default: 0 })
  @IsOptional() @IsInt()
  sortOrder?: number
}

export class UpdateSubSkuCategoryDto {
  @ApiPropertyOptional({ description: '分类编码（一般不修改）' })
  @IsOptional() @IsString()
  code?: string

  @ApiPropertyOptional({ description: '分类名称' })
  @IsOptional() @IsString()
  name?: string

  @ApiPropertyOptional({ description: '父级分类ID' })
  @IsOptional() @IsString()
  parentId?: string

  @ApiPropertyOptional({ description: '排序' })
  @IsOptional() @IsInt()
  sortOrder?: number

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional() @IsBoolean()
  isActive?: boolean
}

export class QuerySubSkuDto {
  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional() @IsString()
  categoryId?: string

  @ApiPropertyOptional({ description: '关键字搜索' })
  @IsOptional() @IsString()
  keyword?: string

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  isActive?: boolean

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  page?: number

  @ApiPropertyOptional({ description: '每页条数', default: 20 })
  @IsOptional()
  pageSize?: number
}
