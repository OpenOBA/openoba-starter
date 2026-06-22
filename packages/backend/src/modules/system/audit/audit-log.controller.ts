import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AuditLogService } from './audit-log.service'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../../common/guards/roles.guard'
import { Roles } from '../../../common/decorators/roles.decorator'

@ApiTags('系统管理 - 审计日志')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('system/audit-logs')
export class AuditLogController {
  constructor(private auditService: AuditLogService) {}

  @Get()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: '审计日志列表（分页 + 多维筛选）' })
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('actorType') actorType?: string,
    @Query('actorId') actorId?: string,
    @Query('category') category?: string,
    @Query('dataDomain') dataDomain?: string,
    @Query('sensitivity') sensitivity?: string,
    @Query('exportTarget') exportTarget?: string,
    @Query('result') result?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    return this.auditService.findAll({
      page,
      pageSize,
      actorType,
      actorId,
      category,
      dataDomain,
      sensitivity,
      exportTarget,
      result,
      startTime,
      endTime,
    })
  }

  @Get('agent-summary')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Agent 行为摘要（近 N 天按类别聚合）' })
  async getAgentSummary(@Query('agentId') agentId: string, @Query('days') days?: number) {
    return this.auditService.getAgentSummary(agentId, days)
  }
}
