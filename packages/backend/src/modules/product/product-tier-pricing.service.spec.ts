/* eslint-disable @typescript-eslint/no-explicit-any -- Jest mock 生态刚需 */
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ProductTierPricingService } from './product-tier-pricing.service'
import { ProductTierPricing } from './entity/product-tier-pricing.entity'

function mockRepo() {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOneBy: jest.fn().mockResolvedValue(null),
    create: jest.fn((d: unknown) => d),
    save: jest.fn((e: unknown) => Promise.resolve(e)),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  }
}

describe('ProductTierPricingService', () => {
  let service: ProductTierPricingService
  let repo: ReturnType<typeof mockRepo>

  beforeEach(async () => {
    repo = mockRepo()
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductTierPricingService, { provide: getRepositoryToken(ProductTierPricing), useValue: repo }],
    }).compile()
    service = module.get<ProductTierPricingService>(ProductTierPricingService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should find all', async () => {
    const result = await service.findAll()
    expect(result).toEqual([])
  })

  it('should create', async () => {
    const result = await service.create({ tier: 'A', discountRate: 0.8 } as any)
    expect(result).toBeDefined()
    expect(repo.save).toHaveBeenCalled()
  })

  it('should remove', async () => {
    const result = await service.remove('t1')
    expect(result.success).toBe(true)
    expect(repo.update).toHaveBeenCalled()
  })
})
