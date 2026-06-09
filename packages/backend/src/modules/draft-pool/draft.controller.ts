/**
 * 通用草稿池 Controller
 *
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-18
 */

import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { DraftService } from './draft.service'
import {
  CreateDraftDto, UpdateDraftDto, UpdateDraftStatusDto, PublishDraftDto, QueryDraftDto,
} from './dto/draft.dto'

@ApiTags('通用草稿池')
@UseGuards(JwtAuthGuard)
@Controller('drafts')
export class DraftController {
  constructor(private readonly service: DraftService) {}

  @Post()
  @ApiOperation({ summary: '创建草稿' })
  async create(@Body() dto: CreateDraftDto) {
    return this.service.create(dto)
  }

  @Get()
  @ApiOperation({ summary: '草稿列表（分页+筛选）' })
  @ApiQuery({ name: 'draftType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'sourceTaskId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async query(@Query() q: QueryDraftDto) {
    return this.service.query(q)
  }

  @Get('stats')
  @ApiOperation({ summary: '草稿池统计' })
  async getStats() {
    return this.service.getStats()
  }

  @Get(':id')
  @ApiOperation({ summary: '草稿详情' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Put(':id')
  @ApiOperation({ summary: '编辑草稿' })
  async update(@Param('id') id: string, @Body() dto: UpdateDraftDto) {
    return this.service.update(id, dto)
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '变更草稿状态' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateDraftStatusDto) {
    return this.service.updateStatus(id, dto)
  }

  @Post(':id/publish')
  @ApiOperation({ summary: '发布草稿' })
  async publish(@Param('id') id: string, @Body() dto: PublishDraftDto) {
    return this.service.publish(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除草稿（软删除）' })
  async remove(@Param('id') id: string) {
    await this.service.softDelete(id)
    return { deleted: true }
  }
}
