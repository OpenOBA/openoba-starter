import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Inventory } from './entity/inventory.entity'
import { InventoryTransaction, TransactionType } from './entity/inventory-transaction.entity'
import { CreateInventoryDto, UpdateInventoryDto } from './dto/inventory.dto'

/**
 * 搴撳瓨 CRUD 瀛?Service
 * 璐熻矗锛氬垱寤哄簱瀛樿褰曘€佹洿鏂伴璀﹂槇鍊? */
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
      if (existing) throw new BadRequestException('璇?SKU 鐨勫簱瀛樿褰曞凡瀛樺湪')

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
          remark: '鏈熷垵瀵煎叆',
        })
      }
      return inv
    })
  }

  async update(id: string, dto: UpdateInventoryDto) {
    const inv = await this.inventoryRepo.findOne({ where: { id } })
    if (!inv) throw new NotFoundException('搴撳瓨璁板綍涓嶅瓨鍦?)

    if (dto.warningQuantity !== undefined) inv.warningQuantity = dto.warningQuantity
    return this.inventoryRepo.save(inv)
  }
}
