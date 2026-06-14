/**
 * SKILL 模块
 */
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SkillRegistry } from './skill-registry.entity'
import { SkillKeyVault } from './skill-key-vault.entity'
import { SkillLoader } from './skill-loader.service'
import { SkillController } from './skill.controller'
import { AgentToolRegistry } from '../task/agent-tool-registry'

@Module({
  imports: [TypeOrmModule.forFeature([SkillRegistry, SkillKeyVault])],
  controllers: [SkillController],
  providers: [SkillLoader, AgentToolRegistry],
  exports: [SkillLoader],
})
export class SkillModule {}
