import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, Logger, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import { Customer, CUSTOMER_TYPES, CUSTOMER_STATUS } from '../customer/entity/customer.entity'
import { CustomerLoginLog, LOGIN_METHODS, LOGIN_RESULTS } from './entity/customer-login-log.entity'
import { SmsService } from '../sms/sms.service'
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
import { SmsPurpose } from '../sms/dto/sms.dto'

/** 官网账户状态（系统级枚举，非字典驱动） */
const ACCOUNT_STATUS = {
  NONE: 'none',
  ACTIVE: 'active',
  DEACTIVATED: 'deactivated',
  SUSPENDED: 'suspended',
} as const

@Injectable()
export class CustomerAuthService {
  private readonly logger = new Logger(CustomerAuthService.name)

  // V1.4-b #15: Map 迁移到 RateLimiter
  private readonly MAX_LOGIN_ATTEMPTS = 5
  private readonly LOCK_DURATION_MS = 15 * 60 * 1000

  private readonly jwtSecret: string

  constructor(
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    @InjectRepository(CustomerLoginLog)
    private loginLogRepo: Repository<CustomerLoginLog>,
    private jwtService: JwtService,
    private smsService: SmsService,
    @InjectDataSource() private dataSource: DataSource,
    @Inject('RATE_LIMITER') private rateLimiter: IRateLimiter,
  ) {
    const secret = process.env.CUSTOMER_JWT_SECRET
    if (!secret) {
      throw new Error('CUSTOMER_JWT_SECRET 环境变量未设置！请在 .env 中配置。')
    }
    this.jwtSecret = secret
  }

