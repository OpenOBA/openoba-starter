/* eslint-disable @typescript-eslint/no-explicit-any -- CORE 泛型/第三方库约束 */
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { Roles } from '../../../common/decorators/roles.decorator'
import { DeliverableService, CreateDeliverableOptions } from './deliverable.service'

@ApiTags('ERA · 交付物管理')
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin', 'operator')
@Controller('eros/deliverables')
export class DeliverableController {
  constructor(private readonly service: DeliverableService) {}

  @Post()
  @ApiOperation({ summary: '创建新版本交付物' })
  async create(@Body() dto: CreateDeliverableOptions & { rootDir: string }) {
    return this.service.createDeliverable(dto)
  }

  @Get('index')
  @ApiOperation({ summary: '获取交付物总索引' })
  @ApiQuery({ name: 'rootDir', required: true, description: '工作区根目录' })
  async getIndex(@Query('rootDir') rootDir: string) {
    return this.service.getIndex(rootDir)
  }

  @Get('query')
  @ApiOperation({ summary: '查询交付物列表（分页）' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async query(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.service.queryIndex(Number(page) || 1, Number(pageSize) || 20)
  }

  @Get(':taskId/versions')
  @ApiOperation({ summary: '获取某任务的所有交付版本' })
  async getVersions(@Param('taskId') taskId: string) {
    return this.service.getVersions(taskId)
  }

  @Get(':taskId/latest')
  @ApiOperation({ summary: '获取某任务的最新交付版本' })
  async getLatest(@Param('taskId') taskId: string) {
    return this.service.getLatest(taskId)
  }

  @Put(':id/status')
  @ApiOperation({ summary: '更新交付物状态' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; approvedBy?: string },
  ) {
    return this.service.updateStatus(id, undefined, body.approvedBy)
  }

  @Delete(':id')
  @ApiOperation({ summary: '归档交付物（软删除）' })
  async archive(@Param('id') id: string) {
    return this.service.archive(id)
  }
}
