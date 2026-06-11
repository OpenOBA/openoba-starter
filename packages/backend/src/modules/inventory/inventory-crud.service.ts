import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Inventory } from './entity/inventory.entity'
import { InventoryTransaction, TransactionType } from './entity/inventory-transaction.entity'
import { CreateInventoryDto, UpdateInventoryDto } from './dto/inventory.dto'

/**
 * 库存 CRUD 子 Service
 * 负责：创建库存记录、更新预警阈值
 */
@Injectable()
export class InventoryCrudService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepo: Repository<Inventory>,
    @InjectRepository(InventoryTransaction)
    private transactionRepo: Repository<InventoryTransaction>,
    private dataSource: DataSource,
  ) {}

  async create(dto: CreateInventoryDto, operatorId?: string) {
    const warehouseCode = dto.warehouseCode || 'WH-MAIN'

    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(Inventory, {
        where: { skuId: dto.skuId, warehouseCode },
        lock: { mode: 'pessimistic_write' },
      })
      if (existing) throw new BadRequestException('该 SKU 的库存记录已存在')

      const currentQty = dto.currentQuantity || 0
      const inv = this.inventoryRepo.create({
        id: crypto.randomUUID(),
        skuId: dto.skuId,
        skuCode: dto.skuCode,
        structureStandardCode: dto.structureStandardCode ?? undefined,
        warehouseCode,
        currentQuantity: currentQty,
        availableQuantity: currentQty,
        lockedQuantity: 0,
        warningQuantity: dto.warningQuantity || 10,
      })

      await manager.save(Inventory, inv)
      if (currentQty > 0) {
        await manager.save(InventoryTransaction, {
          id: crypto.randomUUID(),
          skuId: dto.skuId,
          skuCode: dto.skuCode,
          structureStandardCode: dto.structureStandardCode ?? undefined,
          warehouseCode,
          transactionType: TransactionType.INITIAL,
          quantity: currentQty,
          quantityBefore: 0,
          quantityAfter: currentQty,
          referenceType: 'initial',
          operatorId: operatorId ?? undefined,
          remark: '期初导入',
        })
      }
      return inv
    })
  }

  async update(id: string, dto: UpdateInventoryDto) {
    const inv = await this.inventoryRepo.findOne({ where: { id } })
    if (!inv) throw new NotFoundException('库存记录不存在')

    if (dto.warningQuantity !== undefined) inv.warningQuantity = dto.warningQuantity
    return this.inventoryRepo.save(inv)
  }
}
