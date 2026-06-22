/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { IsString, IsEnum, IsOptional, IsNumber, IsArray, IsNotEmpty, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export enum AfterSalesType {
  RETURN = 'return',
  EXCHANGE = 'exchange',
  REFUND_ONLY = 'refund_only',
  REPAIR = 'repair',
}

export enum ReasonType {
  QUALITY = 'quality',
  WRONG_ITEM = 'wrong_item',
  NOT_AS_DESCRIBED = 'not_as_described',
  CHANGED_MIND = 'changed_mind',
  OTHER = 'other',
}

export class CreateAfterSalesDto {
  @ApiProperty({ description: '关联订单 ID' })
  @IsString()
  @IsNotEmpty()
  orderId: string

  @ApiProperty({ description: '售后类型', enum: AfterSalesType })
  @IsEnum(AfterSalesType)
  afterSalesType: string

  @ApiProperty({ description: '原因分类', enum: ReasonType })
  @IsEnum(ReasonType)
  reasonType: string

  @ApiPropertyOptional({ description: '详细说明' })
  @IsOptional()
  @IsString()
  reasonDetail: string

  @ApiPropertyOptional({ description: '凭证图片 URL 数组' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceUrls: string[]

  @ApiProperty({ description: '申请退款金额' })
  @IsNumber()
  @Min(0)
  refundAmount: number

  @ApiPropertyOptional({ description: '售后商品明细' })
  @IsOptional()
  @IsArray()
  items: any[]

  @ApiPropertyOptional({ description: '申请人类型', enum: ['customer', 'admin'] })
  @IsOptional()
  @IsString()
  applicantType: string

  @ApiPropertyOptional({ description: '申请人 ID' })
  @IsOptional()
  @IsString()
  applicantId: string

  @ApiPropertyOptional({ description: '退回物流单号' })
  @IsOptional()
  @IsString()
  returnTrackingNo: string

  @ApiPropertyOptional({ description: '退回物流公司' })
  @IsOptional()
  @IsString()
  returnCarrier: string
}

export class ReviewAfterSalesDto {
  @ApiProperty({ description: '审核结果: approve / reject' })
  @IsString()
  action: 'approve' | 'reject'

  @ApiPropertyOptional({ description: '审核备注' })
  @IsOptional()
  @IsString()
  reviewNote: string

  @ApiPropertyOptional({ description: '实际退款金额（批准时）' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualRefundAmount: number
}

export class ProcessAfterSalesDto {
  @ApiProperty({ description: '操作: receive / refund / close / reopen' })
  @IsString()
  action: 'receive' | 'refund' | 'close' | 'reopen'

  @ApiPropertyOptional({ description: '操作备注' })
  @IsOptional()
  @IsString()
  note: string

  @ApiPropertyOptional({ description: '退款方式' })
  @IsOptional()
  @IsString()
  refundMethod: string

  @ApiPropertyOptional({ description: '实际退款金额' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualRefundAmount: number
}

export class UpdateAfterSalesDto {
  @ApiPropertyOptional({ description: '退回物流单号' })
  @IsOptional()
  @IsString()
  returnTrackingNo: string

  @ApiPropertyOptional({ description: '退回物流公司' })
  @IsOptional()
  @IsString()
  returnCarrier: string

  @ApiPropertyOptional({ description: '换货重发物流单号' })
  @IsOptional()
  @IsString()
  resendTrackingNo: string

  @ApiPropertyOptional({ description: '换货重发物流公司' })
  @IsOptional()
  @IsString()
  resendCarrier: string
}
