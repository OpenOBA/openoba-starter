/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AfterSalesService } from './after-sales.service'
import { CreateAfterSalesDto, ReviewAfterSalesDto, ProcessAfterSalesDto, UpdateAfterSalesDto } from './dto/after-sales.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { MCPCapable } from '../../common/decorators/mcp-capable.decorator'

@ApiTags('售后管理')
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin', 'operator')
@ApiBearerAuth()
@Controller('after-sales')
export class AfterSalesController {
  constructor(private readonly afterSalesService: AfterSalesService) {}

  @Post()
  @ApiOperation({ summary: '创建售后申请' })
  @MCPCapable({ tool: 'aftersales.create', description: '创建售后/退款申请', category: 'aftersales' })
  create(@Body() dto: CreateAfterSalesDto) {
    return this.afterSalesService.create(dto)
  }

  @Get()
  @ApiOperation({ summary: '售后列表（分页+筛选）' })
  @MCPCapable({ tool: 'aftersales.list', description: '查询售后申请列表（支持分页+多条件筛选）', category: 'aftersales', readOnly: true })
  findAll(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('orderId') orderId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('afterSalesType') afterSalesType?: string,
    @Query('afterSalesNo') afterSalesNo?: string,
  ) {
    const filters: Record<string, unknown> = {}
    if (orderId) filters.orderId = orderId
    if (customerId) filters.customerId = customerId
    if (status) filters.status = status
    if (afterSalesType) filters.afterSalesType = afterSalesType
    if (afterSalesNo) filters.afterSalesNo = afterSalesNo
    return this.afterSalesService.findAll(+page, +pageSize, filters)
  }

  @Get('stats')
  @ApiOperation({ summary: '售后统计' })
  @MCPCapable({ tool: 'aftersales.stats', description: '售后统计指标', category: 'aftersales', readOnly: true })
  getStats() {
    return this.afterSalesService.getStats()
  }

  @Get(':id')
  @ApiOperation({ summary: '售后详情' })
  @MCPCapable({ tool: 'aftersales.detail', description: '查询售后申请详情', category: 'aftersales', readOnly: true })
  findOne(@Param('id') id: string) {
    return this.afterSalesService.findOne(id)
  }

  @Get(':id/logs')
  @ApiOperation({ summary: '售后操作日志' })
  @MCPCapable({ tool: 'aftersales.logs', description: '查询售后操作日志', category: 'aftersales', readOnly: true })
  getLogs(@Param('id') id: string) {
    return this.afterSalesService.getLogs(id)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新售后（物流信息等）' })
  @MCPCapable({ tool: 'aftersales.update', description: '更新售后信息（物流/备注等）', category: 'aftersales' })
  update(@Param('id') id: string, @Body() dto: UpdateAfterSalesDto) {
    return this.afterSalesService.update(id, dto)
  }

  @Post(':id/review')
  @ApiOperation({ summary: '审核售后（批准/拒绝）' })
  @MCPCapable({ tool: 'aftersales.review', description: '审核售后申请（批准/拒绝）', category: 'aftersales' })
  review(@Param('id') id: string, @Body() dto: ReviewAfterSalesDto) {
    return this.afterSalesService.review(id, dto)
  }

  @Post(':id/process')
  @ApiOperation({ summary: '流程处理（收货/退款/关闭/重新打开）' })
  @MCPCapable({ tool: 'aftersales.process', description: '售后流程处理（收货/退款/关闭/重开）', category: 'aftersales' })
  process(@Param('id') id: string, @Body() dto: ProcessAfterSalesDto) {
    return this.afterSalesService.process(id, dto)
  }
}
