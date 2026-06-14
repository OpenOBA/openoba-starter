/**
 * Aesthetics Engine Stub Module
 *
 * @file aesthetics.module.ts
 * @since 2026-06-01
 */

import { Module } from '@nestjs/common'
import { AestheticsService } from './aesthetics.service'

@Module({
  providers: [AestheticsService],
  exports: [AestheticsService],
})
export class AestheticsModule {}
