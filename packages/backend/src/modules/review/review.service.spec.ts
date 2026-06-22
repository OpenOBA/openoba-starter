import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ReviewService } from './review.service'
import { Review } from './entity/review.entity'
import { OrderItem } from '../order/entity/order-item.entity'
import { DataSource } from 'typeorm'

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
    getRawOne: jest.fn().mockResolvedValue(null),
  }
  return {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn((e: unknown) => Promise.resolve(e)),
    create: jest.fn((d: unknown) => d),
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    count: jest.fn().mockResolvedValue(0),
    remove: jest.fn().mockResolvedValue({}),
  }
}

describe('ReviewService', () => {
  let service: ReviewService
  let reviewRepo: ReturnType<typeof mockRepo>

  beforeEach(async () => {
    reviewRepo = mockRepo()
    const module = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: getRepositoryToken(Review), useValue: reviewRepo },
        { provide: getRepositoryToken(OrderItem), useValue: mockRepo() },
        { provide: DataSource, useValue: { query: jest.fn() } },
      ],
    }).compile()
    service = module.get<ReviewService>(ReviewService)
  })

  it('should be defined', () => { expect(service).toBeDefined() })

  describe('findReviews', () => {
    it('should return paginated results', async () => {
      const result = await service.findReviews({ page: 1, pageSize: 10 })
      expect(result).toBeDefined()
    })
  })

  describe('findOneReview', () => {
    it('should throw on missing', async () => {
      await expect(service.findOneReview('bad')).rejects.toThrow()
    })
  })
})
