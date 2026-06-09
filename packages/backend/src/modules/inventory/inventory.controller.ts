import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { InventoryService } from './inventory.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import {
  CreateInventoryDto,
  UpdateInventoryDto,
  StockInDto,
  StockOutDto,
  LockStockDto,
  UnlockStockDto,
  AdjustStockDto,
  QueryInventoryDto,
  QueryTransactionDto,
} from './dto/inventory.dto'
import { MCPCapable } from '../../common/decorators/mcp-capable.decorator'

@ApiTags('库存管理')
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin', 'operator')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  // ===== 库存查询 =====

  @Get()
  @ApiOperation({ summary: '库存列表' })
  @MCPCapable({ tool: 'inventory.list', description: '查询库存列表（支持分页+筛选）', category: 'inventory', readOnly: true })
  async findAll(@Query() dto: QueryInventoryDto) {
    return this.service.findAll(dto)
  }

  @Get('sku/:sku-id')
  @ApiOperation({ summary: 'SKU 库存详情' })
  @MCPCapable({ tool: 'inventory.bySku', description: '按SKU查询库存详情（当前/锁定/可用数量）', category: 'inventory', readOnly: true })
  async findBySku(@Param('sku-id') skuId: string) {
    return this.service.findBySku(skuId)
  }

  @Get('stats')
  @ApiOperation({ summary: '库存统计' })
  @MCPCapable({ tool: 'inventory.stats', description: '库存汇总统计', category: 'inventory', readOnly: true })
  async getStats() {
    return this.service.getStats()
  }

  // ===== 流水查询 =====

  @Get('transactions')
  @ApiOperation({ summary: '库存流水列表' })
  @MCPCapable({ tool: 'inventory.transactions', description: '查询库存流水记录', category: 'inventory', readOnly: true })
  async findTransactions(@Query() dto: QueryTransactionDto) {
    return this.service.findTransactions(dto)
  }

  // ===== 库存操作 =====

  @Post()
  @ApiOperation({ summary: '创建库存记录' })
  @MCPCapable({ tool: 'inventory.create', description: '创建新SKU库存记录', category: 'inventory' })
  async create(@Body() dto: CreateInventoryDto, @Req() req: any) {
    return this.service.create(dto, req.user?.id)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新库存（预警阈值）' })
  @MCPCapable({ tool: 'inventory.update', description: '更新库存预警阈值等设置', category: 'inventory' })
  async update(@Param('id') id: string, @Body() dto: UpdateInventoryDto) {
    return this.service.update(id, dto)
  }

  @Post('in')
  @ApiOperation({ summary: '入库' })
  @MCPCapable({ tool: 'inventory.stockIn', description: '入库操作', category: 'inventory' })
  async stockIn(@Body() dto: StockInDto, @Req() req: any) {
    return this.service.stockIn(dto, req.user?.id)
  }

  @Post('out')
  @ApiOperation({ summary: '出库' })
  @MCPCapable({ tool: 'inventory.stockOut', description: '出库操作（发货/消耗）', category: 'inventory' })
  async stockOut(@Body() dto: StockOutDto, @Req() req: any) {
    return this.service.stockOut(dto, req.user?.id)
  }

  @Post('lock')
  @ApiOperation({ summary: '锁定库存（下单）' })
  @MCPCapable({ tool: 'inventory.lock', description: '下单时锁定库存', category: 'inventory' })
  async lock(@Body() dto: LockStockDto, @Req() req: any) {
    return this.service.lock(dto, req.user?.id)
  }

  @Post('unlock')
  @ApiOperation({ summary: '解锁库存（取消订单）' })
  @MCPCapable({ tool: 'inventory.unlock', description: '取消订单时释放库存', category: 'inventory' })
  async unlock(@Body() dto: UnlockStockDto, @Req() req: any) {
    return this.service.unlock(dto, req.user?.id)
  }

  @Post('adjust')
  @ApiOperation({ summary: '盘点调整' })
  @MCPCapable({ tool: 'inventory.adjust', description: '盘点/手动调整库存数量', category: 'inventory' })
  async adjust(@Body() dto: AdjustStockDto, @Req() req: any) {
    return this.service.adjust(dto, req.user?.id)
  }

  @Delete('transactions/clean')
  @ApiOperation({ summary: '清理过期流水' })
  @MCPCapable({ tool: 'inventory.cleanTransactions', description: '清理旧库存流水（默认90天前）', category: 'inventory' })
  async cleanOld(@Query('days') days?: string) {
    return this.service.cleanOldTransactions(days ? parseInt(days) : 90)
  }
}
