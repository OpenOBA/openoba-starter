/**
 * 元镜（Meta-Mirror）— Controller
 *
 * 供前端 Dashboard 读取元镜状态
 */

import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { ManifestService } from './manifest'

@Controller('meta-mirror')
@UseGuards(JwtAuthGuard)
export class MetaMirrorController {
  constructor(private readonly manifest: ManifestService) {}

  /** 获取元镜当前状态 */
  @Get('manifest')
  getManifest() {
    const m = this.manifest.load()
    if (!m) return { status: 'not_initialized' }

    return {
      status: 'active',
      entityCount: m.entityCount,
      apiCount: m.apiCount,
      moduleCount: m.moduleCount,
      ruleCount: m.ruleCount,
      skillCount: m.skillCount || 17,
      sourceHash: m.sourceHash,
      generatedAt: m.generatedAt,
    }
  }

  /** 获取系统知识文件内容（供 Agent 使用） */
  @Get('knowledge/:scope')
  getKnowledge() {
    const { readdirSync, statSync } = require('fs')
    const { join } = require('path')
    const knowledgeDir = join(process.cwd(), '..', '..', '..', 'skills', 'core', 'query-era-knowledge', 'knowledge')
    try {
      const files = readdirSync(knowledgeDir)
      return {
        files: files.map((f: string) => ({
          name: f,
          isDir: statSync(join(knowledgeDir, f)).isDirectory(),
        })),
      }
    } catch {
      return { files: [] }
    }
  }
}
