/* eslint-disable @typescript-eslint/no-explicit-any -- TODO: 需要类型化 */
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Customer } from './entity/customer.entity'
import { CustomerLens } from './entity/customer-lens.entity'
import { CustomerConsumptionProfile } from './entity/customer-consumption-profile.entity'
import { MemberLevelLog } from './entity/member-level-log.entity'
import { PointsTransaction } from './entity/points-transaction.entity'
import { Order } from '../order/entity/order.entity'
import { OrderItem } from '../order/entity/order-item.entity'
import { MemberLevel } from '../product/entity/member-level.entity'
import { LENS_STATUS } from '../order/order.constants'

/**
 * 会员系统子 Service
 * 负责：会员等级、积分、仪表盘、订单集成（populateCustomerLensFromOrder, updateMemberAssetsAfterPayment）
 */
@Injectable()
export class CustomerMemberService {
  constructor(
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(CustomerLens) private customerLensRepo: Repository<CustomerLens>,
    @InjectRepository(CustomerConsumptionProfile)
    private consumptionProfileRepo: Repository<CustomerConsumptionProfile>,
    @InjectRepository(MemberLevelLog) private memberLevelLogRepo: Repository<MemberLevelLog>,
    @InjectRepository(PointsTransaction) private pointsTxnRepo: Repository<PointsTransaction>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private orderItemRepo: Repository<OrderItem>,
    @InjectRepository(MemberLevel) private memberLevelRepo: Repository<MemberLevel>,
    private dataSource: DataSource,
  ) {}

  escapeLikePattern(keyword: string): string {
    return keyword.replace(/[%_]/g, '\\$&')
  }

  async getMemberLevelLogs(customerId: string) {
    return this.memberLevelLogRepo.find({ where: { customerId }, order: { createdAt: 'DESC' } })
  }

  async getPointsTransactions(customerId: string) {
    return this.pointsTxnRepo.find({ where: { customerId }, order: { createdAt: 'DESC' }, take: 50 })
  }

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

  async scanMemberDowngrades(): Promise<{ count: number; details: Record<string, unknown>[] }> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const customers = await this.customerRepo
      .createQueryBuilder('c')
      .where('c.customer_type = :type', { type: 'retail' })
      .andWhere('c.customer_level != :normal', { normal: 'normal' })
      .andWhere('c.last_active_at < :threshold', { threshold: ninetyDaysAgo })
      .getMany()

