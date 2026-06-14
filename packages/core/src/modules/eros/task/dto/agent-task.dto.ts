/**
 * ER-OS Agent Task DTO
 */

import { IsString, IsOptional, IsNumber, IsEnum, IsObject, IsArray, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateAgentTaskDto {
  @ApiProperty({ description: '任务标题' })
  @IsString()
  title!: string

  @ApiProperty({ description: '任务类型' })
  @IsEnum(['general', 'product_listing', 'content_creation', 'data_analysis', 'customer_service', 'tech_support', 'custom'])
  type!: string

  @ApiPropertyOptional({ description: '任务主体描述（要做什么）' })
  @IsOptional()
  @IsString()
 subject?: string

  @ApiPropertyOptional({ description: '内容要求（品牌调性/目标人群/风格偏好/预算等）' })
  @IsOptional()
  @IsString()
 requirements?: string

  @ApiProperty({ description: '审批人 ID → report_target.id' })
  @IsString()
  reportTo!: string

  @ApiPropertyOptional({ description: '升级审批人 ID' })
  @IsOptional()
  @IsString()
  escalateTo?: string

  @ApiPropertyOptional({ description: '超时升级小时数', default: 48 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  escalationHours?: number

  @ApiPropertyOptional({ description: '汇报频率', enum: ['every_step', 'per_phase', 'daily_digest', 'on_exception'] })
  @IsOptional()
  @IsEnum(['every_step', 'per_phase', 'daily_digest', 'on_exception'])
  reportFrequency?: string

  @ApiPropertyOptional({ description: '任务上下文（老板指令、规格书等）' })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>

  @ApiPropertyOptional({ description: '创建人名称' })
  @IsOptional()
  @IsString()
  createdBy?: string

  @ApiPropertyOptional({ description: '执行的 Agent ID' })
  @IsOptional()
  @IsString()
  agentId?: string

  @ApiPropertyOptional({ description: '总阶段数' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  totalPhases?: number

  @ApiPropertyOptional({ description: '跳过自动分析（Chat 模式由 SSE 路径处理，不触发 analyzeAndReport）' })
  @IsOptional()
  skipAnalyze?: boolean
}

/** 方案反馈 — 驳回时的人机对话记录 */
export class ProposalFeedbackDto {
  @ApiProperty({ description: '驳回原因标签', enum: ['创意不足', '不够全面', '不符合要求', '价格策略需调整', '技术不可行', '其他'] })
  @IsString()
  reason!: string

  @ApiPropertyOptional({ description: '补充要求 / 返工指示' })
  @IsOptional()
  @IsString()
  suggestions?: string

  @ApiPropertyOptional({ description: '补充的上下文信息' })
  @IsOptional()
  @IsObject()
  additionalContext?: Record<string, unknown>
}

export class UpdateAgentTaskDto {
  @ApiPropertyOptional({ description: '任务标题' })
  @IsOptional()
  @IsString()
  title?: string

  @ApiPropertyOptional({ description: '审批人变更' })
  @IsOptional()
  @IsString()
  reportTo?: string

  @ApiPropertyOptional({ description: '汇报频率变更' })
  @IsOptional()
  @IsEnum(['every_step', 'per_phase', 'daily_digest', 'on_exception'])
  reportFrequency?: string

  @ApiPropertyOptional({ description: '任务上下文更新' })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>
}

export class QueryAgentTaskDto {
  @ApiPropertyOptional({ description: '状态筛选', enum: ['drafted', 'proposed', 'revised', 'executing', 'delivered', 'published', 'completed', 'cancelled', 'escalated'] })
  @IsOptional()
  status?: string

  @ApiPropertyOptional({ description: '任务类型筛选' })
  @IsOptional()
  @IsString()
  type?: string

  @ApiPropertyOptional({ description: '审批人筛选' })
  @IsOptional()
  @IsString()
  reportTo?: string

  @ApiPropertyOptional({ description: 'Agent 筛选' })
  @IsOptional()
  @IsString()
  agentId?: string

  @ApiPropertyOptional({ description: '搜索（任务编号/标题模糊匹配）' })
  @IsOptional()
  @IsString()
  search?: string

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number

  @ApiPropertyOptional({ description: '每页条数', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number
}

// ── 汇报协议 DTO ──

export class TaskReportDto {
  @ApiProperty({ description: '任务 ID' })
  @IsString()
  taskId!: string

  @ApiProperty({ description: '方案内容（Markdown）' })
  @IsString()
  content!: string

  @ApiPropertyOptional({ description: '附件列表' })
  @IsOptional()
  @IsArray()
  attachments?: Array<{ name: string; url: string; type: string }>

  @ApiPropertyOptional({ description: '需要决策的事项' })
  @IsOptional()
  @IsArray()
  decisions?: string[]
}

export class ApprovalDto {
  @ApiProperty({ description: '任务 ID' })
  @IsString()
  taskId!: string

  @ApiProperty({ description: '审批决定：approved（通过）/ rejected（驳回附意见）' })
  @IsEnum(['approved', 'rejected', 'revise'])
  action!: string

  @ApiPropertyOptional({ description: '审批意见/修改要求' })
  @IsOptional()
  @IsString()
  comment?: string

  @ApiPropertyOptional({ description: '驳回原因标签', enum: ['创意不足', '不够全面', '不符合要求', '价格策略需调整', '技术不可行', '其他'] })
  @IsOptional()
  @IsString()
  rejectReason?: string

  @ApiPropertyOptional({ description: '补充要求 / 返工指示' })
  @IsOptional()
  @IsString()
  suggestions?: string

  @ApiPropertyOptional({ description: '补充的上下文信息（会合并到任务 context）' })
  @IsOptional()
  @IsObject()
  additionalContext?: Record<string, unknown>
}

export class DeliverDto {
  @ApiProperty({ description: '任务 ID' })
  @IsString()
  taskId!: string

  @ApiPropertyOptional({ description: '交付物清单' })
  @IsOptional()
  @IsArray()
  deliverables?: Array<{ type: string; url: string; status: string }>
}

export class EscalateDto {
  @ApiProperty({ description: '任务 ID' })
  @IsString()
  taskId!: string

  @ApiPropertyOptional({ description: '升级原因' })
  @IsOptional()
  @IsString()
  reason?: string

  @ApiPropertyOptional({ description: '升级到指定审批人（不填则沿汇报链自动升级）' })
  @IsOptional()
  @IsString()
  escalateTo?: string
}
