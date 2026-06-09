// ============================================
// 行业 Schema 类型定义 — AI-BOS V2.0
// ============================================

/** 行业 Schema — 定义了某一行业在商品、客户、定价、效果词等维度的全部配置 */
export interface IndustrySchema {
  industry: string
  version: string

  /** 运行时配置 — 前端 UI 可直接消费，无需硬编码 */
  config?: RuntimeConfig

  // 商品层
  product: {
    spuAttributes: SchemaAttribute[]
    skuAttributes: SchemaAttribute[]
    namingTemplate: string
    namingExample: string
  }

  // 客户层
  customer: {
    tags: string[]
    memberTiers: MemberTier[]
    lensRecommend?: boolean
  }

  // 定价层
  pricing: {
    rules: PricingRule[]
  }

  // 效果词库（行业特有）
  effectThesaurus: {
    skinEffects?: string[]
    faceEffects?: string[]
    colorEffectMapping?: Record<string, { skin?: string; face?: string }>
  }
}

/**
 * 运行时配置 — 将前端硬编码的选项、映射、默认值移到 Schema
 * 新增行业只需要改这里的配置，前端零改动
 */
export interface RuntimeConfig {
  /** 场景标签列表 */
  sceneTags?: string[]

  /** 款式映射 (key 存 DB, value 展示名) */
  genderOptions?: { value: string; label: string; tagType?: string }[]

  /** 状态选项 */
  statusOptions?: { value: string; label: string; tagType?: string }[]

  /** 造型映射 (key = shapeCode, value = 中文名) */
  shapeLabels?: Record<string, string>

  /** 系列映射 */
  seriesLabels?: Record<string, string>

  /** 脸型映射 (key 存 DB, value 展示名) */
  faceShapeLabels?: Record<string, string>

  /** UV 防护选项 */
  uvProtectionOptions?: { value: string; label: string }[]

  /** 产品级别映射 */
  tierLabels?: Record<string, { name: string; color: string }>

  /** 额外配置（行业专属） */
  extra?: Record<string, any>
}

/** Schema 属性定义 */
export interface SchemaAttribute {
  key: string
  label: string
  type: 'dict' | 'computed' | 'enum' | 'text' | 'number' | 'boolean' | 'select'
  dictTable?: string
  values?: string[]
  required?: boolean
}

/** 会员等级 */
export interface MemberTier {
  level: string
  threshold: number
}

/** 定价规则 */
export interface PricingRule {
  name: string
  field?: string
  type: 'tiered' | 'flat_add' | 'multiplier' | 'formula'
  multiplier?: number
  condition?: string
}

/** 行业 Schema 注册表 — 用于按行业查找对应的 Schema */
export interface SchemaRegistry {
  industries: Record<string, IndustrySchema>
}
