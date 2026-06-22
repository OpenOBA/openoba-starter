/* eslint-disable @typescript-eslint/no-explicit-any -- Jest mock 生态刚需，mockImplementation 回调需要 any 绕过类型推断缺陷 */
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SmsService } from './sms.service'
import { SmsVerificationCode } from './entity/sms-verification-code.entity'
import { AliyunSmsService } from './aliyun-sms.service'
import { IRateLimiter } from '../../common/rate-limiter'

// ──────────────── helpers ────────────────

function mockRepo() {
  return {
    create: jest.fn((dto) => dto as any),
    save: jest.fn((entity: any) => Promise.resolve(entity)),
    findOne: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
  }
}

// ──────────────── tests ────────────────

describe('SmsService', () => {
  let service: SmsService
  let smsRepo: ReturnType<typeof mockRepo>
  let aliyunSms: { sendVerificationCode: jest.Mock }
  let rateLimiter: { attempt: jest.Mock; reset: jest.Mock }

  beforeEach(async () => {
    smsRepo = mockRepo()
    aliyunSms = { sendVerificationCode: jest.fn().mockResolvedValue(true) }
    rateLimiter = {
      attempt: jest.fn().mockResolvedValue({ remaining: 4, lockedUntil: 0 }),
      reset: jest.fn().mockResolvedValue(undefined),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        { provide: getRepositoryToken(SmsVerificationCode), useValue: smsRepo },
        { provide: AliyunSmsService, useValue: aliyunSms },
        { provide: 'RATE_LIMITER', useValue: rateLimiter },
      ],
    }).compile()

    service = module.get<SmsService>(SmsService)
  })

  // ═══════════════════ sendCode ═══════════════════
  describe('sendCode', () => {
    const dto = { phone: '13800000000', purpose: 'login' as const }

    it('should send code successfully', async () => {
      smsRepo.create.mockImplementation((d: any) => d)
      smsRepo.save.mockImplementation((e: any) => Promise.resolve(e))

      const result = await service.sendCode(dto as any)

      expect(result).toBeDefined()
      expect(result.message).toContain('已发送')
      expect(aliyunSms.sendVerificationCode).toHaveBeenCalledWith('13800000000', expect.any(String))
    })

    it('should throw on cooldown', async () => {
      smsRepo.findOne.mockResolvedValue({ sentAt: new Date() })
      await expect(service.sendCode(dto as any)).rejects.toThrow('过于频繁')
    })

    it('should throw on daily limit', async () => {
      smsRepo.count.mockResolvedValue(10)
      await expect(service.sendCode(dto as any)).rejects.toThrow('上限')
    })

    it('should throw when SMS provider fails', async () => {
      smsRepo.create.mockImplementation((d: any) => d)
      smsRepo.save.mockImplementation((e: any) => Promise.resolve(e))
      aliyunSms.sendVerificationCode.mockResolvedValue(false)

      await expect(service.sendCode(dto as any)).rejects.toThrow('发送失败')
    })
  })

  // ═══════════════════ verifyCode ═══════════════════
  describe('verifyCode', () => {
    const dto = { phone: '13800000000', code: '123456', purpose: 'login' as const }

    it('should verify successfully', async () => {
      smsRepo.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        used: false,
      })
      smsRepo.save.mockImplementation((e: any) => Promise.resolve(e))

      const result = await service.verifyCode(dto as any)
      expect(result).toBe(true)
      expect(rateLimiter.reset).toHaveBeenCalled()
      expect(smsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ used: true }))
    })

    it('should throw on wrong code', async () => {
      smsRepo.findOne.mockResolvedValue(null)
      await expect(service.verifyCode(dto as any)).rejects.toThrow('验证码错误')
    })

    it('should throw on expired code', async () => {
      smsRepo.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000),
        used: false,
      })
      await expect(service.verifyCode(dto as any)).rejects.toThrow('已过期')
    })
  })

  // ═══════════════════ cleanExpired ═══════════════════
  describe('cleanExpired', () => {
    it('should delete expired codes', async () => {
      smsRepo.delete.mockResolvedValue({ affected: 3 })
      const result = await service.cleanExpired()
      expect(result.affected).toBe(3)
    })
  })
})
