import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import * as crypto from 'crypto'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
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
// P2修复：CustomerService聚合客户消费档案操作（从OrderService迁移）
import { Order } from '../order/entity/order.entity'
import { OrderItem } from '../order/entity/order-item.entity'
import { MemberLevel } from '../product/entity/member-level.entity'
import { LENS_STATUS } from '../order/order.constants'
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

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name)

  constructor(
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    @InjectRepository(CustomerContact)
    private contactRepo: Repository<CustomerContact>,
    @InjectRepository(CustomerAddress)
    private addressRepo: Repository<CustomerAddress>,
    @InjectRepository(CustomerTierPricing)
    private pricingRepo: Repository<CustomerTierPricing>,
    @InjectRepository(VisionPrescription)
    private prescriptionRepo: Repository<VisionPrescription>,
    @InjectRepository(CustomerLens)
    private customerLensRepo: Repository<CustomerLens>,
    @InjectRepository(CustomerConsumptionProfile)
    private consumptionProfileRepo: Repository<CustomerConsumptionProfile>,
    @InjectRepository(MemberLevelLog)
    private memberLevelLogRepo: Repository<MemberLevelLog>,
    @InjectRepository(PointsTransaction)
    private pointsTxnRepo: Repository<PointsTransaction>,
    // P2修复：聚合客户消费档案操作所需
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepo: Repository<OrderItem>,
    @InjectRepository(MemberLevel)
    private memberLevelRepo: Repository<MemberLevel>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  /** V1.4-a #14: 转义 LIKE 通配符 % 和 _，防止用户输入污染查询 */
  private escapeLikePattern(keyword: string): string {
    return keyword.replace(/[%_]/g, '\\$&')
  }

  /**
   * 生成客户系统编号
   * 格式: OBA-CUS-000001（零售）、OBA-BUS-000001（批发）、OBA-PTN-000001（合作伙伴）
   */
  private async generateCustomerCode(customerType: string): Promise<string> {
    const prefixMap: Record<string, string> = {
      retail: 'OBA-CUS',
      business: 'OBA-BUS',
      partner: 'OBA-PTN',
    }
    const prefix = prefixMap[customerType] || 'OBA-CUS'

    // 查询当前最大序号
    const result = await this.customerRepo
      .createQueryBuilder('c')
      .select('MAX(CAST(SUBSTRING(c.customer_code, LENGTH(:prefix) + 2) AS UNSIGNED))', 'maxSeq')
      .setParameter('prefix', prefix)
      .where('c.customer_code LIKE :pattern', { pattern: `${prefix}-%` })
      .getRawOne()

    const nextSeq = ((result?.maxSeq || 0) + 1).toString().padStart(6, '0')
    return `${prefix}-${nextSeq}`
  }

  async findAll(query: QueryCustomerDto) {
    const { keyword, customerType, customerLevel, status, page = 1, pageSize = 20 } = query
    const qb = this.customerRepo.createQueryBuilder('c').where('c.is_deleted = :deleted', { deleted: false })
    if (keyword) {
      qb.andWhere('(c.contact_name LIKE :kw OR c.phone LIKE :kw OR c.company_name LIKE :kw OR c.email LIKE :kw)', { kw: `%${this.escapeLikePattern(keyword)}%` })
    }
    if (customerType) qb.andWhere('c.customer_type = :type', { type: customerType })
    if (customerLevel) qb.andWhere('c.customer_level = :level', { level: customerLevel })
    if (status) qb.andWhere('c.status = :status', { status })
    const [items, total] = await qb
      .orderBy('c.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()
    return { items, total, page, pageSize }
  }

  async findOne(id: string) {
    const item = await this.customerRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.contacts', 'ct')
      .leftJoinAndSelect('c.addresses', 'a')
      .leftJoinAndSelect('c.tierPricings', 'p')
      .leftJoinAndSelect('c.prescriptions', 'rx')
      .leftJoinAndSelect('c.lenses', 'l')
      .where('c.customer_id = :id AND c.is_deleted = :deleted', { id, deleted: false })
      .getOne()
    if (!item) throw new NotFoundException(`客户 ${id} 不存在`)
    return item
  }

  async create(dto: CreateCustomerDto & { wechatId?: string; referralSource?: string; preferredStyle?: string }) {
    const id = `cust-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 6)}`
    const type = dto.customerType || CUSTOMER_TYPES[0] // P1-10: default to retail if not provided
    const customerCode = await this.generateCustomerCode(type)
    // Sync wechatId → wechat
    const wechat = dto.wechatId || dto.wechat || null
    return this.customerRepo.save(
      this.customerRepo.create({
        ...dto,
        customerId: id,
        customerCode,
        customerType: type,
        wechat,
        isDeleted: false,
        totalOrders: 0,
        totalAmount: 0,
        subscriptionStatus: 'none',
        wholesaleTier: dto.wholesaleTier || null,
        memberDiscountRate: dto.memberDiscountRate || 1.0,
        pointsBalance: dto.pointsBalance || 0,
        partnerServices: dto.partnerServices || null,
      }),
    )
  }

  async update(id: string, dto: UpdateCustomerDto & { wechatId?: string; referralSource?: string; preferredStyle?: string }) {
    const existing = await this.customerRepo.findOne({ where: { customerId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`客户 ${id} 不存在`)
    // V1.4-b #34: Object.assign 先于手动赋值，避免覆盖特定映射
    Object.assign(existing, dto)
    // 特定映射：wechatId→wechat, Date 转换等（覆盖 Object.assign 的泛化赋值）
    if (dto.wechatId !== undefined) existing.wechat = dto.wechatId
    if (dto.wechat !== undefined) existing.wechat = dto.wechat
    if (dto.referralSource !== undefined) existing.referralSource = dto.referralSource
    if (dto.preferredStyle !== undefined) existing.preferredStyle = dto.preferredStyle
    if (dto.lastContactAt !== undefined) existing.lastContactAt = dto.lastContactAt ? new Date(dto.lastContactAt) : null
    return this.customerRepo.save(existing)
  }

  async remove(id: string) {
    const existing = await this.customerRepo.findOne({ where: { customerId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`客户 ${id} 不存在`)
    existing.isDeleted = true
    return this.customerRepo.save(existing)
  }

  async addContact(dto: CreateContactDto) {
    const id = `con-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 6)}`
    return this.contactRepo.save(this.contactRepo.create({ ...dto, contactId: id, isDeleted: false }))
  }

  async updateContact(id: string, dto: UpdateContactDto) {
    const existing = await this.contactRepo.findOne({ where: { contactId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`联系人 ${id} 不存在`)
    Object.assign(existing, dto)
    return this.contactRepo.save(existing)
  }

  async removeContact(id: string) {
    const existing = await this.contactRepo.findOne({ where: { contactId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`联系人 ${id} 不存在`)
    existing.isDeleted = true
    return this.contactRepo.save(existing)
  }

  async getContacts(customerId: string) {
    return this.contactRepo.find({ where: { customerId, isDeleted: false }, order: { isPrimary: 'DESC', createdAt: 'DESC' } })
  }

  async addAddress(dto: CreateAddressDto) {
    const id = `addr-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 6)}`
    if (dto.isDefault) await this.addressRepo.update({ customerId: dto.customerId, isDeleted: false }, { isDefault: false })
    return this.addressRepo.save(this.addressRepo.create({ ...dto, addressId: id, isDeleted: false }))
  }

  async updateAddress(id: string, dto: UpdateAddressDto) {
    const existing = await this.addressRepo.findOne({ where: { addressId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`地址 ${id} 不存在`)
    if (dto.isDefault && existing.customerId)
      await this.addressRepo.update({ customerId: existing.customerId, isDeleted: false }, { isDefault: false })
    Object.assign(existing, dto)
    return this.addressRepo.save(existing)
  }

  async removeAddress(id: string) {
    const existing = await this.addressRepo.findOne({ where: { addressId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`地址 ${id} 不存在`)
    existing.isDeleted = true
    return this.addressRepo.save(existing)
  }

  async getAddresses(customerId: string) {
    return this.addressRepo.find({ where: { customerId, isDeleted: false }, order: { isDefault: 'DESC', createdAt: 'DESC' } })
  }

  async addTierPricing(dto: CreateTierPricingDto) {
    const id = `price-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 6)}`
    return this.pricingRepo.save(
      this.pricingRepo.create({
        ...dto,
        pricingId: id,
        isDeleted: false,
        isActive: dto.isActive !== false,
        // 协议价场景：无 tier 默认 A
        tier: dto.tier || 'A',
        minQuantity: dto.minQuantity ?? 1,
        discountRate: dto.discountRate ?? null,
        fixedPrice: dto.fixedPrice ?? null,
        pricingMode: dto.pricingMode || 'discount',
        agreementNo: dto.agreementNo || null,
        agreementStart: dto.agreementStart ? new Date(dto.agreementStart) : null,
        agreementEnd: dto.agreementEnd ? new Date(dto.agreementEnd) : null,
        salesRep: dto.salesRep || null,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      }),
    )
  }

  async updateTierPricing(id: string, dto: UpdateTierPricingDto) {
    const existing = await this.pricingRepo.findOne({ where: { pricingId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`定价 ${id} 不存在`)
    if (dto.effectiveFrom) existing.effectiveFrom = new Date(dto.effectiveFrom)
    if (dto.effectiveTo) existing.effectiveTo = new Date(dto.effectiveTo)
    if (dto.agreementStart) existing.agreementStart = new Date(dto.agreementStart)
    if (dto.agreementEnd) existing.agreementEnd = new Date(dto.agreementEnd)
    if (dto.fixedPrice !== undefined) existing.fixedPrice = dto.fixedPrice
    if (dto.pricingMode) existing.pricingMode = dto.pricingMode
    if (dto.agreementNo !== undefined) existing.agreementNo = dto.agreementNo
    if (dto.salesRep !== undefined) existing.salesRep = dto.salesRep
    if (dto.discountRate !== undefined) existing.discountRate = dto.discountRate
    Object.assign(existing, dto)
    return this.pricingRepo.save(existing)
  }

  async removeTierPricing(id: string) {
    const existing = await this.pricingRepo.findOne({ where: { pricingId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`定价 ${id} 不存在`)
    existing.isDeleted = true
    return this.pricingRepo.save(existing)
  }

  async getTierPricings(customerId: string) {
    return this.pricingRepo.find({ where: { customerId, isDeleted: false }, order: { tier: 'ASC', minQuantity: 'ASC' } })
  }

  // =====================================================
  // 客户核心资产 CRUD（Phase 5 新增）
  // =====================================================

  // --- 验光处方 ---

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
    const id = `rx-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 6)}`
    return this.prescriptionRepo.save(
      this.prescriptionRepo.create({
        ...dto,
        prescriptionId: id,
        customerId,
        prescriptionDate: dto.prescriptionDate ? new Date(dto.prescriptionDate) : null,
        expireDate: dto.expireDate ? new Date(dto.expireDate) : null,
        isDeleted: false,
        ocrVerified: false,
      }),
    )
  }

  async getPrescriptions(customerId: string) {
    return this.prescriptionRepo.find({
      where: { customerId, isDeleted: false },
      order: { createdAt: 'DESC' },
    })
  }

  async removePrescription(id: string) {
    const existing = await this.prescriptionRepo.findOne({ where: { prescriptionId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`处方 ${id} 不存在`)
    existing.isDeleted = true
    return this.prescriptionRepo.save(existing)
  }

  // --- 客户镜片 ---

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
    const id = `cl-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 6)}`
    return this.customerLensRepo.save(
      this.customerLensRepo.create({
        ...dto,
        customerLensId: id,
        customerId,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        status: CUSTOMER_STATUS[0],
        isDeleted: false,
      }),
    )
  }

  async getCustomerLenses(customerId: string) {
    return this.customerLensRepo.find({
      where: { customerId, isDeleted: false },
      order: { createdAt: 'DESC' },
    })
  }

  /**
   * 获取客户镜片概览（用于客户详情快速查看）
   * 返回在用镜片标准列表 + 处方关联信息
   */
  async getCustomerLensSummary(customerId: string) {
    // Step 1: 获取客户镜片 + 处方关联
    const lenses = await this.customerLensRepo
      .createQueryBuilder('cl')
      .leftJoinAndSelect('cl.prescription', 'rx')
      .where('cl.customer_id = :customerId AND cl.is_deleted = :deleted', { customerId, deleted: false })
      .orderBy('cl.created_at', 'DESC')
      .getMany()

    // Step 2: 用 DataSource 直接查 structure_standard 表（避免跨模块依赖）
    const codes = [...new Set(lenses.map((l) => l.structureStandardCode).filter(Boolean))]
    const lensMap = new Map<string, any>()
    if (codes.length > 0) {
      const placeholders = codes.map(() => '?').join(',')
      const rows = await this.dataSource.query(
        `SELECT external_code, shape_code, width, height, surface_types, refractive_indexes FROM structure_standard WHERE external_code IN (${placeholders})`,
        codes,
      )
      rows.forEach((r: any) => lensMap.set(r.external_code, r))
    }

    return {
      total: lenses.length,
      active: lenses.filter((l) => l.status === CUSTOMER_STATUS[0]).length,
      lenses: lenses.map((l) => {
        const std = lensMap.get(l.structureStandardCode)
        return {
          customerLensId: l.customerLensId,
          structureStandardCode: l.structureStandardCode,
          structureStandard: std
            ? {
                externalCode: std.external_code,
                shapeCode: std.shape_code,
                width: std.width,
                height: std.height,
                surfaceType: std.surface_type,
                refractiveIndex: std.refractive_index,
              }
            : null,
          status: l.status,
          prescriptionId: l.prescriptionId,
          prescriptionLabel: l.prescription?.label || null,
          purchaseDate: l.purchaseDate,
          orderId: l.orderId,
          frameCount: 0, // frames relation not loaded in this query; use separate frames endpoint
          createdAt: l.createdAt,
        }
      }),
    }
  }

  async removeCustomerLens(id: string) {
    const existing = await this.customerLensRepo.findOne({ where: { customerLensId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`客户镜片 ${id} 不存在`)
    existing.isDeleted = true
    return this.customerLensRepo.save(existing)
  }

  // --- 客户消费档案 ---

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
    const id = `cp-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 6)}`
    return this.consumptionProfileRepo.save(
      this.consumptionProfileRepo.create({
        ...dto,
        consumptionProfileId: id,
        customerLensId,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        useStatus: dto.useStatus || CUSTOMER_STATUS[0],
        isDeleted: false,
      }),
    )
  }

  async getConsumptionProfiles(customerLensId: string) {
    return this.consumptionProfileRepo.find({
      where: { customerLensId, isDeleted: false },
      order: { createdAt: 'DESC' },
    })
  }

  async removeConsumptionProfile(id: string) {
    const existing = await this.consumptionProfileRepo.findOne({ where: { consumptionProfileId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`消费档案 ${id} 不存在`)
    existing.isDeleted = true
    return this.consumptionProfileRepo.save(existing)
  }

  // =====================================================
  // P1+ 客户管理重构 — 会员等级日志 + 积分流水 + 官网账户
  // =====================================================

  /** 查询会员等级变更日志 */
  async getMemberLevelLogs(customerId: string) {
    return this.memberLevelLogRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    })
  }

  /** 查询积分流水 */
  async getPointsTransactions(customerId: string) {
    return this.pointsTxnRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      take: 50,
    })
  }

  /** 获取官网账户信息 */
  async getAccountInfo(customerId: string) {
    const customer = await this.customerRepo.findOne({
      where: { customerId, isDeleted: false },
      select: [
        'customerId',
        'customerCode',
        'contactName',
        'nickname',
        'accountStatus',
        'registeredAt',
        'lastLoginAt',
        'customerLevel',
        'totalAmount',
        'totalOrders',
        'pointsBalance',
        'pointsEarned',
        'pointsUsed',
        'memberSince',
        'memberValidUntil',
        'lastActiveAt',
      ],
    })
    if (!customer) throw new NotFoundException(`客户 ${customerId} 不存在`)
    return customer
  }

  // P2修复：从 OrderService 迁移 — 打破 Product↔Order 循环依赖
  async scanMemberDowngrades(): Promise<{ count: number; details: any[] }> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    const customers = await this.customerRepo
      .createQueryBuilder('c')
      .where('c.customer_type = :type', { type: 'retail' })
      .andWhere('c.customer_level != :normal', { normal: 'normal' })
      .andWhere('c.last_active_at < :threshold', { threshold: ninetyDaysAgo })
      .getMany()

    const downgradeOrder = ['gold', 'svip', 'vip', 'normal']
    const details: any[] = []

    for (const customer of customers) {
      const currentIndex = downgradeOrder.indexOf(customer.customerLevel || 'normal')
      if (currentIndex <= 0 || currentIndex >= downgradeOrder.length) continue

      const newLevel = downgradeOrder[currentIndex + 1]
      const oldLevel = customer.customerLevel!

      await this.dataSource.transaction(async (manager) => {
        await manager.update(Customer, customer.customerId, { customerLevel: newLevel })

        const logId = `ml-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`
        await manager.save(MemberLevelLog, {
          logId,
          customerId: customer.customerId,
          oldLevel,
          newLevel,
          triggerType: 'downgrade',
          triggerReason: '90天无消费自动降级',
          orderId: null,
        })
      })

      details.push({
        customerId: customer.customerId,
        contactName: customer.contactName,
        oldLevel,
        newLevel,
        lastActiveAt: customer.lastActiveAt,
      })
    }

    return { count: details.length, details }
  }

  // ===== P2修复：从 OrderService 迁移 — 订单发货后沉淀客户镜片档案 =====
  async populateCustomerLensFromOrder(orderId: string): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { where: { orderId } })
      if (!order || !order.customerId) return

      const items = await manager.find(OrderItem, { where: { orderId } })
      if (!items || items.length === 0) return

      const structCodes = [...new Set(items.map((i) => i.structureStandardCode).filter(Boolean))]
      if (structCodes.length === 0) return

      for (const structCode of structCodes) {
        const existing = await manager.findOne(CustomerLens, {
          where: { customerId: order.customerId, structureStandardCode: structCode, isDeleted: false },
        })

        let customerLensId: string
        if (!existing) {
          const orderItems = items.filter((i) => i.structureStandardCode === structCode)
          const allFrameOnly = orderItems.every((i) => i.orderFulfillmentType === 'frame_only')
          const lensStatus = allFrameOnly ? LENS_STATUS.pending : 'active'

          customerLensId = `cl-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`
          await manager.save(CustomerLens, this.customerLensRepo.create({
            customerLensId, customerId: order.customerId,
            structureStandardCode: structCode,
            prescriptionId: order.prescriptionId || null,
            orderId, purchaseDate: new Date(), status: lensStatus,
            attributes: { autoPopulated: true, source: 'order_shipment' },
          }))
        } else {
          customerLensId = existing.customerLensId
          await manager.update(CustomerLens, customerLensId, { orderId, purchaseDate: new Date() })
        }

        for (const si of items.filter((i) => i.structureStandardCode === structCode)) {
          const profileId = `cp-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`
          await manager.save(CustomerConsumptionProfile, {
            profileId, customerLensId,
            productSkuCode: si.skuCode || null, productName: si.productName || null,
            purchaseDate: new Date(), orderId, useStatus: 'active',
            attributes: { autoPopulated: true, source: 'order_shipment' },
          })
        }
      }
    })
  }

  // ===== P2修复：从 OrderService 迁移 — 支付成功后更新会员资产 =====
  async updateMemberAssetsAfterPayment(orderId: string): Promise<void> {
    const order = await this.orderRepo.findOne({
      where: { orderId },
      select: ['orderId', 'customerId', 'customerType', 'totalAmount', 'status', 'orderNo', 'prescriptionId'],
    })
    if (!order || !order.customerId || order.customerType !== 'retail') return

    const now = new Date()
    const levelMultipliers: Record<string, number> = { normal: 1, vip: 1.5, svip: 2, gold: 3 }

    // P1-1修复：资产更新 + 会员等级检查 + 升级全部在同一事务中（悲观锁）
    await this.dataSource.transaction(async (manager) => {
      // 1. 悲观锁锁定客户行，防止并发
      const customer = await manager.findOne(Customer, {
        where: { customerId: order.customerId, isDeleted: false },
        lock: { mode: 'pessimistic_write' },
      })
      if (!customer) return

      const currentLevel = customer.customerLevel || 'normal'
      const multiplier = levelMultipliers[currentLevel] || 1
      const pointsEarned = Math.floor(Number(order.totalAmount) * multiplier)

      // 2. 资产更新
      await manager.increment(Customer, { customerId: order.customerId }, 'totalOrders', 1)
      await manager.increment(Customer, { customerId: order.customerId }, 'totalAmount', Number(order.totalAmount))
      await manager.update(Customer, order.customerId, { lastOrderAt: now, lastActiveAt: now })

      if (pointsEarned > 0) {
        await manager.increment(Customer, { customerId: order.customerId }, 'pointsBalance', pointsEarned)
        await manager.increment(Customer, { customerId: order.customerId }, 'pointsEarned', pointsEarned)

        const afterCustomer = await manager.findOne(Customer, {
          where: { customerId: order.customerId }, select: ['pointsBalance'],
        })
        const txnId = `pt-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`
        await manager.save(PointsTransaction, {
          txnId, customerId: order.customerId, points: pointsEarned,
          balanceAfter: afterCustomer?.pointsBalance ?? pointsEarned,
          type: 'order_earn', refId: orderId,
          description: `订单 ${order.orderNo || orderId} 消费产生积分（${multiplier}x 倍率）`,
        })
      }

      // 3. 重新读取更新后的 totalAmount（同一事务，数据一致）
      const updated = await manager.findOne(Customer, {
        where: { customerId: order.customerId },
        select: ['totalAmount'],
      })
      const newTotalAmount = Number(updated?.totalAmount || 0)

      // 4. 会员等级检查（同一事务）
      const memberLevels = await this.memberLevelRepo.find({ where: { isActive: true }, order: { sortOrder: 'ASC' } })
      let highestLevel = currentLevel
      for (const level of memberLevels) {
        if (newTotalAmount >= Number(level.upgradeThreshold || 0)) highestLevel = level.levelCode
      }

      // 5. 升级操作（同一事务）
      if (highestLevel !== currentLevel) {
        await manager.update(Customer, order.customerId, { customerLevel: highestLevel })
        if (!customer.memberSince) await manager.update(Customer, order.customerId, { memberSince: now })

        const logId = `ml-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`
        await manager.save(MemberLevelLog, {
          logId, customerId: order.customerId, oldLevel: currentLevel, newLevel: highestLevel,
          triggerType: 'upgrade',
          triggerReason: `累计消费 ¥${newTotalAmount.toFixed(2)} 达到升级门槛`,
          orderId,
        })
      }
    })
  }

  /**
   * 会员仪表盘 — 概览统计
   */
  async getMemberDashboard() {
    const summary = await this.customerRepo
      .createQueryBuilder('c')
      .select([
        'COUNT(*) AS total',
        'SUM(CASE WHEN c.totalAmount > 0 THEN 1 ELSE 0 END) AS hasSpent',
        'SUM(CASE WHEN c.memberSince IS NOT NULL THEN 1 ELSE 0 END) AS memberCount',
        'SUM(CASE WHEN c.lastActiveAt > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS active30d',
        'SUM(CASE WHEN c.lastActiveAt > DATE_SUB(NOW(), INTERVAL 90 DAY) THEN 1 ELSE 0 END) AS active90d',
        'AVG(c.totalAmount) AS avgSpent',
        'SUM(c.totalAmount) AS totalRevenue',
        'AVG(c.totalOrders) AS avgOrders',
      ])
      .where('c.isDeleted = 0 AND c.customerType = :type', { type: 'retail' })
      .getRawOne() || {}

    // null/undefined guard（空表兼容）
    const s: any = summary

    // 等级分布
    const levelDist = await this.customerRepo
      .createQueryBuilder('c')
      .select('c.customerLevel AS level, COUNT(*) AS cnt, SUM(c.totalAmount) AS totalSpent')
      .where('c.isDeleted = 0 AND c.customerType = :type', { type: 'retail' })
      .groupBy('c.customerLevel')
      .getRawMany() || []

    return {
      summary: {
        total: Number(s.total || 0),
        hasSpent: Number(s.hasSpent || 0),
        memberCount: Number(s.memberCount || 0),
        active30d: Number(s.active30d || 0),
        active90d: Number(s.active90d || 0),
        avgSpent: parseFloat(s.avgSpent || '0'),
        totalRevenue: parseFloat(s.totalRevenue || '0'),
        avgOrders: parseFloat(s.avgOrders || '0'),
      },
      levelDistribution: (levelDist || []).map((l: any) => ({
        level: l.level,
        count: Number(l.cnt || 0),
        totalSpent: parseFloat(l.totalSpent || '0'),
      })),
    }
  }

  /**
   * 会员分析列表 — 含活跃度、消费力、偏好
   */
  async getMemberAnalytics(query: {
    page?: number; pageSize?: number; level?: string; keyword?: string; sortBy?: string;
  }) {
    const { page = 1, pageSize = 20, level, keyword, sortBy = 'totalAmount' } = query
    const qb = this.customerRepo
      .createQueryBuilder('c')
      .select([
        'c.customerId', 'c.customerCode', 'c.contactName', 'c.phone',
        'c.customerLevel', 'c.totalAmount', 'c.totalOrders',
        'c.lastActiveAt', 'c.memberSince', 'c.createdAt',
        'c.pointsBalance', 'c.preferredStyle', 'c.referralSource',
        'c.subscriptionStatus', 'c.memberDiscountRate',
      ])
      .where('c.isDeleted = 0 AND c.customerType = :type', { type: 'retail' })

    if (level) qb.andWhere('c.customerLevel = :level', { level })
    if (keyword) qb.andWhere('(c.contactName LIKE :kw OR c.phone LIKE :kw OR c.customerCode LIKE :kw)', { kw: `%${this.escapeLikePattern(keyword)}%` })

    // 排序映射
    const sortMap: Record<string, string> = {
      totalAmount: 'c.totalAmount',
      lastActiveAt: 'c.lastActiveAt',
      totalOrders: 'c.totalOrders',
      createdAt: 'c.createdAt',
      memberSince: 'c.memberSince',
    }
    qb.orderBy(sortMap[sortBy] || 'c.totalAmount', 'DESC')

    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()

    // 写入额外字段：活跃度、流失风险
    const enriched = items.map((c: any) => {
      const daysSinceLastActive = c.lastActiveAt
        ? Math.floor((Date.now() - new Date(c.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24))
        : 999
      let activityStatus = 'inactive'
      if (daysSinceLastActive <= 30) activityStatus = 'active'
      else if (daysSinceLastActive <= 90) activityStatus = 'dormant'

      return {
        ...c,
        daysSinceLastActive,
        activityStatus,
        churnRisk: daysSinceLastActive > 90 ? 'high' : daysSinceLastActive > 60 ? 'medium' : 'low',
      }
    })

    return { items: enriched, total, page: +page, pageSize: +pageSize }
  }
}