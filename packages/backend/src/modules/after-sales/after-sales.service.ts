import { EntityManager } from 'typeorm'
import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { AfterSales } from './entity/after-sales.entity'
import { AfterSalesLog } from './entity/after-sales-log.entity'
import { Order } from '../order/entity/order.entity'
import {
  CreateAfterSalesDto,
  ReviewAfterSalesDto,
  ProcessAfterSalesDto,
  UpdateAfterSalesDto,
} from './dto/after-sales.dto'
import { InventoryService } from '../inventory/inventory.service'
import { TransactionType } from '../inventory/entity/inventory-transaction.entity'
import { Inventory } from '../inventory/entity/inventory.entity'
import { InventoryTransaction } from '../inventory/entity/inventory-transaction.entity'
import * as crypto from 'crypto'
// TASK-013 Batch 4: 硬编码替换
import { AFTER_SALES_STATUS, AFTER_SALES_TYPE } from './after-sales.constants'
import { ORDER_STATUS } from '../order/order.constants'

@Injectable()
export class AfterSalesService {
  constructor(
    @InjectRepository(AfterSales)
    private readonly afterSalesRepo: Repository<AfterSales>,
    @InjectRepository(AfterSalesLog)
    private readonly afterSalesLogRepo: Repository<AfterSalesLog>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => InventoryService))
    private readonly inventoryService: InventoryService,
  ) {}

  // 售后编号生成 — 使用 crypto.randomUUID() 防重复
  private generateAfterSalesNo(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const uuid = crypto.randomUUID().substring(0, 4).toUpperCase()
    return `AS-${date}-${uuid}`
  }

  // ===== 创建售后 =====
  async create(dto: CreateAfterSalesDto) {
    // 验证订单存在且状态允许售后（事务外读取，轻量校验）
    const order = await this.getOrder(dto.orderId)
    const validOrderStatuses: string[] = [
      ORDER_STATUS.paid,
      ORDER_STATUS.shipped,
      ORDER_STATUS.delivered,
      ORDER_STATUS.completed,
    ]
    if (!validOrderStatuses.includes(order.status)) {
      throw new BadRequestException('订单状态不可申请售后（当前状态：' + order.status + '）')
    }

    // P1修复：校验退款金额不超过订单实付
    const orderFull = await this.orderRepo.findOne({ where: { orderId: dto.orderId }, select: ['actualAmount'] })
    if (orderFull && dto.refundAmount > Number(orderFull.actualAmount)) {
      throw new BadRequestException(
        `退款金额 ¥${dto.refundAmount.toFixed(2)} 超过订单实付 ¥${Number(orderFull.actualAmount).toFixed(2)}`,
      )
    }

    // R7-P1修复：售后创建+日志+订单状态回写包裹在同一事务中
    return this.dataSource.transaction(async (manager) => {
      const afterSales = this.afterSalesRepo.create({
        ...dto,
        id: crypto.randomUUID(),
        afterSalesNo: this.generateAfterSalesNo(),
        orderNo: order.orderNo,
        customerId: order.customerId,
        customerName: order.customerName,
        refundAmount: dto.refundAmount.toFixed(2),
        status: AFTER_SALES_STATUS.pending,
      })

      const saved = await manager.save(AfterSales, afterSales)

      // 日志在事务内
      await manager.save(AfterSalesLog, {
        id: crypto.randomUUID(),
        afterSalesId: saved.id,
        action: 'create',
        oldStatus: null,
        newStatus: AFTER_SALES_STATUS.pending,
        operator: 'system',
        remark: '创建售后申请',
      })

      // 订单售后状态回写在事务内（失败则整体回滚）
      await manager.update(Order, dto.orderId, { afterSaleStatusCode: AFTER_SALES_STATUS.pending })

      return saved
    })
  }

  // ===== 列表查询 =====
  async findAll(page = 1, limit = 20, filters: Record<string, unknown> = {}) {
    const qb = this.afterSalesRepo
      .createQueryBuilder('as')
      .orderBy('as.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    if (filters.orderId) qb.andWhere('as.orderId = :orderId', { orderId: filters.orderId })
    if (filters.customerId) qb.andWhere('as.customerId = :customerId', { customerId: filters.customerId })
    if (filters.status) qb.andWhere('as.status = :status', { status: filters.status })
    if (filters.afterSalesType)
      qb.andWhere('as.afterSalesType = :afterSalesType', { afterSalesType: filters.afterSalesType })
    if (filters.afterSalesNo)
      qb.andWhere('as.afterSalesNo LIKE :afterSalesNo', { afterSalesNo: `%${filters.afterSalesNo}%` })

    const [items, total] = await qb.getManyAndCount()
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  // ===== 详情 =====
  async findOne(id: string) {
    const afterSales = await this.afterSalesRepo.findOne({ where: { id } })
    if (!afterSales) throw new NotFoundException('售后单不存在')
    return afterSales
  }

  // ===== 更新物流信息 =====
  async update(id: string, dto: UpdateAfterSalesDto) {
    const afterSales = await this.findOne(id)
    Object.assign(afterSales, dto)
    return this.afterSalesRepo.save(afterSales)
  }

  // ===== 审核（批准/拒绝） =====
  async review(id: string, dto: ReviewAfterSalesDto, operatorId?: string) {
    return this.dataSource.transaction(async (manager) => {
      const afterSales = await manager.findOne(AfterSales, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!afterSales) throw new NotFoundException('售后单不存在')
      if (afterSales.status !== AFTER_SALES_STATUS.pending) {
        throw new BadRequestException('售后单状态不可审核（当前状态：' + afterSales.status + '）')
      }

      const fromStatus = afterSales.status
      const toStatus = dto.action === 'approve' ? AFTER_SALES_STATUS.approved : AFTER_SALES_STATUS.rejected

      afterSales.status = toStatus as unknown as AfterSales['status']
      if (operatorId) afterSales.reviewerId = operatorId
      afterSales.reviewNote = dto.reviewNote
      afterSales.reviewedAt = new Date()

      if (dto.action === 'approve' && dto.actualRefundAmount) {
        afterSales.actualRefundAmount = dto.actualRefundAmount.toFixed(2)
      }

      await manager.save(AfterSales, afterSales)
      await this.addLogInTx(manager, afterSales.id, 'review', fromStatus, toStatus, operatorId, dto.reviewNote)

      // 批准退货/换货时：自动回滚库存（将之前发货扣减的库存加回）
      const returnTypes: string[] = [AFTER_SALES_TYPE.return, AFTER_SALES_TYPE.exchange]
      if (dto.action === 'approve' && returnTypes.includes(afterSales.afterSalesType)) {
        await this.rollbackInventoryForReturn(afterSales, manager)
      }

      // P1-2修复：回写订单售后状态
      await manager.update(Order, afterSales.orderId, { afterSaleStatusCode: toStatus })

      return afterSales
    })
  }

  // ===== 流程处理（收货/退款/关闭/重新打开） =====
  async process(id: string, dto: ProcessAfterSalesDto, operatorId?: string) {
    return this.dataSource.transaction(async (manager) => {
      const afterSales = await manager.findOne(AfterSales, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!afterSales) throw new NotFoundException('售后单不存在')

      const fromStatus = afterSales.status
      let toStatus: string

      switch (dto.action) {
        case 'receive': {
          const validStatuses: string[] = [AFTER_SALES_STATUS.approved, AFTER_SALES_STATUS.returning]
          if (!validStatuses.includes(afterSales.status)) {
            throw new BadRequestException('当前状态不可确认收货')
          }
          toStatus = AFTER_SALES_STATUS.received
          break
        }

        case 'refund': {
          const validStatuses: string[] = [AFTER_SALES_STATUS.received, AFTER_SALES_STATUS.approved]
          if (!validStatuses.includes(afterSales.status)) {
            throw new BadRequestException('当前状态不可退款')
          }
          toStatus = AFTER_SALES_STATUS.refunded
          afterSales.refundMethod = dto.refundMethod || 'original'
          afterSales.refundedAt = new Date()
          if (dto.actualRefundAmount) {
            afterSales.actualRefundAmount = dto.actualRefundAmount.toFixed(2)
          }
          break
        }

        case 'close':
          toStatus = AFTER_SALES_STATUS.closed
          break

        case 'reopen': {
          const validStatuses: string[] = [AFTER_SALES_STATUS.closed, AFTER_SALES_STATUS.rejected]
          if (!validStatuses.includes(afterSales.status)) {
            throw new BadRequestException('当前状态不可重新打开')
          }
          toStatus = AFTER_SALES_STATUS.pending
          break
        }

        default:
          throw new BadRequestException('未知操作：' + dto.action)
      }

      afterSales.status = toStatus as unknown as AfterSales['status']
      await manager.save(AfterSales, afterSales)
      await this.addLogInTx(manager, afterSales.id, dto.action, fromStatus, toStatus, operatorId, dto.note)

      // H5修复：自动完成仅re…ed→completed不要跳过re…ed状态，分两步写
      if (toStatus === AFTER_SALES_STATUS.refunded) {
        // refunded状态已生效，再自动转为completed
        afterSales.status = AFTER_SALES_STATUS.completed
        await manager.save(AfterSales, afterSales)
        await this.addLogInTx(
          manager,
          afterSales.id,
          'auto_complete',
          toStatus,
          'completed',
          'system',
          '退款完成后自动关闭',
        )
      } else if (
        toStatus === AFTER_SALES_STATUS.received &&
        afterSales.afterSalesType === AFTER_SALES_TYPE.refund_only
      ) {
        afterSales.status = AFTER_SALES_STATUS.completed
        await manager.save(AfterSales, afterSales)
        await this.addLogInTx(
          manager,
          afterSales.id,
          'auto_complete',
          toStatus,
          'completed',
          'system',
          '仅退款收货后自动关闭',
        )
      }

      // P1-2修复：回写订单售后状态
      await manager.update(Order, afterSales.orderId, { afterSaleStatusCode: toStatus })

      return afterSales
    })
  }

  // ===== 售后日志 =====
  async getLogs(afterSalesId: string) {
    return this.afterSalesLogRepo.find({
      where: { afterSalesId },
      order: { createdAt: 'DESC' },
    })
  }

  private async addLog(
    afterSalesId: string,
    action: string,
    fromStatus: string | null,
    toStatus: string | null,
    operatorId?: string,
    note?: string,
  ) {
    await this.afterSalesLogRepo.save({
      id: crypto.randomUUID(),
      afterSalesId,
      action,
      fromStatus,
      toStatus,
      operatorId,
      operatorName: 'system',
      note,
    })
  }

  private async addLogInTx(
    manager: EntityManager,
    afterSalesId: string,
    action: string,
    fromStatus: string | null,
    toStatus: string | null,
    operatorId?: string,
    note?: string,
  ) {
    await manager.save(AfterSalesLog, {
      id: crypto.randomUUID(),
      afterSalesId,
      action,
      fromStatus,
      toStatus,
      operatorId,
      operatorName: 'system',
      note,
    })
  }

  // ===== 库存回滚（退货批准时） =====
  // 4R06修复：使用外部manager直接操作库存，避免嵌套事务
  private async rollbackInventoryForReturn(afterSales: AfterSales, manager: EntityManager) {
    let items = afterSales.items
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items)
      } catch {
        items = []
      }
    }
    if (!items || !Array.isArray(items) || items.length === 0) return

    for (const item of items) {
      if (!item.skuId || !item.quantity) continue
      try {
        // 使用manager而非外部inventoryService，确保与外层事务一致
        const sku = await manager.findOne(Inventory, {
          where: { skuId: item.skuId },
          lock: { mode: 'pessimistic_write' },
        })
        if (!sku) {
          await this.addLogInTx(
            manager,
            afterSales.id,
            'inventory_rollback_fail',
            null,
            null,
            'system',
            `库存回滚失败：SKU ${item.skuId} 不存在`,
          )
          continue
        }
        sku.currentQuantity += item.quantity
        sku.availableQuantity += item.quantity
        sku.updatedAt = new Date()
        await manager.save(Inventory, sku)
        await manager.save(InventoryTransaction, {
          id: crypto.randomUUID(),
          skuId: sku.skuId,
          skuCode: sku.skuCode,
          warehouseCode: sku.warehouseCode,
          transactionType: TransactionType.RETURN_IN,
          quantity: item.quantity,
          quantityBefore: sku.currentQuantity - item.quantity,
          quantityAfter: sku.currentQuantity,
          referenceType: 'after_sales',
          referenceId: afterSales.id,
          remark: `售后 ${afterSales.afterSalesNo} 退货入库：${item.skuCode || item.skuId} × ${item.quantity}`,
        })
      } catch (err) {
        await this.addLogInTx(
          manager,
          afterSales.id,
          'inventory_rollback_fail',
          null,
          null,
          'system',
          `库存回滚失败：${item.skuCode || item.skuId} × ${item.quantity}，请人工处理`,
        )
      }
    }
  }

  // ===== 获取订单信息（轻量查询） =====
  private async getOrder(orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { orderId },
      select: ['orderId', 'orderNo', 'status', 'customerId', 'customerName'],
    })
    if (!order) throw new NotFoundException('订单不存在')
    return order
  }

  // ===== 统计 =====
  async getStats() {
    const qb = this.afterSalesRepo.createQueryBuilder('as')
    const total = await qb.getCount()
    const pending = await qb.clone().andWhere('as.status = :s', { s: AFTER_SALES_STATUS.pending }).getCount()
    const approved = await qb.clone().andWhere('as.status = :s', { s: AFTER_SALES_STATUS.approved }).getCount()
    const completed = await qb.clone().andWhere('as.status = :s', { s: AFTER_SALES_STATUS.completed }).getCount()

    return { total, pending, approved, completed }
  }
}
