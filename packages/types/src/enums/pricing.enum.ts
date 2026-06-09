// @openoba/types — 定价/Pricing 枚举
// 来源：product/dto/pricing.dto.ts
// V1.4-b M1 Step 3

/** 促销规则类型 */
export const PRICING_RULE_TYPE = ['discount', 'flash_sale', 'bundle', 'coupon', 'member_exclusive'] as const
export type PricingRuleType = (typeof PRICING_RULE_TYPE)[number]

/** 促销目标类型 */
export const PRICING_TARGET_TYPE = ['all', 'category', 'spu', 'sku'] as const
export type PricingTargetType = (typeof PRICING_TARGET_TYPE)[number]

/** 折扣类型 */
export const DISCOUNT_TYPE = ['percent', 'fixed_amount'] as const
export type DiscountType = (typeof DISCOUNT_TYPE)[number]
