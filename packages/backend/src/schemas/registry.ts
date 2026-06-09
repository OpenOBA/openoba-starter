// ============================================
// 行业 Schema 注册表 — AI-BOS V2.0
// ============================================

import { IndustrySchema } from './types'
import { eyewearSchema } from './eyewear.schema'

/** 已注册的行业 Schema */
const registered: Record<string, IndustrySchema> = {
  eyewear: eyewearSchema,
}

/** 按行业代码获取 Schema */
export function getSchema(industry: string): IndustrySchema {
  const schema = registered[industry]
  if (!schema) {
    throw new Error(`未知行业: "${industry}"。可用行业: ${Object.keys(registered).join(', ')}`)
  }
  return schema
}

/** 获取所有可用行业代码 */
export function listIndustries(): string[] {
  return Object.keys(registered)
}

/** 注册新行业 Schema（扩展用） */
export function registerSchema(industry: string, schema: IndustrySchema): void {
  registered[industry] = schema
}
