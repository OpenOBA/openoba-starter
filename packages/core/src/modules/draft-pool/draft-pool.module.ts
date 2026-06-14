/**
 * DraftPool Engine Stub Module
 *
 * 供 AgentExecutorService 注入 DraftPoolService / DraftService。
 * 行业模块可通过 NestJS 模块覆盖提供完整实现。
 *
 * @file draft-pool.module.ts
 * @since 2026-06-01
 */

import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DraftPoolService } from './draft-pool.service'
import { DraftService } from './draft.service'
import { DraftSpu } from './entities/draft-spu.entity'

@Module({
  imports: [TypeOrmModule.forFeature([DraftSpu])],
  providers: [DraftPoolService, DraftService],
  exports: [DraftPoolService, DraftService],
})
export class DraftPoolModule {}
