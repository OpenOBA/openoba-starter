/**
 * 元镜（Meta-Mirror）— Controller
 *
 * 供前端 Dashboard 读取元镜状态：质量门禁 / 版本守护 / 回滚安全网
 */

import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { ManifestService } from './manifest'
import { MetaMirrorService } from './meta-mirror.service'
import * as fs from 'fs'
import * as path from 'path'

@Controller('meta-mirror')
@UseGuards(JwtAuthGuard)
export class MetaMirrorController {
  constructor(
    private readonly manifest: ManifestService,
    private readonly service: MetaMirrorService,
  ) {}

  /** 获取元镜当前状态概要 */
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

  /** 获取质量门禁报告 */
  @Get('quality-gates')
  getQualityGates() {
    return this.readKnowledgeFile('quality-gates.md')
  }

  /** 获取版本守护报告 */
  @Get('version-guard')
  getVersionGuard() {
    const jsonPath = path.join(process.cwd(), 'knowledge', 'version-guard.json')
    if (fs.existsSync(jsonPath)) {
      return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
    }
    // fallback 到 Markdown
    return this.readKnowledgeFile('version-guard-report.md')
  }

  /** 获取版本守护原始 JSON（供前端面板渲染） */
  @Get('version-guard.json')
  getVersionGuardJson() {
    const jsonPath = path.join(process.cwd(), 'knowledge', 'version-guard.json')
    if (fs.existsSync(jsonPath)) {
      return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
    }
    return { error: 'version-guard.json not found' }
  }

  /** 获取回滚安全网报告 */
  @Get('rollback-safety')
  getRollbackSafety() {
    return this.readKnowledgeFile('rollback-safety-net.md')
  }

  /** 获取 Checkpoint 列表 */
  @Get('checkpoints')
  getCheckpoints() {
    const indexDir = path.join(process.cwd(), 'knowledge', 'checkpoints')
    const indexPath = path.join(indexDir, '_index.json')
    if (fs.existsSync(indexPath)) {
      return JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
    }
    return { checkpoints: [] }
  }

  /** 获取单个 Checkpoint 详情 */
  @Get('checkpoints/:id')
  getCheckpointDetail(@Param('id') id: string) {
    const cpPath = path.join(process.cwd(), 'knowledge', 'checkpoints', `${id}.json`)
    if (fs.existsSync(cpPath)) {
      return JSON.parse(fs.readFileSync(cpPath, 'utf-8'))
    }
    return { error: 'Checkpoint not found', id }
  }

  /** 手动触发元镜重新扫描 */
  @Post('regenerate')
  async regenerate() {
    await this.service.regenerate()
    return { success: true, message: '元镜已重新扫描' }
  }

  /** 创建 Checkpoint */
  @Post('checkpoints')
  createCheckpoint(@Body() body: { reason: string }) {
    if (this.service['checkpoint']) {
      const cp = this.service['checkpoint'].createCheckpoint(
        this.service['projectRoot'] as string,
        body.reason || '手动创建',
      )
      return { success: true, checkpoint: cp }
    }
    return { error: 'CheckpointGenerator not available' }
  }

  // ── Private ──
  private readKnowledgeFile(filename: string) {
    const filePath = path.join(process.cwd(), 'knowledge', filename)
    if (fs.existsSync(filePath)) {
      return {
        exists: true,
        content: fs.readFileSync(filePath, 'utf-8'),
        updatedAt: fs.statSync(filePath).mtime.toISOString(),
      }
    }
    return { exists: false, content: '' }
  }
}
