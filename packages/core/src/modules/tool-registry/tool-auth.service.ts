/**
 * 秒镜 AI-BOS · ToolRegistry — 认证与授权服务
 *
 * @file 最小安全层：Agent ID 校验 + 角色鉴权 + 速率限制
 *       Phase 1 实现基础功能，后续深化
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-19
 */

import { Injectable, Logger } from '@nestjs/common'
import { ToolContext } from './types/tool.interface'

interface RateLimitEntry {
  count: number
  windowStart: number
}

@Injectable()
export class ToolAuthService {
  private readonly logger = new Logger(ToolAuthService.name)
  private rateLimits = new Map<string, RateLimitEntry>()

  /**
   * 校验 Agent 身份
   * Phase 1：检查 agentId 非空且存在
   */
  validateAgent(ctx: ToolContext): boolean {
    if (!ctx.agentId) {
      this.logger.warn('Agent ID is empty')
      return false
    }

    // TODO Phase 3：查 agent_registry 表验证身份
    return true
  }

  /**
   * 检查 Agent 是否有权调用指定 Tool
   * Phase 1：所有已注册 Agent 可调用所有 Tool
   */
  canAccess(ctx: ToolContext, toolName: string, requiredRole?: string): boolean {
    if (!this.validateAgent(ctx)) return false

    // P0修复(C02)：基于操作类型的访问控制
    // 写操作工具（create/update/delete/execute）需要 agent_admin 角色
    const WRITE_TOOLS = ['erdl_crud', 'import_execute', 'draft_publish', 'order_create', 'order_cancel']
    if (WRITE_TOOLS.some(t => toolName.includes(t) || toolName.startsWith(t))) {
      if (!ctx.agentRoles?.includes('agent_admin')) {
        this.logger?.warn?.(`Tool ${toolName} denied: agent ${ctx.agentId} lacks agent_admin role`)
        return false
      }
    }

    return true
  }

  /**
   * 速率限制检查 — M04修复：定期清理过期条目
   * Phase 1：简单的滑动窗口计数
   */
  checkRateLimit(ctx: ToolContext, toolName: string, maxRequests: number, windowMs: number): boolean {
    const key = `${ctx.agentId}:${toolName}`
    const now = Date.now()
    const entry = this.rateLimits.get(key)

    // M04修复：每次检查时清理过期条目
    if (this.rateLimits.size > 1000) {
      for (const [k, v] of this.rateLimits) {
        if (now - v.windowStart > windowMs * 2) this.rateLimits.delete(k)
      }
    }

    if (!entry || now - entry.windowStart > windowMs) {
      this.rateLimits.set(key, { count: 1, windowStart: now })
      return true
    }

    if (entry.count >= maxRequests) {
      this.logger.warn(`Rate limit exceeded: ${key} (${entry.count}/${maxRequests} in ${windowMs}ms)`)
      return false
    }

    entry.count++
    return true
  }

  /** 清理过期限流记录（定时任务调用） */
  cleanup(olderThanMs: number = 300000): void {
    const now = Date.now()
    for (const [key, entry] of this.rateLimits.entries()) {
      if (now - entry.windowStart > olderThanMs) {
        this.rateLimits.delete(key)
      }
    }
  }
}
