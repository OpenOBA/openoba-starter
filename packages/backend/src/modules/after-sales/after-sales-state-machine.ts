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
 * 鍞悗鐘舵€佹満瀛?Service
 *
 * 璐熻矗鍞悗瀹℃牳锛坅pprove/reject锛夊拰娴佺▼澶勭悊锛坮eceive/refund/close/reopen锛? * 鎵€鏈夋搷浣滃湪澶栭儴浼犲叆鐨勪簨鍔?manager 涓墽琛岋紝纭繚鐘舵€佷竴鑷存€? *
 * 鈿狅笍 姝?Service 涓嶆敞鍏?DataSource锛屾墍鏈変簨鍔＄敱璋冪敤鏂癸紙涓?Service锛夌鐞? */
@Injectable()
export class AfterSalesStateMachine {
  constructor(
    @InjectRepository(AfterSalesLog)
    private readonly afterSalesLogRepo: Repository<AfterSalesLog>,
  ) {}

  /**
   * 瀹℃牳鍞悗鍗曪紙鎵瑰噯/鎷掔粷锛?   */
  async review(
    manager: any,
    id: string,
    dto: ReviewAfterSalesDto,
    operatorId?: string,
  ): Promise<AfterSales> {
    const afterSales = await manager.findOne(AfterSales, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    })
    if (!afterSales) throw new NotFoundException('鍞悗鍗曚笉瀛樺湪')
    if (afterSales.status !== AFTER_SALES_STATUS.pending) {
      throw new BadRequestException(`鍞悗鍗曠姸鎬佷笉鍙鏍革紙褰撳墠鐘舵€侊細${afterSales.status}锛塦)
    }

    const fromStatus = afterSales.status
    const toStatus =
      dto.action === 'approve' ? AFTER_SALES_STATUS.approved : AFTER_SALES_STATUS.rejected

    afterSales.status = toStatus as any
    if (operatorId) afterSales.reviewerId = operatorId
    afterSales.reviewNote = dto.reviewNote
    afterSales.reviewedAt = new Date()

    if (dto.action === 'approve' && dto.actualRefundAmount) {
      afterSales.actualRefundAmount = dto.actualRefundAmount.toFixed(2)
    }

    await manager.save(AfterSales, afterSales)
    await this.addLogInTx(manager, afterSales.id, 'review', fromStatus, toStatus, operatorId, dto.reviewNote)

    // 鎵瑰噯閫€璐?鎹㈣揣鏃讹細鑷姩鍥炴粴搴撳瓨
    const returnTypes: string[] = [AFTER_SALES_TYPE.return, AFTER_SALES_TYPE.exchange]
    if (dto.action === 'approve' && returnTypes.includes(afterSales.afterSalesType)) {
      await this.rollbackInventoryForReturn(afterSales, manager)
    }

    // 鍥炲啓璁㈠崟鍞悗鐘舵€?    await manager.update(Order, afterSales.orderId, { afterSaleStatusCode: toStatus })

    return afterSales
  }

  /**
   * 娴佺▼澶勭悊锛堟敹璐?閫€娆?鍏抽棴/閲嶆柊鎵撳紑锛?   */
  async process(
    manager: any,
    id: string,
    dto: ProcessAfterSalesDto,
    operatorId?: string,
  ): Promise<AfterSales> {
    const afterSales = await manager.findOne(AfterSales, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    })
    if (!afterSales) throw new NotFoundException('鍞悗鍗曚笉瀛樺湪')

    const fromStatus = afterSales.status
    let toStatus: string

    switch (dto.action) {
      case 'receive': {
        const validStatuses: string[] = [AFTER_SALES_STATUS.approved, AFTER_SALES_STATUS.returning]
        if (!validStatuses.includes(afterSales.status)) {
          throw new BadRequestException('褰撳墠鐘舵€佷笉鍙‘璁ゆ敹璐?)
        }
        toStatus = AFTER_SALES_STATUS.received
        break
      }

      case 'refund': {
        const validStatuses: string[] = [AFTER_SALES_STATUS.received, AFTER_SALES_STATUS.approved]
        if (!validStatuses.includes(afterSales.status)) {
          throw new BadRequestException('褰撳墠鐘舵€佷笉鍙€€娆?)
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
          throw new BadRequestException('褰撳墠鐘舵€佷笉鍙噸鏂版墦寮€')
        }
        toStatus = AFTER_SALES_STATUS.pending
        break
      }

      default:
        throw new BadRequestException(`鏈煡鎿嶄綔锛?{dto.action}`)
    }

    afterSales.status = toStatus as any
    await manager.save(AfterSales, afterSales)
    await this.addLogInTx(manager, afterSales.id, dto.action, fromStatus, toStatus, operatorId, dto.note)

    // H5淇锛氳嚜鍔ㄥ畬鎴?    if (toStatus === AFTER_SALES_STATUS.refunded) {
      afterSales.status = AFTER_SALES_STATUS.completed
      await manager.save(AfterSales, afterSales)
      await this.addLogInTx(
        manager, afterSales.id, 'auto_complete', toStatus, 'completed',
        'system', '閫€娆惧畬鎴愬悗鑷姩鍏抽棴',
      )
    } else if (
      toStatus === AFTER_SALES_STATUS.received &&
      afterSales.afterSalesType === AFTER_SALES_TYPE.refund_only
    ) {
      afterSales.status = AFTER_SALES_STATUS.completed
      await manager.save(AfterSales, afterSales)
      await this.addLogInTx(
        manager, afterSales.id, 'auto_complete', toStatus, 'completed',
        'system', '浠呴€€娆炬敹璐у悗鑷姩鍏抽棴',
      )
    }

    // 鍥炲啓璁㈠崟鍞悗鐘舵€?    await manager.update(Order, afterSales.orderId, { afterSaleStatusCode: toStatus })

    return afterSales
  }

  /**
   * 搴撳瓨鍥炴粴锛堥€€璐ф壒鍑嗘椂锛屽湪澶栭儴浜嬪姟 manager 涓搷浣滐級
   * 4R06淇锛氫娇鐢ㄥ閮╩anager鐩存帴鎿嶄綔搴撳瓨锛岄伩鍏嶅祵濂椾簨鍔?   */
  private async rollbackInventoryForReturn(afterSales: AfterSales, manager: any) {
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
            'system', `搴撳瓨鍥炴粴澶辫触锛歋KU ${item.skuId} 涓嶅瓨鍦╜,
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
          remark: `鍞悗 ${afterSales.afterSalesNo} 閫€璐у叆搴擄細${item.skuCode || item.skuId} 脳 ${item.quantity}`,
        })
      } catch (err) {
        await this.addLogInTx(
          manager, afterSales.id, 'inventory_rollback_fail', null, null,
          'system', `搴撳瓨鍥炴粴澶辫触锛?{item.skuCode || item.skuId} 脳 ${item.quantity}锛岃浜哄伐澶勭悊`,
        )
      }
    }
  }

  /**
   * 浜嬪姟鍐呭啓鏃ュ織
   */
  async addLogInTx(
    manager: any,
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
