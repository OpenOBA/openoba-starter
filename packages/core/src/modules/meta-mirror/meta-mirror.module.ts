/**
 * 元镜（Meta-Mirror）— NestJS 模块
 */

import { Module } from '@nestjs/common'
import { MetaMirrorService } from './meta-mirror.service'
import { MetaMirrorController } from './meta-mirror.controller'
import { EntityScanner } from './scanners/entity.scanner'
import { APIScanner } from './scanners/api.scanner'
import { ModuleScanner } from './scanners/module.scanner'
import { RuleScanner } from './scanners/rule.scanner'
import { DtoScanner } from './scanners/dto.scanner'
import { ErdlAuditScanner } from './scanners/erdl-audit.scanner'
import { KnowledgeWriter } from './generators/knowledge-writer.generator'
import { DepGraphGenerator } from './generators/depgraph.generator'
import { ContextInjector } from './generators/context-injector.generator'
import { QualityGateGenerator } from './generators/quality-gate.generator'
import { ManifestService } from './manifest'

@Module({
  controllers: [MetaMirrorController],
  providers: [
    MetaMirrorService,
    EntityScanner,
    DtoScanner,
    ErdlAuditScanner,
    APIScanner,
    ModuleScanner,
    RuleScanner,
    KnowledgeWriter,
    DepGraphGenerator,
    ContextInjector,
    QualityGateGenerator,
    ManifestService,
  ],
})
export class MetaMirrorModule {}
