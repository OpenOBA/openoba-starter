/**
 * Inventory Engine Stub Module
 *
 * @file inventory.module.ts
 * @since 2026-06-01
 */

import { Module } from '@nestjs/common'
import { InventoryService } from './inventory.service'

@Module({
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
