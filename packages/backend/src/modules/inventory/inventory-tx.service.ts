/* eslint-disable @typescript-eslint/no-explicit-any -- TODO: 需要类型化 */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { Inventory } from './entity/inventory.entity'
import { InventoryTransaction, TransactionType } from './entity/inventory-transaction.entity'

/**
 * 库存事务内子 Service
 *
 * 负责：在外部事务中被调用的库存操作方法
 * 这些方法的 manager 参数由调用方（OrderService）传入，
 * 确保与调用方事务共享同一个连接，实现一致性
 *
 * ⚠️ 关键约束：这些方法不创建独立事务，不在 NestJS DI 中注入 Repository
 * 所有数据操作通过调用方传入的 manager 代理
 */
@Injectable()
export class InventoryTxService {
  /**
   * P0-2修复：已发货订单取消时回滚库存（stockIn，在外部事务内）
   */
  async rollbackStockInTransaction(
    manager: any,
    dto: { skuId: string; orderId: string; quantity: number },
    operatorId?: string,
  ) {
    const inv = await manager.findOne(Inventory, {
      where: { skuId: dto.skuId, warehouseCode: 'WH-MAIN' },
      lock: { mode: 'pessimistic_write' },
    })
    if (!inv) throw new NotFoundException('库存记录不存在')

    const before = inv.currentQuantity
    inv.currentQuantity += dto.quantity
    inv.availableQuantity += dto.quantity
    inv.updatedAt = new Date()

    await manager.save(Inventory, inv)
    await manager.save(InventoryTransaction, {
      id: crypto.randomUUID(),
      skuId: dto.skuId,
      skuCode: inv.skuCode,
      structureStandardCode: inv.structureStandardCode,
      warehouseCode: 'WH-MAIN',
      transactionType: TransactionType.RETURN_IN,
      quantity: dto.quantity,
      quantityBefore: before,
      quantityAfter: inv.currentQuantity,
      referenceType: 'order_cancel',
      referenceId: dto.orderId,
      operatorId: operatorId ?? undefined,
      remark: `已发货订单取消库存回滚 ${dto.quantity} 件`,
    })
  }

  /**
   * C7-P0修复：在外部事务中解锁库存（由调用方管理事务）
   */
  async unlockInTransaction(
    manager: any,
    dto: { skuId: string; orderId: string; quantity: number },
    operatorId?: string,
  ) {
    const inv = await manager.findOne(Inventory, {
      where: { skuId: dto.skuId, warehouseCode: 'WH-MAIN' },
      lock: { mode: 'pessimistic_write' },
    })
    if (!inv) throw new NotFoundException('库存记录不存在')

    if (inv.lockedQuantity < dto.quantity) {
      throw new BadRequestException(`锁定库存不足（锁定 ${inv.lockedQuantity}，需要解锁 ${dto.quantity}）`)
    }

    inv.availableQuantity += dto.quantity
    inv.lockedQuantity -= dto.quantity
    inv.updatedAt = new Date()

    await manager.save(Inventory, inv)
    await manager.save(InventoryTransaction, {
      id: crypto.randomUUID(),
      skuId: dto.skuId,
      skuCode: inv.skuCode,
      structureStandardCode: inv.structureStandardCode,
      warehouseCode: 'WH-MAIN',
      transactionType: TransactionType.UNLOCK,
      quantity: 0,
      quantityBefore: inv.availableQuantity - dto.quantity,
      quantityAfter: inv.availableQuantity,
      referenceType: 'order',
      referenceId: dto.orderId,
      operatorId: operatorId ?? undefined,
      remark: '取消订单库存释放（事务内）',
    })
  }

  /**
   * R7-P0修复：在外部事务中锁定库存（支付时使用）
   * 失败 → 调用方事务回滚，防止超卖
   */
  async lockInTransaction(
    manager: any,
    dto: { skuId: string; orderId: string; quantity: number },
    operatorId?: string,
  ) {
    const inv = await manager.findOne(Inventory, {
      where: { skuId: dto.skuId, warehouseCode: 'WH-MAIN' },
      lock: { mode: 'pessimistic_write' },
    })
    if (!inv) throw new NotFoundException('库存记录不存在')

    if (inv.availableQuantity < dto.quantity) {
      throw new BadRequestException(`可用库存不足（可用 ${inv.availableQuantity}，需要锁定 ${dto.quantity}）`)
    }

    const beforeAvailable = inv.availableQuantity
    inv.availableQuantity -= dto.quantity
    inv.lockedQuantity += dto.quantity
    inv.updatedAt = new Date()

    await manager.save(Inventory, inv)
    await manager.save(InventoryTransaction, {
      id: crypto.randomUUID(),
      skuId: dto.skuId,
      skuCode: inv.skuCode,
      structureStandardCode: inv.structureStandardCode,
      warehouseCode: 'WH-MAIN',
      transactionType: TransactionType.LOCK,
      quantity: 0,
      quantityBefore: beforeAvailable,
      quantityAfter: inv.availableQuantity,
      referenceType: 'order',
      referenceId: dto.orderId,
      operatorId: operatorId ?? undefined,
      remark: `订单锁定 ${dto.quantity} 件`,
    })
  }

  /**
   * R7-P0修复：在外部事务中出库扣减（发货时使用）
   * 失败 → 调用方事务回滚，防止库存不一致
   */
  async stockOutInTransaction(
    manager: any,
    dto: {
      skuId: string
      quantity: number
      transactionType: string
      referenceType?: string
      referenceId?: string
      remark?: string
    },
    operatorId?: string,
  ) {
    const inv = await manager.findOne(Inventory, {
      where: { skuId: dto.skuId, warehouseCode: 'WH-MAIN' },
      lock: { mode: 'pessimistic_write' },
    })
    if (!inv) throw new NotFoundException('库存记录不存在')

    if (inv.availableQuantity < dto.quantity) {
      throw new BadRequestException(`可用库存不足（可用 ${inv.availableQuantity}，需要 ${dto.quantity}）`)
    }

    const before = inv.currentQuantity
    inv.currentQuantity -= dto.quantity
    inv.availableQuantity -= dto.quantity
    inv.updatedAt = new Date()

    await manager.save(Inventory, inv)
    await manager.save(InventoryTransaction, {
      id: crypto.randomUUID(),
      skuId: dto.skuId,
      skuCode: inv.skuCode,
      structureStandardCode: inv.structureStandardCode,
      warehouseCode: 'WH-MAIN',
      transactionType: dto.transactionType,
      quantity: -dto.quantity,
      quantityBefore: before,
      quantityAfter: inv.currentQuantity,
      referenceType: dto.referenceType ?? undefined,
      referenceId: dto.referenceId ?? undefined,
      operatorId: operatorId ?? undefined,
      remark: dto.remark ?? undefined,
    })
  }
}
