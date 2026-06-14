/**
 * ER-OS Agent Task Controller — 任务工作流引擎 API
 *
 * @file AgentTaskController
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-04
 */

import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { Roles } from '../../../common/decorators/roles.decorator'
import { AgentTaskService } from './agent-task.service'
import {
  CreateAgentTaskDto,
  UpdateAgentTaskDto,
  QueryAgentTaskDto,
  TaskReportDto,
  ApprovalDto,
  DeliverDto,
  EscalateDto,
} from './dto/agent-task.dto'

@ApiTags('ER-OS · 任务工作流引擎')
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin', 'operator')
@Controller('eros/tasks')
export class AgentTaskController {
  constructor(private readonly service: AgentTaskService) {}

  // ── CRUD ──

  @Post()
  @ApiOperation({ summary: '创建任务（老板指派 Agent 执行）' })
  async create(@Body() dto: CreateAgentTaskDto) {
    return this.service.create(dto)
  }

  @Get()
  @ApiOperation({ summary: '任务列表（分页+筛选+搜索）' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'reportTo', required: false })
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'search', required: false, description: '搜索任务编号或标题' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async query(@Query() q: QueryAgentTaskDto) {
    return this.service.query(q)
  }

  @Get('stats')
  @ApiOperation({ summary: '任务统计（待审批/执行中/已完成/已升级）' })
  @ApiQuery({ name: 'reportTo', required: false, description: '按审批人筛选' })
  async getStats(@Query('reportTo') reportTo?: string) {
    return this.service.getStats(reportTo)
  }

  @Get('pending/:report-to')
  @ApiOperation({ summary: '获取某审批人的待处理任务' })
  async getPendingApprovals(@Param('report-to') reportTo: string) {
    return this.service.getPendingApprovals(reportTo)
  }

  @Get(':id')
  @ApiOperation({ summary: '任务详情' })
  @ApiParam({ name: 'id' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Get(':id/logs')
  @ApiOperation({ summary: '任务日志（完整认知日志）' })
  async getLogs(@Param('id') id: string) {
    return this.service.getLogs(id)
  }

  @Put(':id')
  @ApiOperation({ summary: '编辑任务（仅 drafted 状态）' })
  async update(@Param('id') id: string, @Body() dto: UpdateAgentTaskDto) {
    return this.service.update(id, dto)
  }

  // ── Task Report ──

  @Post(':id/report')
  @ApiOperation({ summary: 'Agent 提交 Task Report → 状态 drafted/revised → proposed' })
  async submitReport(@Param('id') id: string, @Body() dto: Omit<TaskReportDto, 'taskId'>) {
    return this.service.submitReport({ ...dto, taskId: id })
  }

  // ── Human Approval ──

  @Post(':id/approve')
  @ApiOperation({ summary: '审批任务 → proposed → executing / revised' })
  async approve(@Param('id') id: string, @Body() dto: Omit<ApprovalDto, 'taskId'>) {
    return this.service.approve({ ...dto, taskId: id })
  }

  // ── 交付 / 发布 / 完成 ──

  @Post(':id/deliver')
  @ApiOperation({ summary: 'Agent 交付 → executing → delivered' })
  async deliver(@Param('id') id: string, @Body() dto: Omit<DeliverDto, 'taskId'>) {
    return this.service.deliver({ ...dto, taskId: id })
  }

  @Post(':id/publish')
  @ApiOperation({ summary: '人工发布 → delivered → published' })
  async publish(@Param('id') id: string) {
    return this.service.publish(id)
  }

  @Post(':id/complete')
  @ApiOperation({ summary: '验收完成 → published → completed' })
  async complete(@Param('id') id: string) {
    return this.service.complete(id)
  }

  // ── 异常处理 ──

  @Post(':id/error')
  @ApiOperation({ summary: 'Agent 报错 → 自动重试或升级' })
  async handleError(@Param('id') id: string, @Body() body: { errorInfo: string }) {
    return this.service.handleError(id, body.errorInfo)
  }

  @Post(':id/escalate')
  @ApiOperation({ summary: '手动升级任务' })
  async escalate(@Param('id') id: string, @Body() dto: Omit<EscalateDto, 'taskId'>) {
    return this.service.escalate({ ...dto, taskId: id })
  }

  @Post(':id/resume')
  @ApiOperation({ summary: '从 escalated 恢复执行' })
  async resume(@Param('id') id: string) {
    return this.service.resumeFromEscalated(id)
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消任务（记录保留）' })
  async cancel(@Param('id') id: string) {
    return this.service.cancel(id)
  }

  @Post(':id/abort')
  @ApiOperation({ summary: '中止任务（异常中断，记录保留）' })
  async abort(@Param('id') id: string) {
    return this.service.abort(id)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除任务（任何状态均可，同步清理日志）' })
  async delete(@Param('id') id: string) {
    return this.service.delete(id)
  }

  // ── 超时检查 ──

  @Post('check-escalations')
  @ApiOperation({ summary: '手动触发超时检查（也可用 cron 自动执行）' })
  async checkEscalations() {
    const count = await this.service.checkEscalationDeadlines()
    return { escalated: count }
  }
}
