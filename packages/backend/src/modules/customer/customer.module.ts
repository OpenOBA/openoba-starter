import { Module, OnModuleInit } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
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
import { CustomerController } from './customer.controller'
import { CustomerService } from './customer.service'
import { CustomerCrudService } from './customer-crud.service'
import { CustomerContactService } from './customer-contact.service'
import { CustomerPricingService } from './customer-pricing.service'
import { CustomerLensService } from './customer-lens.service'
import { CustomerMemberService } from './customer-member.service'
import { ToolRegistry } from '@openoba/core/dist/modules/tool-registry/tool-registry.service'
import { registerCustomerTools } from '../tool-registry/tools/customer.tools'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      CustomerContact,
      CustomerAddress,
      CustomerTierPricing,
      VisionPrescription,
      CustomerLens,
      CustomerConsumptionProfile,
      MemberLevelLog,
      PointsTransaction,
      Order,
      OrderItem,
      MemberLevel,
    ]),
  ],
  controllers: [CustomerController],
  providers: [
    CustomerService,
    CustomerCrudService,
    CustomerContactService,
    CustomerPricingService,
    CustomerLensService,
    CustomerMemberService,
  ],
  exports: [CustomerService],
})
export class CustomerModule implements OnModuleInit {
  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly customerService: CustomerService,
  ) {}

  onModuleInit() {
    registerCustomerTools(this.toolRegistry, this.customerService)
  }
}
