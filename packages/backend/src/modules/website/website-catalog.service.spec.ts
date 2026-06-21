import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { WebsiteCatalogService } from './website-catalog.service'
import { ProductSpu } from '../product/entity/product-spu.entity'
import { ProductSku } from '../product/entity/product-sku.entity'
import { ProductCategory } from '../product/entity/product-category.entity'
import { DictSkuColor } from '../product/entity/dict-spu-color.entity'
import { DictFrameMaterial } from '../product/entity/dict-frame-material.entity'
import { DictFrameType } from '../product/entity/dict-frame-type.entity'
import { DictNosePad } from '../product/entity/dict-nose-pad.entity'
import { DictHinge } from '../product/entity/dict-hinge.entity'
import { DictSurfaceTreatment } from '../product/entity/dict-surface-treatment.entity'

function mockRepo() {
  const qb = {
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    select: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
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
        { provide: getRepositoryToken(DictSkuColor), useValue: mockRepo() },
        { provide: getRepositoryToken(DictFrameMaterial), useValue: mockRepo() },
        { provide: getRepositoryToken(DictFrameType), useValue: mockRepo() },
        { provide: getRepositoryToken(DictNosePad), useValue: mockRepo() },
        { provide: getRepositoryToken(DictHinge), useValue: mockRepo() },
        { provide: getRepositoryToken(DictSurfaceTreatment), useValue: mockRepo() },
      ],
    }).compile()
    service = module.get<WebsiteCatalogService>(WebsiteCatalogService)
  })

  it('should be defined', () => { expect(service).toBeDefined() })

  describe('getCatalog', () => {
    it('should return paginated catalog', async () => {
      const helpers = { mapSpuCards: jest.fn().mockResolvedValue([]) }
      const result = await service.getCatalog({ page: 1, pageSize: 20 }, helpers)
      expect(result).toBeDefined()
      expect(result.items).toBeDefined()
    })
  })

  describe('search', () => {
    it('should search products', async () => {
      const helpers = { mapSpuCards: jest.fn().mockResolvedValue([]) }
      const result = await service.search({ keyword: 'test' }, helpers)
      expect(result).toBeDefined()
    })
  })
})
