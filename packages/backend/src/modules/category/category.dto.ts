import { IsString, IsOptional, IsNumber, IsBoolean, IsInt, Min, IsArray } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class CreateCategoryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() categoryCode?: string
  @ApiPropertyOptional() @IsString() categoryName: string
  @ApiPropertyOptional() @IsOptional() @IsString() parentId?: string
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number) level?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number) sortOrder?: number
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
  @ApiPropertyOptional() @IsOptional() @IsString() icon?: string
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) isRecommended?: number
}

export class UpdateCategoryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() categoryName?: string
  @ApiPropertyOptional() @IsOptional() @IsString() parentId?: string
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number) level?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number) sortOrder?: number
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
  @ApiPropertyOptional() @IsOptional() @IsString() icon?: string
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) isRecommended?: number
}

export class BatchSortDto {
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  orderedIds: string[]
}
