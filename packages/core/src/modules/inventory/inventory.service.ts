/**
 * Inventory Engine Stub — 库存管理引擎桩
 *
 * 引擎层提供标准接口，行业模块覆盖完整库存逻辑。
 *
 * @file inventory.service.ts
 * @module inventory (engine stub)
 * @since 2026-06-01
 */

import { Injectable, Logger } from '@nestjs/common'

export interface InventoryDocument {
  id: string
  docNo: string
  status: string
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name)

  async findDocuments(filter: { status?: string }): Promise<{ items: InventoryDocument[]; total: number }> {
    this.logger.warn('[ENGINE STUB] InventoryService.findDocuments - 行业模块未注册')
    return { items: [], total: 0 }
  }

  async confirmDocument(id: string, confirmedBy: string): Promise<void> {
    this.logger.warn('[ENGINE STUB] InventoryService.confirmDocument - 行业模块未注册')
  }
}
