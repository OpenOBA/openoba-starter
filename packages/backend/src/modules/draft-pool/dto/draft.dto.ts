/**
 * 通用草稿池 DTO
 */

import { IsString, IsOptional, IsArray, IsObject, IsEnum, IsIn } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import type { DraftStatus, DraftType, DraftAttachment } from '../entities/draft.entity'

export class CreateDraftDto {
  @ApiPropertyOptional({ description: '标题' })
  @IsOptional()
  @IsString()
  title?: string

  @ApiPropertyOptional({ description: '类型标记' })
  @IsOptional()
  @IsString()
  draftType?: string

  @ApiPropertyOptional({ description: '文本内容' })
  @IsOptional()
  @IsString()
  bodyText?: string

  @ApiPropertyOptional({ description: '结构化内容' })
  @IsOptional()
  @IsObject()
  bodyJson?: Record<string, unknown>

  @ApiPropertyOptional({ description: '内容块数组' })
  @IsOptional()
  @IsArray()
  blocks?: Array<Record<string, unknown>>

  @ApiPropertyOptional({ description: '附件列表' })
  @IsOptional()
  @IsArray()
  attachments?: DraftAttachment[]

  @ApiPropertyOptional({ description: '标签' })
  @IsOptional()
  @IsArray()
  tags?: string[]

  @ApiPropertyOptional({ description: '交付渠道', enum: ['system', 'local_file'] })
  @IsOptional()
  @IsString()
  deliveryChannel?: string

  @ApiPropertyOptional({ description: '本地基准路径' })
  @IsOptional()
  @IsString()
  localBasePath?: string

  // Agent 追溯
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceTaskId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceSessionId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceAgent?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceModel?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourcePrompt?: string
}

export class UpdateDraftDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  draftType?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bodyText?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  bodyJson?: Record<string, unknown>

  @ApiPropertyOptional({ description: '内容块数组' })
  @IsOptional()
  @IsArray()
  blocks?: Array<Record<string, unknown>>

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  attachments?: DraftAttachment[]

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  tags?: string[]

  @ApiPropertyOptional({ description: '交付渠道' })
  @IsOptional()
  @IsString()
  deliveryChannel?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  localBasePath?: string
}

export class UpdateDraftStatusDto {
  @ApiProperty({ description: 'editing|ready|published|archived' })
  @IsString()
  @IsIn(['editing', 'ready', 'published', 'archived'])
  status!: DraftStatus
}

export class PublishDraftDto {
  @ApiProperty({ description: '发布动作' })
  @IsString()
  @IsIn(['insert', 'update', 'replace', 'export', 'post', 'merge'])
  action!: string

  @ApiProperty({ description: '目标实体' })
  @IsString()
  entity!: string

  @ApiPropertyOptional({ description: '发布目标列表' })
  @IsOptional()
  @IsArray()
  targets?: Array<{ id?: string; type: string; name: string; field?: string; old?: unknown; new?: unknown }>
}

export class QueryDraftDto {
  @ApiPropertyOptional({ description: '类型筛选' })
  @IsOptional()
  @IsString()
  draftType?: string

  @ApiPropertyOptional({ description: '状态筛选' })
  @IsOptional()
  @IsString()
  status?: string

  @ApiPropertyOptional({ description: '来源任务' })
  @IsOptional()
  @IsString()
  sourceTaskId?: string

  @ApiPropertyOptional({ description: '搜索关键词（标题+文本）' })
  @IsOptional()
  @IsString()
  search?: string

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  page?: number

  @ApiPropertyOptional({ description: '每页条数', default: 20 })
  @IsOptional()
  pageSize?: number
}
