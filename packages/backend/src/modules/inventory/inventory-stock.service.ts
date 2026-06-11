import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Inventory } from './entity/inventory.entity'
import { InventoryTransaction, TransactionType } from './entity/inventory-transaction.entity'
import { StockInDto, StockOutDto, LockStockDto, UnlockStockDto, AdjustStockDto } from './dto/inventory.dto'

/**
 * 搴撳瓨鍑哄叆搴撳瓙 Service
 * 璐熻矗锛氬叆搴撱€佸嚭搴撱€侀攣瀹氥€佽В閿併€佺洏鐐硅皟鏁达紙鐙珛浜嬪姟锛? */
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
      if (!inv) throw new NotFoundException('搴撳瓨璁板綍涓嶅瓨鍦?)

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
      if (!inv) throw new NotFoundException('搴撳瓨璁板綍涓嶅瓨鍦?)

      if (inv.availableQuantity < dto.quantity) {
        throw new BadRequestException(`鍙敤搴撳瓨涓嶈冻锛堝彲鐢?${inv.availableQuantity}锛岄渶瑕?${dto.quantity}锛塦)
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
      if (!inv) throw new NotFoundException('搴撳瓨璁板綍涓嶅瓨鍦?)

      if (inv.availableQuantity < dto.quantity) {
        throw new BadRequestException(`鍙敤搴撳瓨涓嶈冻锛堝彲鐢?${inv.availableQuantity}锛岄渶瑕侀攣瀹?${dto.quantity}锛塦)
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
        remark: `璁㈠崟閿佸畾 ${dto.quantity} 浠禶,
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
      if (!inv) throw new NotFoundException('搴撳瓨璁板綍涓嶅瓨鍦?)

      if (inv.lockedQuantity < dto.quantity) {
        throw new BadRequestException(`閿佸畾搴撳瓨涓嶈冻锛堥攣瀹?${inv.lockedQuantity}锛岄渶瑕佽В閿?${dto.quantity}锛塦)
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
        remark: `璁㈠崟瑙ｉ攣 ${dto.quantity} 浠禶,
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
      if (!inv) throw new NotFoundException('搴撳瓨璁板綍涓嶅瓨鍦?)

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
        remark: dto.remark || `鐩樼偣璋冩暣锛?{before} 鈫?${dto.newQuantity}`,
      })

      return inv
    })
  }
}
