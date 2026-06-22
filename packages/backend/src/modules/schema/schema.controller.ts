/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
// ============================================
// Schema Controller — AI-BOS V2.0
// 暴露行业 Schema 供前端动态表单渲染使用
// ============================================

import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { MCPCapable } from '../../common/decorators/mcp-capable.decorator'
import { SchemaResolver } from '../../schemas/schema-resolver.service'

@Controller('schema')
@UseGuards(JwtAuthGuard)
export class SchemaController {
  constructor(private readonly schemaResolver: SchemaResolver) {}

  /** 获取当前行业的完整 Schema */
  @Get()
  @MCPCapable({ tool: 'schema.get', description: '获取行业完整 Schema 配置', category: 'schema', readOnly: true, industryScoped: true })
  getSchema(@Query('industry') industry?: string) {
    return this.schemaResolver.getSchema(industry)
  }

  /** 列出所有可用行业 */
  @Get('industries')
  @MCPCapable({ tool: 'schema.industries', description: '列出所有可用行业', category: 'schema', readOnly: true })
  listIndustries() {
    return { industries: this.schemaResolver.listIndustries() }
  }

  /** 获取 SPU 属性列表（前端动态表单用） */
  @Get('spu-attributes')
  @MCPCapable({ tool: 'schema.spuAttributes', description: '获取 SPU 属性列表', category: 'schema', readOnly: true, industryScoped: true })
  getSpuAttributes(@Query('industry') industry?: string) {
    return this.schemaResolver.getSpuAttributes(industry)
  }

  /** 获取 SKU 属性列表（前端动态表单用） */
  @Get('sku-attributes')
  @MCPCapable({ tool: 'schema.skuAttributes', description: '获取 SKU 属性列表', category: 'schema', readOnly: true, industryScoped: true })
  getSkuAttributes(@Query('industry') industry?: string) {
    return this.schemaResolver.getSkuAttributes(industry)
  }

  /** 获取效果词库 */
  @Get('effect-thesaurus')
  @MCPCapable({ tool: 'schema.effectThesaurus', description: '获取效果词库', category: 'schema', readOnly: true, industryScoped: true })
  getEffectThesaurus(@Query('industry') industry?: string) {
    return this.schemaResolver.getEffectThesaurus(industry)
  }

  /** 获取定价规则 */
  @Get('pricing-rules')
  @MCPCapable({ tool: 'schema.pricingRules', description: '获取定价规则', category: 'schema', readOnly: true, industryScoped: true })
  getPricingRules(@Query('industry') industry?: string) {
    return this.schemaResolver.getPricingRules(industry)
  }

  /** 生成展示名 */
  @Get('display-name')
  @MCPCapable({
    tool: 'schema.displayName',
    description: '按 Schema 模板生成展示名',
    category: 'schema',
    readOnly: true,
    industryScoped: true,
  })
  generateDisplayName(@Query('industry') industry?: string, @Query('spu') spu?: string, @Query('sku') sku?: string) {
    let spuObj: Record<string, any> = {}
    let skuObj: Record<string, any> = {}
    try {
      if (spu) spuObj = JSON.parse(spu)
      if (sku) skuObj = JSON.parse(sku)
    } catch {
      return { error: 'Invalid spu/sku JSON' }
    }
    return {
      displayName: this.schemaResolver.generateDisplayName(spuObj, skuObj, industry),
    }
  }
}
