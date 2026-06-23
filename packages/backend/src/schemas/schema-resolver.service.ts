/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
// ============================================
// Schema 解析器 — 将 Schema 配置转化为运行时服务
// AI-BOS V2.0
// ============================================

import { Injectable } from '@nestjs/common'
import { getSchema, listIndustries, registerSchema } from './registry'
import { IndustrySchema, SchemaAttribute, PricingRule, MemberTier } from './types'

@Injectable()
export class SchemaResolver {
  /** 获取当前行业的完整 Schema */
  getSchema(industry?: string): IndustrySchema {
    return getSchema(industry || 'eyewear')
  }

  /** 获取 SPU 属性列表 */
  getSpuAttributes(industry?: string): SchemaAttribute[] {
    return this.getSchema(industry).product.spuAttributes
  }

  /** 获取 SKU 属性列表 */
  getSkuAttributes(industry?: string): SchemaAttribute[] {
    return this.getSchema(industry).product.skuAttributes
  }

  /** 生成展示名（按 namingTemplate 替换变量） */
  generateDisplayName(spu: Record<string, unknown>, sku: Record<string, unknown>, industry?: string): string {
    const schema = this.getSchema(industry)
    let name = schema.product.namingTemplate

    // 替换 SPU 变量: {spu.key}
    for (const attr of schema.product.spuAttributes) {
      name = name.replace(`{spu.${attr.key}}`, (spu[attr.key] as string) || '')
    }

    // 替换 SKU 变量: {sku.key}
    for (const attr of schema.product.skuAttributes) {
      name = name.replace(`{sku.${attr.key}}`, (sku[attr.key] as string) || '')
    }

    return name
  }

  /** 获取定价规则 */
  getPricingRules(industry?: string): PricingRule[] {
    return this.getSchema(industry).pricing.rules
  }

  /** 获取会员等级 */
  getMemberTiers(industry?: string): MemberTier[] {
    return this.getSchema(industry).customer.memberTiers
  }

  /** 获取效果词库 */
  getEffectThesaurus(industry?: string) {
    return this.getSchema(industry).effectThesaurus
  }

  /** 获取推荐的效果词组合（按色彩） */
  getRecommendedEffects(colorName: string, industry?: string): { skin?: string; face?: string } | null {
    const mapping = this.getSchema(industry).effectThesaurus.colorEffectMapping
    return mapping?.[colorName] || null
  }

  /** 列出所有可用行业 */
  listIndustries(): string[] {
    return listIndustries()
  }

  /** 注册新行业 */
  registerSchema(industry: string, schema: IndustrySchema): void {
    registerSchema(industry, schema)
  }
}
