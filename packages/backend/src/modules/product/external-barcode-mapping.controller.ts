import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ExternalBarcodeMappingService } from './external-barcode-mapping.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('外部条码映射')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('product/external-barcodes')
export class ExternalBarcodeMappingController {
  constructor(private readonly service: ExternalBarcodeMappingService) {}

  @ApiOperation({ summary: '外部条码映射列表' })
  @Get()
  async list(@Query() q: Record<string, unknown>) {
    return this.service.findAll(q)
  }

  @ApiOperation({ summary: '外部条码映射详情' })
  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @ApiOperation({ summary: '根据外部条码查找' })
  @Get('lookup/:barcode')
  async lookup(@Param('barcode') barcode: string) {
    return this.service.findByBarcode(barcode)
  }

  @ApiOperation({ summary: '创建外部条码映射' })
  @Post()
  async create(@Body() dto: Record<string, unknown>) {
    return this.service.create(dto)
  }

  @ApiOperation({ summary: '更新外部条码映射' })
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.update(id, dto)
  }

  @ApiOperation({ summary: '删除外部条码映射' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.delete(id)
  }
}
