import { IsString, IsOptional, IsBoolean } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

// ============ Color Material Mapping DTOs ============

export class CreateColorMaterialMappingDto {
  @ApiProperty({ description: '材质代码' })
  @IsString()
  materialCode: string

  @ApiProperty({ description: '颜色代码' })
  @IsString()
  colorCode: string

  @ApiProperty({ description: '可行性', enum: ['feasible', 'not_feasible', 'conditional'], default: 'feasible' })
  @IsString()
  @IsOptional()
  feasibility?: string

  @ApiPropertyOptional({ description: '推荐工艺' })
  @IsString()
  @IsOptional()
  craftProcess?: string

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  notes?: string
}

export class UpdateColorMaterialMappingDto {
  @ApiPropertyOptional({ description: '可行性' })
  @IsString()
  @IsOptional()
  feasibility?: string

  @ApiPropertyOptional({ description: '推荐工艺' })
  @IsString()
  @IsOptional()
  craftProcess?: string

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  notes?: string

  @ApiPropertyOptional({ description: '是否启用' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}

export class QueryColorMaterialMappingDto {
  @ApiPropertyOptional({ description: '材质代码筛选' })
  @IsString()
  @IsOptional()
  materialCode?: string

  @ApiPropertyOptional({ description: '颜色代码筛选' })
  @IsString()
  @IsOptional()
  colorCode?: string

  @ApiPropertyOptional({ description: '可行性筛选' })
  @IsString()
  @IsOptional()
  feasibility?: string

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsOptional()
  page?: number

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @Type(() => Number)
  @IsOptional()
  pageSize?: number
}

// ============ Color Seasonal Palette DTOs ============

export class CreateColorSeasonalPaletteDto {
  @ApiProperty({ description: '季节（如 SS26 / AW26）' })
  @IsString()
  season: string

  @ApiProperty({ description: '色盘名称' })
  @IsString()
  paletteName: string

  @ApiPropertyOptional({ description: '主题描述' })
  @IsString()
  @IsOptional()
  theme?: string

  @ApiPropertyOptional({ description: '目标人群' })
  @IsString()
  @IsOptional()
  targetAudience?: string

  @ApiPropertyOptional({ description: '适用场景' })
  @IsString()
  @IsOptional()
  scenario?: string

  @ApiPropertyOptional({ description: '趋势来源' })
  @IsString()
  @IsOptional()
  trendSource?: string

  @ApiPropertyOptional({ description: '创建人' })
  @IsString()
  @IsOptional()
  createdBy?: string

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  notes?: string
}

export class UpdateColorSeasonalPaletteDto {
  @ApiPropertyOptional({ description: '季节' })
  @IsString()
  @IsOptional()
  season?: string

  @ApiPropertyOptional({ description: '色盘名称' })
  @IsString()
  @IsOptional()
  paletteName?: string

  @ApiPropertyOptional({ description: '主题描述' })
  @IsString()
  @IsOptional()
  theme?: string

  @ApiPropertyOptional({ description: '目标人群' })
  @IsString()
  @IsOptional()
  targetAudience?: string

  @ApiPropertyOptional({ description: '适用场景' })
  @IsString()
  @IsOptional()
  scenario?: string

  @ApiPropertyOptional({ description: '趋势来源' })
  @IsString()
  @IsOptional()
  trendSource?: string

  @ApiPropertyOptional({ description: '状态' })
  @IsString()
  @IsOptional()
  status?: string

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  notes?: string
}

export class QueryColorSeasonalPaletteDto {
  @ApiPropertyOptional({ description: '季节筛选' })
  @IsString()
  @IsOptional()
  season?: string

  @ApiPropertyOptional({ description: '状态筛选' })
  @IsString()
  @IsOptional()
  status?: string

  @ApiPropertyOptional({ description: '关键词' })
  @IsString()
  @IsOptional()
  keyword?: string

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsOptional()
  page?: number

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @Type(() => Number)
  @IsOptional()
  pageSize?: number
}

// ============ Palette Item DTOs ============

export class CreatePaletteItemDto {
  @ApiProperty({ description: '色盘 ID' })
  @IsString()
  paletteId: string

  @ApiProperty({ description: '颜色代码' })
  @IsString()
  colorCode: string

  @ApiPropertyOptional({ description: '在色盘中的角色', enum: ['primary', 'secondary', 'accent'], default: 'primary' })
  @IsString()
  @IsOptional()
  roleInPalette?: string

  @ApiPropertyOptional({ description: '排序', default: 0 })
  @Type(() => Number)
  @IsOptional()
  sortOrder?: number

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  notes?: string
}

// ============ Color Design Project DTOs ============

export class CreateColorDesignProjectDto {
  @ApiProperty({ description: '项目编号' })
  @IsString()
  projectCode: string

  @ApiProperty({ description: '项目名称' })
  @IsString()
  projectName: string

  @ApiPropertyOptional({ description: '项目描述' })
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional({ description: '关联色盘 ID' })
  @IsString()
  @IsOptional()
  paletteId?: string

  @ApiPropertyOptional({ description: '目标季节' })
  @IsString()
  @IsOptional()
  targetSeason?: string

  @ApiPropertyOptional({ description: '目标上市日期' })
  @IsString()
  @IsOptional()
  targetLaunchDate?: string

  @ApiPropertyOptional({ description: '优先级', enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' })
  @IsString()
  @IsOptional()
  priority?: string

  @ApiPropertyOptional({ description: '负责人' })
  @IsString()
  @IsOptional()
  assignedTo?: string

  @ApiPropertyOptional({ description: '创建人' })
  @IsString()
  @IsOptional()
  createdBy?: string

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  notes?: string
}

export class UpdateColorDesignProjectDto {
  @ApiPropertyOptional({ description: '项目名称' })
  @IsString()
  @IsOptional()
  projectName?: string

  @ApiPropertyOptional({ description: '项目描述' })
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional({ description: '关联色盘 ID' })
  @IsString()
  @IsOptional()
  paletteId?: string

  @ApiPropertyOptional({ description: '目标季节' })
  @IsString()
  @IsOptional()
  targetSeason?: string

  @ApiPropertyOptional({ description: '目标上市日期' })
  @IsString()
  @IsOptional()
  targetLaunchDate?: string

  @ApiPropertyOptional({ description: '状态' })
  @IsString()
  @IsOptional()
  status?: string

  @ApiPropertyOptional({ description: '优先级' })
  @IsString()
  @IsOptional()
  priority?: string

  @ApiPropertyOptional({ description: '负责人' })
  @IsString()
  @IsOptional()
  assignedTo?: string

  @ApiPropertyOptional({ description: 'AI 评估评分' })
  @Type(() => Number)
  @IsOptional()
  aiEvaluationScore?: number

  @ApiPropertyOptional({ description: 'AI 评估备注' })
  @IsString()
  @IsOptional()
  aiEvaluationNotes?: string

  @ApiPropertyOptional({ description: '预估销量' })
  @Type(() => Number)
  @IsOptional()
  salesForecast?: number

  @ApiPropertyOptional({ description: '预估置信度' })
  @Type(() => Number)
  @IsOptional()
  forecastConfidence?: number

  @ApiPropertyOptional({ description: '审批人' })
  @IsString()
  @IsOptional()
  approvedBy?: string

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  notes?: string
}

export class QueryColorDesignProjectDto {
  @ApiPropertyOptional({ description: '状态筛选' })
  @IsString()
  @IsOptional()
  status?: string

  @ApiPropertyOptional({ description: '目标季节筛选' })
  @IsString()
  @IsOptional()
  targetSeason?: string

  @ApiPropertyOptional({ description: '优先级筛选' })
  @IsString()
  @IsOptional()
  priority?: string

  @ApiPropertyOptional({ description: '关键词' })
  @IsString()
  @IsOptional()
  keyword?: string

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsOptional()
  page?: number

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @Type(() => Number)
  @IsOptional()
  pageSize?: number
}

// ============ Project Color DTOs ============

export class CreateProjectColorDto {
  @ApiProperty({ description: '项目 ID' })
  @IsString()
  projectId: string

  @ApiProperty({ description: '颜色代码' })
  @IsString()
  colorCode: string

  @ApiPropertyOptional({ description: '材质代码' })
  @IsString()
  @IsOptional()
  materialCode?: string

  @ApiPropertyOptional({ description: '是否主色', default: false })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean

  @ApiPropertyOptional({ description: '排序', default: 0 })
  @Type(() => Number)
  @IsOptional()
  sortOrder?: number

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  notes?: string
}
