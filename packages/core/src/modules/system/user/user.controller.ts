import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { UserService } from './user.service'
import { CreateUserDto, UpdateUserDto, ChangePasswordDto, ResetPasswordDto, UserQueryDto } from './dto/user.dto'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { Roles } from '../../../common/decorators/roles.decorator';

interface JwtRequest extends Request {
  user: { userId: string; username: string }
}

@ApiTags('系统管理 - 用户')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin')
@Controller('system/users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @ApiOperation({ summary: '用户列表（分页）' })
  async findAll(@Query() q: UserQueryDto) {
    return this.userService.findAll(q.page || 1, q.pageSize || 20, q.keyword, q.status)
  }

  @Get(':id')
  @ApiOperation({ summary: '用户详情' })
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: '创建用户' })
  async create(@Request() req: JwtRequest, @Body() dto: CreateUserDto) {
    return this.userService.create(dto, req.user.userId)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新用户' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除用户（软删除）' })
  async remove(@Param('id') id: string) {
    return this.userService.softDelete(id)
  }

  @Put(':id/toggle-status')
  @ApiOperation({ summary: '启用/禁用用户' })
  async toggleStatus(@Param('id') id: string) {
    return this.userService.toggleStatus(id)
  }

  @Post('change-password')
  @ApiOperation({ summary: '修改自己的密码' })
  async changePassword(@Request() req: JwtRequest, @Body() dto: ChangePasswordDto) {
    return this.userService.changePassword(req.user.userId, dto)
  }

  @Post('reset-password')
  @ApiOperation({ summary: '管理员重置用户密码' })
  async resetPassword(@Request() req: JwtRequest, @Body() dto: ResetPasswordDto) {
    return this.userService.resetPassword(req.user.userId, dto.userId, dto.newPassword)
  }
}
