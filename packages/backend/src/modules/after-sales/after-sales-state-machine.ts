import { EntityManager } from 'typeorm'
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AfterSales } from './entity/after-sales.entity'
import { AfterSalesLog } from './entity/after-sales-log.entity'
import { Order } from '../order/entity/order.entity'
import { Inventory } from '../inventory/entity/inventory.entity'
import { InventoryTransaction, TransactionType } from '../inventory/entity/inventory-transaction.entity'
import {
  ReviewAfterSalesDto,
  ProcessAfterSalesDto,
} from './dto/after-sales.dto'
import { AFTER_SALES_STATUS, AFTER_SALES_TYPE } from './after-sales.constants'

/**
 * 售后状态机子 Service
 *
 * 负责售后审核（approve/reject）和流程处理（receive/refund/close/reopen）
 * 所有操作在外部传入的事务 manager 中执行，确保状态一致性
 *
 * ⚠️ 此 Service 不注入 DataSource，所有事务由调用方（主 Service）管理
 */
@Injectable()
export class AfterSalesStateMachine {
  constructor(
    @InjectRepository(AfterSalesLog)
    private readonly afterSalesLogRepo: Repository<AfterSalesLog>,
  ) {}

  /**
   * 审核售后单（批准/拒绝）
   */
  async review(
    manager: EntityManager,
    id: string,
    dto: ReviewAfterSalesDto,
    operatorId?: string,
  ): Promise<AfterSales> {
    const afterSales = await manager.findOne(AfterSales, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    })
    if (!afterSales) throw new NotFoundException('售后单不存在')
    if (afterSales.status !== AFTER_SALES_STATUS.pending) {
      throw new BadRequestException(`售后单状态不可审核（当前状态：${afterSales.status}）`)
    }

    const fromStatus = afterSales.status
    const toStatus =
      dto.action === 'approve' ? AFTER_SALES_STATUS.approved : AFTER_SALES_STATUS.rejected

    afterSales.status = toStatus as unknown as AfterSales['status']
    if (operatorId) afterSales.reviewerId = operatorId
    afterSales.reviewNote = dto.reviewNote
    afterSales.reviewedAt = new Date()

    if (dto.action === 'approve' && dto.actualRefundAmount) {
      afterSales.actualRefundAmount = dto.actualRefundAmount.toFixed(2)
    }

    await manager.save(AfterSales, afterSales)
    await this.addLogInTx(manager, afterSales.id, 'review', fromStatus, toStatus, operatorId, dto.reviewNote)

    // 批准退货/换货时：自动回滚库存
    const returnTypes: string[] = [AFTER_SALES_TYPE.return, AFTER_SALES_TYPE.exchange]
    if (dto.action === 'approve' && returnTypes.includes(afterSales.afterSalesType)) {
      await this.rollbackInventoryForReturn(afterSales, manager)
    }

    // 回写订单售后状态
    await manager.update(Order, afterSales.orderId, { afterSaleStatusCode: toStatus })

    return afterSales
  }

  /**
   * 流程处理（收货/退款/关闭/重新打开）
   */
  async process(
    manager: EntityManager,
    id: string,
    dto: ProcessAfterSalesDto,
    operatorId?: string,
  ): Promise<AfterSales> {
    const afterSales = await manager.findOne(AfterSales, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    })
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
        throw new BadRequestException(`未知操作：${dto.action}`)
    }

    afterSales.status = toStatus as unknown as AfterSales['status']
    await manager.save(AfterSales, afterSales)
    await this.addLogInTx(manager, afterSales.id, dto.action, fromStatus, toStatus, operatorId, dto.note)

    // H5修复：自动完成
    if (toStatus === AFTER_SALES_STATUS.refunded) {
      afterSales.status = AFTER_SALES_STATUS.completed
      await manager.save(AfterSales, afterSales)
      await this.addLogInTx(
        manager, afterSales.id, 'auto_complete', toStatus, 'completed',
        'system', '退款完成后自动关闭',
      )
    } else if (
      toStatus === AFTER_SALES_STATUS.received &&
      afterSales.afterSalesType === AFTER_SALES_TYPE.refund_only
    ) {
      afterSales.status = AFTER_SALES_STATUS.completed
      await manager.save(AfterSales, afterSales)
      await this.addLogInTx(
        manager, afterSales.id, 'auto_complete', toStatus, 'completed',
        'system', '仅退款收货后自动关闭',
      )
    }

    // 回写订单售后状态
    await manager.update(Order, afterSales.orderId, { afterSaleStatusCode: toStatus })

    return afterSales
  }

  /**
   * 库存回滚（退货批准时，在外部事务 manager 中操作）
   * 4R06修复：使用外部manager直接操作库存，避免嵌套事务
   */
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
        const sku = await manager.findOne(Inventory, {
          where: { skuId: item.skuId },
          lock: { mode: 'pessimistic_write' },
        })
        if (!sku) {
          await this.addLogInTx(
            manager, afterSales.id, 'inventory_rollback_fail', null, null,
            'system', `库存回滚失败：SKU ${item.skuId} 不存在`,
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
          manager, afterSales.id, 'inventory_rollback_fail', null, null,
          'system', `库存回滚失败：${item.skuCode || item.skuId} × ${item.quantity}，请人工处理`,
        )
      }
    }
  }

  /**
   * 事务内写日志
   */
  async addLogInTx(
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
}
