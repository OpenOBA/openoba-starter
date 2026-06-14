import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { PermissionService } from './permission.service'
import { Permission } from './permission.entity'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('系统管理 - 权限')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin')
@Controller('system/permissions')
export class PermissionController {
  constructor(private permissionService: PermissionService) {}

  @Get()
  @ApiOperation({ summary: '权限列表' })
  async findAll() {
    return this.permissionService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: '权限详情' })
  async findOne(@Param('id') id: string) {
    return this.permissionService.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: '创建权限' })
  async create(@Body() dto: Partial<Permission>) {
    return this.permissionService.create(dto)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新权限' })
  async update(@Param('id') id: string, @Body() dto: Partial<Permission>) {
    return this.permissionService.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除权限（软删除）' })
  async remove(@Param('id') id: string) {
    return this.permissionService.softDelete(id)
  }
}
