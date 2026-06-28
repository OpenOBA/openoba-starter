/**
 * ERA SOUL 模块
 *
 * 统一管理所有 Agent 的 System Prompt 构建。
 * 五层注入：系统SOUL → 组织信息 → Agent身份 → 岗位能力 → 操作铁律
 *
 * @file soul.module.ts
 * @author OpenOBA
 * @since 2026-05-25
 */

import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AgentManifest } from '../system/agent/agent-manifest.entity'
import { SoulService } from './soul.service'
import { AgentIdentityBuilder } from './agent-identity.builder'
import { OrgInfoBuilder } from './org-info.builder'
import { RoleCapabilityBuilder } from './role-capability.builder'
import { IronRulesBuilder } from './iron-rules.builder'
import { MirrorKnowledgeReader } from './mirror-knowledge-reader'

@Global() // 全局模块，所有 Module 均可直接注入 SoulService
@Module({
  imports: [
    TypeOrmModule.forFeature([AgentManifest]),
  ],
  providers: [
    SoulService,
    AgentIdentityBuilder,
    OrgInfoBuilder,
    RoleCapabilityBuilder,
    IronRulesBuilder,
    MirrorKnowledgeReader,
  ],
  exports: [
    SoulService,
  ],
})
export class SoulModule {}
