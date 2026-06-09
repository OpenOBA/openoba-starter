import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional, IsInt, IsEnum, IsIn, Min } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { TransactionType } from '../entity/inventory-transaction.entity'

export class CreateInventoryDto {
  @ApiProperty({ description: 'SKU ID' })
  @IsString()
  skuId: string

  @ApiProperty({ description: 'SKU 编码' })
  @IsString()
  skuCode: string

  @ApiPropertyOptional({ description: '镜片标准编码' })
  @IsOptional()
  @IsString()
  structureStandardCode?: string

  @ApiPropertyOptional({ description: '仓库编码', default: 'WH-MAIN' })
  @IsOptional()
  @IsString()
  warehouseCode?: string

  @ApiPropertyOptional({ description: '当前库存', default: 0 })
  @IsOptional()
  @IsInt()
  currentQuantity?: number

  @ApiPropertyOptional({ description: 'Warning threshold', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  warningQuantity?: number
}

export class UpdateInventoryDto {
  @ApiPropertyOptional({ description: 'Warning threshold' })
  @IsInt()
  @Min(0)
  warningQuantity?: number
}

export class StockInDto {
  @ApiProperty({ description: 'SKU ID' })
  @IsString()
  skuId: string

  @ApiPropertyOptional({ description: '镜片标准编码' })
  @IsOptional()
  @IsString()
  structureStandardCode?: string

  @ApiProperty({ description: '入库数量', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number

  @ApiProperty({ description: '类型', enum: TransactionType })
  @IsEnum(TransactionType)
  transactionType: TransactionType

  @ApiPropertyOptional({ description: '关联类型：order/purchase/adjust/initial' })
  @IsOptional()
  @IsString()
  referenceType?: string

  @ApiPropertyOptional({ description: '关联记录 ID' })
  @IsOptional()
  @IsString()
  referenceId?: string

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string
}

export class StockOutDto {
  @ApiProperty({ description: 'SKU ID' })
  @IsString()
  skuId: string

  @ApiPropertyOptional({ description: '镜片标准编码' })
  @IsOptional()
  @IsString()
  structureStandardCode?: string

  @ApiProperty({ description: '出库数量', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number

  @ApiProperty({ description: '类型', enum: TransactionType })
  @IsEnum(TransactionType)
  transactionType: TransactionType

  @ApiPropertyOptional({ description: '关联类型：order/purchase/adjust' })
  @IsOptional()
  @IsString()
  referenceType?: string

  @ApiPropertyOptional({ description: '关联记录 ID' })
  @IsOptional()
  @IsString()
  referenceId?: string

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string
}

export class LockStockDto {
  @ApiProperty({ description: 'SKU ID' })
  @IsString()
  skuId: string

  @ApiProperty({ description: '锁定数量', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number

  @ApiProperty({ description: '订单 ID' })
  @IsString()
  orderId: string
}

export class UnlockStockDto {
  @ApiProperty({ description: 'SKU ID' })
  @IsString()
  skuId: string

  @ApiProperty({ description: '解锁数量', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number

  @ApiProperty({ description: '订单 ID' })
  @IsString()
  orderId: string
}

export class AdjustStockDto {
  @ApiProperty({ description: 'SKU ID' })
  @IsString()
  skuId: string

  @ApiProperty({ description: '调整后数量（绝对值）' })
  @IsInt()
  newQuantity: number

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string
}

export class QueryInventoryDto {
  @ApiPropertyOptional({ description: 'SKU 编码' })
  @IsOptional()
  @IsString()
  skuCode?: string

  @ApiPropertyOptional({ description: '镜片标准编码' })
  @IsOptional()
  @IsString()
  structureStandardCode?: string

  @ApiPropertyOptional({ description: '仓库编码' })
  @IsOptional()
  @IsString()
  warehouseCode?: string

  @ApiPropertyOptional({ description: 'Warning threshold' })
  @IsOptional()
  @IsIn(['true', 'false'])
  warningOnly?: string

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  page?: number

  @ApiPropertyOptional({ description: '每页', default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  pageSize?: number
}

export class QueryTransactionDto {
  @ApiPropertyOptional({ description: 'SKU ID' })
  @IsOptional()
  @IsString()
  skuId?: string

  @ApiPropertyOptional({ description: 'SKU 编码' })
  @IsOptional()
  @IsString()
  skuCode?: string

  @ApiPropertyOptional({ description: '镜片标准编码' })
  @IsOptional()
  @IsString()
  structureStandardCode?: string

  @ApiPropertyOptional({ description: '交易类型' })
  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: TransactionType

  @ApiPropertyOptional({ description: '关联类型' })
  @IsOptional()
  @IsString()
  referenceType?: string

  @ApiPropertyOptional({ description: '关联 ID' })
  @IsOptional()
  @IsString()
  referenceId?: string

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  page?: number

  @ApiPropertyOptional({ description: '每页', default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  pageSize?: number
}
