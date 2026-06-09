import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ProductImageService } from './product-image.service'
import { ProductSkuImage } from './entity/product-sku-image.entity'
import { ProductSku } from './entity/product-sku.entity'

describe('ProductImageService', () => {
  let service: ProductImageService
  let imageRepo: any
  let skuRepo: any

  beforeEach(async () => {
    imageRepo = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn((d: any) => d), save: jest.fn((e: any) => Promise.resolve(e)), find: jest.fn().mockResolvedValue([]), delete: jest.fn().mockResolvedValue({ affected: 1 }), remove: jest.fn().mockResolvedValue({}) }
    skuRepo = { findOne: jest.fn().mockResolvedValue(null) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductImageService,
        { provide: getRepositoryToken(ProductSkuImage), useValue: imageRepo },
        { provide: getRepositoryToken(ProductSku), useValue: skuRepo },
      ],
    }).compile()

    service = module.get<ProductImageService>(ProductImageService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
