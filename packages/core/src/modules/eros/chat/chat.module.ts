/**
 * ERA Chat Module — WebSocket 通信模块
 *
 * @file chat.module.ts
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-21
 * @license AGPL-3.0
 */

import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule } from '@nestjs/config'
import { ChatGateway } from './chat.gateway'
import { ChatSessionManager } from './chat.session-manager'
import { MessageService } from './message.service'
import { RunRegistry } from '../stream/run-registry'
import { ErosTaskModule } from '../task/eros-task.module'
import { AgentTask } from '../task/agent-task.entity'
import { AgentRegistry } from '../task/agent-registry.entity'
import { ReportTarget } from '../task/report-target.entity'
import { CognitiveLog } from '../task/cognitive-log.entity'
import { KnowledgeEntry } from '../task/knowledge-entry.entity'
import { PublishPackage } from '../task/publish-package.entity'
import { SystemModuleRegistry } from '../task/system-module-registry.entity'
import { ERDLModule } from '../../erdl/erdl.module'
import { DraftPoolModule } from '../../draft-pool/draft-pool.module'
import { DraftSpu } from '../../draft-pool/entities/draft-spu.entity'
import { AestheticsModule } from '../../aesthetics/aesthetics.module'
import { InventoryModule } from '../../inventory/inventory.module'
import { DeliverableModule } from '../deliverable/deliverable.module'
import { HttpModule } from '@nestjs/axios'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgentTask, ReportTarget, AgentRegistry, CognitiveLog,
      KnowledgeEntry, PublishPackage, SystemModuleRegistry, DraftSpu,
    ]),
    HttpModule,
    JwtModule,
    ConfigModule,
    forwardRef(() => ERDLModule),
    forwardRef(() => ErosTaskModule),  // ← 导入 ErosTaskModule（提供 AgentExecutorService + KnowledgeService）
    DraftPoolModule,
    AestheticsModule,
    InventoryModule,
    DeliverableModule,
  ],
  providers: [
    ChatGateway,
    ChatSessionManager,
    MessageService,
    RunRegistry,
  ],
  exports: [ChatGateway],
})
export class ChatModule {}
