/**
 * ER-OS Task Module — 任务工作流引擎模块
 */

import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HttpModule } from '@nestjs/axios'
import { AgentTask } from './agent-task.entity'
import { ReportTarget } from './report-target.entity'
import { AgentRegistry } from './agent-registry.entity'
import { CognitiveLog } from './cognitive-log.entity'
import { KnowledgeEntry } from './knowledge-entry.entity'
import { PublishPackage } from './publish-package.entity'
import { SystemModuleRegistry } from './system-module-registry.entity'
import { RunRegistry } from '../stream/run-registry'
import { AgentTaskService } from './agent-task.service'
import { AgentExecutorService } from './agent-executor.service'
import { KnowledgeService } from './knowledge.service'
import { HotwordService } from './hotword.service'
import { AgentToolRegistry } from './agent-tool-registry'
import { AgentSecurityGuard } from './agent-security-guard'
import { AgentToolRegistrar } from './agent-tool-registrar'
import { AgentToolImplementations } from './agent-tool-implementations'
import { ToolRegistryBridge } from './tool-registry-bridge.service'
import { AgentTaskController } from './agent-task.controller'
import { KnowledgeController } from './knowledge.controller'
import { AgentStreamController } from './agent-stream.controller'
import { AgentChatController } from './agent-chat.controller'
import { ERDLModule } from '../../erdl/erdl.module'
import { DraftPoolModule } from '../../draft-pool/draft-pool.module'
import { DraftSpu } from '../../draft-pool/entities/draft-spu.entity'
import { AestheticsModule } from '../../aesthetics/aesthetics.module'
import { InventoryModule } from '../../inventory/inventory.module'
import { SystemModule } from '../../system/system.module'
import { DeliverableModule } from '../deliverable/deliverable.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentTask, ReportTarget, AgentRegistry, CognitiveLog, KnowledgeEntry, PublishPackage, SystemModuleRegistry, DraftSpu]),
    HttpModule,
    forwardRef(() => ERDLModule),
    DraftPoolModule,
    AestheticsModule,
    InventoryModule,
    SystemModule,
    DeliverableModule,
  ],
  controllers: [AgentTaskController, KnowledgeController, AgentStreamController, AgentChatController],
  providers: [AgentTaskService, AgentExecutorService, KnowledgeService, HotwordService, AgentToolRegistry, AgentSecurityGuard, AgentToolRegistrar, AgentToolImplementations, ToolRegistryBridge, RunRegistry],
  exports: [AgentTaskService, AgentExecutorService, KnowledgeService, ToolRegistryBridge],
})
export class ErosTaskModule {}
