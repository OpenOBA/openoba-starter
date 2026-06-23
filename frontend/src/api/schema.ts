// ============================================
// Schema API 客户端 — AI-BOS V2.0
// 用于获取行业 Schema 配置，驱动动态表单渲染
// ============================================

import request from './request'

/** Schema 属性定义 */
export interface SchemaAttribute {
  key: string
  label: string
  type: 'dict' | 'enum' | 'computed' | 'text' | 'number' | 'boolean' | 'select'
  dictTable?: string
  values?: string[]
  required?: boolean
}

/** 定价规则 */
export interface PricingRule {
  name: string
  field: string
  type: string
  condition?: string
  multiplier?: number
}

/** 会员等级 */
export interface MemberTier {
  level: string
  threshold: number
}

/** 效果词库 */
export interface EffectThesaurus {
  skinEffects: string[]
  faceEffects: string[]
  colorEffectMapping: Record<string, { skin: string; face: string }>
}

/** 运行时配置项 */
export interface RuntimeConfig {
  sceneTags?: string[]
  genderOptions?: { value: string; label: string; tagType?: string }[]
  statusOptions?: { value: string; label: string; tagType?: string }[]
  shapeLabels?: Record<string, string>
  seriesLabels?: Record<string, string>
  faceShapeLabels?: Record<string, string>
  uvProtectionOptions?: { value: string; label: string }[]
  tierLabels?: Record<string, { name: string; color: string }>
  extra?: Record<string, unknown>
}

/** 完整行业 Schema */
export interface IndustrySchema {
  industry: string
  version: string
  config?: RuntimeConfig
  product: {
    spuAttributes: SchemaAttribute[]
    skuAttributes: SchemaAttribute[]
    namingTemplate: string
    namingExample: string
  }
  customer: {
    tags: string[]
    memberTiers: MemberTier[]
    lensRecommend: boolean
  }
  pricing: {
    rules: PricingRule[]
  }
  effectThesaurus: EffectThesaurus
}

/**
 * 获取完整行业 Schema
 */
export function getSchema(industry?: string): Promise<IndustrySchema> {
  const params: Record<string, string> = {}
  if (industry) params.industry = industry
  return request.get('/schema', { params })
}

/**
 * 列出所有可用行业
 */
export function listIndustries(): Promise<{ industries: string[] }> {
  return request.get('/schema/industries')
}

/**
 * 获取 SPU 属性列表
 */
export function getSpuAttributes(industry?: string): Promise<SchemaAttribute[]> {
  const params: Record<string, string> = {}
  if (industry) params.industry = industry
  return request.get('/schema/spu-attributes', { params })
}

/**
 * 获取 SKU 属性列表
 */
export function getSkuAttributes(industry?: string): Promise<SchemaAttribute[]> {
  const params: Record<string, string> = {}
  if (industry) params.industry = industry
  return request.get('/schema/sku-attributes', { params })
}

/**
 * 获取效果词库
 */
export function getEffectThesaurus(industry?: string): Promise<EffectThesaurus> {
  const params: Record<string, string> = {}
  if (industry) params.industry = industry
  return request.get('/schema/effect-thesaurus', { params })
}

/**
 * 获取定价规则
 */
export function getPricingRules(industry?: string): Promise<PricingRule[]> {
  const params: Record<string, string> = {}
  if (industry) params.industry = industry
  return request.get('/schema/pricing-rules', { params })
}

/**
 * 生成展示名（按 Schema 模板）
 */
export function generateDisplayName(
  spuData: Record<string, unknown>,
  skuData: Record<string, unknown>,
  industry?: string,
): Promise<{ displayName: string }> {
  return request.get('/schema/display-name', {
    params: {
      industry,
      spu: JSON.stringify(spuData),
      sku: JSON.stringify(skuData),
    },
  })
}
