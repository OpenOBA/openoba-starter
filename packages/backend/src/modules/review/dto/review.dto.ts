import { IsString, IsNumber, IsOptional, IsArray, IsBoolean, IsNotEmpty, Min, Max, IsEnum } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateReviewDto {
  @ApiProperty({ description: '关联订单 ID' })
  @IsString()
  @IsNotEmpty()
  orderId: string

  @ApiPropertyOptional({ description: '订单行 ID（可选）' })
  @IsOptional()
  @IsString()
  orderItemId?: string

  @ApiProperty({ description: '用户 ID' })
  @IsString()
  @IsNotEmpty()
  customerId: string

  @ApiPropertyOptional({ description: '用户昵称' })
  @IsOptional()
  @IsString()
  customerName?: string

  @ApiProperty({ description: 'SPU ID' })
  @IsString()
  @IsNotEmpty()
  spuId: string

  @ApiPropertyOptional({ description: 'SKU ID（可选）' })
  @IsOptional()
  @IsString()
  skuId?: string

  @ApiProperty({ description: '总评分 1-5' })
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  overallScore: number

  @ApiPropertyOptional({ description: '质量评分 1-5' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  qualityScore?: number

  @ApiPropertyOptional({ description: '舒适度评分 1-5' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  comfortScore?: number

  @ApiPropertyOptional({ description: '款式评分 1-5' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  styleScore?: number

  @ApiPropertyOptional({ description: '性价比评分 1-5' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  valueScore?: number

  @ApiPropertyOptional({ description: '评价正文' })
  @IsOptional()
  @IsString()
  content?: string

  @ApiPropertyOptional({ description: '评价图片 URL 数组' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[]

  @ApiPropertyOptional({ description: '是否匿名', default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean

  @ApiPropertyOptional({ description: '评价标签' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]
}

export class ReviewActionDto {
  @ApiProperty({ description: '操作: approve / reject', enum: ['approve', 'reject'] })
  @IsEnum(['approve', 'reject'])
  action: 'approve' | 'reject'
}

export class ReplyReviewDto {
  @ApiProperty({ description: '回复内容' })
  @IsString()
  @IsNotEmpty()
  content: string

  @ApiPropertyOptional({ description: '回复人' })
  @IsOptional()
  @IsString()
  replyBy?: string
}

export class QueryReviewDto {
  @ApiPropertyOptional() @IsOptional() @IsString() keyword?: string
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string
  @ApiPropertyOptional() @IsOptional() @IsString() spuId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) minScore?: number
  @ApiPropertyOptional() @IsOptional() @IsString() startDate?: string
  @ApiPropertyOptional() @IsOptional() @IsString() endDate?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) page?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) pageSize?: number
}
