/* eslint-disable @typescript-eslint/no-explicit-any -- Jest mock 生态刚需 */
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { SubSkuService } from './sub-sku.service'
import { SubSku } from './entity/sub-sku.entity'
import { SubSkuCategory } from './entity/sub-sku-category.entity'

describe('SubSkuService', () => {
  let service: SubSkuService
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        SubSkuService,
        {
          provide: getRepositoryToken(SubSku),
          useValue: {
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn().mockResolvedValue([]),
            save: jest.fn((e: any) => Promise.resolve(e)),
            create: jest.fn((d: any) => d),
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
          },
        },
        {
          provide: getRepositoryToken(SubSkuCategory),
          useValue: {
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn().mockResolvedValue([]),
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
          },
        },
      ],
    }).compile()
    service = m.get<SubSkuService>(SubSkuService)
  })
  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
