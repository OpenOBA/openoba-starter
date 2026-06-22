/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { IsString, IsOptional, IsNumber, IsArray, IsEnum, IsIn, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

// 子 DTO 必须在前
export class OrderItemDto {
  @ApiProperty() @IsString() productType: string
  @ApiProperty({ description: '商品ID（SPU维度，可选）' }) @IsOptional() @IsString() productId?: string
  @ApiProperty({ description: 'SKU ID（库存关联键，优先使用）' }) @IsOptional() @IsString() skuId?: string
  @ApiProperty() @IsString() productName: string
  @ApiPropertyOptional() @IsOptional() @IsString() skuCode?: string
  @ApiProperty() @IsNumber() @Type(() => Number) quantity: number
  @ApiProperty() @IsNumber() @Type(() => Number) unitPrice: number
  @ApiProperty() @IsString() structureStandardCode: string
  @ApiPropertyOptional({ default: 'frame_only' }) @IsOptional() @IsString() orderFulfillmentType?: string
  @ApiPropertyOptional({ default: 'not_needed' }) @IsOptional() @IsString() lensStatus?: string
  @ApiPropertyOptional() @IsOptional() skuAttributes?: Record<string, any>
  @ApiPropertyOptional() @IsOptional() @IsString() frameColor?: string
  @ApiPropertyOptional() @IsOptional() @IsString() frameSize?: string
  @ApiPropertyOptional({ default: false }) @IsOptional() prescriptionRequired?: boolean
  @ApiPropertyOptional() @IsOptional() remark?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) retailPrice?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) unitCost?: number
  @ApiPropertyOptional() @IsOptional() @IsString() productTier?: string
}

export class OrderAddressDto {
  @ApiProperty() @IsString() receiverName: string
  @ApiProperty() @IsString() receiverPhone: string
  @ApiProperty() @IsString() province: string
  @ApiProperty() @IsString() city: string
  @ApiPropertyOptional() @IsOptional() @IsString() district?: string
  @ApiProperty() @IsString() addressDetail: string
  @ApiPropertyOptional() @IsOptional() @IsString() postalCode?: string
}

export class CreateOrderDto {
  @ApiProperty() @IsString() customerId: string
  @ApiProperty() @IsString() customerName: string
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string
  @ApiPropertyOptional() @IsOptional() @IsString() customerType?: string
  @ApiPropertyOptional() @IsOptional() @IsString() orderType?: string
  // V3.0 消费场景标识
  @ApiPropertyOptional({ default: false }) @IsOptional() hasPrescription?: boolean
  @ApiPropertyOptional({ default: false }) @IsOptional() hasProcessing?: boolean
  @ApiPropertyOptional({ default: false }) @IsOptional() isWholesale?: boolean
  @ApiPropertyOptional({ description: '结构标准编码（结构锚点原则：每笔订单必须携带）' })
  @IsOptional()
  @IsString()
  structureStandardCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() wholesaleTier?: string
  @ApiProperty() @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto) items: OrderItemDto[]
  @ApiPropertyOptional() @IsOptional() shippingAddress?: OrderAddressDto
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) shippingFee?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) discountAmount?: number
  @ApiPropertyOptional() @IsOptional() @IsString() prescriptionId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() remark?: string
  @ApiPropertyOptional() @IsOptional() @IsString() internalRemark?: string
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string
  @ApiPropertyOptional() @IsOptional() @IsString() createdBy?: string
  @ApiPropertyOptional() @IsOptional() attributes?: Record<string, any>
}

export class UpdateOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerName?: string
  @ApiPropertyOptional() @IsOptional() @IsString() customerPhone?: string
  @ApiPropertyOptional() @IsOptional() @IsString() remark?: string
  @ApiPropertyOptional() @IsOptional() @IsString() internalRemark?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) shippingFee?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) discountAmount?: number
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string
  @ApiPropertyOptional() @IsOptional() @IsString() paymentStatusCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() logisticsStatusCode?: string
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ['pending','paid','processing','shipped','completed','cancelled','returned'] })
  @IsString()
  @IsIn(['pending','paid','processing','shipped','completed','cancelled','returned'])
  status: string
  @ApiPropertyOptional() @IsOptional() @IsString() remark?: string
  @ApiPropertyOptional() @IsOptional() @IsString() operator?: string
}

export class CreatePaymentDto {
  @ApiProperty() @IsString() orderId: string
  @ApiProperty() @IsString() paymentMethod: string
  @ApiProperty() @IsNumber() @Type(() => Number) amount: number
  @ApiPropertyOptional() @IsOptional() @IsString() transactionId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() remark?: string
}

export class CreateShipmentDto {
  @ApiProperty() @IsString() orderId: string
  @ApiProperty() @IsString() trackingNo: string
  @ApiProperty() @IsString() carrier: string
  @ApiPropertyOptional() @IsOptional() @IsString() shipper?: string
  @ApiPropertyOptional() @IsOptional() @IsString() remark?: string
}

export class QueryOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() keyword?: string
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string
  @ApiPropertyOptional() @IsOptional() @IsString() paymentStatus?: string
  @ApiPropertyOptional() @IsOptional() @IsString() orderType?: string
  @ApiPropertyOptional() @IsOptional() @IsString() startDate?: string
  @ApiPropertyOptional() @IsOptional() @IsString() endDate?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) page?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) pageSize?: number
}

/** 取消订单 DTO */
export class CancelOrderDto {
  @ApiPropertyOptional({ description: '取消备注' }) @IsOptional() @IsString() remark?: string
  @ApiPropertyOptional({ description: '操作人' }) @IsOptional() @IsString() operator?: string
}
