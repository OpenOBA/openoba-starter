import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Get, Request, Logger, Req, UnauthorizedException, Res, Inject } from '@nestjs/common'
import { Response } from 'express'
import { AuthService } from './auth.service'
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { RateLimiter } from '../../common/rate-limiter'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { Public } from '../../common/decorators/public.decorator'

interface JwtRequest extends Request {
  user: { userId: string; username: string }
}

class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(64)
  password: string
}

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name)

  // V1.4-b EXT-06: Memory Map → RateLimiter（支持 Redis，单实例回退 Memory）
  private readonly MAX_LOGIN_ATTEMPTS = 5
  private readonly LOCK_DURATION_MS = 15 * 60 * 1000

  constructor(
    private authService: AuthService,
    @Inject('RATE_LIMITER') private rateLimiter: RateLimiter,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  async login(@Body() loginDto: LoginDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown'
    const key = `${ip}:${loginDto.username}`

    // V1.4-b #15: RateLimiter 替代 Map
    const { remaining, lockedUntil } = await this.rateLimiter.attempt(
      key,
      this.MAX_LOGIN_ATTEMPTS,
      this.LOCK_DURATION_MS,
    )
    if (lockedUntil > Date.now()) {
      const remainingMin = Math.ceil((lockedUntil - Date.now()) / 60000)
      throw new UnauthorizedException(`账户已临时锁定，请 ${remainingMin} 分钟后重试`)
    }

    const user = await this.authService.validateUser(loginDto.username, loginDto.password)
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误')
    }

    // 登录成功，清除计数
    await this.rateLimiter.reset(key)

    // 基础版硬限制：Agent Chat 最多 2 个活跃用户
    // Pro 版由 License 文件解锁（待实现 License 验证）
    const maxChatUsers = 2
    const activeUserCount = await this.authService.countActiveUsers()
    if (activeUserCount > maxChatUsers && !await this.authService.isUserActive(user.userId)) {
      throw new UnauthorizedException(`基础版仅支持 ${maxChatUsers} 个用户使用 Agent 功能。请联系我们升级到 Pro 版。`)
    }

    const result = await this.authService.login(user)

    // 从 JWT payload 动态计算 Cookie maxAge，与 Token 过期时间保持一致
    const tokenPayload = JSON.parse(Buffer.from(result.accessToken.split('.')[1], 'base64').toString())
    const maxAge = (tokenPayload.exp - Math.floor(Date.now() / 1000)) * 1000

    // 设置 httpOnly Cookie（防 XSS 窃取）
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: maxAge,
      path: '/',
    })

    this.logger.log('Login successful')
    return result
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  async getProfile(@Request() req: JwtRequest) {
    return this.authService.getProfile(req.user.userId)
  }
}
