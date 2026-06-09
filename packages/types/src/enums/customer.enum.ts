// @openoba/types — 客户层枚举
// 来源：customer.entity.ts + customer-tier-pricing.entity.ts + customer-auth login-log
// V1.4-b M1 Step 3

/** 客户类型 */
export const CUSTOMER_TYPES = ['retail', 'business', 'partner'] as const
export type CustomerType = (typeof CUSTOMER_TYPES)[number]

/** 客户等级 */
export const CUSTOMER_LEVELS = ['normal', 'vip', 'svip', 'gold'] as const
export type CustomerLevel = (typeof CUSTOMER_LEVELS)[number]

/** 客户状态 */
export const CUSTOMER_STATUS = ['active', 'inactive', 'blacklisted', 'dormant', 'trial'] as const
export type CustomerStatus = (typeof CUSTOMER_STATUS)[number]

/** 客户账户状态（官网） */
export const ACCOUNT_STATUS = ['none', 'active', 'deactivated', 'suspended'] as const
export type AccountStatus = (typeof ACCOUNT_STATUS)[number]

/** 订阅状态 */
export const SUBSCRIPTION_STATUS = ['none', 'active', 'expired'] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[number]

/** 定价分级档位 */
export const PRICING_TIERS = ['A', 'B', 'C'] as const
export type PricingTier = (typeof PRICING_TIERS)[number]

/** 登录方式 */
export const LOGIN_METHODS = ['sms_code', 'password', 'admin_create'] as const
export type LoginMethod = (typeof LOGIN_METHODS)[number]

/** 登录结果 */
export const LOGIN_RESULTS = [
  'success',
  'failed_wrong_code',
  'failed_expired',
  'failed_no_account',
  'failed_suspended',
] as const
export type LoginResult = (typeof LOGIN_RESULTS)[number]
