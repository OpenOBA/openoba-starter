import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { StructureStandard } from './entity/structure-standard.entity'
import { StructureStandardAttachment } from './entity/structure-standard-attachment.entity'
import { StructureCompatibility } from './entity/structure-compatibility.entity'
import { StructureController } from './structure.controller'
import { StructureService } from './structure.service'

@Module({
  imports: [TypeOrmModule.forFeature([StructureStandard, StructureStandardAttachment, StructureCompatibility])],
  controllers: [StructureController],
  providers: [StructureService],
  exports: [StructureService],
})
export class StructureModule {}
