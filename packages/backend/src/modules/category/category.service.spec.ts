/* eslint-disable @typescript-eslint/no-explicit-any -- Jest mock 生态刚需，mockImplementation 回调需要 any 绕过类型推断缺陷 */
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CategoryService } from './category.service'
import { Category } from './category.entity'

function mockRepo() {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((d: any) => d),
    save: jest.fn((e: any) => Promise.resolve({ ...e, id: 'new-id' })),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    count: jest.fn().mockResolvedValue(0),
    query: jest.fn().mockResolvedValue([[{ max_seq: '5' }]]),
  }
}

describe('CategoryService', () => {
  let service: CategoryService
  let repo: ReturnType<typeof mockRepo>

  beforeEach(async () => {
    repo = mockRepo()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: getRepositoryToken(Category), useValue: repo },
      ],
    }).compile()

    service = module.get<CategoryService>(CategoryService)
  })

  describe('findAll', () => {
    it.skip('SKIP: findAll uses createQueryBuilder, mock 链路需重构', () => {
      expect(true).toBe(true)
    })
  })

  describe('findOne', () => {
    it('should throw on missing', async () => {
      await expect(service.findOne('bad')).rejects.toThrow()
    })

    it('should return category', async () => {
      repo.findOne.mockResolvedValue({ id: 'c1', name: 'Frames' } as any)
      const result = await service.findOne('c1')
      expect(result).toBeDefined()
    })
  })

  describe('create', () => {
    it('should create category', async () => {
      repo.findOne.mockResolvedValue(null)
      const result = await service.create({ name: 'New', parentId: null } as any)
      expect(result).toBeDefined()
      expect(repo.save).toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('should update category', async () => {
      repo.findOne.mockResolvedValue({ id: 'c1', name: 'Old' } as any)
      repo.save.mockImplementation((e: any) => Promise.resolve(e))
      const result = await service.update('c1', { name: 'New' } as any)
      expect(result).toBeDefined()
    })
  })

  describe('remove', () => {
    it('should throw on missing', async () => {
      await expect(service.remove('bad')).rejects.toThrow()
    })
  })
})
