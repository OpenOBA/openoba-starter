import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { MenuService, CreateMenuDto, UpdateMenuDto } from './menu.service'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { Roles } from '../../../common/decorators/roles.decorator'

@ApiTags('系统管理 - 菜单')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin')
@Controller('system/menus')
export class MenuController {
  constructor(private menuService: MenuService) {}

  @Get('tree')
  @ApiOperation({ summary: '菜单树' })
  async findTree() {
    return this.menuService.findTree()
  }

  @Get()
  @ApiOperation({ summary: '菜单列表（平铺）' })
  async findAll() {
    return this.menuService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: '菜单详情' })
  async findOne(@Param('id') id: string) {
    return this.menuService.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: '创建菜单' })
  async create(@Body() dto: CreateMenuDto) {
    return this.menuService.create(dto)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新菜单' })
  async update(@Param('id') id: string, @Body() dto: UpdateMenuDto) {
    return this.menuService.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除菜单（软删除）' })
  async remove(@Param('id') id: string) {
    return this.menuService.softDelete(id)
  }

  @Put('sort/batch')
  @ApiOperation({ summary: '批量更新排序' })
  async updateSort(@Body() items: { menuId: string; sortOrder: number }[]) {
    return this.menuService.updateSort(items)
  }
}
