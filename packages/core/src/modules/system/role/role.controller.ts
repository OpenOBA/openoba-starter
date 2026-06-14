import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { RoleService, CreateRoleDto, UpdateRoleDto } from './role.service'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('系统管理 - 角色')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin')
@Controller('system/roles')
export class RoleController {
  constructor(private roleService: RoleService) {}

  @Get()
  @ApiOperation({ summary: '角色列表' })
  async findAll() {
    return this.roleService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: '角色详情（含权限列表）' })
  async findOne(@Param('id') id: string) {
    return this.roleService.findOneWithPermissions(id)
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: '获取角色权限列表' })
  async getPermissions(@Param('id') id: string) {
    return this.roleService.getPermissions(id)
  }

  @Post()
  @ApiOperation({ summary: '创建角色（可同时分配权限）' })
  async create(@Body() dto: CreateRoleDto) {
    return this.roleService.create(dto)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新角色（含权限重分配）' })
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.roleService.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除角色' })
  async remove(@Param('id') id: string) {
    return this.roleService.softDelete(id)
  }
}
