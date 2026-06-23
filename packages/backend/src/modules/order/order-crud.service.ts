/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import * as crypto from 'crypto'
import { Order } from './entity/order.entity'
import { OrderItem } from './entity/order-item.entity'
import { OrderAddress } from './entity/order-address.entity'
import { OrderLog } from './entity/order-log.entity'
import { PricingEngineService, PriceResult } from '../product/pricing-engine.service'
import { CreateOrderDto, UpdateOrderDto, UpdateOrderStatusDto } from './dto/order.dto'
import {
  ORDER_STATUS,
  ORDER_TYPES,
  PAYMENT_STATUS,
  LOGISTICS_STATUS,
  AFTER_SALE_STATUS_CODE,
  REVIEW_STATUS_CODE,
  FULFILLMENT_TYPE,
  LENS_STATUS,
} from './order.constants'

/**
 * 订单 CRUD 子 Service
 * 负责：创建订单（价格引擎 + QueryRunner事务）、更新订单、状态变更
 */
@Injectable()
export class OrderCrudService {
  private readonly logger = new Logger(OrderCrudService.name)

  private static readonly VALID_TRANSITIONS: Record<string, string[]> = {
    [ORDER_STATUS.pending]: [ORDER_STATUS.confirmed, ORDER_STATUS.cancelled],
    [ORDER_STATUS.confirmed]: [ORDER_STATUS.paid, ORDER_STATUS.cancelled],
    [ORDER_STATUS.paid]: [ORDER_STATUS.shipped, ORDER_STATUS.cancelled],
    [ORDER_STATUS.shipped]: [ORDER_STATUS.delivered, ORDER_STATUS.cancelled],
    [ORDER_STATUS.delivered]: [ORDER_STATUS.completed],
    [ORDER_STATUS.completed]: [],
    [ORDER_STATUS.cancelled]: [],
  }

  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemRepo: Repository<OrderItem>,
    @InjectRepository(OrderAddress) private addrRepo: Repository<OrderAddress>,
    @InjectRepository(OrderLog) private logRepo: Repository<OrderLog>,
    private pricingEngineService: PricingEngineService,
    private dataSource: DataSource,
  ) {}

  async createOrder(dto: CreateOrderDto) {
    const { items: orderItems, shippingAddress, ...orderData } = dto

    const customerId = orderData.customerId || undefined
    const pricedItems: Array<{ item: (typeof orderItems)[number]; price: PriceResult }> = []
    let totalAmount = 0
    let totalRetailPrice = 0
    let totalDiscount = 0
    let totalCost = 0

    for (const orderItem of orderItems) {
      const skuId = orderItem.skuId || orderItem.productId || ''
      const qty = orderItem.quantity || 1

      let priceResult: PriceResult
      if (skuId) {
        try {
          priceResult = await this.pricingEngineService.calculatePrice({
            skuId,
            customerId,
            customerType: orderData.customerType || ORDER_TYPES.retail,
            quantity: qty,
          })
        } catch (e) {
          this.logger.error(
            `Price engine failed for SKU ${skuId}:`,
            e instanceof Error ? (e as Error).message : String(e),
          )
          throw new BadRequestException(`SKU ${skuId} 价格计算失败，请稍后重试`)
        }
      } else {
        priceResult = {
          retailPrice: orderItem.retailPrice || orderItem.unitPrice || 0,
          finalPrice: orderItem.unitPrice || 0,
          discountAmount: 0,
          discountReason: 'manual',
          discountRefId: null,
          profitPerUnit: (orderItem.unitPrice || 0) - (orderItem.unitCost || 0),
          marginPct: 0,
          warnings: [],
          structureStandardCode: orderItem.structureStandardCode || '',
          productTier: orderItem.productTier || null,
        }
      }

      const unitPrice = priceResult.finalPrice
      const retailPrice = priceResult.retailPrice
      const unitCost = unitPrice - priceResult.profitPerUnit
      const discAmount = priceResult.discountAmount

      if (!orderItem.structureStandardCode && priceResult.structureStandardCode) {
        orderItem.structureStandardCode = priceResult.structureStandardCode
      }
      if (!orderItem.productTier && priceResult.productTier) {
        orderItem.productTier = priceResult.productTier
      }

      pricedItems.push({ item: orderItem, price: priceResult })
      totalAmount += unitPrice * qty
      totalRetailPrice += retailPrice * qty
      totalDiscount += discAmount * qty
      totalCost += unitCost * qty
    }

    const shippingFee = orderData.shippingFee || 0
    const actualAmount = totalAmount - (orderData.discountAmount || 0) + shippingFee
    const grossProfit = totalAmount - totalCost
    const grossMarginPct = totalAmount > 0 ? parseFloat(((grossProfit / totalAmount) * 100).toFixed(2)) : 0

    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const orderNo = `OBA-${dateStr}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`

    const hasPrescription = orderData.hasPrescription || false
    const hasProcessing = orderData.hasProcessing || false
    const isWholesale = orderData.isWholesale || false

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const order = this.orderRepo.create({
        ...orderData,
        orderNo,
        totalAmount,
        discountAmount: orderData.discountAmount || 0,
        shippingFee,
        actualAmount,
        status: ORDER_STATUS.pending,
        paymentStatus: PAYMENT_STATUS.unpaid,
        hasPrescription,
        hasProcessing,
        isWholesale,
        paymentStatusCode: PAYMENT_STATUS.unpaid,
        logisticsStatusCode: LOGISTICS_STATUS.unshipped,
        afterSaleStatusCode: AFTER_SALE_STATUS_CODE.none,
        reviewStatusCode: REVIEW_STATUS_CODE.pending,
        cancelRefundAmount: 0,
        afterSaleRefundAmount: 0,
        totalRetailPrice,
        totalDiscount,
        totalCost,
        grossProfit,
        grossMarginPct,
      })
      const saved = await queryRunner.manager.save(order)
      const orderId = saved.orderId

      for (const { item: orderItem, price } of pricedItems) {
        const skuId = orderItem.skuId || orderItem.productId || ''
        if (!skuId) throw new Error('订单行项目必须提供 skuId 或 productId')
        const unitPrice = price.finalPrice
        const qty = orderItem.quantity || 1
        const retailPrice = price.retailPrice
        const unitCost = unitPrice - price.profitPerUnit
        const discAmount = price.discountAmount
        const grossPft = price.profitPerUnit

        await queryRunner.manager.insert(this.itemRepo.target, {
          orderId,
          productType: orderItem.productType || 'frame',
          productId: skuId,
          productName: orderItem.productName || '',
          skuCode: orderItem.skuCode || '',
          skuAttributes: orderItem.skuAttributes,
          quantity: qty,
          unitPrice,
          subtotal: unitPrice * qty,
          retailPrice,
          discountAmount: discAmount,
          discountReason: price.discountReason,
          discountRefId: price.discountRefId ?? undefined,
          unitCost,
          grossProfit: grossPft * qty,
          structureStandardCode: orderItem.structureStandardCode,
          productTier: orderItem.productTier,
          orderFulfillmentType: orderItem.orderFulfillmentType || FULFILLMENT_TYPE.frame_only,
          lensStatus: orderItem.lensStatus || LENS_STATUS.not_needed,
          frameColor: orderItem.frameColor,
          frameSize: orderItem.frameSize,
          prescriptionRequired: orderItem.prescriptionRequired || false,
          reviewStatus: REVIEW_STATUS_CODE.unreviewed,
          afterSaleStatus: AFTER_SALE_STATUS_CODE.none,
        })
      }

      if (shippingAddress) {
        await queryRunner.manager.insert(this.addrRepo.target, { ...shippingAddress, orderId })
      }

      await queryRunner.manager.insert(this.logRepo.target, {
        orderId,
        action: 'create',
        oldStatus: undefined,
        newStatus: ORDER_STATUS.pending,
        operator: orderData.createdBy || 'system',
        remark: '创建订单',
      })

      await queryRunner.commitTransaction()
      this.logger.log(`订单创建成功: ${orderNo}`)
      return { orderId }
    } catch (e: unknown) {
      await queryRunner.rollbackTransaction()
      this.logger.error(`订单创建失败 (${orderNo || '未知编号'}): ${(e as Error).message}`)
      throw new BadRequestException(`订单创建失败: ${(e as Error).message}`)
    } finally {
      await queryRunner.release()
    }
  }

  async updateOrder(id: string, dto: UpdateOrderDto, ensureExistsFn: () => Promise<unknown>) {
    await ensureExistsFn()
    const allowedFields: Record<string, unknown> = {}
    if (dto.customerName !== undefined) allowedFields.customerName = dto.customerName
    if (dto.customerPhone !== undefined) allowedFields.customerPhone = dto.customerPhone
    if (dto.remark !== undefined) allowedFields.remark = dto.remark
    if (dto.internalRemark !== undefined) allowedFields.internalRemark = dto.internalRemark
    if (dto.paymentMethod !== undefined) allowedFields.paymentMethod = dto.paymentMethod
    if (dto.shippingFee !== undefined) allowedFields.shippingFee = dto.shippingFee
    if (dto.discountAmount !== undefined) allowedFields.discountAmount = dto.discountAmount
    await this.orderRepo.update(id, allowedFields)
  }

  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto, ensureExistsFn: () => Promise<unknown>) {
    const order = await ensureExistsFn()
    const oldStatus = order.status

    const allowed = OrderCrudService.VALID_TRANSITIONS[order.status]
    if (!allowed || !allowed.includes(dto.status)) {
      throw new BadRequestException(
        `订单状态不可从 "${order.status}" 变更为 "${dto.status}"。允许的变更: ${allowed?.join(', ') || '无'}`,
      )
    }

    const updateData: Record<string, unknown> = { status: dto.status }
    if (dto.status === ORDER_STATUS.delivered) {
      updateData.logisticsStatusCode = LOGISTICS_STATUS.delivered
      updateData.receivedAt = new Date()
      const deadline = new Date()
      deadline.setDate(deadline.getDate() + 7)
      updateData.reviewDeadline = deadline
    }
    if (dto.status === ORDER_STATUS.completed) {
      updateData.reviewStatusCode = REVIEW_STATUS_CODE.pending
    }
    await this.orderRepo.update(id, updateData)
    await this.addLog(
      id,
      dto.status === ORDER_STATUS.paid ? 'pay' : dto.status === ORDER_STATUS.shipped ? 'ship' : 'status_change',
      oldStatus,
      dto.status,
      dto.operator || 'system',
      dto.remark,
    )
  }

  private async addLog(
    orderId: string,
    action: string,
    oldStatus: string | null,
    newStatus: string | null,
    operator: string,
    remark?: string,
  ) {
    await this.logRepo.insert({
      orderId,
      action,
      oldStatus: oldStatus || undefined,
      newStatus: newStatus || undefined,
      operator,
      remark,
    })
  }
}
