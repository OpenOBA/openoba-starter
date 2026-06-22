/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
// @openoba/types — 商品层接口
// 来源：product-sku.entity.ts
// V1.4-b M1 Step 4

import { SkuStatus, ImageType, GenderType, UVProtectionLevel } from '../enums/product.enum'

export interface IProductSku {
  /** UUID 主键 */
  skuId: string
  /** SKU 编码（唯一） */
  skuCode: string
  /** 关联 SPU ID */
  spuId: string
  /** SKU 名称 */
  skuName?: string
  /** 色彩代码 */
  colorCode: string
  /** 肤色效果词 */
  skinToneEffect?: string
  /** 脸型效果词 */
  faceShapeEffect?: string
  /** 完整展示名 */
  displayName?: string
  /** 结构标准编码（锚点） */
  structureStandardCode: string
  /** 产品层级 */
  productTier?: string
  /** SKU 属性快照 */
  skuAttributes?: Record<string, any>
  /** 成本价 */
  costPrice?: number
  /** 统一零售价 */
  retailPrice: number
  /** 最低售价 */
  minPrice?: number
  /** 状态 */
  status: SkuStatus
  /** 图片类型 */
  imageType?: ImageType
  /** 性别适配 */
  gender?: GenderType
  /** 紫外线防护等级 */
  uvProtection?: UVProtectionLevel
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
}
