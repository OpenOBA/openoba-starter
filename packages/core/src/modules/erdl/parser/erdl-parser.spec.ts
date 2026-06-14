/**
 * 秒镜科技 · ERDL — ERDL Parser 单元测试
 *
 * @file erdl-parser.spec.ts
 * @author 唐浩然
 * @since 2026-05-01
 */

import { ERDLParser } from './erdl-parser'

describe('ERDLParser', () => {
  describe('parseString', () => {
    it('should parse a valid ERDL YAML string', () => {
      const yaml = `
namespace: com.test.example
module:
  version: "1.0.0"
entities:
  Product:
    properties:
      id: { type: "UUID", required: true }
      name: { type: "String", required: true }
      price: { type: "Money(CNY)" }
`
      const ast = ERDLParser.parseString(yaml)

      expect(ast.namespace).toBe('com.test.example')
      expect(ast.module?.version).toBe('1.0.0')
      expect(ast.entities).toBeDefined()
      expect(ast.entities!['Product']).toBeDefined()
      expect(ast.entities!['Product'].properties['id']).toBeDefined()
      expect(ast.entities!['Product'].properties['name']).toBeDefined()
    })

    it('should parse rulesets with policies', () => {
      const yaml = `
namespace: com.test
rulesets:
  PricingRules:
    policies:
      - name: "VIP Discount"
        priority: 1
        trigger: "Product.price.calculate"
        tier: policy
        entity: Product
        condition:
          logic: AND
          conditions:
            - field: "customer.tier"
              operator: eq
              value: "VIP"
        actions:
          - type: calculate
            params:
              formula: "retailPrice * 0.8"
`
      const ast = ERDLParser.parseString(yaml)

      expect(ast.rulesets).toBeDefined()
      expect(ast.rulesets!['PricingRules'].policies).toHaveLength(1)
      expect(ast.rulesets!['PricingRules'].policies![0].name).toBe('VIP Discount')
    })

    it('should parse agents and knowledgeBases', () => {
      const yaml = `
namespace: com.test
agents:
  RecommendAgent:
    capabilities:
      - face_analysis
    knowledgeBases:
      - "product-kb"
knowledgeBases:
  product-kb:
    type: STRUCTURED
    source:
      type: API
      endpoint: "/api/products"
`
      const ast = ERDLParser.parseString(yaml)

      expect(ast.agents).toBeDefined()
      expect(ast.agents!['RecommendAgent'].capabilities).toContain('face_analysis')
      expect(ast.knowledgeBases).toBeDefined()
      expect(ast.knowledgeBases!['product-kb'].source?.endpoint).toBe('/api/products')
    })
  })

  describe('validate', () => {
    it('should return valid=true for correct ERDL YAML', () => {
      const yaml = `
namespace: com.test
entities:
  Item:
    properties:
      id: { type: "String" }
`
      const result = ERDLParser.validate(yaml)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return valid=false for empty content', () => {
      const result = ERDLParser.validate('')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should return valid=false for missing namespace', () => {
      const yaml = `
entities:
  Item:
    properties: {}
`
      const result = ERDLParser.validate(yaml)
      expect(result.valid).toBe(false)
    })
  })
})
