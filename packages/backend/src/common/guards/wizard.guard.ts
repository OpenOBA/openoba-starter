import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common'
import * as mysql from 'mysql2/promise'

/**
 * WizardGuard — 初装向导安全守卫
 *
 * 替代类级 @Public() 装饰器，确保：
 *   1. 仅白名单 IP 可访问
 *   2. 首次启动生成一次性 token（控制台打印）
 *   3. 初始化完成后 token 自动失效
 */
@Injectable()
export class WizardGuard implements CanActivate {
  private readonly logger = new Logger(WizardGuard.name)
  private static initialized = false

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const ip = request.ip || request.socket?.remoteAddress || 'unknown'

    // 0. 初始化完成后自动关闭 Wizard
    if (WizardGuard.initialized) {
      throw new ForbiddenException('Wizard 已永久关闭（系统初始化已完成）')
    }

    try {
      const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'openoba_starter',
        connectTimeout: 3000,
      })
      const [rows] = await conn.execute('SELECT COUNT(*) AS cnt FROM sys_user WHERE username = ?', ['admin'])
      const adminExists = (Number((rows as Array<Record<string, unknown>>)[0]?.cnt) || 0) > 0
      await conn.end()

      if (adminExists) {
        WizardGuard.initialized = true
        throw new ForbiddenException('Wizard 已永久关闭（系统初始化已完成）')
      }
    } catch (e) {
      if (e instanceof ForbiddenException) throw e
      this.logger.warn(`Wizard DB 检查失败（可能尚未初始化）: ${(e as Error).message}`)
    }

    // 1. IP 白名单
    const allowIps = (process.env.WIZARD_ALLOW_IPS || '127.0.0.1,::1,::ffff:127.0.0.1').split(',')
    const matched = allowIps.some((allowed: string) => {
      const trimmed = allowed.trim()
      return ip === trimmed || (trimmed === '::1' && ip === '::ffff:127.0.0.1')
    })
    if (!matched) {
      throw new ForbiddenException(`Wizard IP 不在白名单中: ${ip}`)
    }

    // 2. 启动 token 校验
    const token = request.headers['x-wizard-token'] as string
    const expectedToken = process.env.WIZARD_INIT_TOKEN
    if (!expectedToken || expectedToken === '***') {
      throw new ForbiddenException('Wizard 已永久关闭（初始化完成后自动禁用）')
    }
    if (token !== expectedToken) {
      throw new ForbiddenException('无效的 Wizard Token')
    }

    return true
  }
}
