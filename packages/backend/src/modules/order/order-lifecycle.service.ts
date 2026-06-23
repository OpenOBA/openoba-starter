/* eslint-disable @typescript-eslint/no-explicit-any -- TODO: 需要类型化 */
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import * as crypto from 'crypto'
import { Order } from './entity/order.entity'
import { OrderItem } from './entity/order-item.entity'
import { OrderPayment } from './entity/order-payment.entity'
import { OrderShipment } from './entity/order-shipment.entity'
import { OrderLog } from './entity/order-log.entity'
import { CustomerLens } from '../customer/entity/customer-lens.entity'
import { InventoryService } from '../inventory/inventory.service'
import { CreatePaymentDto, CreateShipmentDto } from './dto/order.dto'
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  LOGISTICS_STATUS,
  PAYMENT_RECORD_STATUS,
  SHIPMENT_STATUS,
} from './order.constants'
import { TransactionType } from '../inventory/entity/inventory-transaction.entity'

const VALID_TRANSITIONS: Record<string, string[]> = {
  [ORDER_STATUS.pending]: [ORDER_STATUS.confirmed, ORDER_STATUS.cancelled],
  [ORDER_STATUS.confirmed]: [ORDER_STATUS.paid, ORDER_STATUS.cancelled],
  [ORDER_STATUS.paid]: [ORDER_STATUS.shipped, ORDER_STATUS.cancelled],
  [ORDER_STATUS.shipped]: [ORDER_STATUS.delivered, ORDER_STATUS.cancelled],
  [ORDER_STATUS.delivered]: [ORDER_STATUS.completed],
  [ORDER_STATUS.completed]: [],
  [ORDER_STATUS.cancelled]: [],
}

/**
 * 订单生命周期子 Service
 *
 * 负责：支付 / 发货 / 取消（事务核心，含跨 Service Inventory 调用）
 *
 * ⚠️ createPayment 和 createShipment 含 `.then()` 副作用链
 *   事务内的库存操作由本 Service 完成
 *   事务外的副作用（会员更新 / 客户档案沉淀）由主 Service 处理
 */
