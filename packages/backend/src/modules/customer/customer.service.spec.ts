import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { CustomerService } from './customer.service'
import { Customer } from './entity/customer.entity'
import { CustomerContact } from './entity/customer-contact.entity'
import { CustomerAddress } from './entity/customer-address.entity'
import { CustomerTierPricing } from './entity/customer-tier-pricing.entity'
import { VisionPrescription } from './entity/vision-prescription.entity'
import { CustomerLens } from './entity/customer-lens.entity'
import { CustomerConsumptionProfile } from './entity/customer-consumption-profile.entity'
import { MemberLevelLog } from './entity/member-level-log.entity'
import { PointsTransaction } from './entity/points-transaction.entity'
import { Order } from '../order/entity/order.entity'
import { OrderItem } from '../order/entity/order-item.entity'
import { MemberLevel } from '../product/entity/member-level.entity'
import { CustomerCrudService } from './customer-crud.service'
import { CustomerContactService } from './customer-contact.service'
import { CustomerPricingService } from './customer-pricing.service'
import { CustomerLensService } from './customer-lens.service'
import { CustomerMemberService } from './customer-member.service'

// ──────────────── helpers ────────────────

function mockRepo() {
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getOne: jest.fn().mockResolvedValue(null),
    getRawOne: jest.fn().mockResolvedValue(null),
    getMany: jest.fn().mockResolvedValue([]),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
  }
  return {
    create: jest.fn((dto) => dto as any),
    save: jest.fn((entity: any) => Promise.resolve(entity)),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn().mockResolvedValue(null),
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    count: jest.fn().mockResolvedValue(0),
  }
}

function mockSubService(methods: Record<string, jest.Mock>) {
  return methods
}

// ──────────────── tests ────────────────

