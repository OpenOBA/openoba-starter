import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AgentManifestService, RegisterAgentDto } from './agent-manifest.service'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../../common/guards/roles.guard'
import { Roles } from '../../../common/decorators/roles.decorator'

@ApiTags('系统管理 - Agent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('system/agents')
export class AgentManifestController {
  constructor(private agentService: AgentManifestService) {}

  @Get()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Agent 清单' })
  async findAll() {
    return this.agentService.findAll()
  }

  @Get(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Agent 详情' })
  async findOne(@Param('id') id: string) {
    return this.agentService.findOne(id)
  }

  @Post('register')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Agent 自主注册（Agent 启动时调用）' })
  async register(@Body() dto: RegisterAgentDto) {
    return this.agentService.register(dto)
  }

  @Put(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: '更新 Agent 信息（名称/标识/安全等级/状态/关联用户）' })
  async update(
    @Param('id') id: string,
    @Body() dto: {
      agentCode?: string
      agentName?: string
      securityClearance?: string
      status?: string
      userId?: string
    },
  ) {
    return this.agentService.update(id, dto)
  }

  @Put(':id/status')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: '更新 Agent 状态（active/inactive/suspended）' })
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.agentService.updateStatus(id, status)
  }
}