@Injectable()
export class OrderLifecycleService {
  private readonly logger = new Logger(OrderLifecycleService.name)

  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemRepo: Repository<OrderItem>,
    @InjectRepository(OrderPayment) private payRepo: Repository<OrderPayment>,
    @InjectRepository(OrderShipment) private shipRepo: Repository<OrderShipment>,
    @InjectRepository(OrderLog) private logRepo: Repository<OrderLog>,
    @InjectRepository(CustomerLens) private customerLensRepo: Repository<CustomerLens>,
    private inventoryService: InventoryService,
    private dataSource: DataSource,
  ) {}

  // ===== 取消订单 =====
  async cancelOrder(id: string, ensureExistsFn: () => Promise<unknown>, remark?: string, operator?: string) {
    const order = await ensureExistsFn()
    const allowed = VALID_TRANSITIONS[order.status]
    if (!allowed || !allowed.includes(ORDER_STATUS.cancelled)) {
      throw new BadRequestException(`订单状态 ${order.status} 不可取消`)
    }
    const oldStatus = order.status
    const isShippedOrDelivered = oldStatus === ORDER_STATUS.shipped || oldStatus === ORDER_STATUS.delivered

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Order, id, {
        status: ORDER_STATUS.cancelled,
        internalRemark: undefined as unknown as string,
      } as unknown as Record<string, unknown>)
      await manager.insert(OrderLog, {
        orderId: id,
        action: 'cancel',
        oldStatus,
        newStatus: ORDER_STATUS.cancelled,
        operator: operator || 'system',
        remark: remark || '取消订单',
      })

      const items = await manager.find(this.itemRepo.target, { where: { orderId: id } })
      for (const item of items) {
        if (!item.productId || (item as unknown as { quantity: number }).quantity <= 0) continue
        try {
          if (isShippedOrDelivered) {
            await this.inventoryService.rollbackStockInTransaction(manager, {
              skuId: item.productId,
              orderId: id,
              quantity: (item as unknown as { quantity: number }).quantity,
            })
          } else {
            await this.inventoryService.unlockInTransaction(manager, {
              skuId: item.productId,
              orderId: id,
              quantity: (item as unknown as { quantity: number }).quantity,
            })
          }
        } catch (e: unknown) {
          this.logger.error(`取消订单 ${id} SKU ${item.productId} 库存处理失败: ${(e as Error).message}`)
          throw e
        }
      }
    })

    this.logger.log(`订单 ${id} 已取消（${isShippedOrDelivered ? '库存回滚' : '库存释放'}）`)
  }

  // ===== 支付 =====
  async createPayment(dto: CreatePaymentDto) {
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('支付金额必须大于 0')
    }

    const paymentNo = `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().substring(0, 8).toUpperCase()}`

    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { orderId: dto.orderId },
        lock: { mode: 'pessimistic_write' },
      })
      if (!order) throw new NotFoundException('订单不存在')

      const payableStatuses: string[] = [ORDER_STATUS.pending, ORDER_STATUS.confirmed]
      if (!payableStatuses.includes(order.status as string)) {
        throw new BadRequestException(`订单状态 ${order.status} 不可支付`)
      }

      const existingPayments = await manager.find(OrderPayment, {
        where: { orderId: dto.orderId, status: PAYMENT_RECORD_STATUS.paid },
      })
      const alreadyPaid = existingPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      const remaining = Number(order.actualAmount) - alreadyPaid

      if (dto.amount > remaining) {
        throw new BadRequestException('支付金额超过剩余未付')
      }

      await manager.insert(OrderPayment, { ...dto, paymentNo, status: PAYMENT_RECORD_STATUS.paid, paidAt: new Date() })

      const totalPaid = alreadyPaid + dto.amount
      const paymentStatus = totalPaid >= Number(order.actualAmount) ? PAYMENT_STATUS.paid : PAYMENT_STATUS.partial
      const updateData: Record<string, unknown> = { paymentStatus, paymentStatusCode: paymentStatus }

      if (paymentStatus === PAYMENT_STATUS.paid) updateData.status = ORDER_STATUS.paid
      await manager.update(Order, dto.orderId, updateData)

      await manager.insert(OrderLog, {
        orderId: dto.orderId,
        action: 'pay',
        oldStatus: order.status,
        newStatus: ORDER_STATUS.paid,
        operator: 'system',
        remark: '支付完成',
      })

      // R7-P0修复：库存锁定纳入主事务
      if (paymentStatus === PAYMENT_STATUS.paid) {
        const items = await manager.find(OrderItem, { where: { orderId: dto.orderId } })
        for (const item of items) {
          if (!item.productId || item.quantity <= 0) continue
          await this.inventoryService.lockInTransaction(manager, {
            skuId: item.productId,
            orderId: dto.orderId,
            quantity: item.quantity,
          })
        }
      }

      return { paymentNo, oldStatus: order.status, orderId: dto.orderId }
    })
  }

  async findPaymentByNo(paymentNo: string) {
    return this.payRepo.findOne({ where: { paymentNo } })
  }

  // ===== 发货 =====
  async createShipment(dto: CreateShipmentDto) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { orderId: dto.orderId },
        lock: { mode: 'pessimistic_write' },
      })
      if (!order) throw new NotFoundException('订单不存在')
      if (order.status !== ORDER_STATUS.paid && order.status !== ORDER_STATUS.confirmed) {
        throw new BadRequestException(`订单状态 ${order.status} 不可发货`)
      }

      const oldStatus = order.status
      await manager.insert(OrderShipment, { ...dto, status: SHIPMENT_STATUS.shipped, shippedAt: new Date() })
      await manager.update(Order, dto.orderId, {
        status: ORDER_STATUS.shipped,
        logisticsStatusCode: LOGISTICS_STATUS.shipped,
      })
      await manager.insert(OrderLog, {
        orderId: dto.orderId,
        action: 'ship',
        oldStatus,
        newStatus: ORDER_STATUS.shipped,
        operator: dto.shipper || 'system',
        remark: `发货：${dto.carrier} ${dto.trackingNo}`,
      })

      const items = await manager.find(OrderItem, { where: { orderId: dto.orderId } })
      for (const item of items) {
        if (!item.productId || item.quantity <= 0) continue
        await this.inventoryService.unlockInTransaction(manager, {
          skuId: item.productId,
          orderId: dto.orderId,
          quantity: item.quantity,
        })
        await this.inventoryService.stockOutInTransaction(manager, {
          skuId: item.productId,
          quantity: item.quantity,
          transactionType: TransactionType.SALE_OUT,
          referenceType: 'order',
          referenceId: dto.orderId,
          remark: `订单 ${dto.orderId} 发货出库`,
        })
      }

      return { orderId: dto.orderId }
    })
  }

  async findShipmentByOrderId(orderId: string) {
    return this.shipRepo.findOne({ where: { orderId }, order: { createdAt: 'DESC' } })
  }

  // ===== 客户镜片档案 =====
  async autoPopulateCustomerLens(orderId: string) {
    const order = await this.orderRepo.findOne({ where: { orderId } })
    if (!order?.customerId) return
    const items = await this.itemRepo.find({ where: { orderId } })
    if (!items?.length) return
    const structCodes = [...new Set(items.map((i) => i.structureStandardCode).filter(Boolean))]
    if (!structCodes.length) return

    for (const structCode of structCodes) {
      const existing = await this.customerLensRepo.findOne({
        where: { customerId: order.customerId, structureStandardCode: structCode, isDeleted: false },
      })
      if (!existing) {
        const orderItems = items.filter((i) => i.structureStandardCode === structCode)
        const allFrameOnly = orderItems.every((i) => i.orderFulfillmentType === 'frame_only')
        await this.customerLensRepo.save(
          this.customerLensRepo.create({
            customerLensId: `cl-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`,
            customerId: order.customerId,
            structureStandardCode: structCode,
            prescriptionId: order.prescriptionId || null,
            orderId,
            purchaseDate: new Date(),
            status: allFrameOnly ? 'pending' : 'active',
          }),
        )
      }
    }
  }
}
