/**
 * ER-OS Knowledge Controller — 知识库 API
 * 
 * 分两类端点：
 * - /knowledge/*    人类用（CRUD + 标签云）
 * - /knowledge/search  Agent 检索用
 */

import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { KnowledgeService } from './knowledge.service'
import { HotwordService, HotwordEntry } from './hotword.service'

export { HotwordEntry }

@ApiTags('ER-OS · 知识库')
@UseGuards(JwtAuthGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(
    private readonly service: KnowledgeService,
    private readonly hotwords: HotwordService,
  ) {}

  /** Live-ERDL 热词 */
  @Get('hotwords')
  @ApiOperation({ summary: '[Live-ERDL] 实时热词' })
  getHotwords() {
    return this.hotwords.getHotwords()
  }

  // ══════════════════════════════════════
  // 人类操作
  // ══════════════════════════════════════

  @Post()
  @ApiOperation({ summary: '添加知识' })
  create(@Body() body: {
    title: string
    visibility?: string
    type?: string
    tags: string[]
    content: string
    contributor?: string
  }) {
    return this.service.create(undefined
  }

  @Get()
  @ApiOperation({ summary: '知识列表（分页+筛选）' })
  query(@Query() q: Record<string, string | number>) {
    return this.service.query(q)
  }

  @Get('tags')
  @ApiOperation({ summary: '标签云' })
  tagCloud() {
    return this.service.getTagCloud()
  }

  @Get(':id')
  @ApiOperation({ summary: '知识详情' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Put(':id')
  @ApiOperation({ summary: '编辑知识' })
  update(@Param('id') id: string, @Body() body: { title?: string; content?: string; tags?: string[]; visibility?: string; type?: string; contributor?: string }) {
    return this.service.update(id, body as unknown as Record<string, unknown>)
  }

  @Post(':id/archive')
  @ApiOperation({ summary: '归档知识' })
  archive(@Param('id') id: string) {
    return this.service.archive(id)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除知识' })
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }

  // ══════════════════════════════════════
  // Agent 操作
  // ══════════════════════════════════════

  @Get('search/agent')
  @ApiOperation({ summary: 'Agent 按标签检索知识' })
  searchForAgent(@Query('tags') tags: string, @Query('topk') topk?: number) {
    return this.service.searchForAgent({
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      topk: topk ? Number(topk) : 10,
    })
  }

  @Post(':id/cite')
  @ApiOperation({ summary: 'Agent 引用知识（权重+1）' })
  cite(@Param('id') id: string) {
    return this.service.cite(id)
  }
}
