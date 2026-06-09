import { Controller, Post, Get, Param, Query, Body, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { AestheticsService } from './aesthetics.service'
import { AestheticCheckDto, AestheticFeedbackDto, AestheticBatchCheckDto } from './dto/aesthetics.dto'

@Controller('aesthetics')
@UseGuards(JwtAuthGuard)
export class AestheticsController {
  constructor(private readonly service: AestheticsService) {}

  @Post('check')
  async check(@Body() dto: AestheticCheckDto) {
    return this.service.check(dto)
  }

  @Post('batch-check')
  async batchCheck(@Body() dto: AestheticBatchCheckDto) {
    return this.service.batchCheck(dto)
  }

  @Post('feedback')
  async feedback(@Body() dto: AestheticFeedbackDto) {
    await this.service.recordFeedback(dto)
    return { success: true }
  }

  @Get('rules')
  async getRules() {
    return this.service.getRules()
  }

  @Get('matrices')
  async getMatrices(@Query('type') type?: string) {
    return this.service.getMatrices(type)
  }

  @Get('matrices/:type')
  async getMatricesByType(@Param('type') type: string) {
    return this.service.getMatrices(type)
  }
}
