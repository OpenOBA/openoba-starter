/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Entity, PrimaryColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'
import { CustomerContact } from './customer-contact.entity'
import { CustomerAddress } from './customer-address.entity'
import { CustomerTierPricing } from './customer-tier-pricing.entity'
import { VisionPrescription } from './vision-prescription.entity'
import { CustomerLens } from './customer-lens.entity'

export const CUSTOMER_TYPES = ['retail', 'business', 'partner'] as const
export const CUSTOMER_LEVELS = ['normal', 'vip', 'svip', 'gold'] as const
export const CUSTOMER_STATUS = ['active', 'inactive', 'blacklisted', 'dormant', 'trial'] as const

@Entity('customer')
@Index('idx_type', ['customerType'])
@Index('idx_level', ['customerLevel'])
@Index('idx_phone', ['phone'])
@Index('idx_status', ['status'])
export class Customer {
  @PrimaryColumn('varchar', { name: 'customer_id', length: 36 })
  customerId: string

  @Column('varchar', { name: 'customer_code', length: 32, unique: true, comment: '系统编号，如 MJ-CUS-000001' })
  customerCode: string

  // P1-10: nullable for FK SET NULL
  @Column('varchar', { name: 'customer_type', length: 32, nullable: true, comment: 'retail/business/partner' })
  customerType?: string

  @Column('varchar', { name: 'customer_level', length: 32, nullable: true, default: 'normal', comment: 'normal/vip/svip/gold' })
  customerLevel?: string

  @Column('varchar', { name: 'company_name', length: 256, nullable: true, comment: '企业名称' })
  companyName: string | null

  @Column('varchar', { name: 'contact_name', length: 128, comment: '联系人姓名' })
  contactName: string

  @Column('varchar', { length: 32, comment: '联系电话' })
  phone: string

  @Column('varchar', { length: 128, nullable: true, comment: '电子邮箱（非必填）' })
  email: string | null

  @Column('varchar', { length: 128, nullable: true, comment: '微信号' })
  wechat: string | null

  @Column('varchar', { length: 128, nullable: true, comment: '昵称' })
  nickname: string | null

  @Column('varchar', { name: 'avatar_url', length: 512, nullable: true, comment: '头像 URL' })
  avatarUrl: string | null

  @Column('varchar', { length: 512, nullable: true, comment: '默认地址' })
  address: string | null

  @Column('varchar', { length: 64, nullable: true, comment: '城市' })
  city: string | null

  @Column('varchar', { length: 64, nullable: true, comment: '省份' })
  province: string | null

  // 订阅状态（C 端零售）
  @Column('varchar', { name: 'subscription_status', length: 32, default: 'none', comment: 'none/active/expired' })
  subscriptionStatus: string

  // B 端字段（仅 business 类型使用）
  @Column('varchar', { name: 'wholesale_tier', length: 16, nullable: true, comment: '阶梯定价档位 A/B/C' })
  wholesaleTier: string | null

  // C 端会员字段（仅 retail 类型使用）
  @Column('decimal', { name: 'member_discount_rate', precision: 3, scale: 2, default: 1.0, comment: '会员折扣率' })
  memberDiscountRate: number

  @Column({ name: 'points_balance', type: 'int', default: 0, comment: '积分余额' })
  pointsBalance: number

  // TASK-010: 会员扩展字段
  @Column({ name: 'member_valid_until', type: 'datetime', nullable: true, comment: '会员有效期至' })
  memberValidUntil: Date | null

  @Column({ name: 'member_since', type: 'datetime', nullable: true, comment: '成为会员时间' })
  memberSince: Date | null

  @Column({ name: 'last_active_at', type: 'datetime', nullable: true, comment: '最后活跃时间' })
  lastActiveAt: Date | null

  @Column({ name: 'points_earned', type: 'int', default: 0, comment: '累计获得积分' })
  pointsEarned: number

  @Column({ name: 'points_used', type: 'int', default: 0, comment: '已消耗积分' })
  pointsUsed: number

  // 合作伙伴字段（仅 partner 类型使用）
  @Column({ type: 'json', name: 'partner_services', nullable: true, comment: '["optometry","lens_supply","processing","after_sale"]' })
  partnerServices: string[] | null

  @Column('varchar', {comment: '状态',  length: 32, default: CUSTOMER_STATUS[0] })
  status: string

  @Column('varchar', { name: 'referral_source', length: 32, nullable: true, comment: '来源渠道' })
  referralSource: string | null

  @Column('varchar', { name: 'preferred_style', length: 64, nullable: true, comment: '偏好风格' })
  preferredStyle: string | null

  @Column('varchar', { name: 'wechat_id', length: 128, nullable: true, comment: '微信号（前端字段别名，映射到 wechat）' })
  wechatId: string | null

  // ===== 官网账户字段（2026-04-15 新增） =====
  @Column('varchar', { name: 'password_hash', length: 256, nullable: true, comment: '官网登录密码（bcrypt）' })
  passwordHash: string | null

  @Column('varchar', {
    name: 'account_status',
    length: 32,
    default: 'none',
    comment: '官网账户状态：none(未注册)/active(已激活)/deactivated(已注销)/suspended(已冻结)',
  })
  accountStatus: string

  @Column('timestamp', { name: 'registered_at', nullable: true, comment: '官网账户注册时间' })
  registeredAt: Date | null

  @Column('timestamp', { name: 'last_login_at', nullable: true, comment: '官网账户最后登录时间' })
  lastLoginAt: Date | null

  @Column('varchar', { name: 'password_reset_token', length: 128, nullable: true, comment: '密码重置 Token' })
  passwordResetToken: string | null

  @Column('timestamp', { name: 'password_reset_expires', nullable: true, comment: '密码重置 Token 过期时间' })
  passwordResetExpires: Date | null

  @Column('text', { nullable: true, comment: '备注' })
  notes: string | null

  @Column({ type: 'json', nullable: true, comment: '扩展属性' })
  attributes: Record<string, any> | null

  @Column({ name: 'total_orders', type: 'int', default: 0, comment: '累计订单数' })
  totalOrders: number

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2, default: 0.0, comment: '累计消费金额' })
  totalAmount: number

  @Column({ name: 'last_order_at', type: 'timestamp', nullable: true, comment: '最后下单时间' })
  lastOrderAt: Date | null

  @Column({ name: 'last_contact_at', type: 'timestamp', nullable: true, comment: '最后联系时间' })
  lastContactAt: Date | null

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @OneToMany(() => CustomerContact, (c) => c.customer)
  contacts: CustomerContact[]

  @OneToMany(() => CustomerAddress, (a) => a.customer)
  addresses: CustomerAddress[]

  @OneToMany(() => CustomerTierPricing, (p) => p.customer)
  tierPricings: CustomerTierPricing[]

  @OneToMany(() => VisionPrescription, (p) => p.customer)
  prescriptions: VisionPrescription[]

  @OneToMany(() => CustomerLens, (l) => l.customer)
  lenses: CustomerLens[]
}