    const downgradeOrder = ['gold', 'svip', 'vip', 'normal']
    const details: Record<string, unknown>[] = []

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
          await manager.save(
            CustomerLens,
            this.customerLensRepo.create({
              customerLensId,
              customerId: order.customerId,
              structureStandardCode: structCode,
              prescriptionId: order.prescriptionId || null,
              orderId,
              purchaseDate: new Date(),
              status: lensStatus,
              attributes: { autoPopulated: true, source: 'order_shipment' },
            }),
          )
        } else {
          customerLensId = existing.customerLensId
          await manager.update(CustomerLens, customerLensId, { orderId, purchaseDate: new Date() })
        }

        for (const si of items.filter((i) => i.structureStandardCode === structCode)) {
          const profileId = `cp-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`
          await manager.save(CustomerConsumptionProfile, {
            profileId,
            customerLensId,
            productSkuCode: si.skuCode || null,
            productName: si.productName || null,
            purchaseDate: new Date(),
            orderId,
            useStatus: 'active',
            attributes: { autoPopulated: true, source: 'order_shipment' },
          })
        }
      }
    })
  }

  async updateMemberAssetsAfterPayment(orderId: string): Promise<void> {
    const order = await this.orderRepo.findOne({
      where: { orderId },
      select: ['orderId', 'customerId', 'customerType', 'totalAmount', 'status', 'orderNo', 'prescriptionId'],
    })
    if (!order || !order.customerId || order.customerType !== 'retail') return

    const now = new Date()
    const levelMultipliers: Record<string, number> = { normal: 1, vip: 1.5, svip: 2, gold: 3 }

    await this.dataSource.transaction(async (manager) => {
      const customer = await manager.findOne(Customer, {
        where: { customerId: order.customerId, isDeleted: false },
        lock: { mode: 'pessimistic_write' },
      })
      if (!customer) return

      const currentLevel = customer.customerLevel || 'normal'
      const multiplier = levelMultipliers[currentLevel] || 1
      const pointsEarned = Math.floor(Number(order.totalAmount) * multiplier)

      await manager.increment(Customer, { customerId: order.customerId }, 'totalOrders', 1)
      await manager.increment(Customer, { customerId: order.customerId }, 'totalAmount', Number(order.totalAmount))
      await manager.update(Customer, order.customerId, { lastOrderAt: now, lastActiveAt: now })

      if (pointsEarned > 0) {
        await manager.increment(Customer, { customerId: order.customerId }, 'pointsBalance', pointsEarned)
        await manager.increment(Customer, { customerId: order.customerId }, 'pointsEarned', pointsEarned)

        const afterCustomer = await manager.findOne(Customer, {
          where: { customerId: order.customerId },
          select: ['pointsBalance'],
        })
        const txnId = `pt-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`
        await manager.save(PointsTransaction, {
          txnId,
          customerId: order.customerId,
          points: pointsEarned,
          balanceAfter: afterCustomer?.pointsBalance ?? pointsEarned,
          type: 'order_earn',
          refId: orderId,
          description: `订单 ${order.orderNo || orderId} 消费产生积分（${multiplier}x 倍率）`,
        })
      }

      const updated = await manager.findOne(Customer, {
        where: { customerId: order.customerId },
        select: ['totalAmount'],
      })
      const newTotalAmount = Number(updated?.totalAmount || 0)

      const memberLevels = await this.memberLevelRepo.find({ where: { isActive: true }, order: { sortOrder: 'ASC' } })
      let highestLevel = currentLevel
      for (const level of memberLevels) {
        if (newTotalAmount >= Number(level.upgradeThreshold || 0)) highestLevel = level.levelCode
      }

      if (highestLevel !== currentLevel) {
        await manager.update(Customer, order.customerId, { customerLevel: highestLevel })
        if (!customer.memberSince) await manager.update(Customer, order.customerId, { memberSince: now })

        const logId = `ml-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`
        await manager.save(MemberLevelLog, {
          logId,
          customerId: order.customerId,
          oldLevel: currentLevel,
          newLevel: highestLevel,
          triggerType: 'upgrade',
          triggerReason: `累计消费 ¥${newTotalAmount.toFixed(2)} 达到升级门槛`,
          orderId,
        })
      }
    })
  }

  async getMemberDashboard() {
    const summary =
      (await this.customerRepo
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
        .getRawOne()) || {}

    const s: Record<string, unknown> = summary
    const levelDist =
      (await this.customerRepo
        .createQueryBuilder('c')
        .select('c.customerLevel AS level, COUNT(*) AS cnt, SUM(c.totalAmount) AS totalSpent')
        .where('c.isDeleted = 0 AND c.customerType = :type', { type: 'retail' })
        .groupBy('c.customerLevel')
        .getRawMany()) || []

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
      levelDistribution: (levelDist || []).map((l: Record<string, unknown>) => ({
        level: l.level,
        count: Number(l.cnt || 0),
        totalSpent: parseFloat(l.totalSpent || '0'),
      })),
    }
  }

  async getMemberAnalytics(query: {
    page?: number
    pageSize?: number
    level?: string
    keyword?: string
    sortBy?: string
  }) {
    const { page = 1, pageSize = 20, level, keyword, sortBy = 'totalAmount' } = query
    const qb = this.customerRepo
      .createQueryBuilder('c')
      .select([
        'c.customerId',
        'c.customerCode',
        'c.contactName',
        'c.phone',
        'c.customerLevel',
        'c.totalAmount',
        'c.totalOrders',
        'c.lastActiveAt',
        'c.memberSince',
        'c.createdAt',
        'c.pointsBalance',
        'c.preferredStyle',
        'c.referralSource',
        'c.subscriptionStatus',
        'c.memberDiscountRate',
      ])
      .where('c.isDeleted = 0 AND c.customerType = :type', { type: 'retail' })

    if (level) qb.andWhere('c.customerLevel = :level', { level })
    if (keyword)
      qb.andWhere('(c.contactName LIKE :kw OR c.phone LIKE :kw OR c.customerCode LIKE :kw)', {
        kw: `%${this.escapeLikePattern(keyword)}%`,
      })

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

    const enriched = items.map((c: Record<string, unknown>) => {
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
