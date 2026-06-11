import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Order } from './entity/order.entity'
import { OrderItem } from './entity/order-item.entity'
import { OrderAddress } from './entity/order-address.entity'
import { OrderPayment } from './entity/order-payment.entity'
import { OrderShipment } from './entity/order-shipment.entity'
import { OrderLog } from './entity/order-log.entity'
import { QueryOrderDto } from './dto/order.dto'
import { ORDER_STATUS } from './order.constants'

/**
 * 璁㈠崟鏌ヨ瀛?Service
 * 璐熻矗锛氬垪琛?璇︽儏/鏀粯/鐗╂祦/鏃ュ織/缁熻
 */
@Injectable()
export class OrderQueryService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemRepo: Repository<OrderItem>,
    @InjectRepository(OrderAddress) private addrRepo: Repository<OrderAddress>,
    @InjectRepository(OrderPayment) private payRepo: Repository<OrderPayment>,
    @InjectRepository(OrderShipment) private shipRepo: Repository<OrderShipment>,
    @InjectRepository(OrderLog) private logRepo: Repository<OrderLog>,
  ) {}

  async findOrders(query: QueryOrderDto) {
    const { page = 1, pageSize = 20, keyword, customerId, status, paymentStatus, orderType, startDate, endDate } = query
    const qb = this.orderRepo.createQueryBuilder('o').where('1=1')
    const safeKeyword = keyword
      ? keyword.toString().slice(0, 50).replace(/[%_]/g, '\\$&')
      : ''
    if (safeKeyword) {
      qb.andWhere('(o.order_no LIKE :kw OR o.customer_name LIKE :kw)', { kw: '%' + safeKeyword + '%' })
    }
    if (customerId) qb.andWhere('o.customer_id = :cid', { cid: customerId })
    if (status) qb.andWhere('o.status = :st', { st: status })
    if (paymentStatus) qb.andWhere('o.payment_status = :ps', { ps: paymentStatus })
    if (orderType) qb.andWhere('o.order_type = :ot', { ot: orderType })
    if (startDate) qb.andWhere('o.created_at >= :sd', { sd: startDate })
    if (endDate) qb.andWhere('o.created_at <= :ed', { ed: endDate })
    qb.orderBy('o.created_at', 'DESC')
    const [orders, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount()

    const orderIds = orders.map((o) => o.orderId)
    const [items, addresses] = orderIds.length > 0
      ? await Promise.all([
          this.itemRepo.find({ where: orderIds.map((id) => ({ orderId: id })), order: { createdAt: 'ASC' } }),
          this.addrRepo.find({ where: orderIds.map((id) => ({ orderId: id })) }),
        ])
      : [[], []]

    const result = orders.map((o) => ({
      ...o,
      items: items.filter((i) => i.orderId === o.orderId),
      address: addresses.find((a) => a.orderId === o.orderId) || null,
    }))

    return { items: result, total, page: +page, pageSize: +pageSize }
  }

  async findOneOrder(id: string) {
    const order = await this.orderRepo.findOne({ where: { orderId: id } })
    if (!order) throw new NotFoundException('璁㈠崟涓嶅瓨鍦?)

    const [items, addresses, payments, shipments, logs] = await Promise.all([
      this.itemRepo.find({ where: { orderId: id }, order: { createdAt: 'ASC' } }),
      this.addrRepo.find({ where: { orderId: id } }),
      this.payRepo.find({ where: { orderId: id }, order: { createdAt: 'DESC' } }),
      this.shipRepo.find({ where: { orderId: id }, order: { createdAt: 'DESC' } }),
      this.logRepo.find({ where: { orderId: id }, order: { createdAt: 'DESC' } }),
    ])

    return { ...order, items, address: addresses[0] || null, payments, shipments, logs }
  }

  async getOrderPayments(orderId: string) {
    return this.payRepo.find({ where: { orderId }, order: { createdAt: 'DESC' } })
  }

  async getOrderShipments(orderId: string) {
    return this.shipRepo.find({ where: { orderId }, order: { createdAt: 'DESC' } })
  }

  async getOrderLogs(orderId: string) {
    return this.logRepo.find({ where: { orderId }, order: { createdAt: 'DESC' } })
  }

  async getStats() {
    const qb = this.orderRepo.createQueryBuilder('o')
    const [total, pending, paid, shipping, completed, cancelled] = await Promise.all([
      qb.getCount(),
      qb.clone().where('o.status = :s', { s: ORDER_STATUS.pending }).getCount(),
      qb.clone().where('o.status = :s', { s: ORDER_STATUS.paid }).getCount(),
      qb.clone().where('o.status = :s', { s: ORDER_STATUS.shipped }).getCount(),
      qb.clone().where('o.status = :s', { s: ORDER_STATUS.completed }).getCount(),
      qb.clone().where('o.status = :s', { s: ORDER_STATUS.cancelled }).getCount(),
    ])
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todaySales = await this.orderRepo
      .createQueryBuilder('o')
      .select('SUM(o.actualAmount)', 'total')
      .where('o.status IN (:...statuses)', { statuses: [ORDER_STATUS.paid, ORDER_STATUS.shipped, ORDER_STATUS.completed] })
      .andWhere('o.created_at >= :today', { today })
      .getRawOne()
    return { total, pending, paid, shipping, completed, cancelled, todaySales: Number(todaySales?.total || 0) }
  }
}
