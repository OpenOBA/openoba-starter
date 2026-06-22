import { Module, OnModuleInit } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
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
import { InventoryModule } from '../inventory/inventory.module'
import { ProductModule } from '../product/product.module'
import { CustomerModule } from '../customer/customer.module'
import { OrderService } from './order.service'
import { OrderQueryService } from './order-query.service'
import { OrderCrudService } from './order-crud.service'
import { OrderLifecycleService } from './order-lifecycle.service'
import { OrderController } from './order.controller'
import { ToolRegistry } from '@openoba/core/dist/modules/tool-registry/tool-registry.service'
import { registerOrderTools } from '../tool-registry/tools/order.tools'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderAddress,
      OrderPayment,
      OrderShipment,
      OrderLog,
      CustomerLens,
      CustomerConsumptionProfile,
      Customer,
      MemberLevelLog,
      MemberLevel,
    ]),
    InventoryModule,
    CustomerModule,
    ProductModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderQueryService, OrderCrudService, OrderLifecycleService],
  exports: [OrderService],
})
export class OrderModule implements OnModuleInit {
  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly orderService: OrderService,
  ) {}

  onModuleInit() {
    registerOrderTools(this.toolRegistry, this.orderService)
  }
}
