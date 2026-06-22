/* eslint-disable @typescript-eslint/no-explicit-any -- Jest mock 生态刚需 */
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { PricingService } from './pricing.service'
import { ProductTierPricing } from './entity/product-tier-pricing.entity'
import { WholesaleTier } from './entity/wholesale-tier.entity'
import { PriceHistory } from './entity/price-history.entity'
import { ProductSku } from './entity/product-sku.entity'
import { Promotion } from './entity/promotion.entity'
import { MemberLevel } from './entity/member-level.entity'
import { MemberPricingRule } from './entity/member-pricing-rule.entity'

describe('PricingService', () => {
  let service: PricingService
  beforeEach(async () => {
    const mr = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn((e: any) => Promise.resolve(e)),
      create: jest.fn((d: any) => d),
    }
    const m = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: getRepositoryToken(ProductTierPricing), useValue: mr },
        { provide: getRepositoryToken(WholesaleTier), useValue: mr },
        { provide: getRepositoryToken(PriceHistory), useValue: mr },
        { provide: getRepositoryToken(ProductSku), useValue: mr },
        { provide: getRepositoryToken(Promotion), useValue: mr },
        { provide: getRepositoryToken(MemberLevel), useValue: mr },
        { provide: getRepositoryToken(MemberPricingRule), useValue: mr },
      ],
    }).compile()
    service = m.get<PricingService>(PricingService)
  })
  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
