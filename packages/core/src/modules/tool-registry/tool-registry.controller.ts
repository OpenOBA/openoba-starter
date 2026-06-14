/**
 * 秒镜 AI-BOS · ToolRegistry — 管理 API
 *
 * @file 用于查看已注册的 Tool，调试 Agent 调用
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-19
 */

import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { ToolRegistry } from './tool-registry.service'
import { ToolContext } from './types/tool.interface'

@Controller('tool-registry')
@UseGuards(JwtAuthGuard)
@Roles('super_admin', 'admin')
export class ToolRegistryController {
  constructor(private readonly registry: ToolRegistry) {}

  /**
   * 获取注册中心统计
   */
  @Get('stats')
  getStats() {
    return {
      success: true,
      data: this.registry.getStats(),
    }
  }

  /**
   * 获取所有已注册的 Tool 列表
   */
  @Get('tools')
  getAllTools() {
    return {
      success: true,
      data: {
        tools: this.registry.getAllDefinitions().map((t) => ({
          name: t.name,
          description: t.description,
          domain: t.domain,
          inputSchema: t.inputSchema,
          annotations: t.annotations,
          industries: t.industries,
          requiresRole: t.requiresRole,
          rateLimit: t.rateLimit,
        })),
        stats: this.registry.getStats(),
      },
    }
  }

  /**
   * 获取某个 Tool 的详情
   */
  @Get('tools/:toolName')
  getTool(@Param('toolName') toolName: string) {
    const def = this.registry.getDefinition(toolName)
    if (!def) {
      return { success: false, error: { code: 'TOOL_NOT_FOUND', message: `Unknown tool: ${toolName}` } }
    }
    return { success: true, data: def }
  }

  /**
   * 模拟 Tool 执行（调试用）
   */
  @Post('execute')
  async execute(
    @Body() body: { toolName: string; args: Record<string, unknown>; agentId?: string },
  ) {
    const ctx: ToolContext = {
      agentId: body.agentId || 'debug-agent',
    }
    const result = await this.registry.execute(body.toolName, body.args, ctx)
    return result
  }
}
