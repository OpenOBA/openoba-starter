import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
  Logger,
  UnauthorizedException,
  OnModuleDestroy,
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
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
export class AuthController implements OnModuleDestroy {
  private readonly logger = new Logger(AuthController.name)

  constructor(private authService: AuthService) {
    // P1修复：定期清理过期登录尝试记录（每10分钟），防止内存泄漏
    this.cleanupTimer = setInterval(
      () => {
        const now = Date.now()
        for (const [key, attempt] of this.loginAttempts) {
          if (attempt.lockUntil < now) this.loginAttempts.delete(key)
        }
      },
      10 * 60 * 1000,
    )
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer)
  }

  // H10修复：暴力破解防护 + 定期清理（内存Map，生产建议Redis）
  // TODO-PROD: 多实例部署时迁移到 Redis 共享存储
  private loginAttempts = new Map<string, { count: number; lockUntil: number }>()
  private readonly MAX_LOGIN_ATTEMPTS = 5
  private readonly LOCK_DURATION_MS = 15 * 60 * 1000
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  async login(@Body() loginDto: LoginDto, @Request() req: Record<string, unknown>) {
    const ip = (req.ip as string) || (req.connection as Record<string, unknown> | undefined)?.remoteAddress as string || 'unknown'
    const key = `${ip}:${loginDto.username}`

    // 暴力破解检查
    const attempt = this.loginAttempts.get(key)
    if (attempt && attempt.lockUntil > Date.now()) {
      const remaining = Math.ceil((attempt.lockUntil - Date.now()) / 60000)
      throw new UnauthorizedException(`账户已临时锁定，请 ${remaining} 分钟后重试`)
    }

    const user = await this.authService.validateUser(loginDto.username, loginDto.password)
    if (!user) {
      // 记录失败
      const current = this.loginAttempts.get(key) || { count: 0, lockUntil: 0 }
      current.count++
      if (current.count >= this.MAX_LOGIN_ATTEMPTS) {
        current.lockUntil = Date.now() + this.LOCK_DURATION_MS
        this.logger.warn(`Account locked: ${key} after ${current.count} attempts`)
      }
      this.loginAttempts.set(key, current)
      throw new UnauthorizedException('用户名或密码错误')
    }

    // 登录成功，清除计数
    this.loginAttempts.delete(key)

    // 基础版硬限制：Agent Chat 最多 2 个活跃用户
    // Pro 版由 License 文件解锁（待实现 License 验证）
    const maxChatUsers = 2
    const activeUserCount = await this.authService.countActiveUsers()
    if (activeUserCount > maxChatUsers && !(await this.authService.isUserActive(user.userId))) {
      throw new UnauthorizedException(`基础版仅支持 ${maxChatUsers} 个用户使用 Agent 功能。请联系我们升级到 Pro 版。`)
    }

    const result = this.authService.login(user)
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
