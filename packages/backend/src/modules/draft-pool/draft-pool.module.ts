import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DraftPoolController } from './draft-pool.controller'
import { DraftController } from './draft.controller'
import { DraftPoolService } from './draft-pool.service'
import { DraftService } from './draft.service'
import { Draft } from './entities/draft.entity'
import { DraftSpu } from './entities/draft-spu.entity'
import { DraftSku } from './entities/draft-sku.entity'
import { DraftBatch } from './entities/draft-batch.entity'
import { DraftPublishBatch } from './entities/draft-publish-batch.entity'
import { AdvisoryReport } from './entities/advisory-report.entity'
import { DraftTask } from './entities/draft-task.entity'
import { ProductSpu } from '../product/entity/product-spu.entity'
import { ProductSku } from '../product/entity/product-sku.entity'
import { StructureStandard } from '../structure/entity/structure-standard.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Draft, DraftSpu, DraftSku, DraftBatch, DraftPublishBatch, AdvisoryReport, DraftTask, ProductSpu, ProductSku, StructureStandard])],
  controllers: [DraftPoolController, DraftController],
  providers: [DraftPoolService, DraftService],
  exports: [DraftPoolService, DraftService],
})
export class DraftPoolModule {}
