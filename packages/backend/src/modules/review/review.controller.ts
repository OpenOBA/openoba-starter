import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { ReviewService } from './review.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CreateReviewDto, ReviewActionDto, ReplyReviewDto, QueryReviewDto } from './dto/review.dto'
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('用户评价')
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin', 'operator')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // ===== 管理端 =====

  @ApiOperation({ summary: '提交评价' })
  @Post()
  async createReview(@Body() dto: CreateReviewDto) {
    return this.reviewService.createReview(dto)
  }

  @ApiOperation({ summary: '评价列表（管理端）' })
  @Get()
  async reviews(@Query() q: QueryReviewDto) {
    return this.reviewService.findReviews(q)
  }

  @ApiOperation({ summary: '评价详情' })
  @Get(':id')
  async review(@Param('id') id: string) {
    return this.reviewService.findOneReview(id)
  }

  @ApiOperation({ summary: '审核评价' })
  @Post(':id/action')
  async reviewAction(@Param('id') id: string, @Body() dto: ReviewActionDto) {
    return this.reviewService.reviewAction(id, dto)
  }

  @ApiOperation({ summary: '商家回复' })
  @Put(':id/reply')
  async replyReview(@Param('id') id: string, @Body() dto: ReplyReviewDto) {
    return this.reviewService.replyReview(id, dto)
  }

  @ApiOperation({ summary: '标记有用' })
  @Post(':id/helpful')
  async markHelpful(@Param('id') id: string) {
    return this.reviewService.markHelpful(id)
  }

  @ApiOperation({ summary: '删除评价' })
  @Delete(':id')
  async deleteReview(@Param('id') id: string) {
    return this.reviewService.deleteReview(id)
  }

  // ===== 官网端（只读） =====

  @ApiOperation({ summary: 'SPU 评价列表（官网）' })
  @Get('spu/:spu-id')
  async reviewsBySpu(@Param('spu-id') spuId: string, @Query() q: Record<string, string | number>) {
    return this.reviewService.findReviewsBySpu(spuId, q)
  }

  @ApiOperation({ summary: 'SPU 评价统计（官网）' })
  @Get('spu/:spu-id/stats')
  async spuStats(@Param('spu-id') spuId: string) {
    return this.reviewService.getSpuStats(spuId)
  }
}
