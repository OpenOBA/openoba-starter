import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { WholesaleTierService } from './wholesale-tier.service'
import { WholesaleTier } from './entity/wholesale-tier.entity'

function mockRepo() {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOneBy: jest.fn().mockResolvedValue(null),
    create: jest.fn((d: unknown) => d),
    save: jest.fn((e: unknown) => Promise.resolve(e)),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  }
}

describe('WholesaleTierService', () => {
  let service: WholesaleTierService
  let repo: ReturnType<typeof mockRepo>

  beforeEach(async () => {
    repo = mockRepo()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WholesaleTierService,
        { provide: getRepositoryToken(WholesaleTier), useValue: repo },
      ],
    }).compile()
    service = module.get<WholesaleTierService>(WholesaleTierService)
  })

  it('should be defined', () => { expect(service).toBeDefined() })
  it('should find all', async () => { expect((await service.findAll())).toEqual([]) })
  it('should create', async () => {
    const r = await service.create({ tierName: 'Gold' } as any)
    expect(r).toBeDefined()
    expect(repo.save).toHaveBeenCalled()
  })
})
