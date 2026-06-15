/**
 * 秒镜科技 · ERDL — MCP Server 桩
 *
 * @file MCP Server Controller — 标准 Model Context Protocol 接口
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-01
 * @license BSL-1.1
 *
 * 基于 MCP 协议 2025 规范（modelcontextprotocol.io）
 * 传输方式：HTTP + SSE（适配 NestJS）
 *
 * 暴露能力：
 * - Tools: 定价计算、订单同步、商品查询、库存同步
 * - Resources: 平台订单/商品只读视图
 * - Prompts: 预置业务指令模板
 *
 * 安全设计：
 * - API Key 认证（X-MCP-Api-Key Header）
 * - 按 appKey 限流
 * - 敏感操作记录审计日志
 */

import { Controller, Get, Post, Body, Headers, HttpException, HttpStatus, UseGuards, Logger } from '@nestjs/common'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { ERDLRuleEngine } from '../core/erdl-rule-engine'
import { ERDLRegistry } from '../core/erdl-registry'

// ============================================
// MCP 协议类型
// ============================================

/** JSON-RPC 2.0 请求 */
interface McpRequest {
  jsonrpc: '2.0'
  id: number | string
  method: string
  params?: Record<string, unknown>
}

/** JSON-RPC 2.0 响应 */
interface McpResponse {
  jsonrpc: '2.0'
  id: number | string
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

/** MCP Tool 定义 */
interface McpTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, { type: string; description: string; enum?: string[] }>
    required: string[]
  }
}

/** MCP Resource 定义 */
interface McpResource {
  uri: string
  name: string
  description: string
  mimeType?: string
}

// ============================================
// 内置 MCP Tools
// ============================================

const MCP_TOOLS: McpTool[] = [
  {
    name: 'calculatePrice',
    description: '计算商品价格（基于秒镜定价引擎 + ERDL 规则）',
    inputSchema: {
      type: 'object',
      properties: {
        skuId: { type: 'string', description: 'SKU ID' },
        customerType: { type: 'string', description: '客户类型', enum: ['retail', 'business', 'partner'] },
        quantity: { type: 'number', description: '购买数量' },
        customerId: { type: 'string', description: '客户 ID（可选）' },
      },
      required: ['skuId', 'quantity'],
    },
  },
  {
    name: 'syncOrders',
    description: '从外部平台同步订单到秒镜 ERP（支持淘宝/京东/抖音）',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', description: '平台标识', enum: ['taobao', 'jd', 'douyin', 'pinduoduo'] },
        startTime: { type: 'string', description: '开始时间 ISO 8601' },
        endTime: { type: 'string', description: '结束时间 ISO 8601' },
        status: { type: 'string', description: '订单状态过滤（可选）' },
      },
      required: ['platform', 'startTime', 'endTime'],
    },
  },
  {
    name: 'syncInventory',
    description: '同步库存到外部平台',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', description: '目标平台', enum: ['taobao', 'jd', 'douyin', 'pinduoduo'] },
        skuId: { type: 'string', description: 'SKU ID' },
        quantity: { type: 'number', description: '库存数量' },
      },
      required: ['platform', 'skuId', 'quantity'],
    },
  },
  {
    name: 'pushShipment',
    description: '发货后回传物流单号到外部平台',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', description: '目标平台', enum: ['taobao', 'jd', 'douyin', 'pinduoduo'] },
        orderId: { type: 'string', description: '秒镜订单 ID' },
        trackingNo: { type: 'string', description: '物流单号' },
        logisticsCompany: { type: 'string', description: '物流公司编码' },
      },
      required: ['platform', 'orderId', 'trackingNo'],
    },
  },
  {
    name: 'queryAfterSales',
    description: '查询外部平台的售后/退款单',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', description: '平台标识', enum: ['taobao', 'jd', 'douyin', 'pinduoduo'] },
        status: { type: 'string', description: '售后状态过滤（可选）' },
        startTime: { type: 'string', description: '开始时间' },
        endTime: { type: 'string', description: '结束时间' },
      },
      required: ['platform'],
    },
  },
  {
    name: 'queryERDL',
    description: '查询 ERDL 规则空间状态',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'LLM 自然语言业务查询' },
        namespaces: {
          type: 'string',
          description: '命名空间过滤（逗号分隔，可选）',
        },
      },
      required: ['query'],
    },
  },
]

const MCP_RESOURCES: McpResource[] = [
  {
    uri: 'platform://{platform}/orders',
    name: '外部平台订单',
    description: '从外部平台同步的订单数据（只读）',
    mimeType: 'application/json',
  },
  {
    uri: 'platform://{platform}/products',
    name: '外部平台商品',
    description: '从外部平台同步的商品数据（只读）',
    mimeType: 'application/json',
  },
  {
    uri: 'erdl://registry/entities',
    name: 'ERDL Entity 注册表',
    description: '当前系统中所有 ERDL Entity 定义',
    mimeType: 'application/json',
  },
  {
    uri: 'erdl://registry/rules',
    name: 'ERDL 规则注册表',
    description: '当前系统中所有激活的 ERDL 规则',
    mimeType: 'application/json',
  },
]

// ============================================
// MCP Server Controller
// ============================================

@Controller('mcp')
@UseGuards(JwtAuthGuard)
export class McpServerController {
  private readonly logger = new Logger(McpServerController.name)