describe('CustomerService', () => {
  let service: CustomerService
  let customerRepo: ReturnType<typeof mockRepo>
  let crudService: ReturnType<typeof mockSubService>
  let contactService: ReturnType<typeof mockSubService>
  let pricingService: ReturnType<typeof mockSubService>
  let lensService: ReturnType<typeof mockSubService>
  let memberService: ReturnType<typeof mockSubService>

  beforeEach(async () => {
    customerRepo = mockRepo()
    crudService = mockSubService({
      findAll: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
      findOne: jest.fn(),
      create: jest.fn().mockResolvedValue({ customerId: 'new-id', customerCode: 'OBA-CUS-000001' }),
      update: jest.fn(),
      remove: jest.fn(),
    })
    contactService = mockSubService({
      addContact: jest.fn(),
      updateContact: jest.fn(),
      removeContact: jest.fn(),
      getContacts: jest.fn().mockResolvedValue([]),
      addAddress: jest.fn(),
      updateAddress: jest.fn(),
      removeAddress: jest.fn(),
      getAddresses: jest.fn().mockResolvedValue([]),
    })
    pricingService = mockSubService({
      addTierPricing: jest.fn(),
      updateTierPricing: jest.fn(),
      removeTierPricing: jest.fn(),
      getTierPricings: jest.fn().mockResolvedValue([]),
    })
    const lensServiceMocks = {
      createPrescription: jest.fn().mockResolvedValue({ prescriptionId: 'p1' } as any),
      getPrescriptions: jest.fn().mockResolvedValue([]),
      removePrescription: jest.fn(),
      createCustomerLens: jest.fn(),
      getCustomerLenses: jest.fn().mockResolvedValue([]),
      getCustomerLensSummary: jest.fn(),
      removeCustomerLens: jest.fn(),
      createConsumptionProfile: jest.fn(),
      getConsumptionProfiles: jest.fn().mockResolvedValue([]),
      removeConsumptionProfile: jest.fn(),
    }
    lensService = mockSubService(lensServiceMocks)
    memberService = mockSubService({
      getMemberLevelLogs: jest.fn().mockResolvedValue([]),
      getPointsTransactions: jest.fn().mockResolvedValue([]),
      getAccountInfo: jest.fn(),
      scanMemberDowngrades: jest.fn().mockResolvedValue({ count: 0, details: [] }),
      populateCustomerLensFromOrder: jest.fn(),
      updateMemberAssetsAfterPayment: jest.fn(),
      getMemberDashboard: jest.fn(),
      getMemberAnalytics: jest.fn(),
    })

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: getRepositoryToken(CustomerContact), useValue: mockRepo() },
        { provide: getRepositoryToken(CustomerAddress), useValue: mockRepo() },
        { provide: getRepositoryToken(CustomerTierPricing), useValue: mockRepo() },
        { provide: getRepositoryToken(VisionPrescription), useValue: mockRepo() },
        { provide: getRepositoryToken(CustomerLens), useValue: mockRepo() },
        { provide: getRepositoryToken(CustomerConsumptionProfile), useValue: mockRepo() },
        { provide: getRepositoryToken(MemberLevelLog), useValue: mockRepo() },
        { provide: getRepositoryToken(PointsTransaction), useValue: mockRepo() },
        { provide: getRepositoryToken(Order), useValue: mockRepo() },
        { provide: getRepositoryToken(OrderItem), useValue: mockRepo() },
        { provide: getRepositoryToken(MemberLevel), useValue: mockRepo() },
        { provide: DataSource, useValue: { query: jest.fn() } },
        { provide: CustomerCrudService, useValue: crudService },
        { provide: CustomerContactService, useValue: contactService },
        { provide: CustomerPricingService, useValue: pricingService },
        { provide: CustomerLensService, useValue: lensService },
        { provide: CustomerMemberService, useValue: memberService },
      ],
    }).compile()

    service = module.get<CustomerService>(CustomerService)
  })

  // ═══════════════════ findAll ═══════════════════
  describe('findAll', () => {
    it('should delegate to crudService', async () => {
      await service.findAll({ page: 1, pageSize: 10 })
      expect(crudService.findAll).toHaveBeenCalledWith({ page: 1, pageSize: 10 })
    })
  })

  // ═══════════════════ findOne ═══════════════════
  describe('findOne', () => {
    it('should delegate to crudService', async () => {
      crudService.findOne.mockResolvedValue({ customerId: '1', contactName: 'Henry' })
      const result = await service.findOne('1')
      expect(crudService.findOne).toHaveBeenCalledWith('1')
      expect(result.customerId).toBe('1')
    })
  })

  // ═══════════════════ create ═══════════════════
  describe('create', () => {
    it('should delegate to crudService', async () => {
      const dto = { contactName: 'Test', phone: '13800000000', customerType: 'retail' as const }
      await service.create(dto)
      expect(crudService.create).toHaveBeenCalledWith(dto)
    })
  })

  // ═══════════════════ update ═══════════════════
  describe('update', () => {
    it('should delegate to crudService', async () => {
      crudService.update.mockResolvedValue({ customerId: '1', contactName: 'New' })
      const result = await service.update('1', { contactName: 'New' } as any)
      expect(crudService.update).toHaveBeenCalledWith('1', { contactName: 'New' })
    })
  })

  // ═══════════════════ remove ═══════════════════
  describe('remove', () => {
    it('should delegate to crudService', async () => {
      await service.remove('1')
      expect(crudService.remove).toHaveBeenCalledWith('1')
    })
  })

  // ═══════════════════ contacts CRUD ═══════════════════
  describe('contact management', () => {
    it('should delegate addContact', async () => {
      contactService.addContact.mockResolvedValue({ contactId: 'c1' })
      const result = await service.addContact({ customerId: '1', contactName: 'Test' } as any)
      expect(contactService.addContact).toHaveBeenCalled()
    })

    it('should delegate getContacts', async () => {
      const result = await service.getContacts('1')
      expect(contactService.getContacts).toHaveBeenCalledWith('1')
      expect(result).toHaveLength(0)
    })
  })

  // ═══════════════════ prescription ═══════════════════
  describe('createPrescription', () => {
    it('should delegate to lensService', async () => {
      lensService.createPrescription.mockResolvedValue({ prescriptionId: 'p1' })
      const result = await service.createPrescription('1', { odSphere: -2.0 })
      expect(lensService.createPrescription).toHaveBeenCalledWith('1', { odSphere: -2.0 })
      expect((result as any).prescriptionId).toBe('p1')
    })
  })

  // ═══════════════════ getAccountInfo ═══════════════════
  describe('getAccountInfo', () => {
    it('should delegate to memberService', async () => {
      memberService.getAccountInfo.mockResolvedValue({ customerId: '1', accountStatus: 'active' })
      const result = await service.getAccountInfo('1')
      expect(memberService.getAccountInfo).toHaveBeenCalledWith('1')
      expect(result.accountStatus).toBe('active')
    })
  })
})
