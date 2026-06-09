import { Injectable, BadRequestException, Logger, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThan, MoreThan } from 'typeorm'
import * as crypto from 'crypto'
import { SmsVerificationCode } from './entity/sms-verification-code.entity'
import { SendSmsCodeDto, VerifySmsCodeDto, SmsPurpose } from './dto/sms.dto'
import { AliyunSmsService } from './aliyun-sms.service'
import { IRateLimiter } from '../../common/rate-limiter'

/**
 * 短信验证码服务
 * - 生成 6 位随机数字验证码
 * - 5 分钟过期
 * - 同一手机号 60 秒冷却
 * - 同一手机号每天最多 10 条
 * - 验证码一次性使用
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name)

  private readonly CODE_EXPIRE_MS = 5 * 60 * 1000
  private readonly COOLDOWN_MS = 60 * 1000
  private readonly DAILY_LIMIT = 10
  private readonly IP_DAILY_LIMIT = 20
  private readonly MAX_VERIFY_ATTEMPTS = 5
  // V1.4-b #15: 原 verifyFailures Map 已迁移到 RateLimiter
  private readonly VERIFY_LOCK_DURATION_MS = 60 * 60 * 1000 // 1小时锁定

  constructor(
    @InjectRepository(SmsVerificationCode)
    private smsRepo: Repository<SmsVerificationCode>,
    private readonly aliyunSms: AliyunSmsService,
    @Inject('RATE_LIMITER') private rateLimiter: IRateLimiter,
  ) {}

  /**
   * 发送验证码
   */
  async sendCode(dto: SendSmsCodeDto, ipAddress?: string) {
    const { phone, purpose = SmsPurpose.LOGIN } = dto
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    // IP 级限制
    if (ipAddress) {
      const ipTodayCount = await this.smsRepo.count({
        where: { ipAddress, sentAt: MoreThan(todayStart) },
      })
      if (ipTodayCount >= this.IP_DAILY_LIMIT) {
        throw new BadRequestException('请求过于频繁，请稍后再试')
      }
    }

    // 冷却期
    const cooldownCheck = await this.smsRepo.findOne({
      where: {
        phone,
        purpose,
        sentAt: MoreThan(new Date(now.getTime() - this.COOLDOWN_MS)),
      },
      order: { sentAt: 'DESC' },
    })
    if (cooldownCheck) {
      const remaining = Math.ceil((this.COOLDOWN_MS - (now.getTime() - cooldownCheck.sentAt.getTime())) / 1000)
      throw new BadRequestException(`验证码发送过于频繁，请 ${remaining} 秒后再试`)
    }

    // 每日限额
    const todayCount = await this.smsRepo.count({
      where: { phone, purpose, sentAt: MoreThan(todayStart) },
    })
    if (todayCount >= this.DAILY_LIMIT) {
      throw new BadRequestException('今日发送次数已达上限，请明天再试')
    }

    // 3. 生成 6 位验证码
    const code = crypto.randomInt(100000, 999999).toString()

    // 4. 保存到数据库
    const record = this.smsRepo.create({
      id: crypto.randomUUID(),
      phone,
      code,
      purpose,
      expiresAt: new Date(now.getTime() + this.CODE_EXPIRE_MS),
      used: false,
      ipAddress: ipAddress || null,
      sentAt: now,
    })
    await this.smsRepo.save(record)

    // 5. 发送短信
    const sent = await this.aliyunSms.sendVerificationCode(phone, code)
    if (!sent) {
      throw new BadRequestException('短信发送失败，请稍后再试')
    }

    this.logger.log(`验证码已发送 → ${phone.substring(0,3)}****${phone.substring(7)} (${purpose})`)
    return { message: '验证码已发送', expiresAt: record.expiresAt }
  }

  /**
   * 验证验证码
   * @returns 验证成功后删除验证码（一次性使用）
   */
  async verifyCode(dto: VerifySmsCodeDto): Promise<boolean> {
    const { phone, code, purpose = SmsPurpose.LOGIN } = dto
    const now = new Date()

    // V1.4-b #15: Memory Map → RateLimiter（支持 Redis，单实例回退 Memory）
    const failKey = `${phone}:${purpose}`
    const { remaining, lockedUntil } = await this.rateLimiter.attempt(
      failKey,
      this.MAX_VERIFY_ATTEMPTS,
      this.VERIFY_LOCK_DURATION_MS,
    )

    if (lockedUntil > now.getTime()) {
      const remainingMin = Math.ceil((lockedUntil - now.getTime()) / 60000)
      throw new BadRequestException(`验证尝试次数过多，请 ${remainingMin} 分钟后再试`)
    }

    // 查找最近一条未使用的验证码
    const record = await this.smsRepo.findOne({
      where: { phone, code, purpose, used: false },
      order: { sentAt: 'DESC' },
    })

    if (!record) {
      throw new BadRequestException('验证码错误')
    }

    if (record.expiresAt < now) {
      throw new BadRequestException('验证码已过期，请重新获取')
    }

    // 验证成功：清除失败计数
    await this.rateLimiter.reset(failKey)

    // 标记为已使用
    record.used = true
    await this.smsRepo.save(record)

    this.logger.log(`验证码验证成功 → ${phone.substring(0,3)}****${phone.substring(7)} (${purpose})`)
    return true
  }

  /**
   * 清理过期验证码（定时任务可调用）
   */
  async cleanExpired() {
    const now = new Date()
    const result = await this.smsRepo.delete({
      expiresAt: LessThan(now),
      used: false,
    })
    if (result.affected && result.affected > 0) {
      this.logger.log(`清理过期验证码 ${result.affected} 条`)
    }
    return result
  }
}
