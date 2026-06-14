import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScheduleModule } from '@nestjs/schedule'
import { DeliverableManifest } from './deliverable-manifest.entity'
import { CognitiveLog } from '../task/cognitive-log.entity'
import { DeliverableService } from './deliverable.service'
import { AgentEvolutionService } from './agent-evolution.service'
import { LogArchiveService } from './log-archive.service'
import { DeliverableController } from './deliverable.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([DeliverableManifest, CognitiveLog]),
    ScheduleModule.forRoot(),
  ],
  controllers: [DeliverableController],
  providers: [DeliverableService, AgentEvolutionService, LogArchiveService],
  exports: [DeliverableService, AgentEvolutionService],
})
export class DeliverableModule {}
