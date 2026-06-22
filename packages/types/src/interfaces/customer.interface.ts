/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
// @openoba/types — 客户层接口
// 来源：customer.entity.ts
// V1.4-b M1 Step 4

import { CustomerType, CustomerLevel, CustomerStatus, AccountStatus, SubscriptionStatus, PricingTier } from '../enums/customer.enum'

export interface ICustomer {
  /** UUID 主键 */
  customerId: string
  /** 系统编号（OBA-CUS-000001 / OBA-BUS-000001 / OBA-PTN-000001） */
  customerCode: string
  /** 客户类型 */
  customerType?: CustomerType
  /** 客户等级 */
  customerLevel?: CustomerLevel
  /** 企业名称 */
  companyName: string | null
  /** 联系人姓名 */
  contactName: string
  /** 联系电话 */
  phone: string
  /** 电子邮箱 */
  email: string | null
  /** 微信号 */
  wechat: string | null
  /** 昵称 */
  nickname: string | null
  /** 头像 URL */
  avatarUrl: string | null
  /** 默认地址 */
  address: string | null
  /** 城市 */
  city: string | null
  /** 省份 */
  province: string | null
  /** 订阅状态 */
  subscriptionStatus: SubscriptionStatus
  /** 批发阶梯档位 */
  wholesaleTier: string | null
  /** 会员折扣率 */
  memberDiscountRate: number
  /** 积分余额 */
  pointsBalance: number
  /** 会员有效期至 */
  memberValidUntil: Date | null
  /** 成为会员时间 */
  memberSince: Date | null
  /** 最后活跃时间 */
  lastActiveAt: Date | null
  /** 累计获得积分 */
  pointsEarned: number
  /** 已消耗积分 */
  pointsUsed: number
  /** 合作伙伴服务 */
  partnerServices: string[] | null
  /** 状态 */
  status: CustomerStatus
  /** 来源渠道 */
  referralSource: string | null
  /** 偏好风格 */
  preferredStyle: string | null
  /** 微信号（前端别名） */
  wechatId: string | null
  /** 官网登录密码 hash */
  passwordHash: string | null
  /** 官网账户状态 */
  accountStatus: AccountStatus
  /** 官网注册时间 */
  registeredAt: Date | null
  /** 最后登录时间 */
  lastLoginAt: Date | null
  /** 密码重置 Token */
  passwordResetToken: string | null
  /** 密码重置 Token 过期时间 */
  passwordResetExpires: Date | null
  /** 备注 */
  notes: string | null
  /** 扩展属性 */
  attributes: Record<string, any> | null
  /** 累计订单数 */
  totalOrders: number
  /** 累计消费金额 */
  totalAmount: number
  /** 最后下单时间 */
  lastOrderAt: Date | null
  /** 最后联系时间 */
  lastContactAt: Date | null
  /** 软删除标记 */
  isDeleted: boolean
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
}
