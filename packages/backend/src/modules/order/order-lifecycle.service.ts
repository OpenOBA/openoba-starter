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
import {
  CreatePaymentDto,
  CreateShipmentDto,
} from './dto/order.dto'
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  LOGISTICS_STATUS,
  PAYMENT_RECORD_STATUS,
  SHIPMENT_STATUS,
} from './order.constants'
import { TransactionType } from '../inventory/entity/inventory-transaction.entity'

/**
 * 璁㈠崟鐢熷懡鍛ㄦ湡瀛?Service
 *
 * 璐熻矗锛氭敮浠?/ 鍙戣揣 / 鍙栨秷锛堜簨鍔℃牳蹇冿紝鍚法 Service Inventory 璋冪敤锛? *
 * 鈿狅笍 createPayment 鍜?createShipment 鍚?`.then()` 鍓綔鐢ㄩ摼
 *   浜嬪姟鍐呯殑搴撳瓨鎿嶄綔鐢辨湰 Service 瀹屾垚
 *   浜嬪姟澶栫殑鍓綔鐢紙浼氬憳鏇存柊 / 瀹㈡埛妗ｆ娌夋穩锛夌敱涓?Service 澶勭悊
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

  // ===== 鍙栨秷璁㈠崟 =====
  async cancelOrder(id: string, ensureExistsFn: () => Promise<any>, remark?: string, operator?: string) {
    const order = await ensureExistsFn()
    const VALID_TRANSITIONS: Record<string, string[]> = {
      [ORDER_STATUS.pending]: [ORDER_STATUS.confirmed, ORDER_STATUS.cancelled],
      [ORDER_STATUS.confirmed]: [ORDER_STATUS.paid, ORDER_STATUS.cancelled],
      [ORDER_STATUS.paid]: [ORDER_STATUS.shipped, ORDER_STATUS.cancelled],
      [ORDER_STATUS.shipped]: [ORDER_STATUS.delivered, ORDER_STATUS.cancelled],
      [ORDER_STATUS.delivered]: [ORDER_STATUS.completed],
      [ORDER_STATUS.completed]: [],
      [ORDER_STATUS.cancelled]: [],
    }
    const allowed = VALID_TRANSITIONS[order.status]
    if (!allowed || !allowed.includes(ORDER_STATUS.cancelled)) {
      throw new BadRequestException(`璁㈠崟鐘舵€?${order.status} 涓嶅彲鍙栨秷`)
    }
    const oldStatus = order.status
    const isShippedOrDelivered = oldStatus === ORDER_STATUS.shipped || oldStatus === ORDER_STATUS.delivered

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Order, id, { status: ORDER_STATUS.cancelled, internalRemark: null } as any)
      await manager.insert(OrderLog, { orderId: id, action: 'cancel', oldStatus, newStatus: ORDER_STATUS.cancelled, operator: operator || 'system', remark: remark || '鍙栨秷璁㈠崟' })

      const items = await manager.find(this.itemRepo.target, { where: { orderId: id } })
      for (const item of items) {
        if (!item.productId || (item as any).quantity <= 0) continue
        try {
          if (isShippedOrDelivered) {
            await this.inventoryService.rollbackStockInTransaction(manager, {
              skuId: item.productId, orderId: id, quantity: (item as any).quantity,
            })
          } else {
            await this.inventoryService.unlockInTransaction(manager, {
              skuId: item.productId, orderId: id, quantity: (item as any).quantity,
            })
          }
        } catch (e: unknown) {
          this.logger.error(`鍙栨秷璁㈠崟 ${id} SKU ${item.productId} 搴撳瓨澶勭悊澶辫触: ${(e as Error).message}`)
          throw e
        }
      }
    })

    this.logger.log(`璁㈠崟 ${id} 宸插彇娑堬紙${isShippedOrDelivered ? '搴撳瓨鍥炴粴' : '搴撳瓨閲婃斁'}锛塦)
  }

  // ===== 鏀粯 =====
  async createPayment(dto: CreatePaymentDto) {
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('鏀粯閲戦蹇呴』澶т簬 0')
    }

    const paymentNo = `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().substring(0, 8).toUpperCase()}`

    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { orderId: dto.orderId },
        lock: { mode: 'pessimistic_write' },
      })
      if (!order) throw new NotFoundException('璁㈠崟涓嶅瓨鍦?)

      const payableStatuses: string[] = [ORDER_STATUS.pending, ORDER_STATUS.confirmed]
      if (!payableStatuses.includes(order.status as string)) {
        throw new BadRequestException(`璁㈠崟鐘舵€?${order.status} 涓嶅彲鏀粯`)
      }

      const existingPayments = await manager.find(OrderPayment, {
        where: { orderId: dto.orderId, status: PAYMENT_RECORD_STATUS.paid },
      })
      const alreadyPaid = existingPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      const remaining = Number(order.actualAmount) - alreadyPaid

      if (dto.amount > remaining) {
        throw new BadRequestException('鏀粯閲戦瓒呰繃鍓╀綑鏈粯')
      }

      await manager.insert(OrderPayment, { ...dto, paymentNo, status: PAYMENT_RECORD_STATUS.paid, paidAt: new Date() })

      const totalPaid = alreadyPaid + dto.amount
      const paymentStatus = totalPaid >= Number(order.actualAmount) ? PAYMENT_STATUS.paid : PAYMENT_STATUS.partial
      const updateData: Record<string, unknown> = { paymentStatus, paymentStatusCode: paymentStatus }

      if (paymentStatus === PAYMENT_STATUS.paid) updateData.status = ORDER_STATUS.paid
      await manager.update(Order, dto.orderId, updateData)

      await manager.insert(OrderLog, { orderId: dto.orderId, action: 'pay', oldStatus: order.status, newStatus: ORDER_STATUS.paid, operator: 'system', remark: '鏀粯瀹屾垚' })

      // R7-P0淇锛氬簱瀛橀攣瀹氱撼鍏ヤ富浜嬪姟
      if (paymentStatus === PAYMENT_STATUS.paid) {
        const items = await manager.find(OrderItem, { where: { orderId: dto.orderId } })
        for (const item of items) {
          if (!item.productId || item.quantity <= 0) continue
          await this.inventoryService.lockInTransaction(manager, {
            skuId: item.productId, orderId: dto.orderId, quantity: item.quantity,
          })
        }
      }

      return { paymentNo, oldStatus: order.status, orderId: dto.orderId }
    })
  }

  async findPaymentByNo(paymentNo: string) {
    return this.payRepo.findOne({ where: { paymentNo } })
  }

  // ===== 鍙戣揣 =====
  async createShipment(dto: CreateShipmentDto) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { orderId: dto.orderId },
        lock: { mode: 'pessimistic_write' },
      })
      if (!order) throw new NotFoundException('璁㈠崟涓嶅瓨鍦?)
      if (order.status !== ORDER_STATUS.paid && order.status !== ORDER_STATUS.confirmed) {
        throw new BadRequestException(`璁㈠崟鐘舵€?${order.status} 涓嶅彲鍙戣揣`)
      }

      const oldStatus = order.status
      await manager.insert(OrderShipment, { ...dto, status: SHIPMENT_STATUS.shipped, shippedAt: new Date() })
      await manager.update(Order, dto.orderId, { status: ORDER_STATUS.shipped, logisticsStatusCode: LOGISTICS_STATUS.shipped })
      await manager.insert(OrderLog, { orderId: dto.orderId, action: 'ship', oldStatus, newStatus: ORDER_STATUS.shipped, operator: dto.shipper || 'system', remark: `鍙戣揣锛?{dto.carrier} ${dto.trackingNo}` })

      const items = await manager.find(OrderItem, { where: { orderId: dto.orderId } })
      for (const item of items) {
        if (!item.productId || item.quantity <= 0) continue
        await this.inventoryService.unlockInTransaction(manager, {
          skuId: item.productId, orderId: dto.orderId, quantity: item.quantity,
        })
        await this.inventoryService.stockOutInTransaction(manager, {
          skuId: item.productId, quantity: item.quantity,
          transactionType: TransactionType.SALE_OUT,
          referenceType: 'order', referenceId: dto.orderId,
          remark: `璁㈠崟 ${dto.orderId} 鍙戣揣鍑哄簱`,
        })
      }

      return { orderId: dto.orderId }
    })
  }

  async findShipmentByOrderId(orderId: string) {
    return this.shipRepo.findOne({ where: { orderId }, order: { createdAt: 'DESC' } })
  }

  // ===== 瀹㈡埛闀滅墖妗ｆ =====
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
