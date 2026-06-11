import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

/**
 * WizardGuard 鈥?鍒濊鍚戝瀹夊叏瀹堝崼
 *
 * 鏇夸唬绫荤骇 @Public() 瑁呴グ鍣紝纭繚锛? *   1. 浠呯櫧鍚嶅崟 IP 鍙闂? *   2. 棣栨鍚姩鐢熸垚涓€娆℃€?token锛堟帶鍒跺彴鎵撳嵃锛? *   3. 鍒濆鍖栧畬鎴愬悗 token 鑷姩澶辨晥
 */
@Injectable()
export class WizardGuard implements CanActivate {
  private readonly logger = new Logger(WizardGuard.name)

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const ip = request.ip || request.socket?.remoteAddress || 'unknown'

    // 1. IP 鐧藉悕鍗?    const allowIps = (process.env.WIZARD_ALLOW_IPS || '127.0.0.1,::1,::ffff:127.0.0.1').split(',')
    const matched = allowIps.some((allowed: string) => {
      const trimmed = allowed.trim()
      return ip === trimmed || (trimmed === '::1' && ip === '::ffff:127.0.0.1')
    })
    if (!matched) {
      throw new ForbiddenException(`Wizard IP 涓嶅湪鐧藉悕鍗曚腑: ${ip}`)
    }

    // 2. 鍚姩 token 鏍￠獙
    const token = request.headers['x-wizard-token'] as string
    const expectedToken = process.env.WIZARD_INIT_TOKEN
    if (!expectedToken || expectedToken === '***') {
      throw new ForbiddenException('Wizard 宸叉案涔呭叧闂紙鍒濆鍖栧畬鎴愬悗鑷姩绂佺敤锛?)
    }
    if (token !== expectedToken) {
      throw new ForbiddenException('鏃犳晥鐨?Wizard Token')
    }

    return true
  }
}
