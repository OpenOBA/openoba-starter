import { Module, OnModuleInit } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Inventory } from './entity/inventory.entity'
import { InventoryTransaction } from './entity/inventory-transaction.entity'
import { InventoryDocument } from './entity/inventory-document.entity'
import { InventoryService } from './inventory.service'
import { InventoryController } from './inventory.controller'
import { ToolRegistry } from '@openoba/core/dist/modules/tool-registry/tool-registry.service'
import { registerInventoryTools } from '../tool-registry/tools/inventory.tools'

@Module({
  imports: [TypeOrmModule.forFeature([Inventory, InventoryTransaction, InventoryDocument])],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
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
