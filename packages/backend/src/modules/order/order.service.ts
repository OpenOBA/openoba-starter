/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
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
import { MemberLevel } from '../product/entity/member-level.entity'
import { InventoryService } from '../inventory/inventory.service'
import { PricingEngineService } from '../product/pricing-engine.service'
import { CustomerService } from '../customer/customer.service'
import {
  ORDER_STATUS,
  ORDER_TYPES,
  PAYMENT_STATUS,
  LOGISTICS_STATUS,
  AFTER_SALE_STATUS_CODE,
  REVIEW_STATUS_CODE,
  PAYMENT_RECORD_STATUS,
  SHIPMENT_STATUS,
  FULFILLMENT_TYPE,
  LENS_STATUS,
} from './order.constants'
import { TransactionType } from '../inventory/entity/inventory-transaction.entity'
import {
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  QueryOrderDto,
  CreatePaymentDto,
  CreateShipmentDto,
} from './dto/order.dto'
import { PriceResult } from '../product/pricing-engine.service'
import { OrderCrudService } from './order-crud.service'
import { OrderQueryService } from './order-query.service'
import { OrderLifecycleService } from './order-lifecycle.service'

/**
 * OrderService — 聚合门面（Facade）
 *
 * 委托子 Service 处理具体领域：
 *  - OrderCrudService      → 创建订单 / 更新订单 / 状态变更 / 状态机
 *  - OrderQueryService     → 列表 / 详情 / 支付查询 / 发货查询 / 日志 / 统计
 *  - OrderLifecycleService → 取消 / 支付 / 发货 / 客户镜片档案
 */
@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name)

  // ===== 状态机常量（供 CRUD Service 和 Controller 外部引用） =====
  static readonly VALID_TRANSITIONS: Record<string, string[]> = {
    [ORDER_STATUS.pending]: [ORDER_STATUS.confirmed, ORDER_STATUS.cancelled],
    [ORDER_STATUS.confirmed]: [ORDER_STATUS.paid, ORDER_STATUS.cancelled],
    [ORDER_STATUS.paid]: [ORDER_STATUS.shipped, ORDER_STATUS.cancelled],
    [ORDER_STATUS.shipped]: [ORDER_STATUS.delivered, ORDER_STATUS.cancelled],
    [ORDER_STATUS.delivered]: [ORDER_STATUS.completed],
    [ORDER_STATUS.completed]: [],
    [ORDER_STATUS.cancelled]: [],
  }

  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemRepo: Repository<OrderItem>,
    @InjectRepository(OrderAddress) private addrRepo: Repository<OrderAddress>,
    @InjectRepository(OrderPayment) private payRepo: Repository<OrderPayment>,
    @InjectRepository(OrderShipment) private shipRepo: Repository<OrderShipment>,
    @InjectRepository(OrderLog) private logRepo: Repository<OrderLog>,
    @InjectRepository(CustomerLens) private customerLensRepo: Repository<CustomerLens>,
    @InjectRepository(CustomerConsumptionProfile)
    private customerConsumptionProfileRepo: Repository<CustomerConsumptionProfile>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(MemberLevelLog) private memberLevelLogRepo: Repository<MemberLevelLog>,
    @InjectRepository(MemberLevel) private memberLevelRepo: Repository<MemberLevel>,
    private readonly customerService: CustomerService,
    private inventoryService: InventoryService,
    private pricingEngineService: PricingEngineService,
    private dataSource: DataSource,
    private crudService: OrderCrudService,
    private queryService: OrderQueryService,
    private lifecycleService: OrderLifecycleService,
  ) {}

  // ===== 订单列表 / 详情 → OrderQueryService =====

  async findOrders(query: QueryOrderDto) {
    return this.queryService.findOrders(query)
  }

  async findOneOrder(id: string) {
    return this.queryService.findOneOrder(id)
  }

  // ===== 创建订单 → OrderCrudService =====

  async createOrder(dto: CreateOrderDto) {
    const result = await this.crudService.createOrder(dto)
    // findOneOrder 需要 orderId，由 createOrder 返回
    return this.queryService.findOneOrder(result.orderId)
  }

  // ===== 更新订单 → OrderCrudService =====

  async updateOrder(id: string, dto: UpdateOrderDto) {
    await this.crudService.updateOrder(id, dto, () => this.queryService.findOneOrder(id))
    return this.queryService.findOneOrder(id)
  }

  // ===== 更新订单状态 → OrderCrudService =====

  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto) {
    await this.crudService.updateOrderStatus(id, dto, () => this.queryService.findOneOrder(id))
    return this.queryService.findOneOrder(id)
  }

  // ===== 取消订单 → OrderLifecycleService =====

  async cancelOrder(id: string, remark?: string, operator?: string) {
    await this.lifecycleService.cancelOrder(id, () => this.queryService.findOneOrder(id), remark, operator)
    return this.queryService.findOneOrder(id)
  }

  // ===== 删除订单 =====

  async deleteOrder(id: string) {
    return this.cancelOrder(id, '删除订单')
  }

  // ===== 支付 → OrderLifecycleService =====

  async getOrderPayments(orderId: string) {
    return this.queryService.getOrderPayments(orderId)
  }

  async createPayment(dto: CreatePaymentDto) {
    const result = await this.lifecycleService.createPayment(dto)
    // 事务外副作用：会员资产更新
    try {
      await this.customerService.updateMemberAssetsAfterPayment(result.orderId)
    } catch (e: unknown) {
      this.logger.error(`会员资产更新失败 [${result.orderId}]: ${(e as Error).message}`)
      try {
        await this.orderRepo.update(result.orderId, { internalRemark: 'MEMBER_UPDATE_FAILED' } as unknown as Parameters<typeof this.orderRepo.update>[1])
      } catch (e2: unknown) {
        this.logger.error(`更新订单备注失败 [${result.orderId}]: ${(e2 as Error).message}`)
      }
    }
    return this.lifecycleService.findPaymentByNo(result.paymentNo)
  }

  // ===== 发货 → OrderLifecycleService =====

  async getOrderShipments(orderId: string) {
    return this.queryService.getOrderShipments(orderId)
  }

  async createShipment(dto: CreateShipmentDto) {
    const result = await this.lifecycleService.createShipment(dto)
    // 事务外副作用：客户档案沉淀
    try {
      await this.lifecycleService.autoPopulateCustomerLens(result.orderId)
    } catch (e) {
      this.logger.error(`客户档案沉淀失败 [${result.orderId}]:`, e instanceof Error ? (e as Error).message : String(e))
    }
    return this.lifecycleService.findShipmentByOrderId(result.orderId)
  }

  // ===== 日志 / 统计 → OrderQueryService =====

  async getOrderLogs(orderId: string) {
    return this.queryService.getOrderLogs(orderId)
  }

  async getStats() {
    return this.queryService.getStats()
  }
}
