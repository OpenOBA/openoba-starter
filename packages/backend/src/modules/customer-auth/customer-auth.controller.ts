import { Request } from 'express'
import { Controller, Post, Get, Put, Body, UseGuards, Req, Logger, BadRequestException, Inject } from '@nestjs/common'
export interface CustomerRequest extends Request {
  customerId: string
}

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { CustomerAuthService } from './customer-auth.service'
import { CustomerJwtGuard } from './customer-auth.guard'
import { Public } from '../../common/decorators/public.decorator'
import { IRateLimiter } from '../../common/rate-limiter'
import {
  RegisterCustomerDto,
  LoginCustomerDto,
  ChangePasswordDto,
  ResetPasswordRequestDto,
  ResetPasswordConfirmDto,
  SmsLoginDto,
  SmsRegisterDto,
} from './dto/customer-auth.dto'

@ApiTags('客户官网账户')
@Controller('customer-auth')
export class CustomerAuthController {
  private readonly logger = new Logger(CustomerAuthController.name)

  // V1.4-b #15: static Map 迁移到 RateLimiter
  private readonly MAX_ATTEMPTS = 5
  private readonly WINDOW_MS = 15 * 60 * 1000 // 15分钟锁定窗口

  constructor(
    private readonly authService: CustomerAuthService,
    @Inject('RATE_LIMITER') private rateLimiter: IRateLimiter,
  ) {}

  /** 登录限流检查（异步） */
  private async checkRateLimit(identifier: string): Promise<void> {
    const { remaining, lockedUntil } = await this.rateLimiter.attempt(
      `customer-login:${identifier}`,
      this.MAX_ATTEMPTS,
      this.WINDOW_MS,
    )

    if (lockedUntil > Date.now()) {
      const remainingMin = Math.ceil((lockedUntil - Date.now()) / 1000 / 60)
      throw new BadRequestException(`登录尝试次数过多，请 ${remainingMin} 分钟后重试`)
    }
  }

  private async resetAttempts(identifier: string): Promise<void> {
    await this.rateLimiter.reset(`customer-login:${identifier}`)
  }

  // ===== 密码登录/注册（保留兼容） =====

  @Post('register')
  @Public()
  @ApiOperation({ summary: '官网账户注册（密码模式）' })
  async register(@Body() dto: RegisterCustomerDto) {
    return this.authService.register(dto)
  }

  @Post('login')
  @Public()
  @ApiOperation({ summary: '官网账户登录（密码模式）' })
  async login(@Body() dto: LoginCustomerDto, @Req() req: CustomerRequest) {
    const identifier = dto.phone || req.ip || 'unknown'
    await this.checkRateLimit(identifier)
    const result = await this.authService.login(dto)
    await this.resetAttempts(identifier)
    return result
  }

  // ===== SMS 验证码登录/注册 ⭐ =====

  @Post('sms-login')
  @Public()
  @ApiOperation({ summary: '验证码登录（手机号+验证码，自动注册）' })
  async smsLogin(@Body() dto: SmsLoginDto, @Req() req: CustomerRequest) {
    const identifier = dto.phone || req.ip || 'unknown'
    await this.checkRateLimit(identifier)
    const result = await this.authService.smsLogin(dto)
    await this.resetAttempts(identifier)
    return result
  }

  @Post('sms-register')
  @Public()
  @ApiOperation({ summary: '验证码注册（手机号+验证码+姓名）' })
  async smsRegister(@Body() dto: SmsRegisterDto) {
    return this.authService.smsRegister(dto)
  }

  // ===== 密码管理（保留兼容） =====

  @Post('change-password')
  @ApiOperation({ summary: '修改密码' })
  @ApiBearerAuth()
  @UseGuards(CustomerJwtGuard)
  async changePassword(@Req() req: CustomerRequest, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.customerId, dto)
  }

  @Post('reset-password/request')
  @Public()
  @ApiOperation({ summary: '请求密码重置' })
  async requestReset(@Body() dto: ResetPasswordRequestDto) {
    return this.authService.requestPasswordReset(dto)
  }

  @Post('reset-password/confirm')
  @Public()
  @ApiOperation({ summary: '确认密码重置' })
  async confirmReset(@Body() dto: ResetPasswordConfirmDto) {
    return this.authService.confirmPasswordReset(dto)
  }

  // ===== 账户管理 =====

  @Post('deactivate')
  @ApiOperation({ summary: '注销账户' })
  @ApiBearerAuth()
  @UseGuards(CustomerJwtGuard)
  async deactivate(@Req() req: CustomerRequest) {
    return this.authService.deactivateAccount(req.customerId)
  }

  @Get('profile')
  @ApiOperation({ summary: '获取个人资料' })
  @ApiBearerAuth()
  @UseGuards(CustomerJwtGuard)
  async getProfile(@Req() req: CustomerRequest) {
    return this.authService.getProfile(req.customerId)
  }

  @Put('profile')
  @ApiOperation({ summary: '更新个人资料' })
  @ApiBearerAuth()
  @UseGuards(CustomerJwtGuard)
  async updateProfile(
    @Req() req: CustomerRequest,
    @Body() data: { nickname?: string; email?: string; avatarUrl?: string },
  ) {
    return this.authService.updateProfile(req.customerId, data)
  }
}
