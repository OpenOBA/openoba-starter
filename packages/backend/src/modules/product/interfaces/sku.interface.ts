/**
 * SKU 内部类型接口
 * — 不暴露为 DTO，仅用于 service 内部类型签名
 */

/** 技术参数：尺寸 & 材质（validateTechSpecSizes 入参） */
export interface TechSpecInput {
  lensWidth?: number | null
  bridgeWidth?: number | null
  templeLength?: number | null
  totalWidth?: number | null
}

/** 价格变更字段定义 */
export interface PriceFieldDef {
  key: string
  type: string
}

/** 生成 SKU 展示名的输入数据 */
export interface SkuDisplayNameInput {
  spuId?: string
  spu?: { structureStandardCode?: string; seriesCode?: string; gender?: string } | Record<string, unknown>
  structureStandardCode?: string
  colorCode?: string
  skinToneEffect?: string
  faceShapeEffect?: string
}
