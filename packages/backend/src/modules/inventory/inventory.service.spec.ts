import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { InventoryService } from './inventory.service'
import { Inventory } from './entity/inventory.entity'
import { InventoryTransaction } from './entity/inventory-transaction.entity'
import { InventoryDocument } from './entity/inventory-document.entity'
import { InventoryBatchService } from './inventory-batch.service'

function mockQueryBuilder(overrides?: { getManyAndCount?: jest.Mock }) {
  const getManyAndCount = overrides?.getManyAndCount ?? jest.fn().mockResolvedValue([[], 0])
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount,
    getOne: jest.fn().mockResolvedValue(null),
    getRawOne: jest.fn().mockResolvedValue(null),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
  }
}

function mockRepo() {
  const qb = mockQueryBuilder()
  return {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    delete: jest.fn(),
    update: jest.fn(),
    query: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    insert: jest.fn(),
  }
}

describe('InventoryService', () => {
  let service: InventoryService
  let invRepo: ReturnType<typeof mockRepo>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(Inventory), useValue: mockRepo() },
        { provide: getRepositoryToken(InventoryTransaction), useValue: mockRepo() },
        { provide: getRepositoryToken(InventoryDocument), useValue: mockRepo() },
        { provide: DataSource, useValue: { manager: { transaction: jest.fn() } } },
        { provide: InventoryBatchService, useValue: { executeDocument: jest.fn(), confirmDocument: jest.fn(), findDocuments: jest.fn() } },
      ],
    }).compile()

    service = module.get<InventoryService>(InventoryService)
    invRepo = module.get(getRepositoryToken(Inventory)) as any
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('findAll', () => {
    it('should return paginated inventory', async () => {
      const mockData = [
        { inventoryId: '1', skuId: 'sku-1', availableQuantity: 10, currentQuantity: 20 },
      ]
      const qb = invRepo.createQueryBuilder()
      ;(qb.getManyAndCount as jest.Mock).mockResolvedValue([mockData, 1])

      const result = await service.findAll({ page: 1, pageSize: 20 })

      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
    })
  })

  describe('findBySku', () => {
    it('should find inventory by SKU ID', async () => {
      const mockInv = { inventoryId: '1', skuId: 'sku-1', availableQuantity: 10, currentQuantity: 20 }
      ;(invRepo.findOne as jest.Mock).mockResolvedValue(mockInv)
      const result = await service.findBySku('sku-1')
      expect(result).toBeDefined()
    })

    it('should throw when SKU not found', async () => {
      await expect(service.findBySku('non-existent')).rejects.toThrow()
    })
  })
})
