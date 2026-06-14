/**
 * 秒镜科技 · ERDL — ERDL Rule Engine 单元测试
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
  })
})
