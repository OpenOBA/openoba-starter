import { Controller, Post, Get, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger'
import { CustomerAuthService } from './customer-auth.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('客户官网账户管理（ERP 后台）')
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin')
@Controller('customer-auth-admin')
export class CustomerAuthAdminController {
  constructor(private readonly authService: CustomerAuthService) {}

  @Get(':customerId')
  @ApiOperation({ summary: '获取客户官网账户信息（管理端）' })
  @ApiParam({ name: 'customerId', description: '客户 ID' })
  async getAccount(@Param('customerId') customerId: string) {
    return this.authService.getAdminAccountInfo(customerId)
  }

  @Get(':customerId/login-logs')
  @ApiOperation({ summary: '查询客户登录日志（管理端）' })
  @ApiParam({ name: 'customerId', description: '客户 ID' })
  @ApiQuery({ name: 'limit', required: false, description: '返回条数' })
  async getLoginLogs(@Param('customerId') customerId: string, @Query('limit') limit?: string) {
    return this.authService.getLoginLogs(customerId, limit ? parseInt(limit) : 20)
  }

  @Post(':customerId/register')
  @ApiOperation({ summary: '为客户创建官网账户（管理端）' })
  @ApiParam({ name: 'customerId', description: '客户 ID' })
  async registerAccount(@Param('customerId') customerId: string) {
    return this.authService.adminRegisterAccount(customerId)
  }

  @Post(':customerId/reset-password')
  @ApiOperation({ summary: '重置客户密码，返回 6 位 PIN（管理端）' })
  @ApiParam({ name: 'customerId', description: '客户 ID' })
  async resetPassword(@Param('customerId') customerId: string) {
    return this.authService.adminResetPassword(customerId)
  }

  @Post(':customerId/toggle-status')
  @ApiOperation({ summary: '切换客户账户状态（管理端）' })
  @ApiParam({ name: 'customerId', description: '客户 ID' })
  async toggleStatus(@Param('customerId') customerId: string, @Body() body: { status: string }) {
    return this.authService.adminToggleStatus(customerId, body.status)
  }

  @Post(':customerId/send-login-code')
  @ApiOperation({ summary: '发送短信登录验证码（管理端代操作）' })
  @ApiParam({ name: 'customerId', description: '客户 ID' })
  async sendLoginCode(@Param('customerId') customerId: string) {
    return this.authService.adminSendLoginCode(customerId)
  }
}
