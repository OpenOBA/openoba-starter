import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Inventory } from './entity/inventory.entity'
import { InventoryTransaction, TransactionType } from './entity/inventory-transaction.entity'
import { StockInDto, StockOutDto, LockStockDto, UnlockStockDto, AdjustStockDto } from './dto/inventory.dto'

/**
 * 库存出入库子 Service
 * 负责：入库、出库、锁定、解锁、盘点调整（独立事务）
 */
@Injectable()
export class InventoryStockService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepo: Repository<Inventory>,
    @InjectRepository(InventoryTransaction)
    private transactionRepo: Repository<InventoryTransaction>,
    private dataSource: DataSource,
  ) {}

  async stockIn(dto: StockInDto, operatorId?: string) {
    return this.dataSource.transaction(async (manager) => {
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
        structureStandardCode: dto.structureStandardCode ?? inv.structureStandardCode,
        warehouseCode: 'WH-MAIN',
        transactionType: dto.transactionType,
        quantity: dto.quantity,
        quantityBefore: before,
        quantityAfter: inv.currentQuantity,
        referenceType: dto.referenceType ?? undefined,
        referenceId: dto.referenceId ?? undefined,
        operatorId: operatorId ?? undefined,
        remark: dto.remark ?? undefined,
      })

      return inv
    })
  }

  async stockOut(dto: StockOutDto, operatorId?: string) {
    return this.dataSource.transaction(async (manager) => {
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
        structureStandardCode: dto.structureStandardCode ?? inv.structureStandardCode,
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

      return inv
    })
  }

  async lock(dto: LockStockDto, operatorId?: string) {
    return this.dataSource.transaction(async (manager) => {
      const inv = await manager.findOne(Inventory, {
        where: { skuId: dto.skuId, warehouseCode: 'WH-MAIN' },
        lock: { mode: 'pessimistic_write' },
      })
      if (!inv) throw new NotFoundException('库存记录不存在')

      if (inv.availableQuantity < dto.quantity) {
        throw new BadRequestException(`可用库存不足（可用 ${inv.availableQuantity}，需要锁定 ${dto.quantity}）`)
      }

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
        quantityBefore: inv.availableQuantity + dto.quantity,
        quantityAfter: inv.availableQuantity,
        referenceType: 'order',
        referenceId: dto.orderId,
        operatorId: operatorId ?? undefined,
        remark: `订单锁定 ${dto.quantity} 件`,
      })

      return inv
    })
  }

  async unlock(dto: UnlockStockDto, operatorId?: string) {
    return this.dataSource.transaction(async (manager) => {
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
        remark: `订单解锁 ${dto.quantity} 件`,
      })

      return inv
    })
  }

  async adjust(dto: AdjustStockDto, operatorId?: string) {
    return this.dataSource.transaction(async (manager) => {
      const inv = await manager.findOne(Inventory, {
        where: { skuId: dto.skuId, warehouseCode: 'WH-MAIN' },
        lock: { mode: 'pessimistic_write' },
      })
      if (!inv) throw new NotFoundException('库存记录不存在')

      const diff = dto.newQuantity - inv.currentQuantity
      const before = inv.currentQuantity

      inv.currentQuantity = dto.newQuantity
      inv.availableQuantity = Math.max(0, dto.newQuantity - inv.lockedQuantity)
      inv.lastStockCheckAt = new Date()
      inv.updatedAt = new Date()

      await manager.save(Inventory, inv)
      await manager.save(InventoryTransaction, {
        id: crypto.randomUUID(),
        skuId: dto.skuId,
        skuCode: inv.skuCode,
        structureStandardCode: inv.structureStandardCode,
        warehouseCode: 'WH-MAIN',
        transactionType: TransactionType.ADJUST,
        quantity: diff,
        quantityBefore: before,
        quantityAfter: dto.newQuantity,
        referenceType: 'adjust',
        operatorId: operatorId ?? undefined,
        remark: dto.remark || `盘点调整：${before} → ${dto.newQuantity}`,
      })

      return inv
    })
  }
}
