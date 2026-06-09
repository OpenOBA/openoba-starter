import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WebsiteController } from './website.controller'
import { WebsiteService } from './website.service'
import { WebsiteCatalogService } from './website-catalog.service'

// 直接注册所需实体，避免跨模块循环依赖
import { ProductSpu } from '../product/entity/product-spu.entity'
import { ProductSku } from '../product/entity/product-sku.entity'
import { ProductSkuImage } from '../product/entity/product-sku-image.entity'
import { ProductCategory } from '../product/entity/product-category.entity'
import { ProductSet } from '../product/entity/product-set.entity'
import { DictSkuColor } from '../product/entity/dict-spu-color.entity'
import { Inventory } from '../inventory/entity/inventory.entity'
import { Order } from '../order/entity/order.entity'
import { OrderItem } from '../order/entity/order-item.entity'
import { StructureCompatibility } from '../structure/entity/structure-compatibility.entity'
import { StructureStandard } from '../structure/entity/structure-standard.entity'
import { DictFrameMaterial } from '../product/entity/dict-frame-material.entity'
import { DictFrameType } from '../product/entity/dict-frame-type.entity'
import { DictNosePad } from '../product/entity/dict-nose-pad.entity'
import { DictHinge } from '../product/entity/dict-hinge.entity'
import { DictSurfaceTreatment } from '../product/entity/dict-surface-treatment.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductSpu,
      ProductSku,
      ProductSkuImage,
      ProductCategory,
      ProductSet,
      DictSkuColor,
      Inventory,
      Order,
      OrderItem,
      StructureCompatibility,
      StructureStandard,
      DictFrameMaterial,
      DictFrameType,
      DictNosePad,
      DictHinge,
      DictSurfaceTreatment,
    ]),
  ],
  controllers: [WebsiteController],
  providers: [WebsiteService, WebsiteCatalogService],
  exports: [WebsiteService, WebsiteCatalogService],
})
export class WebsiteModule {}
