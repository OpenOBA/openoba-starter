/**
 * 秒镜科技 · ERDL — DTO 定义
 *
 * @file erdl.dto.ts
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-02
 * @license AGPL-3.0
 *
 * ERDL 规则管理 CRUD 接口使用的数据传输对象。
 */

import { IsString, IsOptional, IsInt, IsBoolean, IsObject, IsNumber, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

// ============================================
// 创建规则 DTO
// ============================================

export class CreateRuleDto {
  @ApiProperty({ description: '规则名称' })
  @IsString()
  name!: string

  @ApiProperty({ description: '触发器标识（如 "Product.price.calculate"）' })
  @IsString()
  trigger!: string

  @ApiProperty({ description: '命名空间（如 "industry.eyewear"）' })
  @IsString()
  namespace!: string

  @ApiProperty({ description: '目标实体类型（如 "ProductSku"）' })
  @IsString()
  entity!: string

  @ApiProperty({ description: '规则层级', enum: ['policy', 'validation', 'computed'] })
  @IsString()
  tier!: 'policy' | 'validation' | 'computed'

  @ApiProperty({ description: '优先级（数字越小优先级越高）' })
  @IsInt()
  priority!: number

  @ApiPropertyOptional({ description: '是否激活', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ApiProperty({ description: '条件（JSON 对象）' })
  @IsObject()
  condition!: Record<string, unknown>

  @ApiProperty({ description: '动作（JSON 数组）' })
  @IsObject()
  actions!: Record<string, unknown>[]
}

// ============================================
// 更新规则 DTO
// ============================================

export class UpdateRuleDto {
  @ApiPropertyOptional({ description: '规则名称' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional({ description: '触发器标识' })
  @IsOptional()
  @IsString()
  trigger?: string

  @ApiPropertyOptional({ description: '命名空间' })
  @IsOptional()
  @IsString()
  namespace?: string

  @ApiPropertyOptional({ description: '目标实体类型' })
  @IsOptional()
  @IsString()
  entity?: string

  @ApiPropertyOptional({ description: '规则层级', enum: ['policy', 'validation', 'computed'] })
  @IsOptional()
  @IsString()
  tier?: 'policy' | 'validation' | 'computed'

  @ApiPropertyOptional({ description: '优先级' })
  @IsOptional()
  @IsInt()
  priority?: number

  @ApiPropertyOptional({ description: '是否激活' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional({ description: '条件（JSON 对象）' })
  @IsOptional()
  @IsObject()
  condition?: Record<string, unknown>

  @ApiPropertyOptional({ description: '动作（JSON 数组）' })
  @IsOptional()
  @IsObject()
  actions?: Record<string, unknown>[]
}

// ============ P0-1修复：ERDL Proxy DTO ============

export class ProxyQueryDto {
  @IsOptional() @IsString() namespace?: string
  @IsString() entity: string
  @IsOptional() select?: string[]
  @IsOptional() @IsObject() where?: Record<string, unknown>
  @IsOptional() @IsNumber() @Min(1) @Max(1000) @Type(() => Number) limit?: number
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) offset?: number
}

export class ProxyInsertDto {
  @IsOptional() @IsString() namespace?: string
  @IsString() entity: string
  @IsObject() data: Record<string, unknown>
}

export class ProxyUpdateDto {
  @IsOptional() @IsString() namespace?: string
  @IsString() entity: string
  @IsObject() where: Record<string, unknown>
  @IsObject() data: Record<string, unknown>
}

export class ProxyDeleteDto {
  @IsOptional() @IsString() namespace?: string
  @IsString() entity: string
  @IsObject() where: Record<string, unknown>
}
