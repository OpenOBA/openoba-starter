import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { CategoryService } from './category.service'
import { CreateCategoryDto, UpdateCategoryDto, BatchSortDto } from './category.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('分类管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin', 'operator')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({ summary: '分类列表（树形）' })
  @Get()
  async findAll() {
    return this.categoryService.findTree()
  }

  @ApiOperation({ summary: '分类列表（扁平）' })
  @Get('flat')
  async findAllFlat() {
    return this.categoryService.findAll()
  }

  @ApiOperation({ summary: '分类详情' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id)
  }

  @ApiOperation({ summary: '创建分类' })
  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto)
  }

  @ApiOperation({ summary: '更新分类' })
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto)
  }

  @ApiOperation({ summary: '删除分类' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.categoryService.remove(id)
  }

  @ApiOperation({ summary: '批量排序' })
  @Post('sort')
  async batchSort(@Body() dto: BatchSortDto) {
    return this.categoryService.batchSort(dto.orderedIds)
  }
}