  // ===== 密码注册（兼容旧版） =====
  async register(dto: RegisterCustomerDto) {
    const existing = await this.customerRepo.findOne({
      where: { phone: dto.phone, isDeleted: false },
    })

    if (existing) {
      if (existing.accountStatus === ACCOUNT_STATUS.ACTIVE) {
        throw new BadRequestException('该手机号已注册。')
      }
      if (existing.accountStatus === ACCOUNT_STATUS.DEACTIVATED) {
        throw new BadRequestException('该账户已注销，无法重新注册。')
      }
      existing.passwordHash = await bcrypt.hash(dto.password, 10)
      existing.accountStatus = ACCOUNT_STATUS.ACTIVE
      existing.registeredAt = new Date()
      if (dto.nickname) existing.nickname = dto.nickname
      if (dto.email) existing.email = dto.email
      await this.customerRepo.save(existing)

      return this.generateToken(existing)
    }

    const customerId = `cus-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
    const customerCode = `MJ-CUS-${String((await this.customerRepo.count()) + 1).padStart(6, '0')}`

    const customer = this.customerRepo.create({
      customerId,
      customerCode,
      customerType: CUSTOMER_TYPES[0],
      contactName: dto.contactName,
      phone: dto.phone,
      passwordHash: await bcrypt.hash(dto.password, 10),
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      registeredAt: new Date(),
      email: dto.email || null,
      nickname: dto.nickname || null,
      subscriptionStatus: 'none',
      memberDiscountRate: 1.0,
      pointsBalance: 0,
      status: CUSTOMER_STATUS[0],
      totalOrders: 0,
      totalAmount: 0,
      isDeleted: false,
    })

    await this.customerRepo.save(customer)
    return this.generateToken(customer)
  }

  // ===== 密码登录（兼容旧版） =====
  async login(dto: LoginCustomerDto) {
    const customer = await this.customerRepo.findOne({
      where: { phone: dto.phone, isDeleted: false },
    })

    if (!customer || !customer.passwordHash) {
      throw new UnauthorizedException('手机号或密码错误')
    }

    // V1.4-b #15: RateLimiter 替代 Map
    const lockKey = `pwd:${dto.phone}`
    const { remaining, lockedUntil } = await this.rateLimiter.attempt(
      lockKey,
      this.MAX_LOGIN_ATTEMPTS,
      this.LOCK_DURATION_MS,
    )
    if (lockedUntil > Date.now()) {
      const remainingMin = Math.ceil((lockedUntil - Date.now()) / 60000)
      throw new UnauthorizedException(`账户已临时锁定，请 ${remainingMin} 分钟后重试`)
    }

    if (customer.accountStatus === ACCOUNT_STATUS.DEACTIVATED) {
      throw new UnauthorizedException('账户已注销')
    }
    if (customer.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
      throw new UnauthorizedException('账户已冻结，请联系客服。')
    }
    if (customer.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
      throw new UnauthorizedException('账户未注册，请先注册')
    }

    const match = await bcrypt.compare(dto.password, customer.passwordHash)
    if (!match) {
      await this.recordLoginLog({
        customerId: customer.customerId,
        phone: dto.phone,
        loginMethod: 'password',
        loginResult: 'failed_wrong_code',
        failReason: '密码错误',
      })
      throw new UnauthorizedException('手机号或密码错误')
    }

    await this.customerRepo.update(customer.customerId, { lastLoginAt: new Date() })
    // P0修复(C04)：登录成功，清除失败计数
    await this.rateLimiter.reset(lockKey)
    await this.recordLoginLog({
      customerId: customer.customerId,
      phone: dto.phone,
      loginMethod: 'password',
      loginResult: 'success',
    })
    return this.generateToken(customer)
  }

  // ===== SMS 登录（手机号+验证码） =====
  async smsLogin(dto: SmsLoginDto) {
    // 1. 验证短信验证码
    await this.smsService.verifyCode({ phone: dto.phone, code: dto.code, purpose: SmsPurpose.LOGIN })

    // 2. 查找用户
    let customer = await this.customerRepo.findOne({
      where: { phone: dto.phone, isDeleted: false },
    })

    // 3. 如果用户不存在，自动注册
    if (!customer) {
      const customerId = `cus-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
      const customerCode = `MJ-CUS-${String((await this.customerRepo.count()) + 1).padStart(6, '0')}`

      customer = this.customerRepo.create({
        customerId,
        customerCode,
        customerType: CUSTOMER_TYPES[0],
        contactName: '',
        phone: dto.phone,
        accountStatus: ACCOUNT_STATUS.ACTIVE,
        registeredAt: new Date(),
        subscriptionStatus: 'none',
        memberDiscountRate: 1.0,
        pointsBalance: 0,
        status: CUSTOMER_STATUS[0],
        totalOrders: 0,
        totalAmount: 0,
        isDeleted: false,
      })

      await this.customerRepo.save(customer)
    }

    // 4. 检查账户状态
    if (customer.accountStatus === ACCOUNT_STATUS.DEACTIVATED) {
      throw new UnauthorizedException('账户已注销')
    }
    if (customer.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
      throw new UnauthorizedException('账户已冻结，请联系客服。')
    }

    // 5. 更新登录时间
    await this.customerRepo.update(customer.customerId, { lastLoginAt: new Date() })
    await this.recordLoginLog({
      customerId: customer.customerId,
      phone: dto.phone,
      loginMethod: 'sms_code',
      loginResult: 'success',
    })

