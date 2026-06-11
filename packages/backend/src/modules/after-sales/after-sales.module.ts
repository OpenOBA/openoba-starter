import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AfterSales } from './entity/after-sales.entity'
import { AfterSalesLog } from './entity/after-sales-log.entity'
import { Order } from '../order/entity/order.entity'
import { AfterSalesService } from './after-sales.service'
import { AfterSalesStateMachine } from './after-sales-state-machine'
import { AfterSalesController } from './after-sales.controller'
import { InventoryModule } from '../inventory/inventory.module'

@Module({
  imports: [TypeOrmModule.forFeature([AfterSales, AfterSalesLog, Order]), forwardRef(() => InventoryModule)],
  controllers: [AfterSalesController],
  providers: [AfterSalesService, AfterSalesStateMachine],
  exports: [AfterSalesService],
})
export class AfterSalesModule {}
