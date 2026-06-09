import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { DraftPoolService } from './draft-pool.service'
import {
  CreateDraftSpuDto,
  UpdateDraftSpuDto,
  ReviewDraftDto,
  PublishDraftDto,
  PromoteToProductDto,
  QueryDraftDto,
  CreateAdvisoryReportDto,
} from './dto/draft-pool.dto'

@Controller('draft-pool')
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin')
export class DraftPoolController {
  constructor(private readonly service: DraftPoolService) {}

  // ========== Draft SPU CRUD ==========
  @Post('drafts')
  create(@Body() dto: CreateDraftSpuDto) {
    return this.service.createDraftSpu(dto)
  }

  @Get('drafts')
  query(@Query() query: QueryDraftDto) {
    return this.service.queryDrafts(query)
  }

  @Get('drafts/waitlist-count')
  getWaitlistCount() {
    return this.service.getWaitlistCount()
  }

  @Get('drafts/:id')
  getDetail(@Param('id') id: string) {
    return this.service.getDraftDetail(id)
  }

  @Put('drafts/:id')
  update(@Param('id') id: string, @Body() dto: UpdateDraftSpuDto) {
    return this.service.updateDraft(id, dto)
  }

  @Delete('drafts/:id')
  delete(@Param('id') id: string) {
    return this.service.deleteDraft(id)
  }

  // ========== Review ==========
  @Post('drafts/:id/review')
  review(@Param('id') id: string, @Body() dto: ReviewDraftDto) {
    return this.service.reviewDraft(id, dto)
  }

  // ========== Publish / Promote to Product ==========
  @Post('promote')
  promoteToProduct(@Body() dto: PromoteToProductDto) {
    return this.service.promoteDraftsToProducts(dto)
  }

  @Get('pending-promotion')
  getPendingPromotion() {
    return this.service.getPendingPromotion()
  }

  @Post('publish')
  publish(@Body() dto: PublishDraftDto) {
    return this.service.publishDrafts(dto)
  }

  @Get('packages')
  getPackages() {
    return this.service.queryPackages()
  }

  // ========== Batches ==========
  @Post('batches')
  createBatch(@Body('name') name: string, @Body('type') type?: string) {
    return this.service.createBatch(name, type)
  }

  @Post('batches/:id/complete')
  completeBatch(@Param('id') id: string) {
    return this.service.completeBatch(id)
  }

  @Get('batches')
  getBatches() {
    return this.service.queryBatches()
  }

  // ========== Advisory Reports ==========
  @Post('reports')
  createReport(@Body() dto: CreateAdvisoryReportDto) {
    return this.service.createReport(dto)
  }

  @Get('reports')
  getReports() {
    return this.service.queryReports()
  }

  // ========== Agent Tasks ==========
  @Get('tasks')
  getTasks(@Query('taskType') taskType?: string, @Query('status') status?: string) {
    return this.service.queryTasks(taskType, status)
  }
}