  constructor(
    private readonly ruleEngine: ERDLRuleEngine,
    private readonly registry: ERDLRegistry,
  ) {}

  /**
   * MCP JSON-RPC 入口
   *
   * @api POST /api/mcp
   * @description 标准 MCP JSON-RPC 2.0 端点
   */
  @Post()
  async handleRequest(
    @Body() body: McpRequest,
    @Headers('x-mcp-api-key') apiKey?: string,
  ): Promise<McpResponse> {
    // 安全校验
    this.validateAuth(apiKey)

    const { id, method, params } = body

    try {
      switch (method) {
        case 'tools/list':
          return this.response(id, { tools: MCP_TOOLS })

        case 'tools/call':
          return this.response(id, await this.handleToolCall(params))

        case 'resources/list':
          return this.response(id, { resources: MCP_RESOURCES })

        case 'resources/read':
          return this.response(id, await this.handleResourceRead(params))

        case 'initialize':
          return this.response(id, {
            protocolVersion: '2025-03-26',
            serverInfo: {
              name: '秒镜 ERP MCP Server',
              version: '1.0.0',
            },
            capabilities: {
              tools: {},
              resources: {},
              prompts: {},
            },
          })

        default:
          return this.error(id, -32601, `Method not found: ${method}`)
      }
    } catch (error) {
      if (error instanceof HttpException) throw error
      return this.error(
        id,
        -32603,
        error instanceof Error ? error.message : 'Internal error',
      )
    }
  }

  /**
   * GET 端点：MCP Server 元信息（工具发现）
   */
  @Get()
  getCapabilities() {
    return {
      protocol: 'mcp',
      version: '2025-03-26',
      server: '秒镜 ERP MCP Server',
      transport: 'http',
      endpoint: '/api/mcp',
      auth: 'X-MCP-Api-Key header',
      tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description })),
      resources: MCP_RESOURCES.map((r) => ({ uri: r.uri, name: r.name })),
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  /** API Key 验证 — P0修复：未配置KEY时拒绝所有请求，防止生产环境漏配导致端点暴露 */
  private validateAuth(apiKey?: string): void {
    const validKey = process.env.MCP_API_KEY
    if (!validKey) {
      throw new HttpException('MCP service not configured — missing MCP_API_KEY', HttpStatus.SERVICE_UNAVAILABLE)
    }
    if (!apiKey || apiKey !== validKey) {
      throw new HttpException('Unauthorized: Invalid or missing MCP API Key', HttpStatus.UNAUTHORIZED)
    }
  }

  /** 构建 JSON-RPC 成功响应 */
  private response(id: number | string, result: unknown): McpResponse {
    return { jsonrpc: '2.0', id, result }
  }

  /** 构建 JSON-RPC 错误响应 */
  private error(id: number | string, code: number, message: string): McpResponse {
    return { jsonrpc: '2.0', id, error: { code, message } }
  }

  /** 执行 Tool 调用 */
  private async handleToolCall(params?: Record<string, unknown>): Promise<unknown> {
    if (!params?.name) {
      throw new Error("Missing required param: 'name'")
    }

    const toolName = params.name as string
    const toolArgs = (params.arguments as Record<string, unknown>) || {}

    this.logToolCall(toolName, toolArgs)

    switch (toolName) {
      case 'calculatePrice':
        return this.ruleEngine.evaluate('Product.price.calculate', toolArgs)

      case 'syncOrders':
        return this.platformStub('syncOrders', toolArgs)

      case 'syncInventory':
        return this.platformStub('syncInventory', toolArgs)

      case 'pushShipment':
        return this.platformStub('pushShipment', toolArgs)

      case 'queryAfterSales':
        return this.platformStub('queryAfterSales', toolArgs)

      case 'queryERDL':
        return {
          entities: this.registry.getAllEntities().length,
          stats: this.registry.getStats(),
        }

      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }
  }

  /** 读取 Resource */
  private async handleResourceRead(params?: Record<string, unknown>): Promise<unknown> {
    const uri = params?.uri as string
    if (!uri) throw new Error("Missing required param: 'uri'")

    if (uri.startsWith('erdl://registry/')) {
      if (uri.includes('entities')) {
        return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(this.registry.getAllEntities()) }] }
      }
      if (uri.includes('rules')) {
        return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(this.registry.getStats()) }] }
      }
    }

    return this.platformStub('resourceRead', { uri })
  }

  /**
   * 平台适配器桩（Stub）
   *
   * 实际平台对接在联调阶段通过 ERDL Skill 实现。
   * 当前返回桩数据，保持接口契约稳定。
   */
  private platformStub(operation: string, args: Record<string, unknown>): Record<string, unknown> {
    const platform = (args.platform as string) || 'unknown'
    return {
      status: 'stub',
      message: `Platform adapter for '${platform}' not yet implemented (${operation}). Use ERDL Skill to define platform integration.`,
      operation,
      platform,
      args,
      timestamp: Date.now(),
    }
  }

  /** 审计日志 — P2修复：使用 NestJS Logger 替代 console.log */
  private logToolCall(toolName: string, args: Record<string, unknown>): void {
    const safeArgs = { ...args }
    // 脱敏：不记录敏感字段
    delete safeArgs.apiKey
    delete safeArgs.token
    delete safeArgs.password
    this.logger.log(`[MCP] Tool called: ${toolName} ${JSON.stringify(safeArgs).substring(0, 200)}`)
  }
}
