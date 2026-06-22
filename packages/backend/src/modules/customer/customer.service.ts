/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Customer, CUSTOMER_TYPES, CUSTOMER_STATUS } from './entity/customer.entity'
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
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  QueryCustomerDto,
  CreateContactDto,
  UpdateContactDto,
  CreateAddressDto,
  UpdateAddressDto,
  CreateTierPricingDto,
  UpdateTierPricingDto,
} from './dto/customer.dto'
import { CustomerCrudService } from './customer-crud.service'
import { CustomerContactService } from './customer-contact.service'
import { CustomerPricingService } from './customer-pricing.service'
import { CustomerLensService } from './customer-lens.service'
import { CustomerMemberService } from './customer-member.service'

/**
 * CustomerService — 聚合门面（Facade）
 *
 * 委托子 Service 处理具体领域：
 *  - CustomerCrudService     → 客户 CRUD
 *  - CustomerContactService  → 联系人 + 地址
 *  - CustomerPricingService  → 阶梯定价
 *  - CustomerLensService     → 处方 / 镜片 / 消费档案
 *  - CustomerMemberService   → 会员等级 / 积分 / 仪表盘 / 订单集成
 */
@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name)

  constructor(
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(CustomerContact) private contactRepo: Repository<CustomerContact>,
    @InjectRepository(CustomerAddress) private addressRepo: Repository<CustomerAddress>,
    @InjectRepository(CustomerTierPricing) private pricingRepo: Repository<CustomerTierPricing>,
    @InjectRepository(VisionPrescription) private prescriptionRepo: Repository<VisionPrescription>,
    @InjectRepository(CustomerLens) private customerLensRepo: Repository<CustomerLens>,
    @InjectRepository(CustomerConsumptionProfile) private consumptionProfileRepo: Repository<CustomerConsumptionProfile>,
    @InjectRepository(MemberLevelLog) private memberLevelLogRepo: Repository<MemberLevelLog>,
    @InjectRepository(PointsTransaction) private pointsTxnRepo: Repository<PointsTransaction>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private orderItemRepo: Repository<OrderItem>,
    @InjectRepository(MemberLevel) private memberLevelRepo: Repository<MemberLevel>,
    private dataSource: DataSource,
    private crudService: CustomerCrudService,
    private contactService: CustomerContactService,
    private pricingService: CustomerPricingService,
    private lensService: CustomerLensService,
    private memberService: CustomerMemberService,
  ) {}

  // ===== 客户 CRUD → CustomerCrudService =====

  async findAll(query: QueryCustomerDto) {
    return this.crudService.findAll(query)
  }

  async findOne(id: string) {
    return this.crudService.findOne(id)
  }

  async create(dto: CreateCustomerDto & { wechatId?: string; referralSource?: string; preferredStyle?: string }) {
    return this.crudService.create(dto)
  }

  async update(id: string, dto: UpdateCustomerDto & { wechatId?: string; referralSource?: string; preferredStyle?: string }) {
    return this.crudService.update(id, dto)
  }

  async remove(id: string) {
    return this.crudService.remove(id)
  }

  // ===== 联系人 → CustomerContactService =====

  async addContact(dto: CreateContactDto) {
    return this.contactService.addContact(dto)
  }

  async updateContact(id: string, dto: UpdateContactDto) {
    return this.contactService.updateContact(id, dto)
  }

  async removeContact(id: string) {
    return this.contactService.removeContact(id)
  }

  async getContacts(customerId: string) {
    return this.contactService.getContacts(customerId)
  }

  // ===== 地址 → CustomerContactService =====

  async addAddress(dto: CreateAddressDto) {
    return this.contactService.addAddress(dto)
  }

  async updateAddress(id: string, dto: UpdateAddressDto) {
    return this.contactService.updateAddress(id, dto)
  }

  async removeAddress(id: string) {
    return this.contactService.removeAddress(id)
  }

  async getAddresses(customerId: string) {
    return this.contactService.getAddresses(customerId)
  }

  // ===== 阶梯定价 → CustomerPricingService =====

  async addTierPricing(dto: CreateTierPricingDto) {
    return this.pricingService.addTierPricing(dto)
  }

  async updateTierPricing(id: string, dto: UpdateTierPricingDto) {
    return this.pricingService.updateTierPricing(id, dto)
  }

  async removeTierPricing(id: string) {
    return this.pricingService.removeTierPricing(id)
  }

  async getTierPricings(customerId: string) {
    return this.pricingService.getTierPricings(customerId)
  }

  // ===== 处方 / 镜片 / 消费档案 → CustomerLensService =====

  async createPrescription(
    customerId: string,
    dto: {
      label?: string
      odSphere?: number
      odCylinder?: number
      odAxis?: number
      odAdd?: number
      osSphere?: number
      osCylinder?: number
      osAxis?: number
      osAdd?: number
      pdValue?: number
      sourceType?: string
      prescriptionDate?: string
      expireDate?: string
      prescriptionImages?: string[]
    },
  ) {
    return this.lensService.createPrescription(customerId, dto)
  }

  async getPrescriptions(customerId: string) {
    return this.lensService.getPrescriptions(customerId)
  }

  async removePrescription(id: string) {
    return this.lensService.removePrescription(id)
  }

  async createCustomerLens(
    customerId: string,
    dto: {
      structureStandardCode: string
      prescriptionId?: string
      purchaseDate?: string
      orderId?: string
      attributes?: Record<string, any>
    },
  ) {
    return this.lensService.createCustomerLens(customerId, dto)
  }

  async getCustomerLenses(customerId: string) {
    return this.lensService.getCustomerLenses(customerId)
  }

  async getCustomerLensSummary(customerId: string) {
    return this.lensService.getCustomerLensSummary(customerId)
  }

  async removeCustomerLens(id: string) {
    return this.lensService.removeCustomerLens(id)
  }

  async createConsumptionProfile(
    customerLensId: string,
    dto: {
      productSkuCode?: string
      productName?: string
      purchaseDate?: string
      orderId?: string
      useStatus?: string
      useFrequency?: string
      sceneTags?: string[]
      attributes?: Record<string, any>
    },
  ) {
    return this.lensService.createConsumptionProfile(customerLensId, dto)
  }

  async getConsumptionProfiles(customerLensId: string) {
    return this.lensService.getConsumptionProfiles(customerLensId)
  }

  async removeConsumptionProfile(id: string) {
    return this.lensService.removeConsumptionProfile(id)
  }

  // ===== 会员 / 积分 / 仪表盘 / 订单集成 → CustomerMemberService =====

  async getMemberLevelLogs(customerId: string) {
    return this.memberService.getMemberLevelLogs(customerId)
  }

  async getPointsTransactions(customerId: string) {
    return this.memberService.getPointsTransactions(customerId)
  }

  async getAccountInfo(customerId: string) {
    return this.memberService.getAccountInfo(customerId)
  }

  async scanMemberDowngrades(): Promise<{ count: number; details: any[] }> {
    return this.memberService.scanMemberDowngrades()
  }

  async populateCustomerLensFromOrder(orderId: string): Promise<void> {
    return this.memberService.populateCustomerLensFromOrder(orderId)
  }

  async updateMemberAssetsAfterPayment(orderId: string): Promise<void> {
    return this.memberService.updateMemberAssetsAfterPayment(orderId)
  }

  async getMemberDashboard() {
    return this.memberService.getMemberDashboard()
  }

  async getMemberAnalytics(query: {
    page?: number; pageSize?: number; level?: string; keyword?: string; sortBy?: string;
  }) {
    return this.memberService.getMemberAnalytics(query)
  }
}
