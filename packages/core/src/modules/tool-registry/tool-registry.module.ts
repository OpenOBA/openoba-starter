/**
 * 秒镜 AI-BOS · ToolRegistry Module
 *
 * @file 注册中心 NestJS Module
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-19
 */

import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ToolRegistry } from './tool-registry.service'
import { ToolRegistryController } from './tool-registry.controller'
import { ToolErrorMapper } from './tool-error-mapper.service'
import { ToolAuthService } from './tool-auth.service'
import { CognitiveLog } from '../eros/task/cognitive-log.entity'

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([CognitiveLog])],
  controllers: [ToolRegistryController],
  providers: [ToolRegistry, ToolErrorMapper, ToolAuthService],
  exports: [ToolRegistry, ToolErrorMapper],
})
export class ToolRegistryModule {}
