import { Module, OnModuleInit } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Inventory } from './entity/inventory.entity'
import { InventoryTransaction } from './entity/inventory-transaction.entity'
import { InventoryDocument } from './entity/inventory-document.entity'
import { InventoryService } from './inventory.service'
import { InventoryQueryService } from './inventory-query.service'
import { InventoryCrudService } from './inventory-crud.service'
import { InventoryStockService } from './inventory-stock.service'
import { InventoryTxService } from './inventory-tx.service'
import { InventoryDocumentService } from './inventory-document.service'
import { InventoryBatchService } from './inventory-batch.service'
import { InventoryController } from './inventory.controller'
import { ToolRegistry } from '@openoba/core/dist/modules/tool-registry/tool-registry.service'
import { registerInventoryTools } from '../tool-registry/tools/inventory.tools'

@Module({
  imports: [TypeOrmModule.forFeature([Inventory, InventoryTransaction, InventoryDocument])],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryQueryService,
    InventoryCrudService,
    InventoryStockService,
    InventoryTxService,
    InventoryDocumentService,
    InventoryBatchService,
  ],
  exports: [InventoryService, InventoryBatchService],
})
export class InventoryModule implements OnModuleInit {
  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly inventoryService: InventoryService,
  ) {}

  onModuleInit() {
    registerInventoryTools(this.toolRegistry, this.inventoryService)
  }
}
