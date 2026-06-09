import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { WebsiteCatalogService } from './website-catalog.service'
import { ProductSpu } from '../product/entity/product-spu.entity'
import { ProductSku } from '../product/entity/product-sku.entity'
import { ProductCategory } from '../product/entity/product-category.entity'

function mockRepo() {
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    where: jest.fn().mockReturnThis(),
  }
  return { createQueryBuilder: jest.fn().mockReturnValue(qb), find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null) }
}

describe('WebsiteCatalogService', () => {
  let service: WebsiteCatalogService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WebsiteCatalogService,
        { provide: getRepositoryToken(ProductSpu), useValue: mockRepo() },
        { provide: getRepositoryToken(ProductSku), useValue: mockRepo() },
        { provide: getRepositoryToken(ProductCategory), useValue: mockRepo() },
      ],
    }).compile()
    service = module.get<WebsiteCatalogService>(WebsiteCatalogService)
  })

  it('should be defined', () => { expect(service).toBeDefined() })

  describe('getHome', () => {
    it('should return home sections', async () => {
      const result = await service.getHome()
      expect(result).toBeDefined()
      expect(result.featured).toBeDefined()
      expect(result.bestsellers).toBeDefined()
    })
  })

  describe('search', () => {
    it('should search products', async () => {
      const result = await service.search('test')
      expect(result).toBeDefined()
    })
  })
})
