import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { ProductService } from './product.service'
import { ColorService } from './color.service'
import { SpuService } from './spu.service'
import { SkuService } from './sku.service'
import { SetService } from './set.service'
import { DictSkuColor } from './entity/dict-spu-color.entity'
import { ProductSpu } from './entity/product-spu.entity'
import { ProductSku } from './entity/product-sku.entity'
import { ProductSet } from './entity/product-set.entity'
import { ExternalBarcodeMapping } from './entity/external-barcode-mapping.entity'
import { ProductSkuImage } from './entity/product-sku-image.entity'
import { PriceHistory } from './entity/price-history.entity'
import { DictEffectTag } from './entity/dict-effect-tag.entity'
import { SkuEffectRecommend } from './entity/sku-effect-recommend.entity'

function mockQueryBuilder() {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  }
}

function mockRepo() {
  return {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder()),
    delete: jest.fn(),
    update: jest.fn(),
    query: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  }
}

function mockDataSource() {
  return {
    getRepository: jest.fn().mockReturnValue(mockRepo()),
    manager: { transaction: jest.fn() },
  }
}

describe('ProductService (Facade)', () => {
  let service: ProductService
  let colorService: ColorService
  let spuService: SpuService
  let skuService: SkuService
  let setService: SetService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        ColorService,
        SpuService,
        SkuService,
        SetService,
        // Shared repository mocks
        { provide: getRepositoryToken(DictSkuColor), useValue: mockRepo() },
        { provide: getRepositoryToken(ProductSpu), useValue: mockRepo() },
        { provide: getRepositoryToken(ProductSku), useValue: mockRepo() },
        { provide: getRepositoryToken(ProductSet), useValue: mockRepo() },
        { provide: getRepositoryToken(ExternalBarcodeMapping), useValue: mockRepo() },
        { provide: getRepositoryToken(ProductSkuImage), useValue: mockRepo() },
        { provide: getRepositoryToken(PriceHistory), useValue: mockRepo() },
        { provide: getRepositoryToken(DictEffectTag), useValue: mockRepo() },
        { provide: getRepositoryToken(SkuEffectRecommend), useValue: mockRepo() },
        { provide: DataSource, useValue: mockDataSource() },
      ],
    }).compile()

    service = module.get<ProductService>(ProductService)
    colorService = module.get<ColorService>(ColorService)
    spuService = module.get<SpuService>(SpuService)
    skuService = module.get<SkuService>(SkuService)
    setService = module.get<SetService>(SetService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should delegate findSpus to SpuService', async () => {
    const spy = jest.spyOn(spuService, 'findSpus').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })
    await service.findSpus({ page: 1, pageSize: 20 })
    expect(spy).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
  })

  it('should delegate findSkus to SkuService', async () => {
    const spy = jest.spyOn(skuService, 'findSkus').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })
    await service.findSkus({ page: 1, pageSize: 20 })
    expect(spy).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
  })

  it('should delegate findSets to SetService', async () => {
    const spy = jest.spyOn(setService, 'findSets').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })
    await service.findSets({ page: 1, pageSize: 20 })
    expect(spy).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
  })

  it('should delegate findColors to ColorService', async () => {
    const spy = jest.spyOn(colorService, 'findColors').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })
    await service.findColors({ page: 1, pageSize: 20 })
    expect(spy).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
  })
})
