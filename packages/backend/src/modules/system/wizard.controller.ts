/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Controller, Get, Post, Body, Req, HttpException, HttpStatus, UseGuards } from '@nestjs/common'
import { ApiOperation } from '@nestjs/swagger'
import { WizardService } from './wizard.service'
import { WizardGuard } from '../../common/guards/wizard.guard'

@Controller('wizard')
@UseGuards(WizardGuard)
export class WizardController {
  constructor(private readonly wizard: WizardService) {}

  @Get('status')
  @ApiOperation({ summary: '检测系统初始化状态' })
  async getStatus() { return this.wizard.checkStatus() }

  @Post('test-db')
  @ApiOperation({ summary: '测试数据库连接' })
  async testDb(@Req() req: any, @Body() body: { host: string; port: number; username: string; password: string }) {
    this.verifyNotInitialized()
    return this.wizard.testDbConnection(body)
  }

  /** 步骤2：建库建表 */
  @Post('create-tables')
  @ApiOperation({ summary: '建库建表 — 步骤2' })
  async createTables(@Req() req: any, @Body() body: { host: string; port: number; username: string; password: string; database?: string }) {
    this.verifyNotInitialized()
    return this.wizard.createTables(body)
  }

  /** 步骤3：种子数据 */
  @Post('seed-db')
  @ApiOperation({ summary: '导入种子数据 — 步骤3' })
  async seedDb(@Req() req: any, @Body() body: { host: string; port: number; username: string; password: string; database?: string }) {
    this.verifyNotInitialized()
    return this.wizard.seedDb(body)
  }

  /** 安全防护：已初始化则拒绝写入操作 */
  private async verifyNotInitialized() {
    const { initialized } = await this.wizard.checkStatus()
    if (initialized) {
      throw new HttpException(
        { message: '系统已初始化完毕，Wizard 写入接口已自动禁用', code: 'WIZARD_DISABLED' },
        HttpStatus.FORBIDDEN,
      )
    }
  }
}