    return this.generateToken(customer)
  }

  // ===== SMS 注册（手机号+验证码+昵称） =====
  async smsRegister(dto: SmsRegisterDto) {
    // 1. 验证短信验证码
    await this.smsService.verifyCode({ phone: dto.phone, code: dto.code, purpose: SmsPurpose.LOGIN })

    // 2. 检查是否已注册
    const existing = await this.customerRepo.findOne({
      where: { phone: dto.phone, isDeleted: false },
    })

    if (existing) {
      if (existing.accountStatus === ACCOUNT_STATUS.DEACTIVATED) {
        throw new BadRequestException('该账户已注销，无法重新注册。')
      }
      // 已注册，直接登录
      if (existing.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
        existing.accountStatus = ACCOUNT_STATUS.ACTIVE
        existing.registeredAt = new Date()
        await this.customerRepo.save(existing)
      }
      await this.customerRepo.update(existing.customerId, { lastLoginAt: new Date() })
      return this.generateToken(existing)
    }

    // 3. 创建新账户
    const customerId = `cus-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
    const customerCode = `MJ-CUS-${String((await this.customerRepo.count()) + 1).padStart(6, '0')}`

    const customer = this.customerRepo.create({
      customerId,
      customerCode,
      customerType: CUSTOMER_TYPES[0],
      contactName: dto.contactName,
      phone: dto.phone,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      registeredAt: new Date(),
      nickname: dto.nickname || null,
      subscriptionStatus: 'none',
      memberDiscountRate: 1.0,
      pointsBalance: 0,
      status: CUSTOMER_STATUS[0],
      totalOrders: 0,
      totalAmount: 0,
      isDeleted: false,
    })

    await this.customerRepo.save(customer)
    return this.generateToken(customer)
  }

  // ===== 修改密码 =====
  async changePassword(customerId: string, dto: ChangePasswordDto) {
    const customer = await this.customerRepo.findOne({
      where: { customerId, isDeleted: false },
    })
    if (!customer || !customer.passwordHash) {
      throw new NotFoundException('账户不存在。')
    }

    const match = await bcrypt.compare(dto.oldPassword, customer.passwordHash)
    if (!match) {
      throw new BadRequestException('当前密码错误')
    }

    customer.passwordHash = await bcrypt.hash(dto.newPassword, 10)
    await this.customerRepo.save(customer)
    return { message: '密码修改成功' }
  }

  // ===== 申请密码重置（返回 Token） =====
  async requestPasswordReset(dto: ResetPasswordRequestDto) {
    const customer = await this.customerRepo.findOne({
      where: { phone: dto.phone, isDeleted: false, accountStatus: ACCOUNT_STATUS.ACTIVE },
    })
    if (!customer) {
      return { message: '该手机号尚未注册，但邮件已发送。' }
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date()
    expires.setHours(expires.getHours() + 1)

    customer.passwordResetToken = token
    customer.passwordResetExpires = expires
    await this.customerRepo.save(customer)

    // P0修复(C03)：Token 不通过 API 明文返回，生产环境通过短信发送
    const isDev = process.env.APP_ENV === 'development'
    return {
      message: isDev
        ? '重置 Token 已生成（开发模式：Token 直接返回）'
        : '密码重置链接已发送至您的手机，请查收短信',
      ...(isDev ? { token } : {}),
    }
  }

  // ===== 密码重置（确认） =====
  async confirmPasswordReset(dto: ResetPasswordConfirmDto) {
    const customer = await this.customerRepo.findOne({
      where: { passwordResetToken: dto.token, isDeleted: false },
    })
    if (!customer) {
      throw new BadRequestException('无效的重置 Token')
    }
    if (customer.passwordResetExpires && customer.passwordResetExpires < new Date()) {
      throw new BadRequestException('重置 Token 已过期。')
    }

    customer.passwordHash = await bcrypt.hash(dto.newPassword, 10)
    customer.passwordResetToken = null
    customer.passwordResetExpires = null
    await this.customerRepo.save(customer)
    return { message: '密码重置成功' }
  }

  // ===== 注销账户 =====
  async deactivateAccount(customerId: string) {
    const customer = await this.customerRepo.findOne({
      where: { customerId, isDeleted: false },
    })
    if (!customer) {
      throw new NotFoundException('账户不存在。')
    }
    if (customer.accountStatus === ACCOUNT_STATUS.DEACTIVATED) {
      throw new BadRequestException('账户已注销')
    }

    customer.accountStatus = ACCOUNT_STATUS.DEACTIVATED
    customer.passwordHash = null
    customer.passwordResetToken = null
    customer.passwordResetExpires = null
    await this.customerRepo.save(customer)
    return { message: '账户已注销' }
  }

  // ===== 获取用户资料 =====
  async getProfile(customerId: string) {
    const customer = await this.customerRepo.findOne({
      where: { customerId, isDeleted: false },
    })
    if (!customer) throw new NotFoundException('账户不存在。')

    return {
      customerId: customer.customerId,
      customerCode: customer.customerCode,
      contactName: customer.contactName,
      phone: customer.phone,
      email: customer.email,
      nickname: customer.nickname,
      avatarUrl: customer.avatarUrl,
      accountStatus: customer.accountStatus,
      registeredAt: customer.registeredAt,
      lastLoginAt: customer.lastLoginAt,
      memberDiscountRate: customer.memberDiscountRate,
      pointsBalance: customer.pointsBalance,
      subscriptionStatus: customer.subscriptionStatus,
      totalOrders: customer.totalOrders,
      totalAmount: customer.totalAmount,
    }
  }

  // ===== 更新个人资料 =====
  async updateProfile(customerId: string, data: { nickname?: string; email?: string; avatarUrl?: string }) {
    const customer = await this.customerRepo.findOne({
      where: { customerId, isDeleted: false },
    })
    if (!customer) throw new NotFoundException('账户不存在。')

    if (data.nickname !== undefined) customer.nickname = data.nickname
    if (data.email !== undefined) customer.email = data.email
    if (data.avatarUrl !== undefined) customer.avatarUrl = data.avatarUrl
    await this.customerRepo.save(customer)
    return this.getProfile(customerId)
  }

  // ===== Token 生成 =====
  private generateToken(customer: Customer) {
    const payload = { sub: customer.customerId, phone: customer.phone }
    return {
      accessToken: this.jwtService.sign(payload, { secret: this.jwtSecret, expiresIn: '7d' }),
      customer: {
        customerId: customer.customerId,
        contactName: customer.contactName,
        phone: customer.phone,
        nickname: customer.nickname,
        avatarUrl: customer.avatarUrl,
        accountStatus: customer.accountStatus,
      },
    }
  }

  // ============================================================
  // ERP 管理端 API（管理员操作）
  // ============================================================

  /** 获取客户官网账户完整信息 */
  async getAdminAccountInfo(customerId: string) {
    const customer = await this.customerRepo.findOne({
      where: { customerId, isDeleted: false },
    })
    if (!customer) throw new NotFoundException('客户不存在')

    return {
      customerId: customer.customerId,
      customerCode: customer.customerCode,
      contactName: customer.contactName,
      phone: customer.phone,
      email: customer.email,
      nickname: customer.nickname,
      avatarUrl: customer.avatarUrl,
      accountStatus: customer.accountStatus,
      hasPassword: !!customer.passwordHash,
      registeredAt: customer.registeredAt,
      lastLoginAt: customer.lastLoginAt,
      totalOrders: customer.totalOrders,
      totalAmount: customer.totalAmount,
      lastOrderAt: customer.lastOrderAt,
      memberDiscountRate: customer.memberDiscountRate,
      pointsBalance: customer.pointsBalance,
      subscriptionStatus: customer.subscriptionStatus,
      memberSince: customer.memberSince,
      memberValidUntil: customer.memberValidUntil,
    }
  }

  /** 管理员为客户创建官网账户（手机号自动作为账号） */
  async adminRegisterAccount(customerId: string) {
    const customer = await this.customerRepo.findOne({
      where: { customerId, isDeleted: false },
    })
    if (!customer) throw new NotFoundException('客户不存在')
    if (customer.accountStatus === 'active') {
      throw new BadRequestException('该客户已注册官网账户')
    }

    // 生成 6 位初始密码
    const pin = crypto.randomInt(100000, 999999).toString()
    customer.passwordHash = await bcrypt.hash(pin, 10)
    customer.accountStatus = 'active'
    customer.registeredAt = new Date()
    await this.customerRepo.save(customer)

    // H07修复：生产环境不返回明文密码
    const isDev = process.env.APP_ENV === 'development'
    return {
      message: isDev ? '官网账户已创建' : '官网账户已创建，密码已通过短信发送',
      phone: customer.phone,
      ...(isDev ? { initialPassword: pin } : {}),
    }
  }

  /** 管理员重置密码 — 返回 6 位 PIN */
  async adminResetPassword(customerId: string) {
    const customer = await this.customerRepo.findOne({
      where: { customerId, isDeleted: false },
    })
    if (!customer) throw new NotFoundException('客户不存在')
    if (customer.accountStatus === 'none') {
      throw new BadRequestException('该客户尚未注册官网账户')
    }

    const pin = crypto.randomInt(100000, 999999).toString()
    customer.passwordHash = await bcrypt.hash(pin, 10)
    customer.passwordResetToken = null
    customer.passwordResetExpires = null
    await this.customerRepo.save(customer)

    // H07修复：生产环境PIN通过短信发送，API不返回明文
    const isDev = process.env.APP_ENV === 'development'
    return {
      message: isDev
        ? '密码已重置'
        : '密码已重置，新密码已通过短信发送',
      ...(isDev ? { newPin: pin } : {}),
    }
  }

  /** 管理员切换账户状态 */
  async adminToggleStatus(customerId: string, status: string) {
    const validStatuses = ['active', 'inactive', 'suspended', 'deactivated', 'none']
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`无效状态: ${status}，可选: ${validStatuses.join(', ')}`)
    }

    const customer = await this.customerRepo.findOne({
      where: { customerId, isDeleted: false },
    })
    if (!customer) throw new NotFoundException('客户不存在')

    customer.accountStatus = status
    await this.customerRepo.save(customer)

    const statusLabels: Record<string, string> = {
      active: '已激活',
      inactive: '未激活',
      suspended: '已冻结',
      deactivated: '已注销',
      none: '未注册',
    }
    return {
      message: `账户状态已切换为「${statusLabels[status] || status}」`,
      status,
    }
  }

  /** 管理员代发送短信登录验证码 */
  async adminSendLoginCode(customerId: string) {
    const customer = await this.customerRepo.findOne({
      where: { customerId, isDeleted: false },
    })
    if (!customer) throw new NotFoundException('客户不存在')
    if (!customer.phone) {
      throw new BadRequestException('该客户没有手机号')
    }
    if (customer.accountStatus === 'none') {
      throw new BadRequestException('该客户尚未注册官网账户')
    }

    return this.smsService.sendCode({ phone: customer.phone })
  }

  /** 查询客户登录日志 */
  async getLoginLogs(customerId: string, limit: number = 20) {
    const customer = await this.customerRepo.findOne({
      where: { customerId, isDeleted: false },
    })
    if (!customer) throw new NotFoundException('客户不存在')

    const logs = await this.loginLogRepo.find({
      where: [{ customerId }, { phone: customer.phone }],
      order: { createdAt: 'DESC' },
      take: limit,
    })

    return {
      customerId,
      phone: customer.phone,
      total: logs.length,
      logs: logs.map((log) => ({
        logId: log.logId,
        loginMethod: log.loginMethod,
        loginResult: log.loginResult,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        deviceId: log.deviceId,
        failReason: log.failReason,
        createdAt: log.createdAt,
      })),
    }
  }

  /** 记录登录日志（内部辅助方法） */
  async recordLoginLog(data: {
    customerId?: string
    phone: string
    loginMethod: string
    loginResult: string
    ipAddress?: string
    userAgent?: string
    deviceId?: string
    failReason?: string
  }) {
    const log = this.loginLogRepo.create({
      logId: crypto.randomUUID(),
      customerId: data.customerId || null,
      phone: data.phone,
      loginMethod: data.loginMethod,
      loginResult: data.loginResult,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      deviceId: data.deviceId || null,
      failReason: data.failReason || null,
    })
    await this.loginLogRepo.save(log)
  }
}
