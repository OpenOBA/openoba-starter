import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { OrderService } from './order.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CreateOrderDto, UpdateOrderDto, UpdateOrderStatusDto, CancelOrderDto, CreatePaymentDto, CreateShipmentDto, QueryOrderDto } from './dto/order.dto'
import { MCPCapable } from '../../common/decorators/mcp-capable.decorator'

@ApiTags('订单管理')
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin', 'operator')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiOperation({ summary: '订单列表' })
  @Get()
  @MCPCapable({ tool: 'order.list', description: '查询订单列表（支持分页+筛选）', category: 'order', readOnly: true })
  async orders(@Query() q: QueryOrderDto) {
    return this.orderService.findOrders(q)
  }

  @ApiOperation({ summary: '订单详情' })
  @Get(':id')
  @MCPCapable({ tool: 'order.detail', description: '查询单个订单完整详情', category: 'order', readOnly: true })
  async order(@Param('id') id: string) {
    return this.orderService.findOneOrder(id)
  }

  @ApiOperation({ summary: '创建订单' })
  @Post()
  @MCPCapable({ tool: 'order.create', description: '创建新订单', category: 'order' })
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(dto)
  }

  @ApiOperation({ summary: '更新订单' })
  @Put(':id')
  @MCPCapable({ tool: 'order.update', description: '更新订单基本信息', category: 'order' })
  async updateOrder(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.orderService.updateOrder(id, dto)
  }

  @ApiOperation({ summary: '更新订单状态' })
  @Put(':id/status')
  @MCPCapable({ tool: 'order.updateStatus', description: '更新订单状态（确认/发货/签收等）', category: 'order' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orderService.updateOrderStatus(id, dto)
  }

  @ApiOperation({ summary: '取消订单' })
  @Put(':id/cancel')
  @MCPCapable({ tool: 'order.cancel', description: '取消订单并释放库存', category: 'order' })
  async cancelOrder(@Param('id') id: string, @Body() dto: CancelOrderDto) {
    return this.orderService.cancelOrder(id, dto.remark, dto.operator)
  }

  @ApiOperation({ summary: '删除订单' })
  @Delete(':id')
  @MCPCapable({ tool: 'order.delete', description: '软删除订单', category: 'order' })
  async deleteOrder(@Param('id') id: string) {
    return this.orderService.deleteOrder(id)
  }

  @ApiOperation({ summary: '订单统计' })
  @Get('stats/overview')
  @MCPCapable({ tool: 'order.stats', description: '订单关键统计指标', category: 'order', readOnly: true })
  async stats() {
    return this.orderService.getStats()
  }

  // ===== 支付 =====
  @ApiOperation({ summary: '订单支付记录' })
  @Get(':id/payments')
  @MCPCapable({ tool: 'order.payments', description: '查询订单支付记录', category: 'order', readOnly: true })
  async payments(@Param('id') id: string) {
    return this.orderService.getOrderPayments(id)
  }

  @ApiOperation({ summary: '创建支付记录' })
  @Post('payments')
  @MCPCapable({ tool: 'order.createPayment', description: '创建支付记录（标记已付款）', category: 'order' })
  async createPayment(@Body() dto: CreatePaymentDto) {
    return this.orderService.createPayment(dto)
  }

  // ===== 发货 =====
  @ApiOperation({ summary: '订单发货记录' })
  @Get(':id/shipments')
  @MCPCapable({ tool: 'order.shipments', description: '查询订单发货记录', category: 'order', readOnly: true })
  async shipments(@Param('id') id: string) {
    return this.orderService.getOrderShipments(id)
  }

  @ApiOperation({ summary: '创建发货记录' })
  @Post('shipments')
  @MCPCapable({ tool: 'order.createShipment', description: '创建发货记录', category: 'order' })
  async createShipment(@Body() dto: CreateShipmentDto) {
    return this.orderService.createShipment(dto)
  }

  // ===== 日志 =====
  @ApiOperation({ summary: '订单操作日志' })
  @Get(':id/logs')
  @MCPCapable({ tool: 'order.logs', description: '查询订单操作日志', category: 'order', readOnly: true })
  async logs(@Param('id') id: string) {
    return this.orderService.getOrderLogs(id)
  }
}
