import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AgentManifestService, RegisterAgentDto } from './agent-manifest.service'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'

@ApiTags('系统管理 - Agent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('system/agents')
export class AgentManifestController {
  constructor(private agentService: AgentManifestService) {}

  @Get()
  @ApiOperation({ summary: 'Agent 清单' })
  async findAll() {
    return this.agentService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Agent 详情' })
  async findOne(@Param('id') id: string) {
    return this.agentService.findOne(id)
  }

  @Post('register')
  @ApiOperation({ summary: 'Agent 自主注册（Agent 启动时调用）' })
  async register(@Body() dto: RegisterAgentDto) {
    return this.agentService.register(dto)
  }

  @Put(':id/status')
  @ApiOperation({ summary: '更新 Agent 状态（active/inactive/suspended）' })
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.agentService.updateStatus(id, status)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除 Agent（仅可删除 inactive/suspended 的 Sub Agent）' })
  async remove(@Param('id') id: string) {
    return this.agentService.remove(id)
  }
}
