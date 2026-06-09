import { Type } from 'class-transformer'
import { IsOptional, IsString, IsNotEmpty, IsArray, IsInt, Min, Max, ValidateNested } from 'class-validator'

export class CreateDraftSkuDto {
  @IsNotEmpty() @IsString() colorCode: string
  @IsOptional() @IsString() colorName?: string
  @IsOptional() @IsString() skinToneEffect?: string
  @IsOptional() @IsString() faceShapeEffect?: string
  @IsOptional() @IsString() displayName?: string
  @IsOptional() @IsInt() sortOrder?: number
}

export class CreateDraftSpuDto {
  @IsOptional() @IsString() batchId?: string

  @IsNotEmpty() @IsString() gender: string
  @IsNotEmpty() @IsString() shapeCode: string
  @IsNotEmpty() @IsString() seriesCode: string
  @IsNotEmpty() @IsString() structureStandardCode: string
  @IsNotEmpty() @IsString() spuName: string

  @IsOptional() @IsString() spuDescription?: string
  @IsOptional() @IsString() displayNameTemplate?: string
  @IsOptional() @IsString() source?: string

  @IsOptional() @IsArray() skus?: CreateDraftSkuDto[]
}

export class UpdateDraftSkuDto {
  @IsOptional() @IsString() draftSkuId?: string
  @IsOptional() @IsString() colorCode?: string
  @IsOptional() @IsString() colorName?: string
  @IsOptional() @IsString() skinToneEffect?: string
  @IsOptional() @IsString() faceShapeEffect?: string
  @IsOptional() @IsString() displayName?: string
  @IsOptional() @IsInt() sortOrder?: number
}

export class UpdateDraftSpuDto {
  @IsOptional() @IsString() gender?: string
  @IsOptional() @IsString() shapeCode?: string
  @IsOptional() @IsString() seriesCode?: string
  @IsOptional() @IsString() spuName?: string
  @IsOptional() @IsString() spuDescription?: string
  @IsOptional() @IsString() structureStandardCode?: string
  @IsOptional() @IsString() displayNameTemplate?: string
  @IsOptional() @IsString() reviewNotes?: string
  @IsOptional() @IsString() rejectedReason?: string
  @IsOptional() @IsString() status?: string
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => UpdateDraftSkuDto) skus?: UpdateDraftSkuDto[]
}

export class ReviewDraftDto {
  @IsNotEmpty() @IsString() action: string // approve | reject

  @IsOptional() @IsString() reviewNotes?: string
  @IsOptional() @IsString() rejectedReason?: string
  @IsOptional() @IsArray() @IsString({ each: true }) skuIds?: string[] // approve/reject specific SKUs
}

export class GenerateDraftsDto {
  @IsNotEmpty() @IsString() gender: string
  @IsNotEmpty() @IsString() shapeCode: string
  @IsNotEmpty() @IsString() seriesCode: string
  @IsNotEmpty() @IsString() structureStandardCode: string

  @IsOptional() @IsString() spuName?: string
  @IsOptional() @IsInt() @Min(4) @Max(12) colorCount?: number
  @IsOptional() @IsString() promptOverride?: string
}

export class PublishDraftDto {
  @IsArray() draftIds: string[]
  @IsOptional() @IsString() packageName?: string
  @IsOptional() @IsString() publishedBy?: string
}

export class QueryDraftDto {
  @IsOptional() @IsString() status?: string
  @IsOptional() @IsString() gender?: string
  @IsOptional() @IsString() shapeCode?: string
  @IsOptional() @IsString() seriesCode?: string
  @IsOptional() @IsString() source?: string
  @IsOptional() @IsString() batchId?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number
}

export class CreateAdvisoryReportDto {
  @IsNotEmpty() @IsString() reportName: string
  @IsNotEmpty() @IsString() reportType: string
  @IsOptional() @IsString() queryContext?: string
}

export class DraftBatchDto {
  @IsOptional() @IsString() batchName?: string
  @IsOptional() @IsString() status?: string
}

export class PromoteToProductDto {
  @IsArray() @IsString({ each: true }) draftIds: string[]
  @IsOptional() @IsString() taskId?: string
  @IsOptional() @IsString() packageName?: string
}
