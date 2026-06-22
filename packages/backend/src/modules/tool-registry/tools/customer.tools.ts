/**
 * OpenOBA · Customer Domain Tool Registration
 */

import { ToolRegistry } from '@openoba/core/dist/modules/tool-registry/tool-registry.service'
import { CustomerService } from '../../customer/customer.service'
import type { ToolResult } from '@openoba/core/dist/modules/tool-registry/types/tool.interface'

export function registerCustomerTools(registry: ToolRegistry, customerService: CustomerService): void {
  registry.register(
    {
      name: 'customer.profile',
      description: 'Get full customer profile including contact info, structure history, and membership.',
      domain: 'customer',
      inputSchema: {
        type: 'object',
        properties: {
          customerId: { type: 'string', description: 'Customer ID' },
        },
        required: ['customerId'],
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args: Record<string, unknown>): Promise<ToolResult> => {
      const customer = await customerService.findOne(args.customerId as string)
      return { success: true, data: customer }
    },
  )

  registry.register(
    {
      name: 'customer.membership',
      description: 'Query customer membership info including level history and points.',
      domain: 'customer',
      inputSchema: {
        type: 'object',
        properties: {
          customerId: { type: 'string', description: 'Customer ID' },
        },
        required: ['customerId'],
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args: Record<string, unknown>): Promise<ToolResult> => {
      const customerId = args.customerId as string
      const [levelLogs, pointsTxns] = await Promise.all([
        customerService.getMemberLevelLogs(customerId),
        customerService.getPointsTransactions(customerId),
      ])
      return { success: true, data: { customerId, memberLevelLogs: levelLogs, pointsTransactions: pointsTxns } }
    },
  )

  registry.register(
    {
      name: 'customer.list',
      description: 'Search customers by keyword, type, and level. Returns paginated list.',
      domain: 'customer',
      inputSchema: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: 'Search keyword (name/phone/company/email)' },
          customerType: { type: 'string', description: 'Customer type', enum: ['retail', 'business', 'partner'] },
          customerLevel: { type: 'string', description: 'Member level', enum: ['B1', 'B2', 'B3', 'B4', 'B5'] },
          page: { type: 'number', description: 'Page number, default 1' },
          pageSize: { type: 'number', description: 'Page size, default 20' },
        },
        required: [],
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args: Record<string, unknown>): Promise<ToolResult> => {
      const result = await customerService.findAll({
        keyword: args.keyword as string | undefined,
        customerType: args.customerType as string | undefined,
        customerLevel: args.customerLevel as string | undefined,
        page: (args.page as number) || 1,
        pageSize: (args.pageSize as number) || 20,
      })
      return { success: true, data: result }
    },
  )
}
