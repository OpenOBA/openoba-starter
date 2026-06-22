/**
 * OpenOBA · Inventory Domain Tool Registration
 */

import { ToolRegistry } from '@openoba/core/dist/modules/tool-registry/tool-registry.service'
import { InventoryService } from '../../inventory/inventory.service'
import type { Inventory } from '../../inventory/entity/inventory.entity'
import type { ToolResult } from '@openoba/core/dist/modules/tool-registry/types/tool.interface'

export function registerInventoryTools(registry: ToolRegistry, inventoryService: InventoryService): void {
  registry.register(
    {
      name: 'inventory.check',
      description: 'Query inventory info for a SKU. Returns current, available, locked, and warning quantities.',
      domain: 'inventory',
      inputSchema: {
        type: 'object',
        properties: {
          skuId: { type: 'string', description: 'SKU ID' },
          skuCode: { type: 'string', description: 'SKU code (alternative to skuId)' },
          warehouseCode: { type: 'string', description: 'Warehouse code, default WH-MAIN' },
        },
        required: [],
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args: Record<string, unknown>): Promise<ToolResult> => {
      const warehouse = (args.warehouseCode as string) || 'WH-MAIN'
      if (args.skuId) {
        const inv = await inventoryService.findBySku(args.skuId as string, warehouse)
        return { success: true, data: inv }
      }
      if (args.skuCode) {
        const inv = await inventoryService.findBySkuCode(args.skuCode as string, warehouse)
        return { success: true, data: inv }
      }
      const result = await inventoryService.findAll({ page: 1, pageSize: 20 })
      return { success: true, data: result }
    },
  )

  registry.register(
    {
      name: 'inventory.lock',
      description: 'Lock inventory quantity for a SKU. Used during order confirmation.',
      domain: 'inventory',
      inputSchema: {
        type: 'object',
        properties: {
          skuId: { type: 'string', description: 'SKU ID' },
          quantity: { type: 'number', description: 'Quantity to lock' },
          referenceType: {
            type: 'string',
            description: 'Business reference type',
            enum: ['order', 'manual', 'transfer'],
          },
          referenceId: { type: 'string', description: 'Business reference ID' },
        },
        required: ['skuId', 'quantity', 'referenceId'],
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args: Record<string, unknown>): Promise<ToolResult> => {
      const result = await inventoryService.lock(
        {
          skuId: args.skuId as string,
          quantity: args.quantity as number,
          orderId: (args.referenceId as string) || `agent-${Date.now()}`,
        },
        'agent',
      )
      return { success: true, data: result }
    },
  )

  registry.register(
    {
      name: 'inventory.alert',
      description: 'Check inventory alerts. Returns SKUs below warning threshold.',
      domain: 'inventory',
      inputSchema: {
        type: 'object',
        properties: {
          minQuantity: { type: 'number', description: 'Minimum quantity threshold' },
        },
        required: [],
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args: Record<string, unknown>): Promise<ToolResult> => {
      const minQty = args.minQuantity as number | undefined
      const listResult = await inventoryService.findAll({ page: 1, pageSize: 100, warningOnly: 'true' })
      if (minQty) {
        listResult.items = listResult.items.filter((item: Inventory) => (item.availableQuantity ?? 0) <= minQty)
      }
      return {
        success: true,
        data: {
          alertCount: listResult.items.length,
          items: listResult.items.map((item: Inventory) => ({
            skuId: item.skuId,
            skuCode: item.skuCode,
            available: item.availableQuantity,
            locked: item.lockedQuantity,
            warning: item.warningQuantity,
          })),
        },
      }
    },
  )
}
