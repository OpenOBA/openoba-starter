/* eslint-disable @typescript-eslint/no-explicit-any -- Jest mock 生态刚需，mockImplementation 回调需要 any 绕过类型推断缺陷 */
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { DraftService } from './draft.service'
import { Draft } from './entities/draft.entity'
import { ProductSpu } from '../product/entity/product-spu.entity'
import { ProductSku } from '../product/entity/product-sku.entity'

function mockRepo() {
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getOne: jest.fn().mockResolvedValue(null),
  }
  return {
    create: jest.fn((d: any) => d),
    save: jest.fn((e: any) => Promise.resolve({ ...e, id: 'new-id' })),
    findOne: jest.fn().mockResolvedValue(null),
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    count: jest.fn().mockResolvedValue(0),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  }
}

describe('DraftService', () => {
  let service: DraftService
  let draftRepo: ReturnType<typeof mockRepo>
  let spuRepo: ReturnType<typeof mockRepo>
  let skuRepo: ReturnType<typeof mockRepo>

  beforeEach(async () => {
    draftRepo = mockRepo()
    spuRepo = mockRepo()
    skuRepo = mockRepo()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DraftService,
        { provide: getRepositoryToken(Draft), useValue: draftRepo },
        { provide: getRepositoryToken(ProductSpu), useValue: spuRepo },
        { provide: getRepositoryToken(ProductSku), useValue: skuRepo },
        { provide: DataSource, useValue: { query: jest.fn() } },
      ],
    }).compile()

    service = module.get<DraftService>(DraftService)
  })

  describe('create', () => {
    it('should create a draft', async () => {
      draftRepo.create.mockImplementation((d: any) => ({ ...d, draftNo: 'D-001', draftId: 'd1' }))
      const result = await service.create({
        title: 'New Draft',
        type: 'spu',
        source: 'manual',
      } as any)
      expect(result).toBeDefined()
      expect(draftRepo.save).toHaveBeenCalled()
    })
  })

  describe('query', () => {
    it('should return paginated results', async () => {
      const result = await service.query({ page: 1, pageSize: 10 })
      expect(result).toBeDefined()
      expect(result.items).toBeDefined()
    })
  })

  describe('findOne', () => {
    it('should throw on missing', async () => {
      await expect(service.findOne('bad')).rejects.toThrow()
    })

    it('should return draft when found', async () => {
      draftRepo.findOne.mockResolvedValue({ draftId: 'd1', title: 'Test' } as any)
      const result = await service.findOne('d1')
      expect(result).toBeDefined()
    })
  })

  describe('update', () => {
    it('should update a draft', async () => {
      draftRepo.findOne.mockResolvedValue({ draftId: 'd1', title: 'Old' } as any)
      draftRepo.save.mockImplementation((e: any) => Promise.resolve(e))
      const result = await service.update('d1', { title: 'New' } as any)
      expect(result).toBeDefined()
      expect(draftRepo.save).toHaveBeenCalled()
    })
  })

  describe('softDelete', () => {
    it('should throw on missing', async () => {
      await expect(service.softDelete('bad')).rejects.toThrow()
    })
  })
})
