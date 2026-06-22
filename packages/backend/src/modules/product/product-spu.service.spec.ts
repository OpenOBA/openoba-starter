/* eslint-disable @typescript-eslint/no-explicit-any -- Jest mock 生态刚需 */
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { ProductSpuService } from './product-spu.service'
import { ProductSpu } from './entity/product-spu.entity'
import { StructureStandard } from '../structure/entity/structure-standard.entity'
import { ProductSku } from './entity/product-sku.entity'
import { NamingEngine } from './utils/naming-engine'

function mockRepo() {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((d: any) => d),
    save: jest.fn((e: any) => Promise.resolve({ ...e, spuId: 'new-spu' })),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    count: jest.fn().mockResolvedValue(0),
  }
}

describe('ProductSpuService', () => {
  let service: ProductSpuService
  let spuRepo: ReturnType<typeof mockRepo>

  beforeEach(async () => {
    spuRepo = mockRepo()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductSpuService,
        { provide: getRepositoryToken(ProductSpu), useValue: spuRepo },
        { provide: getRepositoryToken(StructureStandard), useValue: mockRepo() },
        { provide: getRepositoryToken(ProductSku), useValue: mockRepo() },
        { provide: NamingEngine, useValue: { generateName: jest.fn().mockReturnValue('Auto Name'), generateDisplayName: jest.fn().mockReturnValue('Display') } },
        { provide: DataSource, useValue: { query: jest.fn() } },
      ],
    }).compile()

    service = module.get<ProductSpuService>(ProductSpuService)
  })

  it('should be defined', () => { expect(service).toBeDefined() })

  it('should throw on missing spu', async () => {
    await expect(service.findOneSpu('bad')).rejects.toThrow()
  })

  it('should create spu', async () => {
    spuRepo.count.mockResolvedValue(0)
    const result = await service.createSpu({ spuName: 'Test SPU', category: 'frames', gender: 'unisex' } as any)
    expect(result).toBeDefined()
  })
})
