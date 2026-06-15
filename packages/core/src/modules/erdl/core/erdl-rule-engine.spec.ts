/**
 * OpenOBA · ERDL Rule Engine 单元测试
 *
 * @file erdl-rule-engine.spec.ts
 * @author 唐浩然
 * @since 2026-05-01
 */

import { ERDLRuleEngine } from './erdl-rule-engine'
import { ERDLRegistry } from './erdl-registry'

// Mock ERDLRegistry
function createMockRegistry(): ERDLRegistry {
  return {
    getRulesByTrigger: jest.fn(),
    getAllRules: jest.fn(),
    getEntity: jest.fn(),
    getAllEntities: jest.fn(),
  } as unknown as ERDLRegistry
}

describe('ERDLRuleEngine', () => {
  let engine: ERDLRuleEngine
  let mockRegistry: jest.Mocked<ERDLRegistry>

  beforeEach(() => {
    mockRegistry = createMockRegistry() as jest.Mocked<ERDLRegistry>
    engine = new ERDLRuleEngine(mockRegistry)
  })

  describe('evaluate', () => {
    it('should return matched=false when no rules exist for trigger', async () => {
      mockRegistry.getRulesByTrigger.mockReturnValue([])

      const result = await engine.evaluate('Product.price.calculate', { retailPrice: 100 })

      expect(result.matched).toBe(false)
    })

    it('should match a VIP discount rule', async () => {
      mockRegistry.getRulesByTrigger.mockReturnValue([
        {
          id: 'rule-vip',
          name: 'VIP 折扣',
          namespace: 'com.test',
          entity: 'Product',
          trigger: 'Product.price.calculate',
          priority: 1,
          tier: 'policy' as const,
          condition: {
            logic: 'AND' as const,
            conditions: [
              { field: 'customer.tier', operator: 'eq' as const, value: 'VIP' },
            ],
          },
          actions: [
            { type: 'calculate' as const, params: { formula: 'retailPrice * 0.8' } },
          ],
          isActive: true,
          createdAt: new Date(),
          version: 1,
        },
      ])

      const result = await engine.evaluate('Product.price.calculate', {
        retailPrice: 299,
        customer: { tier: 'VIP' },
      })

      expect(result.matched).toBe(true)
      expect(result.ruleName).toBe('VIP 折扣')
      expect(result.result).toBeCloseTo(239.2, 1) // 299 * 0.8
    })

    it('should respect priority ordering', async () => {
      mockRegistry.getRulesByTrigger.mockReturnValue([
        {
          id: 'rule-low',
          name: 'Low Priority',
          namespace: 'com.test',
          entity: 'Product',
          trigger: 'Product.price.calculate',
          priority: 10,
          tier: 'policy' as const,
          condition: { logic: 'AND', conditions: [{ field: 'x', operator: 'gt', value: 0 }] },
          actions: [{ type: 'calculate', params: { formula: 'retailPrice * 0.9' } }],
          isActive: true,
          createdAt: new Date(),
          version: 1,
        },
        {
          id: 'rule-high',
          name: 'High Priority',
          namespace: 'com.test',
          entity: 'Product',
          trigger: 'Product.price.calculate',
          priority: 1,
          tier: 'policy' as const,
          condition: { logic: 'AND', conditions: [{ field: 'x', operator: 'gt', value: 0 }] },
          actions: [{ type: 'calculate', params: { formula: 'retailPrice * 0.7' } }],
          isActive: true,
          createdAt: new Date(),
          version: 1,
        },
      ])

      const result = await engine.evaluate('Product.price.calculate', {
        retailPrice: 100,
        x: 5,
      })

      expect(result.matched).toBe(true)
      expect(result.ruleName).toBe('High Priority') // priority 1 wins
      expect(result.result).toBe(70) // 100 * 0.7
    })
  })

  describe('validate', () => {
    it('should pass when no validation rules exist', () => {
      mockRegistry.getAllRules.mockReturnValue([])

      const result = engine.validate('ProductSpu', { name: 'Test' })

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should collect errors from failed validation rules', () => {
      mockRegistry.getAllRules.mockReturnValue([
        {
          id: 'rule-v1',
          name: '价格必须大于0',
          namespace: 'com.test',
          entity: 'ProductSpu',
          trigger: undefined,
          priority: 10,
          tier: 'validation' as const,
          condition: { logic: 'AND', conditions: [{ field: 'price', operator: 'gt', value: 0 }] },
          actions: [{ type: 'validate', params: { error: '价格必须大于 0' } }],
          isActive: true,
          createdAt: new Date(),
          version: 1,
        },
      ])

      const result = engine.validate('ProductSpu', { price: -5 })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('价格必须大于 0')
    })

    // ============================================
    // P1-2 新增测试：从 5 → 15+ it()
    // ============================================

    it('should skip inactive rules', async () => {
      mockRegistry.getRulesByTrigger.mockReturnValue([
        {
          id: 'rule-disabled',
          name: 'Disabled Discount',
          namespace: 'com.test',
          entity: 'Product',
          trigger: 'Product.price.calculate',
          priority: 1,
          tier: 'policy' as const,
          condition: { logic: 'AND' as const, conditions: [] },
          actions: [{ type: 'calculate' as const, params: { formula: '0' } }],
          isActive: false,
          createdAt: new Date(),
          version: 1,
        },
      ])

      const result = await engine.evaluate('Product.price.calculate', { retailPrice: 100 })
      expect(result.matched).toBe(false)
    })

    it('should chain through rules: first unmatched → second matched', async () => {
      mockRegistry.getRulesByTrigger.mockReturnValue([
        {
          id: 'rule-a',
          name: 'Rule A (will not match)',
          namespace: 'com.test',
          entity: 'Product',
          trigger: 'Product.price.calculate',
          priority: 1,
          tier: 'policy' as const,
          condition: { logic: 'AND' as const, conditions: [{ field: 'customer.tier', operator: 'eq' as const, value: 'VIP' }] },
          actions: [{ type: 'calculate' as const, params: { formula: 'retailPrice * 0.8' } }],
          isActive: true,
          createdAt: new Date(),
          version: 1,
        },
        {
          id: 'rule-b',
          name: 'Rule B (should match)',
          namespace: 'com.test',
          entity: 'Product',
          trigger: 'Product.price.calculate',
          priority: 2,
          tier: 'policy' as const,
          condition: { logic: 'AND' as const, conditions: [{ field: 'customer.tier', operator: 'eq' as const, value: 'NORMAL' }] },
          actions: [{ type: 'calculate' as const, params: { formula: 'retailPrice * 0.95' } }],
          isActive: true,
          createdAt: new Date(),
          version: 1,
        },
      ])

      const result = await engine.evaluate('Product.price.calculate', {
        retailPrice: 200,
        customer: { tier: 'NORMAL' },
      })

      expect(result.matched).toBe(true)
      expect(result.ruleName).toBe('Rule B (should match)')
      expect(result.result).toBe(190) // 200 * 0.95
    })

    it('should evaluate nested OR conditions', async () => {
      mockRegistry.getRulesByTrigger.mockReturnValue([
        {
          id: 'rule-or',
          name: 'OR Discount',
          namespace: 'com.test',
          entity: 'Product',
          trigger: 'Product.price.calculate',
          priority: 1,
          tier: 'policy' as const,
          condition: {
            logic: 'OR' as const,
            conditions: [
              { field: 'customer.tier', operator: 'eq' as const, value: 'VIP' },
              { field: 'customer.tier', operator: 'eq' as const, value: 'AGENT' },
            ],
          },
          actions: [{ type: 'calculate' as const, params: { formula: 'retailPrice * 0.85' } }],
          isActive: true,
          createdAt: new Date(),
          version: 1,
        },
      ])

      const result = await engine.evaluate('Product.price.calculate', {
        retailPrice: 100,
        customer: { tier: 'AGENT' },
      })
      expect(result.matched).toBe(true)
      expect(result.result).toBe(85)
    })

    it('should evaluate deeply nested AND+OR conditions', async () => {
      mockRegistry.getRulesByTrigger.mockReturnValue([
        {
          id: 'rule-nested',
          name: 'Nested Condition Discount',
          namespace: 'com.test',
          entity: 'Product',
          trigger: 'Product.price.calculate',
          priority: 1,
          tier: 'policy' as const,
          condition: {
            logic: 'AND' as const,
            conditions: [
              {
                logic: 'OR' as const,
                conditions: [
                  { field: 'customer.tier', operator: 'eq' as const, value: 'VIP' },
                  { field: 'customer.tier', operator: 'eq' as const, value: 'AGENT' },
                ],
              },
              { field: 'hasCoupon', operator: 'eq' as const, value: true },
            ],
          },
          actions: [{ type: 'calculate' as const, params: { formula: 'retailPrice * 0.7' } }],
          isActive: true,
          createdAt: new Date(),
          version: 1,
        },
      ])

      // VIP + coupon → should match
      const result = await engine.evaluate('Product.price.calculate', {
        retailPrice: 100,
        customer: { tier: 'VIP' },
        hasCoupon: true,
      })
      expect(result.matched).toBe(true)
      expect(result.result).toBe(70)

      // NORMAL + coupon → should NOT match (OR fails)
      mockRegistry.getRulesByTrigger.mockReturnValue([
        {
          id: 'rule-nested',
          name: 'Nested Condition Discount',
          namespace: 'com.test',
          entity: 'Product',
          trigger: 'Product.price.calculate',
          priority: 1,
          tier: 'policy' as const,
          condition: {
            logic: 'AND' as const,
            conditions: [
              {
                logic: 'OR' as const,
                conditions: [
                  { field: 'customer.tier', operator: 'eq' as const, value: 'VIP' },
                  { field: 'customer.tier', operator: 'eq' as const, value: 'AGENT' },
                ],
              },
              { field: 'hasCoupon', operator: 'eq' as const, value: true },
            ],
          },
          actions: [{ type: 'calculate' as const, params: { formula: 'retailPrice * 0.7' } }],
          isActive: true,
          createdAt: new Date(),
          version: 1,
        },
      ])
      const result2 = await engine.evaluate('Product.price.calculate', {
        retailPrice: 100,
        customer: { tier: 'NORMAL' },
        hasCoupon: true,
      })
      expect(result2.matched).toBe(false)
    })

    it('should gracefully handle formula with property access (defense-in-depth)', async () => {
      mockRegistry.getRulesByTrigger.mockReturnValue([
        {
          id: 'rule-danger',
          name: 'Dangerous rule',
          namespace: 'com.test',
          entity: 'Product',
          trigger: 'Product.price.calculate',
          priority: 1,
          tier: 'policy' as const,
          condition: { logic: 'AND' as const, conditions: [] },
          actions: [{ type: 'calculate' as const, params: { formula: 'constructor.prototype' } }],
          isActive: true,
          createdAt: new Date(),
          version: 1,
        },
      ])
      mockRegistry.getAllRules.mockReturnValue([])

      // Formula errors are caught gracefully: matched=true, result=null
      const result = await engine.evaluate('Product.price.calculate', { retailPrice: 100 })
      expect(result.matched).toBe(true)
      expect(result.ruleName).toBe('Dangerous rule')
      expect(result.result).toBeNull()
    })

    it('should gracefully handle division by zero', async () => {
      mockRegistry.getRulesByTrigger.mockReturnValue([
        {
          id: 'rule-divzero',
          name: 'Divide by zero',
          namespace: 'com.test',
          entity: 'Product',
          trigger: 'Product.price.calculate',
          priority: 1,
          tier: 'policy' as const,
          condition: { logic: 'AND' as const, conditions: [] },
          actions: [{ type: 'calculate' as const, params: { formula: 'retailPrice / x' } }],
          isActive: true,
          createdAt: new Date(),
          version: 1,
        },
      ])

      const result = await engine.evaluate('Product.price.calculate', { retailPrice: 100, x: 0 })
      expect(result.matched).toBe(true)
      expect(result.result).toBeNull()
    })

    it('should gracefully handle undefined variable', async () => {
      mockRegistry.getRulesByTrigger.mockReturnValue([
        {
          id: 'rule-missing',
          name: 'Missing variable',
          namespace: 'com.test',
          entity: 'Product',
          trigger: 'Product.price.calculate',
          priority: 1,
          tier: 'policy' as const,
          condition: { logic: 'AND' as const, conditions: [] },
          actions: [{ type: 'calculate' as const, params: { formula: 'retailPrice * unknownVar' } }],
          isActive: true,
          createdAt: new Date(),
          version: 1,
        },
      ])

      const result = await engine.evaluate('Product.price.calculate', { retailPrice: 100 })
      expect(result.matched).toBe(true)
      expect(result.result).toBeNull()
    })

    it('should handle negative numbers and parentheses', async () => {
      mockRegistry.getRulesByTrigger.mockReturnValue([
        {
          id: 'rule-complex',
          name: 'Complex formula',
          namespace: 'com.test',
          entity: 'Product',
          trigger: 'Product.price.calculate',
          priority: 1,
          tier: 'policy' as const,
          condition: { logic: 'AND' as const, conditions: [] },
          actions: [{ type: 'calculate' as const, params: { formula: '(retailPrice - 50) * (1 + a)' } }],
          isActive: true,
          createdAt: new Date(),
          version: 1,
        },
      ])

      const result = await engine.evaluate('Product.price.calculate', {
        retailPrice: 300,
        a: 0.1,
      })
      expect(result.result).toBeCloseTo(275, 0) // (300 - 50) * 1.1 = 275
    })

    it('should only match validation rules for the correct entity', () => {
      mockRegistry.getAllRules.mockReturnValue([
        {
          id: 'rule-other-entity',
          name: 'Different entity validation',
          namespace: 'com.test',
          entity: 'Order',
          trigger: undefined,
          priority: 10,
          tier: 'validation' as const,
          condition: { logic: 'AND', conditions: [{ field: 'total', operator: 'gt', value: 0 }] },
          actions: [{ type: 'validate', params: { error: 'Total must be positive' } }],
          isActive: true,
          createdAt: new Date(),
          version: 1,
        },
      ])

      const result = engine.validate('ProductSpu', { price: -5 })
      // Order 的校验规则不应该应用在 ProductSpu 上
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})
