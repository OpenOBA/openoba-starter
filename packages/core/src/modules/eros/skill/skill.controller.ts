/**
 * SKILL 管理 Controller
 */
import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { Roles } from '../../../common/decorators/roles.decorator'
import { SkillLoader } from './skill-loader.service'

@ApiTags('SKILL 管理')
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin')
@Controller('skills')
export class SkillController {
  constructor(private readonly loader: SkillLoader) {}

  @Get()
  @ApiOperation({ summary: '已安装 SKILL 列表' })
  async list() {
    return this.loader.listSkills()
  }

  @Post('refresh')
  @ApiOperation({ summary: '重新扫描 skills/ 目录' })
  async refresh() {
    const count = await this.loader.scanAndRegister()
    return { refreshed: count }
  }

  @Get(':skillName/keys')
  @ApiOperation({ summary: 'SKILL 需要的 Key 列表' })
  async getKeys(@Param('skillName') skillName: string) {
    return this.loader.getSkillKeys(skillName)
  }

  @Put(':skillName/keys/:keyName')
  @ApiOperation({ summary: '设置 SKILL Key 值' })
  async setKey(
    @Param('skillName') skillName: string,
    @Param('keyName') keyName: string,
    @Body() body: { value: string },
  ) {
    await this.loader.setSkillKey(skillName, keyName, body.value)
    return { ok: true }
  }
}
