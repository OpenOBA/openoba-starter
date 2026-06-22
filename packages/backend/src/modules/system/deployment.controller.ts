/* eslint-disable @typescript-eslint/no-explicit-any -- TODO: 需要类型化 */
/**
 * 部署管理 Controller — 双环境隔离 / 同步 / 回滚 / 发布
 *
 * @author 唐浩然（AI 联合创始人）
 * @since 2026-05-23
 */

import { Controller, Get, Post, Put, Body, Param, UseGuards, Req, Inject } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { ApiOperation } from '@nestjs/swagger'
import { DeploymentService } from './deployment.service'
import { EntitySyncService } from './entity-sync.service'
import { RateLimiter } from '@openoba/core/dist/common/rate-limiter'

const ENGINE_CORE_PATHS = [
  // Core 引擎保护路径（闭源模块）
  'openoba-core/backend/dist/modules/eros/',
  'openoba-core/backend/dist/modules/erdl/',
  'openoba-core/backend/dist/modules/meta-mirror/',
  'openoba-core/backend/dist/common/guards/',
  'openoba-core/backend/erdl/core.erdl',
]

@Controller('deployment')
@UseGuards(JwtAuthGuard)
export class DeploymentController {
  constructor(
    private readonly deployment: DeploymentService,
    private readonly entitySync: EntitySyncService,
    @Inject('RATE_LIMITER') private readonly rateLimiter: RateLimiter,
  ) {}

  // ═══ 模式管理 ═══

  @Get('mode')
  @ApiOperation({ summary: '查询当前部署模式' })
  getMode() {
    const mode = process.env.DEPLOYMENT_MODE || 'operator'
    const descriptions: Record<string, { label: string; desc: string }> = {
      operator: { label: '运营模式', desc: 'Agent 只能操作业务数据和行业规则。引擎核心锁定。' },
      developer: { label: '开发模式', desc: 'Agent 可以修改项目源代码，但不能修改引擎核心。' },
      maintainer: { label: '维护模式', desc: 'Agent 完全开放。秒镜科技不承担技术支持义务。' },
    }
    return {
      mode,
      ...descriptions[mode] || descriptions.operator,
      engineCoreProtected: mode !== 'maintainer',
      engineCorePaths: ENGINE_CORE_PATHS,
      restrictions: mode === 'operator'
        ? ['文件写入: 禁止', '引擎代码: 禁止', 'ERA系统表: 禁止']
        : mode === 'developer'
          ? ['文件写入: 允许（除引擎核心）', '引擎代码: 禁止', 'ERA系统表: 禁止']
          : ['全部开放 · 厂商支持: 已终止'],
    }
  }

  @Put('mode')
  @Roles('super_admin')
  @ApiOperation({ summary: '切换部署模式（仅超级管理员）' })
  async setMode(@Body() body: { mode: string; confirmed?: boolean }) {
    const { mode, confirmed } = body
    if (!['operator', 'developer', 'maintainer'].includes(mode)) {
      return { error: '无效的模式。支持: operator / developer / maintainer' }
    }

    const currentMode = process.env.DEPLOYMENT_MODE || 'operator'

    if (mode === 'maintainer' && currentMode !== 'maintainer' && !confirmed) {
      return {
        warning: '⚠️ 切换到维护模式后，Agent 将获得完全开放权限，可以修改引擎核心代码。秒镜科技对维护模式下的操作不承担技术支持义务。',
        requireConfirm: true,
        confirmAction: { method: 'PUT', path: '/api/deployment/mode', body: { mode: 'maintainer', confirmed: true } },
      }
    }

    process.env.DEPLOYMENT_MODE = mode

    return {
      mode,
      message: `已切换到${mode === 'operator' ? '运营' : mode === 'developer' ? '开发' : '维护'}模式`,
      appliedAt: new Date().toISOString(),
    }
  }

  // ═══ 环境状态 ═══

  @Get('status')
  @ApiOperation({ summary: '双环境状态：production + staging' })
  getStatus() {
    return this.deployment.getStatus()
  }

  @Get('sync-status')
  @ApiOperation({ summary: '环境同步状态' })
  getSyncStatus() {
    return this.deployment.getStatus()
  }

  // ═══ 变更管理 ═══

