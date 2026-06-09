import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AestheticsController } from './aesthetics.controller'
import { AestheticsService } from './aesthetics.service'
import { RuleEngineService } from './rule-engine.service'
import { AestheticRule } from './entities/aesthetic-rule.entity'
import { AestheticCompatMatrix } from './entities/aesthetic-compat-matrix.entity'
import { AestheticFeedback } from './entities/aesthetic-feedback.entity'

@Module({
  imports: [TypeOrmModule.forFeature([AestheticRule, AestheticCompatMatrix, AestheticFeedback])],
  controllers: [AestheticsController],
  providers: [AestheticsService, RuleEngineService],
  exports: [RuleEngineService, AestheticsService],
})
export class AestheticsModule {}
