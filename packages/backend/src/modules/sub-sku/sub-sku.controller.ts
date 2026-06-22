import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger'
import { SubSkuService } from './sub-sku.service'
import {
  CreateSubSkuDto,
  UpdateSubSkuDto,
  CreateSubSkuCategoryDto,
  UpdateSubSkuCategoryDto,
  QuerySubSkuDto,
} from './dto/sub-sku.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('副品管理 (S-SKU)')
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin', 'operator')
@Controller('sub-skus')
export class SubSkuController {
  constructor(private readonly service: SubSkuService) {}

  // ============ 分类 ============

  @Get('categories')
  @ApiOperation({ summary: '获取分类列表（平铺）' })
  getAllCategories() {
    return this.service.getAllCategories()
  }

  @Get('categories/tree')
  @ApiOperation({ summary: '获取分类树' })
  getCategoryTree() {
    return this.service.getCategoryTree()
  }

  @Post('categories')
  @ApiOperation({ summary: '新增分类' })
  createCategory(@Body() dto: CreateSubSkuCategoryDto) {
    return this.service.createCategory(dto)
  }

  @Put('categories/:id')
  @ApiOperation({ summary: '更新分类' })
  @ApiParam({ name: 'id' })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateSubSkuCategoryDto) {
    return this.service.updateCategory(id, dto)
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: '删除分类（软删除）' })
  @ApiParam({ name: 'id' })
  deleteCategory(@Param('id') id: string) {
    return this.service.deleteCategory(id)
  }

  // ============ S-SKU ============

  @Get()
  @ApiOperation({ summary: '查询副品列表' })
  findAll(@Query() query: QuerySubSkuDto) {
    return this.service.findAll(query)
  }

  @Get(':id')
  @ApiOperation({ summary: '查询副品详情' })
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: '新增副品' })
  create(@Body() dto: CreateSubSkuDto) {
    return this.service.create(dto)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新副品' })
  @ApiParam({ name: 'id' })
  update(@Param('id') id: string, @Body() dto: UpdateSubSkuDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: '下架副品（软删除）' })
  @ApiParam({ name: 'id' })
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }

  // ============ 工具 ============

  @Post('generate-name')
  @ApiOperation({ summary: '根据规格参数生成展示名' })
  generateName(@Body() dto: CreateSubSkuDto) {
    return this.service.generateDisplayName(dto)
  }
}