  @Get('deltas/:id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: '获取单个变更详情（供 Chat 使用）' })
  getDelta(@Param('id') id: string) {
    return this.deployment.getDelta(id)
  }

  @Post('deltas')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: '创建变更记录（Agent 发起）' })
  createDelta(@Body() body: { type: string; summary: string; files: string[]; migrationSql?: string }) {
    const delta = this.deployment.createDelta(body)
    return delta
  }

  @Post('deltas/:id/deploy-staging')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: '部署变更到 staging 环境' })
  deployToStaging(@Param('id') id: string) {
    return this.deployment.deployToStaging(id)
  }

  @Post('deltas/:id/verify')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: '验证 staging 环境变更' })
  verifyStaging(@Param('id') id: string) {
    return this.deployment.verifyStaging(id)
  }

  @Post('deltas/:id/promote')
  @Roles('super_admin')
  @ApiOperation({ summary: '发布到生产环境' })
  promoteToProduction(@Param('id') id: string) {
    return this.deployment.promoteToProduction(id)
  }

  // ═══ 环境同步 ═══

  @Post('deltas/:id/transition')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: '变更 Delta 状态（校验状态机转换合法性）' })
  transitionDelta(@Param('id') id: string, @Body() body: { status: string; feedback?: string }) {
    return this.deployment.transitionDelta(id, body.status as any, { feedback: body.feedback })
  }

  @Post('sync')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: '同步 staging 到 production' })
  syncStaging() {
    return this.deployment.syncStagingToProduction()
  }

  // ═══ 数据库迁移 ═══

  @Post('migrate')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: '执行 Migration SQL（仅 ADD COLUMN，安全模式）' })
  async runMigration(@Body() body: { sql: string }, @Req() req: any) {
    // 限流：3 次/分钟，防止重复迁移
    const ip = req.ip || 'unknown'
    const { lockedUntil } = await this.rateLimiter.attempt(`deploy-migrate:${ip}`, 3, 60_000)
    if (lockedUntil > Date.now()) {
      const waitSec = Math.ceil((lockedUntil - Date.now()) / 1000)
      return { success: false, message: `迁移过于频繁，请 ${waitSec} 秒后重试` }
    }

    if (!body.sql || typeof body.sql !== 'string') {
      return { success: false, message: '缺少 sql 参数' }
    }
    // 安全校验：逐句检查（防分号注入多语句）
    const statements = body.sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    if (statements.length === 0) {
      return { success: false, message: 'SQL 为空' }
    }

    const dangerous = ['DROP', 'TRUNCATE', 'DELETE ', 'UPDATE ', 'INSERT ', 'MODIFY', 'CHANGE', 'RENAME', 'CREATE']

    for (const stmt of statements) {
      const normalized = stmt.toUpperCase()
      // 仅允许 ALTER TABLE ... ADD COLUMN
      if (!normalized.startsWith('ALTER TABLE') || !normalized.includes('ADD COLUMN')) {
        return { success: false, message: `语句被拒: ${stmt.substring(0, 60)}... 仅允许 ADD COLUMN 操作` }
      }
      for (const kw of dangerous) {
        if (normalized.includes(kw)) {
          return { success: false, message: `禁止的关键词: ${kw}。仅允许 ADD COLUMN。` }
        }
      }
    }
    try {
      await this.deployment.executeRawMigration(body.sql)
      return { success: true, message: 'Migration 执行成功' }
    } catch (e: any) {
      return { success: false, message: e.message || 'Migration 执行失败' }
    }
  }

  // ═══ 回滚 ═══

  @Post('rollback')
  @Roles('super_admin')
  @ApiOperation({ summary: '回滚生产到指定版本' })
  async rollback(@Body() body: { targetVersion: string; fullRollback?: boolean }, @Req() req: any) {
    // 限流：2 次/分钟，防止重复回滚
    const ip = req.ip || 'unknown'
    const { lockedUntil } = await this.rateLimiter.attempt(`deploy-rollback:${ip}`, 2, 60_000)
    if (lockedUntil > Date.now()) {
      return { success: false, message: `回滚过于频繁，请 ${Math.ceil((lockedUntil - Date.now()) / 1000)} 秒后重试` }
    }
    return this.deployment.rollback(body.targetVersion, body.fullRollback)
  }
}
