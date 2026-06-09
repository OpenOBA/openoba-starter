// @openoba/types — 商品层枚举
// 来源：product.constants.ts + MemberPricingRule + SkuImage + Spu inline defaults
// V1.4-b M1 Step 3

/** 商品状态 */
export const PRODUCT_STATUS = ['draft', 'on_sale', 'off_sale'] as const
export type ProductStatus = (typeof PRODUCT_STATUS)[number]

/** SKU 状态 */
export const SKU_STATUS = ['active', 'inactive', 'discontinued'] as const
export type SkuStatus = (typeof SKU_STATUS)[number]

/** 促销状态 */
export const PROMOTION_STATUS = ['draft', 'active', 'paused', 'expired'] as const
export type PromotionStatus = (typeof PROMOTION_STATUS)[number]

/** 定价规则类型 */
export const RULE_TYPE = ['discount', 'fixed_price', 'extra_discount'] as const
export type RuleType = (typeof RULE_TYPE)[number]

/** 色彩类型 */
export const COLOR_TYPE = ['solid', 'gradient', 'pattern', 'transparent'] as const
export type ColorType = (typeof COLOR_TYPE)[number]

/** 商品图片类型 */
export const IMAGE_TYPE = ['main', 'gallery', 'detail', 'lifestyle', '360view', 'website_banner'] as const
export type ImageType = (typeof IMAGE_TYPE)[number]

/** 性别适配 */
export const GENDER_TYPE = ['unisex', 'male', 'female', 'kids'] as const
export type GenderType = (typeof GENDER_TYPE)[number]

/** 紫外线防护等级 */
export const UV_PROTECTION_LEVEL = ['none', 'UV380', 'UV400', 'UV420'] as const
export type UVProtectionLevel = (typeof UV_PROTECTION_LEVEL)[number]

/** 表面类型（镜片） */
export const SURFACE_TYPES = ['SPH', 'ASP', 'DAS', 'FRM'] as const
export type SurfaceType = (typeof SURFACE_TYPES)[number]
