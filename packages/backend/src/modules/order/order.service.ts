import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import * as crypto from 'crypto'
import { CustomerService } from '../customer/customer.service'
import { Order } from './entity/order.entity'
import { OrderItem } from './entity/order-item.entity'
import { OrderAddress } from './entity/order-address.entity'
import { OrderPayment } from './entity/order-payment.entity'
import { OrderShipment } from './entity/order-shipment.entity'
import { OrderLog } from './entity/order-log.entity'
import { CustomerLens } from '../customer/entity/customer-lens.entity'
import { CustomerConsumptionProfile } from '../customer/entity/customer-consumption-profile.entity'
import { Customer } from '../customer/entity/customer.entity'
import { MemberLevelLog } from '../customer/entity/member-level-log.entity'
import { MemberLevel } from '../product/entity/member-level.entity'
import { InventoryService } from '../inventory/inventory.service'
import { PricingEngineService } from '../product/pricing-engine.service'
// TASK-013 Batch 2: 硬编码替换
import {
  ORDER_STATUS,
  ORDER_TYPES,
  PAYMENT_STATUS,
  LOGISTICS_STATUS,
  AFTER_SALE_STATUS_CODE,
  REVIEW_STATUS_CODE,
  PAYMENT_RECORD_STATUS,
  SHIPMENT_STATUS,
  FULFILLMENT_TYPE,
  LENS_STATUS,
} from './order.constants'
import { TransactionType } from '../inventory/entity/inventory-transaction.entity'
import {
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  QueryOrderDto,
  CreatePaymentDto,
  CreateShipmentDto,
} from './dto/order.dto'
import { PriceResult } from '../product/pricing-engine.service'

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name)

  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemRepo: Repository<OrderItem>,
    @InjectRepository(OrderAddress) private addrRepo: Repository<OrderAddress>,
    @InjectRepository(OrderPayment) private payRepo: Repository<OrderPayment>,
    @InjectRepository(OrderShipment) private shipRepo: Repository<OrderShipment>,
    @InjectRepository(OrderLog) private logRepo: Repository<OrderLog>,
    @InjectRepository(CustomerLens) private customerLensRepo: Repository<CustomerLens>,
    @InjectRepository(CustomerConsumptionProfile)
    private customerConsumptionProfileRepo: Repository<CustomerConsumptionProfile>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(MemberLevelLog) private memberLevelLogRepo: Repository<MemberLevelLog>,
    @InjectRepository(MemberLevel) private memberLevelRepo: Repository<MemberLevel>,
    private readonly customerService: CustomerService,
    private inventoryService: InventoryService,
    private pricingEngineService: PricingEngineService,
    private dataSource: DataSource,
  ) {}

  // ===== 订单状态机转换矩阵（P0修复） =====
  private static readonly VALID_TRANSITIONS: Record<string, string[]> = {
    [ORDER_STATUS.pending]:   [ORDER_STATUS.confirmed, ORDER_STATUS.cancelled],
    [ORDER_STATUS.confirmed]: [ORDER_STATUS.paid, ORDER_STATUS.cancelled],
    [ORDER_STATUS.paid]:      [ORDER_STATUS.shipped, ORDER_STATUS.cancelled],
    [ORDER_STATUS.shipped]:   [ORDER_STATUS.delivered, ORDER_STATUS.cancelled],
    [ORDER_STATUS.delivered]: [ORDER_STATUS.completed],
    [ORDER_STATUS.completed]: [],
    [ORDER_STATUS.cancelled]: [],
  }

  // ===== 订单列表 =====
  async findOrders(query: QueryOrderDto) {
    const { page = 1, pageSize = 20, keyword, customerId, status, paymentStatus, orderType, startDate, endDate } = query
    const qb = this.orderRepo.createQueryBuilder('o').where('1=1')
    // M1修复：keyword长度限制(50字符) + LIKE通配符转义
    const safeKeyword = keyword
      ? keyword.toString().slice(0, 50).replace(/[%_]/g, '\\$&')
      : ''
    if (safeKeyword) {
      qb.andWhere('(o.order_no LIKE :kw OR o.customer_name LIKE :kw)', { kw: '%' + safeKeyword + '%' })
    }
    if (customerId) qb.andWhere('o.customer_id = :cid', { cid: customerId })
    if (status) qb.andWhere('o.status = :st', { st: status })
    if (paymentStatus) qb.andWhere('o.payment_status = :ps', { ps: paymentStatus })
    if (orderType) qb.andWhere('o.order_type = :ot', { ot: orderType })
    if (startDate) qb.andWhere('o.created_at >= :sd', { sd: startDate })
    if (endDate) qb.andWhere('o.created_at <= :ed', { ed: endDate })
    qb.orderBy('o.created_at', 'DESC')
    const [orders, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()

    // Load relations separately to avoid duplicate rows
    const orderIds = orders.map((o) => o.orderId)
    const [items, addresses] =
      orderIds.length > 0
        ? await Promise.all([
            this.itemRepo.find({ where: orderIds.map((id) => ({ orderId: id })), order: { createdAt: 'ASC' } }),
            this.addrRepo.find({ where: orderIds.map((id) => ({ orderId: id })) }),
          ])
        : [[], []]

    const result = orders.map((o) => ({
      ...o,
      items: items.filter((i) => i.orderId === o.orderId),
      address: addresses.find((a) => a.orderId === o.orderId) || null,
    }))

    return { items: result, total, page: +page, pageSize: +pageSize }
  }

  async findOneOrder(id: string) {
    const order = await this.orderRepo.findOne({ where: { orderId: id } })
    if (!order) throw new NotFoundException('订单不存在')

    const [items, addresses, payments, shipments, logs] = await Promise.all([
      this.itemRepo.find({ where: { orderId: id }, order: { createdAt: 'ASC' } }),
      this.addrRepo.find({ where: { orderId: id } }),
      this.payRepo.find({ where: { orderId: id }, order: { createdAt: 'DESC' } }),
      this.shipRepo.find({ where: { orderId: id }, order: { createdAt: 'DESC' } }),
      this.logRepo.find({ where: { orderId: id }, order: { createdAt: 'DESC' } }),
    ])

    return {
      ...order,
      items,
      address: addresses[0] || null,
      payments,
      shipments,
      logs,
    }
  }

  // ===== 创建订单（C2-P0修复：事务包裹） =====
  async createOrder(dto: CreateOrderDto) {
    const { items: orderItems, shippingAddress, ...orderData } = dto

    // ===== 价格引擎：逐行计算价格 =====
    const customerId = orderData.customerId || undefined
    const pricedItems: Array<{ item: typeof orderItems[number]; price: PriceResult }> = []
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
          // P0修复：价格引擎失败时拒绝创建订单，不使用客户端提交的价格（防价格操纵）
          this.logger.error(`Price engine failed for SKU ${skuId}:`, e instanceof Error ? (e as Error).message : String(e))
          throw new BadRequestException(`SKU ${skuId} 价格计算失败，请稍后重试`)
        }
      } else {
        // 无 SKU 的项目（如服务费），直接使用手动价格
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
      // 镜片锚点原则：从 SKU 实体自动带出结构标准编码
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
    // V1.4-a #12: COUNT+1 并发安全隐患 → crypto.randomUUID() 前8位
    // 原 MJ- 前缀同步改为 OBA-（去秒镜历史品牌名残留）
    const orderNo = `OBA-${dateStr}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`

    // V3.0 消费场景默认值
    const hasPrescription = orderData.hasPrescription || false
    const hasProcessing = orderData.hasProcessing || false
    const isWholesale = orderData.isWholesale || false

    // C2-P0修复：事务包裹所有写操作，防止部分失败数据不一致
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      // 使用 create + save 代替 insert，确保 UUID 正确生成
      const order = this.orderRepo.create({
      ...orderData,
      orderNo,
      totalAmount,
      discountAmount: orderData.discountAmount || 0,
      shippingFee,
      actualAmount,
      status: ORDER_STATUS.pending,
      paymentStatus: PAYMENT_STATUS.unpaid,
      // V3.0 新字段
      hasPrescription,
      hasProcessing,
      isWholesale,
      paymentStatusCode: PAYMENT_STATUS.unpaid,
      logisticsStatusCode: LOGISTICS_STATUS.unshipped,
      afterSaleStatusCode: AFTER_SALE_STATUS_CODE.none,
      reviewStatusCode: REVIEW_STATUS_CODE.pending,
      cancelRefundAmount: 0,
      afterSaleRefundAmount: 0,
      // Phase 9A: 利润字段
      totalRetailPrice,
      totalDiscount,
      totalCost,
      grossProfit,
      grossMarginPct,
    })
    const saved = await queryRunner.manager.save(order)
    const orderId = saved.orderId

    for (const { item: orderItem, price } of pricedItems) {
      // 统一使用 skuId 作为 product_id（库存关联键）
      const skuId = orderItem.skuId || orderItem.productId || ''
      if (!skuId) {
        throw new Error('订单行项目必须提供 skuId 或 productId')
      }
      const unitPrice = price.finalPrice
      const qty = orderItem.quantity || 1
      const retailPrice = price.retailPrice
      const unitCost = unitPrice - price.profitPerUnit
      const discAmount = price.discountAmount
      const grossPft = price.profitPerUnit

      await queryRunner.manager.insert(this.itemRepo.target, {
        orderId,
        productType: orderItem.productType || 'frame',
        productId: skuId, // 统一使用 skuId（SKU UUID）
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

    // addLog 在事务内
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
    return this.findOneOrder(orderId)
    } catch (e: unknown) {
      await queryRunner.rollbackTransaction()
      this.logger.error(`订单创建失败 (${orderNo || '未知编号'}): ${(e as Error).message}`)
      throw new BadRequestException(`订单创建失败: ${(e as Error).message}`)
    } finally {
      await queryRunner.release()
    }
  }

  // ===== 更新订单 =====
  async updateOrder(id: string, dto: UpdateOrderDto) {
    await this.findOneOrder(id)
    // P1修复：显式列出可更新字段，排除 paymentStatusCode/logisticsStatusCode
    const allowedFields: Record<string, unknown> = {}
    if (dto.customerName !== undefined) allowedFields.customerName = dto.customerName
    if (dto.customerPhone !== undefined) allowedFields.customerPhone = dto.customerPhone
    if (dto.remark !== undefined) allowedFields.remark = dto.remark
    if (dto.internalRemark !== undefined) allowedFields.internalRemark = dto.internalRemark
    if (dto.paymentMethod !== undefined) allowedFields.paymentMethod = dto.paymentMethod
    if (dto.shippingFee !== undefined) allowedFields.shippingFee = dto.shippingFee
    if (dto.discountAmount !== undefined) allowedFields.discountAmount = dto.discountAmount
    await this.orderRepo.update(id, allowedFields)
    return this.findOneOrder(id)
  }

  // ===== 更新订单状态 =====
  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.findOneOrder(id)
    const oldStatus = order.status

    // C1-P0修复：使用状态机矩阵校验，禁止非法跳转
    const allowed = OrderService.VALID_TRANSITIONS[order.status]
    if (!allowed || !allowed.includes(dto.status)) {
      throw new BadRequestException(
        `订单状态不可从 "${order.status}" 变更为 "${dto.status}"。允许的变更: ${allowed?.join(', ') || '无'}`
      )
    }

    const updateData: Record<string, unknown> = { status: dto.status }
    // 同步状态码
    if (dto.status === ORDER_STATUS.delivered) {
      updateData.logisticsStatusCode = LOGISTICS_STATUS.delivered
      updateData.receivedAt = new Date()
      // 设置评价截止日期：签收后 7 天
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
    return this.findOneOrder(id)
  }

  // ===== 取消订单（P0-2修复：区分已发货/未发货库存处理） =====
  async cancelOrder(id: string, remark?: string, operator?: string) {
    const order = await this.findOneOrder(id)
    const allowed = OrderService.VALID_TRANSITIONS[order.status]
    if (!allowed || !allowed.includes(ORDER_STATUS.cancelled)) {
      throw new BadRequestException(`订单状态 ${order.status} 不可取消`)
    }
    const oldStatus = order.status
    const isShippedOrDelivered = oldStatus === ORDER_STATUS.shipped || oldStatus === ORDER_STATUS.delivered

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Order, id, { status: ORDER_STATUS.cancelled, internalRemark: null } as any)
      await manager.insert(OrderLog, { orderId: id, action: 'cancel', oldStatus, newStatus: ORDER_STATUS.cancelled, operator: operator || 'system', remark: remark || '取消订单' })

      const items = await manager.find(this.itemRepo.target, { where: { orderId: id } })
      for (const item of items) {
        if (!item.productId || (item as any).quantity <= 0) continue
        try {
          if (isShippedOrDelivered) {
            // P0-2修复：已发货/已签收 → stockIn回滚（库存已扣减）
            await this.inventoryService.rollbackStockInTransaction(manager, {
              skuId: item.productId,
              orderId: id,
              quantity: (item as any).quantity,
            })
          } else {
            // 未发货 → unlock释放锁定库存
            await this.inventoryService.unlockInTransaction(manager, {
              skuId: item.productId,
              orderId: id,
              quantity: (item as any).quantity,
            })
          }
        } catch (e: unknown) {
          this.logger.error(`取消订单 ${id} SKU ${item.productId} 库存处理失败: ${(e as Error).message}`)
          throw e
        }
      }
    })

    this.logger.log(`订单 ${id} 已取消（${isShippedOrDelivered ? '库存回滚' : '库存释放'}）`)
    return this.findOneOrder(id)
  }

  // ===== 订单库存释放 =====
  private async unlockOrderInventory(orderId: string) {
    const items = await this.itemRepo.find({ where: { orderId } })
    const unlockedSkus: string[] = []
    for (const item of items) {
      if (!item.productId || item.quantity <= 0) continue
      try {
        await this.inventoryService.unlock({
          skuId: item.productId,
          orderId,
          quantity: item.quantity,
        })
        unlockedSkus.push(item.productId)
      } catch (e: unknown) {
        this.logger.error(`取消订单 ${orderId} 库存解锁异常 [${item.productId}]: ${(e as Error).message}`)
        await this.addLog(
          orderId,
          'inventory_unlock_fail',
          null,
          null,
          'system',
          `库存释放失败：${item.productId} × ${item.quantity}，请人工处理`,
        )
      }
    }
    if (unlockedSkus.length > 0) {
      await this.addLog(orderId, 'inventory_unlock', null, null, 'system', `库存释放成功：${unlockedSkus.join(', ')}`)
    }
  }

  // ===== 删除订单 =====
  async deleteOrder(id: string) {
    return this.cancelOrder(id, '删除订单')
  }

  // ===== 支付 =====
  async getOrderPayments(orderId: string) {
    return this.payRepo.find({ where: { orderId }, order: { createdAt: 'DESC' } })
  }

  async createPayment(dto: CreatePaymentDto) {
    // P0修复：金额必须大于0
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('支付金额必须大于 0')
    }

    const paymentNo = `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().substring(0, 8).toUpperCase()}`

    // P0修复：事务内悲观锁锁定订单行，防止并发支付 + 金额校验
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
        throw new BadRequestException(`支付金额超过剩余未付`)
      }

      await manager.insert(OrderPayment, { ...dto, paymentNo, status: PAYMENT_RECORD_STATUS.paid, paidAt: new Date() })

      const totalPaid = alreadyPaid + dto.amount
      const paymentStatus = totalPaid >= Number(order.actualAmount) ? PAYMENT_STATUS.paid : PAYMENT_STATUS.partial
      const updateData: Record<string, unknown> = { paymentStatus, paymentStatusCode: paymentStatus }

      if (paymentStatus === PAYMENT_STATUS.paid) updateData.status = ORDER_STATUS.paid
      await manager.update(Order, dto.orderId, updateData)

      // 日志在事务内
      await manager.insert(OrderLog, { orderId: dto.orderId, action: 'pay', oldStatus: order.status, newStatus: ORDER_STATUS.paid, operator: 'system', remark: '支付完成' })

      // R7-P0修复：库存锁定纳入主事务（失败 → 整体回滚，不会超卖）
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
    }).then(async (result) => {
      // 事务外仅处理非关键副作用（会员资产更新可选延迟）
      if (result) {
        try { await this.customerService.updateMemberAssetsAfterPayment(result.orderId) } catch (e: unknown) {
          this.logger.error(`会员资产更新失败 [${result.orderId}]: ${(e as Error).message}`)
          try { await this.orderRepo.update(result.orderId, { internalRemark: 'MEMBER_UPDATE_FAILED' } as any) } catch (e2: unknown) {
            this.logger.error(`更新订单备注失败 [${result.orderId}]: ${(e2 as Error).message}`)
          }
        }
      }
      return this.payRepo.findOne({ where: { paymentNo: result.paymentNo } })
    })
  }

  // ===== 订单库存锁定 =====
  private async lockOrderInventory(orderId: string) {
    const items = await this.itemRepo.find({ where: { orderId } })
    const lockedSkus: string[] = []
    for (const item of items) {
      if (!item.productId || item.quantity <= 0) continue
      try {
        await this.inventoryService.lock({
          skuId: item.productId,
          orderId,
          quantity: item.quantity,
        })
        lockedSkus.push(item.productId)
      } catch (e: unknown) {
        this.logger.error(`支付时库存锁定失败 [${orderId}]: ${item.productId} — ${(e as Error).message}`)
        // 库存不足时记录日志但不阻断支付（运营人员介入处理）
        await this.addLog(
          orderId,
          'inventory_lock_fail',
          null,
          null,
          'system',
          `库存锁定失败：${item.productId} × ${item.quantity}，请人工处理`,
        )
      }
    }
    if (lockedSkus.length > 0) {
      await this.addLog(orderId, 'inventory_lock', null, null, 'system', `库存锁定成功：${lockedSkus.join(', ')}`)
    }
  }

  // ===== 发货 =====
  async getOrderShipments(orderId: string) {
    return this.shipRepo.find({ where: { orderId }, order: { createdAt: 'DESC' } })
  }

  async createShipment(dto: CreateShipmentDto) {
    // P0修复：事务内悲观锁 + 原子发货，防止并发重复发货
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
      await manager.update(Order, dto.orderId, { status: ORDER_STATUS.shipped, logisticsStatusCode: LOGISTICS_STATUS.shipped })
      await manager.insert(OrderLog, { orderId: dto.orderId, action: 'ship', oldStatus, newStatus: ORDER_STATUS.shipped, operator: dto.shipper || 'system', remark: `发货：${dto.carrier} ${dto.trackingNo}` })

      // R7-P0修复：库存扣减纳入主事务（先unlock后stockOut，原子操作）
      const items = await manager.find(OrderItem, { where: { orderId: dto.orderId } })
      for (const item of items) {
        if (!item.productId || item.quantity <= 0) continue
        // 先解锁（释放支付时锁定的库存）
        await this.inventoryService.unlockInTransaction(manager, {
          skuId: item.productId,
          orderId: dto.orderId,
          quantity: item.quantity,
        })
        // 再出库扣减
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
    }).then(async (result) => {
      // 事务外仅处理非关键副作用（客户档案沉淀可选延迟）
      try { await this.autoPopulateCustomerLens(result.orderId) } catch (e) {
        this.logger.error(`客户档案沉淀失败 [${result.orderId}]:`, e instanceof Error ? (e as Error).message : String(e))
      }
      return this.shipRepo.findOne({ where: { orderId: result.orderId }, order: { createdAt: 'DESC' } })
    })
  }

  // ===== 订单库存扣减 =====
  // 发货时：先解锁（释放支付时锁定的库存），再出库扣减
  private async deductOrderInventory(orderId: string) {
    const items = await this.itemRepo.find({ where: { orderId } })
    const deductedSkus: string[] = []
    for (const item of items) {
      if (!item.productId || item.quantity <= 0) continue
      try {
        // 先解锁（释放支付时锁定的库存）
        await this.inventoryService.unlock({
          skuId: item.productId,
          orderId,
          quantity: item.quantity,
        })
        // 再出库扣减
        await this.inventoryService.stockOut({
          skuId: item.productId,
          quantity: item.quantity,
          transactionType: TransactionType.SALE_OUT,
          referenceType: 'order',
          referenceId: orderId,
          remark: `订单 ${orderId} 发货出库`,
        })
        deductedSkus.push(item.productId)
      } catch (e: unknown) {
        this.logger.error(`发货库存扣减失败 [${orderId}]: ${item.productId} — ${(e as Error).message}`)
        await this.addLog(
          orderId,
          'inventory_deduct_fail',
          null,
          null,
          'system',
          `库存扣减失败：${item.productId} × ${item.quantity}，请人工处理`,
        )
      }
    }
    if (deductedSkus.length > 0) {
      await this.addLog(orderId, 'inventory_deduct', null, null, 'system', `库存扣减成功（先解锁后出库）：${deductedSkus.join(', ')}`)
    }
  }

  // ===== 订单自动沉淀客户镜片档案 =====
  // H1+H2修复：autoPopulateCustomerLens 和 updateMemberAssetsAfterPayment 已迁移到 CustomerService

  // ===== TASK-010: 降级扫描 =====
  async scanMemberDowngrades(): Promise<{ count: number; details: any[] }> {
    const now = new Date()
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    // 查找需要降级的客户
    const customers = await this.customerRepo
      .createQueryBuilder('c')
      .where('c.customer_type = :type', { type: ORDER_TYPES.retail })
      .andWhere('c.customer_level != :normal', { normal: 'normal' })
      .andWhere('c.last_active_at < :threshold', { threshold: ninetyDaysAgo })
      .getMany()

    const downgradeOrder = ['gold', 'svip', 'vip', 'normal']
    const details: any[] = []

    for (const customer of customers) {
      const currentIndex = downgradeOrder.indexOf(customer.customerLevel || 'normal')
      if (currentIndex <= 0 || currentIndex >= downgradeOrder.length) continue

      const newLevel = downgradeOrder[currentIndex + 1]
      const oldLevel = customer.customerLevel!

      // 更新客户等级
      await this.customerRepo.update(customer.customerId, {
        customerLevel: newLevel,
      })

      // 写入等级变更日志
      const logId = `ml-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`
      await this.memberLevelLogRepo.save({
        logId,
        customerId: customer.customerId,
        oldLevel,
        newLevel,
        triggerType: 'downgrade',
        triggerReason: '90天无消费自动降级',
        orderId: null,
      })

      details.push({
        customerId: customer.customerId,
        contactName: customer.contactName,
        oldLevel,
        newLevel,
        lastActiveAt: customer.lastActiveAt,
      })
    }

    return { count: details.length, details }
  }

  // ===== 日志 =====
  async getOrderLogs(orderId: string) {
    return this.logRepo.find({ where: { orderId }, order: { createdAt: 'DESC' } })
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

  // ===== 统计 =====
  async getStats() {
    const qb = this.orderRepo.createQueryBuilder('o')
    const [total, pending, paid, shipping, completed, cancelled] = await Promise.all([
      qb.getCount(),
      qb.clone().where('o.status = :s', { s: ORDER_STATUS.pending }).getCount(),
      qb.clone().where('o.status = :s', { s: ORDER_STATUS.paid }).getCount(),
      qb.clone().where('o.status = :s', { s: ORDER_STATUS.shipped }).getCount(),
      qb.clone().where('o.status = :s', { s: ORDER_STATUS.completed }).getCount(),
      qb.clone().where('o.status = :s', { s: ORDER_STATUS.cancelled }).getCount(),
    ])
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todaySales = await this.orderRepo
      .createQueryBuilder('o')
      .select('SUM(o.actual_amount)', 'total')
      .where('o.status IN (:...statuses)', { statuses: [ORDER_STATUS.paid, ORDER_STATUS.shipped, ORDER_STATUS.completed] })
      .andWhere('o.created_at >= :today', { today })
      .getRawOne()
    return { total, pending, paid, shipping, completed, cancelled, todaySales: Number(todaySales?.total || 0) }
  }

  // H1修复：autoPopulateCustomerLens 保留在OrderService（CustomerService无此方法）
  private async autoPopulateCustomerLens(orderId: string) {
    const order = await this.orderRepo.findOne({ where: { orderId } })
    if (!order?.customerId) return
    const items = await this.itemRepo.find({ where: { orderId } })
    if (!items?.length) return
    const structCodes = [...new Set(items.map(i => i.structureStandardCode).filter(Boolean))]
    if (!structCodes.length) return

    for (const structCode of structCodes) {
      const existing = await this.customerLensRepo.findOne({ where: { customerId: order.customerId, structureStandardCode: structCode, isDeleted: false } })
      if (!existing) {
        const orderItems = items.filter(i => i.structureStandardCode === structCode)
        const allFrameOnly = orderItems.every(i => i.orderFulfillmentType === 'frame_only')
        await this.customerLensRepo.save(this.customerLensRepo.create({
          customerLensId: `cl-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`,
          customerId: order.customerId, structureStandardCode: structCode,
          prescriptionId: order.prescriptionId || null, orderId,
          purchaseDate: new Date(), status: allFrameOnly ? 'pending' : 'active',
        }))
      }
    }
  }
}
