import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SubSkuController } from './sub-sku.controller'
import { SubSkuService } from './sub-sku.service'
import { SubSku } from './entity/sub-sku.entity'
import { SubSkuCategory } from './entity/sub-sku-category.entity'

@Module({
  imports: [TypeOrmModule.forFeature([SubSku, SubSkuCategory])],
  controllers: [SubSkuController],
  providers: [SubSkuService],
  exports: [SubSkuService],
})
export class SubSkuModule {}
