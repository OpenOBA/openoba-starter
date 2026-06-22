/**
 * OpenOBA · 订单域 Tool 注册（行业模块 → Core ToolRegistry 桥接）
 *
 * @file 5 个订单 Tool：create / search / pay / cancel / detail
 */

import { ToolRegistry } from '@openoba/core/dist/modules/tool-registry/tool-registry.service'
import { OrderService } from '../../order/order.service'
import type { CreateOrderDto } from '../../order/dto/order.dto'
import type { ToolResult } from '@openoba/core/dist/modules/tool-registry/types/tool.interface'

export function registerOrderTools(registry: ToolRegistry, orderService: OrderService): void {
  registry.register(
    {
      name: 'order.create',
      description: 'Create a new order. Locks inventory for items, generates order number.',
      domain: 'order',
      inputSchema: {
        type: 'object',
        properties: {
          customerId: { type: 'string', description: 'Customer ID' },
          customerType: { type: 'string', description: 'Customer type', enum: ['retail', 'business', 'partner'] },
          items: {
            type: 'array',
            description: 'Order items',
            items: {
              type: 'object',
              description: 'Order item',
              properties: {
                skuId: { type: 'string', description: 'SKU ID' },
                quantity: { type: 'number', description: 'Quantity' },
              },
              required: ['skuId', 'quantity'],
            },
          },
          remark: { type: 'string', description: 'Order remark' },
        },
        required: ['customerId', 'items'],
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args: Record<string, unknown>): Promise<ToolResult> => {
      const dto: Record<string, unknown> = {
        customerId: args.customerId as string,
        customerName: `Customer-${(args.customerId as string).substring(0, 8)}`,
        customerType: (args.customerType as string) || 'retail',
        items: ((args.items as Array<Record<string, unknown>>) || []).map((item: Record<string, unknown>) => ({
          productType: 'frame',
          productName: `SKU-${item.skuId}`,
          skuId: item.skuId,
          quantity: item.quantity,
          unitPrice: 0,
          structureStandardCode: '',
        })),
        remark: args.remark as string | undefined,
      }
      const order = await orderService.createOrder(dto as unknown as CreateOrderDto)
      return { success: true, data: order }
    },
  )

  registry.register(
    {
      name: 'order.search',
      description: 'Search orders by customer, status, and date range. Returns paginated results.',
      domain: 'order',
      inputSchema: {
        type: 'object',
        properties: {
          customerId: { type: 'string', description: 'Customer ID' },
          status: {
            type: 'string',
            description: 'Order status',
            enum: ['pending', 'paid', 'shipped', 'completed', 'cancelled'],
          },
          startDate: { type: 'string', description: 'Start date YYYY-MM-DD' },
          endDate: { type: 'string', description: 'End date YYYY-MM-DD' },
          page: { type: 'number', description: 'Page number, default 1' },
          pageSize: { type: 'number', description: 'Page size, default 20' },
        },
        required: [],
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args: Record<string, unknown>): Promise<ToolResult> => {
      const result = await orderService.findOrders(args as unknown as Record<string, unknown>)
      return { success: true, data: result }
    },
  )

  registry.register(
    {
      name: 'order.pay',
      description: 'Confirm payment for an order. Updates payment status and locks inventory.',
      domain: 'order',
      inputSchema: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'Order ID' },
          paymentMethod: {
            type: 'string',
            description: 'Payment method',
            enum: ['wechat', 'alipay', 'bank_transfer', 'cash', 'other'],
          },
          amount: { type: 'number', description: 'Payment amount (CNY)' },
          transactionId: { type: 'string', description: 'Transaction ID' },
        },
        required: ['orderId', 'paymentMethod', 'amount'],
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (args: Record<string, unknown>): Promise<ToolResult> => {
      const result = await orderService.createPayment({
        orderId: args.orderId as string,
        paymentMethod: args.paymentMethod as string,
        amount: args.amount as number,
        transactionId: args.transactionId as string | undefined,
      })
      return { success: true, data: result }
    },
  )

  registry.register(
    {
      name: 'order.cancel',
      description: 'Cancel an order. Release locked inventory, set status to cancelled.',
      domain: 'order',
      inputSchema: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'Order ID' },
          remark: { type: 'string', description: 'Cancel reason' },
        },
        required: ['orderId'],
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async (args: Record<string, unknown>): Promise<ToolResult> => {
      const result = await orderService.cancelOrder(args.orderId as string, args.remark as string | undefined, 'agent')
      return { success: true, data: result }
    },
  )

  registry.register(
    {
      name: 'order.detail',
      description: 'Get order details including items, payments, and shipping info.',
      domain: 'order',
      inputSchema: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'Order ID' },
        },
        required: ['orderId'],
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args: Record<string, unknown>): Promise<ToolResult> => {
      const order = await orderService.findOneOrder(args.orderId as string)
      return { success: true, data: order }
    },
  )
}
