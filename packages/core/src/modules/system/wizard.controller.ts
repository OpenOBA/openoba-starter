/**
 * 初装引导 Controller — 首次启动时检测系统状态，提供引导 API
 *
 * @author 唐浩然（AI 联合创始人）
 * @since 2026-06-03
 *
 * 所有端点无需认证（系统尚未配置完成时无法登录）
 */

import { Controller, Get, Post, Body } from '@nestjs/common'
import { ApiOperation } from '@nestjs/swagger'
import { WizardService } from './wizard.service'
import { Public } from '../../common/decorators/public.decorator'

@Controller('wizard')
@Public() // 整个 Controller 跳过 JWT 认证
export class WizardController {
  constructor(private readonly wizard: WizardService) {}

  /** 检测系统初始化状态 */
  @Get('status')
  @ApiOperation({ summary: '检测系统初始化状态 — 无需登录' })
  async getStatus() {
    return this.wizard.checkStatus()
  }

  /** 测试数据库连接 */
  @Post('test-db')
  @ApiOperation({ summary: '测试数据库连接 — 无需登录' })
  async testDb(@Body() body: { host: string; port: number; username: string; password: string; database?: string }) {
    return this.wizard.testDbConnection(body)
  }

  /** 执行数据库初始化（建库 + 导入表结构 + 种子数据） */
  @Post('init-db')
  @ApiOperation({ summary: '初始化数据库 — 建库 + 导入表结构 + 种子数据 — 无需登录' })
  async initDb(@Body() body: { host: string; port: number; username: string; password: string; database?: string }) {
    return this.wizard.initDatabase(body)
  }

  /** 保存 .env 配置 */
  @Post('save-env')
  @ApiOperation({ summary: '保存环境配置到 .env 文件 — 无需登录' })
  async saveEnv(@Body() body: {
    dbHost: string; dbPort: number; dbUsername: string; dbPassword: string; dbDatabase: string;
    llmApiKey: string; llmProvider?: string; adminUsername?: string; adminPassword?: string;
    jwtSecret?: string;
  }) {
    return this.wizard.saveEnvConfig(body)
  }

}
