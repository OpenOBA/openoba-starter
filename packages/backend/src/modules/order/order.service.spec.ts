import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { OrderService } from './order.service'
import { Order } from './entity/order.entity'
import { OrderItem } from './entity/order-item.entity'
import { OrderAddress } from './entity/order-address.entity'
import { OrderPayment } from './entity/order-payment.entity'
import { OrderShipment } from './entity/order-shipment.entity'
import { OrderLog } from './entity/order-log.entity'
import { CustomerLens } from '../customer/entity/customer-lens.entity'
import { CustomerConsumptionProfile } from '../customer/entity/customer-consumption-profile.entity'
import { Customer } from '../customer/entity/customer.entity'
import { MemberLevelLog } from '../customer/entity/member-level-log.entity'
import { PointsTransaction } from '../customer/entity/points-transaction.entity'
import { MemberLevel } from '../product/entity/member-level.entity'
import { InventoryService } from '../inventory/inventory.service'
import { PricingEngineService } from '../product/pricing-engine.service'
import { CustomerService } from '../customer/customer.service'

function mockQueryBuilder() {
  const getManyAndCount = jest.fn().mockResolvedValue([[], 0])
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

describe('OrderService', () => {
  let service: OrderService
  let orderRepo: ReturnType<typeof mockRepo>
  let module: TestingModule

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getRepositoryToken(Order), useValue: mockRepo() },
        { provide: getRepositoryToken(OrderItem), useValue: mockRepo() },
        { provide: getRepositoryToken(OrderAddress), useValue: mockRepo() },
        { provide: getRepositoryToken(OrderPayment), useValue: mockRepo() },
        { provide: getRepositoryToken(OrderShipment), useValue: mockRepo() },
        { provide: getRepositoryToken(OrderLog), useValue: mockRepo() },
        { provide: getRepositoryToken(CustomerLens), useValue: mockRepo() },
        { provide: getRepositoryToken(CustomerConsumptionProfile), useValue: mockRepo() },
        { provide: getRepositoryToken(Customer), useValue: mockRepo() },
        { provide: getRepositoryToken(MemberLevelLog), useValue: mockRepo() },
        { provide: getRepositoryToken(PointsTransaction), useValue: mockRepo() },
        { provide: getRepositoryToken(MemberLevel), useValue: mockRepo() },
        { provide: InventoryService, useValue: { findBySku: jest.fn(), lock: jest.fn(), stockOut: jest.fn(), unlock: jest.fn() } },
        { provide: PricingEngineService, useValue: { calculatePrice: jest.fn() } },
        { provide: CustomerService, useValue: { findById: jest.fn(), updateMemberAssetsAfterPayment: jest.fn() } },
        { provide: DataSource, useValue: { manager: { transaction: jest.fn() } } },
      ],
    }).compile()

    service = module.get<OrderService>(OrderService)
    orderRepo = module.get(getRepositoryToken(Order)) as any
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('findOrders', () => {
    function mockOrdersResult(items: any[]) {
      const qb = orderRepo.createQueryBuilder()
      ;(qb.getManyAndCount as jest.Mock).mockResolvedValue([items, items.length])
    }

    it('should return paginated orders', async () => {
      const mockData = [
        { orderId: '1', orderCode: 'ORD001', status: 'pending', totalAmount: 299 },
        { orderId: '2', orderCode: 'ORD002', status: 'paid', totalAmount: 199 },
      ]
      // Mock findOrders 内部调用的 itemRepo.find() 和 addrRepo.find()
      const itemRepo = module.get(getRepositoryToken(OrderItem))
      ;(itemRepo.find as jest.Mock).mockResolvedValue([])
      const addrRepo = module.get(getRepositoryToken(OrderAddress))
      ;(addrRepo.find as jest.Mock).mockResolvedValue([])
      mockOrdersResult(mockData)
      const result = await service.findOrders({ page: 1, pageSize: 20 })
      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('should filter by status', async () => {
      const qb = orderRepo.createQueryBuilder()
      ;(qb.getManyAndCount as jest.Mock).mockResolvedValue([[], 0])
      await service.findOrders({ status: 'paid' })
      expect(qb.andWhere).toHaveBeenCalled()
    })
  })
})
