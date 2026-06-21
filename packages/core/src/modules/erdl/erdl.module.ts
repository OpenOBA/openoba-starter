/**
 * 秒镜科技 · ERDL — Enterprise Resource Definition Language
 *
 * @file ERDL Module — NestJS 模块定义（v2：含议会模型）
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-01
 * @license BSL-1.1
 *
 * Copyright (c) 2026 深圳市秒镜科技有限公司
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * @description
 * ERDL 核心模块，整合以下子组件：
 *
 * 声明层：
 * - Parser: YAML 解析
 * - Schema Generator: 表单 Schema 生成
 *
 * 执行层：
 * - Registry: 运行时注册中心
 * - RuleEngine: 规则执行引擎
 * - HotReload: 文件热重载
 *
 * 智能层：
 * - LLM Bridge v2: 多 Provider + Failover + Token 计数
 *
 * 议会层（v2 新增）：
 * - RuleStore: 不可变规则存储
 * - SnapshotManager: 全局快照管理
 * - RuleEventBus: 事件总线
 * - ProposalEngine: 提案引擎
 * - ValidationEngine: 冲突校验
 */

import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HttpModule } from '@nestjs/axios'
import { ERDLRegistry } from './core/erdl-registry'
import { ERDLRuleEngine } from './core/erdl-rule-engine'
import { ERDLHotReload } from './core/erdl-hot-reload'
import { ERDLLLMBridge } from './llm/erdl-llm-bridge'
import { LlmSseHandler } from './llm/llm-sse-handler'
import { LlmPromptBuilder } from './llm/llm-prompt-builder'
import { ERDLSchemaGenerator } from './schema/erdl-schema-generator'
import { RuleStoreService } from './core/rule-store.service'
import { SnapshotManagerService } from './core/snapshot-manager.service'
import { RuleEventBus } from './core/rule-event-bus.service'
import { ProposalEngine, ValidationEngine } from './core/proposal-engine.service'
import { ERDLController } from './erdl.controller'
import { ERDLPlaygroundController } from './erdl-playground.controller'
import { ERDLRecommendController } from './erdl-recommend.controller'
import { McpServerController } from './mcp/mcp-server.controller'
import { EntityProxyService } from './core/entity-proxy.service'
import { ERDLActionGuard } from './core/erdl-action-guard'
import { FileReaderService } from './file-reader.service'
// 议会模型 Entities
import { ERDLRuleRecord } from './core/entity/erdl-rule-record.entity'
import { ERDLSnapshot } from './core/entity/erdl-snapshot.entity'
import { ERDLProposal, ERDLProposalVote } from './core/entity/erdl-proposal.entity'

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      ERDLRuleRecord,
      ERDLSnapshot,
      ERDLProposal,
      ERDLProposalVote,
    ]),
  ],
  controllers: [
    ERDLController,
    ERDLPlaygroundController,
    ERDLRecommendController,
    McpServerController,
  ],
  providers: [
    // 声明层
    ERDLRegistry,
    // 执行层
    ERDLRuleEngine,
    ERDLHotReload,
    // 智能层
    ERDLLLMBridge,
    // V2.1 智能层子模块（渐进式拆分）
    LlmSseHandler,
    LlmPromptBuilder,
    ERDLSchemaGenerator,
    // V1.3 实体代理引擎
    EntityProxyService,
    // V1.5 ERDL Action Guard
    ERDLActionGuard,
    // V1.6 FileReader — Agent 文件读取
    FileReaderService,
    // 议会层（v2）
    RuleStoreService,
    SnapshotManagerService,
    RuleEventBus,
    ProposalEngine,
    ValidationEngine,
  ],
  exports: [
    ERDLRegistry,
    ERDLRuleEngine,
    ERDLLLMBridge,
    LlmSseHandler,
    LlmPromptBuilder,
    ERDLSchemaGenerator,
    EntityProxyService,
    ERDLActionGuard,
    FileReaderService,
    // 议会层导出
    RuleStoreService,
    SnapshotManagerService,
    RuleEventBus,
    ProposalEngine,
    ValidationEngine,
  ],
})
export class ERDLModule {}
