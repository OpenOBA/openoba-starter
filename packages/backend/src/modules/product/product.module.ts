import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProductController } from './product.controller'
import { ExternalBarcodeMappingController } from './external-barcode-mapping.controller'
import { PricingController } from './pricing.controller'
import { ProductService } from './product.service'
import { ProductSpuService } from './product-spu.service'
import { ProductSkuService } from './product-sku.service'
import { ProductImageService } from './product-image.service'
import { ExternalBarcodeMappingService } from './external-barcode-mapping.service'
import { PricingService } from './pricing.service'
import { PricingEngineService } from './pricing-engine.service'
// P2修复：移�?OrderModule 循环依赖，改�?CustomerModule（scanMemberDowngrades 已迁移）
import { CustomerModule } from '../customer/customer.module'
import { CategoryModule } from '../category/category.module'
import { DictSkuColor } from './entity/dict-spu-color.entity'
import { ProductSpu } from './entity/product-spu.entity'
import { ProductSku } from './entity/product-sku.entity'
import { ProductSet } from './entity/product-set.entity'
import { ExternalBarcodeMapping } from './entity/external-barcode-mapping.entity'
import { ProductSkuImage } from './entity/product-sku-image.entity'
import { DictFrameMaterial } from './entity/dict-frame-material.entity'
import { DictFrameType } from './entity/dict-frame-type.entity'
import { DictNosePad } from './entity/dict-nose-pad.entity'
import { DictHinge } from './entity/dict-hinge.entity'
import { DictSurfaceTreatment } from './entity/dict-surface-treatment.entity'
import { ProductTierPricing } from './entity/product-tier-pricing.entity'
import { WholesaleTier } from './entity/wholesale-tier.entity'
import { PriceHistory } from './entity/price-history.entity'
import { MemberLevel } from './entity/member-level.entity'
import { MemberPricingRule } from './entity/member-pricing-rule.entity'
import { Promotion } from './entity/promotion.entity'
import { PromotionSku } from './entity/promotion-sku.entity'
// V2.0 命名规范：效果词�?
import { DictEffectTag } from './entity/dict-effect-tag.entity'
import { SkuEffectRecommend } from './entity/sku-effect-recommend.entity'
// Cross-module entity: customer_tier_pricing lives in customer module
import { CustomerTierPricing } from '../customer/entity/customer-tier-pricing.entity'
import { Customer } from '../customer/entity/customer.entity'
import { StructureStandard } from '../structure/entity/structure-standard.entity'
// ERDL 核心模块（引�?Core 闭源引擎 dist�?
import { ERDLModule } from '@openoba/core/dist/modules/erdl/erdl.module'

@Module({
  imports: [
    // P2修复：移�?forwardRef(OrderModule)，改�?CustomerModule
    CustomerModule,
    ERDLModule,
    CategoryModule,
    TypeOrmModule.forFeature([
      DictSkuColor,
      ProductSpu,
      ProductSku,
      ProductSet,
      ExternalBarcodeMapping,
      ProductSkuImage,
      DictFrameMaterial,
      DictFrameType,
      DictNosePad,
      DictHinge,
      DictSurfaceTreatment,
      ProductTierPricing,
      WholesaleTier,
      PriceHistory,
      MemberLevel,
      MemberPricingRule,
      Promotion,
      PromotionSku,
      CustomerTierPricing,
      Customer,
      StructureStandard,
      // V2.0 命名规范
      DictEffectTag,
      SkuEffectRecommend,
    ]),
  ],
  controllers: [ProductController, ExternalBarcodeMappingController, PricingController],
  providers: [
    ProductService,
    ProductSpuService,
    ProductSkuService,
    ProductImageService,
    ExternalBarcodeMappingService,
    PricingService,
    PricingEngineService,
  ],
  exports: [ProductService, ProductSpuService, ProductSkuService, ProductImageService, PricingService, PricingEngineService],
})
export class ProductModule {}
