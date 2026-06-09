import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { ProductService } from './product.service'
import { DictSkuColor } from './entity/dict-spu-color.entity'
import { ProductCategory } from './entity/product-category.entity'
import { ProductSpu } from './entity/product-spu.entity'
import { ProductSku } from './entity/product-sku.entity'
import { ProductSet } from './entity/product-set.entity'
import { ExternalBarcodeMapping } from './entity/external-barcode-mapping.entity'
import { ProductSkuImage } from './entity/product-sku-image.entity'
import { PriceHistory } from './entity/price-history.entity'
import { DictEffectTag } from './entity/dict-effect-tag.entity'
import { SkuEffectRecommend } from './entity/sku-effect-recommend.entity'

function mockQueryBuilder(overrides?: { getManyAndCount?: jest.Mock }) {
  const getManyAndCount = overrides?.getManyAndCount ?? jest.fn().mockResolvedValue([[], 0])
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount,
  }
}

function mockRepo() {
  const qb = mockQueryBuilder()
  return {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    delete: jest.fn(),
    update: jest.fn(),
    query: jest.fn(),
  }
}

describe('ProductService', () => {
  let service: ProductService
  let spuRepo: ReturnType<typeof mockRepo>
  let skuRepo: ReturnType<typeof mockRepo>
  let skuImageRepo: ReturnType<typeof mockRepo>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: getRepositoryToken(DictSkuColor), useValue: mockRepo() },
        { provide: getRepositoryToken(ProductCategory), useValue: mockRepo() },
        { provide: getRepositoryToken(ProductSpu), useValue: mockRepo() },
        { provide: getRepositoryToken(ProductSku), useValue: mockRepo() },
        { provide: getRepositoryToken(ProductSet), useValue: mockRepo() },
        { provide: getRepositoryToken(ExternalBarcodeMapping), useValue: mockRepo() },
        { provide: getRepositoryToken(ProductSkuImage), useValue: mockRepo() },
        { provide: getRepositoryToken(PriceHistory), useValue: mockRepo() },
        { provide: getRepositoryToken(DictEffectTag), useValue: mockRepo() },
        { provide: getRepositoryToken(SkuEffectRecommend), useValue: mockRepo() },
        { provide: DataSource, useValue: { manager: { transaction: jest.fn() } } },
      ],
    }).compile()

    service = module.get<ProductService>(ProductService)
    spuRepo = module.get(getRepositoryToken(ProductSpu)) as any
    skuRepo = module.get(getRepositoryToken(ProductSku)) as any
    skuImageRepo = module.get(getRepositoryToken(ProductSkuImage)) as any
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('findSpus', () => {
    function mockSpusResult(items: any[]) {
      const qb = spuRepo.createQueryBuilder()
      ;(qb.getManyAndCount as jest.Mock).mockResolvedValue([items, items.length])
    }

    it('should return paginated SPUs', async () => {
      const mockData = [
        { spuId: '1', spuCode: 'SPU001', spuName: '测试SPU' },
        { spuId: '2', spuCode: 'SPU002', spuName: '测试SPU2' },
      ]
      mockSpusResult(mockData)

      const result = await service.findSpus({ page: 1, pageSize: 20 })

      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(spuRepo.createQueryBuilder).toHaveBeenCalled()
    })

    it('should filter by keyword', async () => {
      mockSpusResult([{ spuId: '1', spuCode: 'SPU001', spuName: '测试SPU' }])
      await service.findSpus({ keyword: 'SPU001' })

      const qb = spuRepo.createQueryBuilder()
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('spu_name LIKE'),
        expect.objectContaining({ kw: '%SPU001%' }),
      )
    })

    it('should filter by gender when valid', async () => {
      mockSpusResult([])
      await service.findSpus({ gender: 'female' })

      const qb = spuRepo.createQueryBuilder()
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('gender'),
        expect.objectContaining({ g: 'female' }),
      )
    })
  })

  describe('findSkus', () => {
    it('should return paginated SKUs', async () => {
      const mockData = [{ skuId: '1', skuCode: 'SKU001', skuName: '测试SKU' }]
      const qb = skuRepo.createQueryBuilder()
      ;(qb.getManyAndCount as jest.Mock).mockResolvedValue([mockData, 1])
      skuImageRepo.find = jest.fn().mockResolvedValue([])

      const result = await service.findSkus({ page: 1, pageSize: 20 })

      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
    })
  })

  describe('findSets', () => {
    it('should return paginated sets', async () => {
      const result = await service.findSets({ page: 1, pageSize: 20 })
      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  describe('generateSetCode', () => {
    it('should exist as a method', () => {
      expect(typeof (service as any).generateSetCode).toBe('function')
    })
  })
})
