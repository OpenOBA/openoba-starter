/**
 * 秒镜 AI-BOS · ToolRegistry — 核心注册中心
 *
 * @file 统一 Tool 注册、发现、执行的中心
 *       Agent 调用路径：registry.execute('order.create', args, ctx) → Service
 *       Agent 发现路径：registry.getAllDefinitions() → 注入 LLM Function Calling Prompt
 *
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-19
 */

import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import {
  ToolDefinition,
  ToolHandler,
  ToolContext,
  ToolResult,
  ToolEntry,
} from './types/tool.interface'
import { ToolErrorMapper } from './tool-error-mapper.service'
import { ToolAuthService } from './tool-auth.service'
import { CognitiveLog } from '../eros/task/cognitive-log.entity'

@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name)
  private tools = new Map<string, ToolEntry>()

  constructor(
    private readonly errorMapper: ToolErrorMapper,
    private readonly authService: ToolAuthService,
    @InjectRepository(CognitiveLog)
    private readonly cognitiveLogRepo: Repository<CognitiveLog>,
  ) {}

  // ============================================
  // 注册
  // ============================================

  /**
   * 注册一个 Tool。
   * 各 Module 在 onModuleInit() 中调用此方法。
   *
   * @throws 如果同名 Tool 已存在
   */
  register(definition: ToolDefinition, handler: ToolHandler): void {
    if (this.tools.has(definition.name)) {
      throw new Error(`Tool already registered: ${definition.name}`)
    }

    this.tools.set(definition.name, {
      definition,
      handler,
      registeredAt: new Date(),
    })

    const industryInfo = definition.industries?.length
      ? ` [industries: ${definition.industries.join(',')}]`
      : ' [universal]'
    this.logger.log(`Registered: ${definition.name}${industryInfo}`)
  }

  /**
   * 批量注册
   */
  registerAll(tools: Array<{ definition: ToolDefinition; handler: ToolHandler }>): void {
    for (const { definition, handler } of tools) {
      this.register(definition, handler)
    }
  }

  // ============================================
  // 发现
  // ============================================

  /**
   * 获取所有已注册的 Tool 定义（给 Agent 生成 FC 用）
   */
  getAllDefinitions(industry?: string): ToolDefinition[] {
    const all = Array.from(this.tools.values()).map((t) => t.definition)
    if (!industry) return all
    return all.filter(
      (t) => !t.industries || t.industries.length === 0 || t.industries.includes(industry),
    )
  }

  /**
   * 获取某个 Tool 的定义
   */
  getDefinition(name: string): ToolDefinition | undefined {
    return this.tools.get(name)?.definition
  }

  // ============================================
  // 执行
  // ============================================

  /**
   * 执行一个 Tool 调用。
   * 这是 Agent 调用 ERP 的核心入口。
   *
   * @param toolName Tool 名称，如 'order.create'
   * @param args 参数
   * @param ctx 上下文
   * @returns ToolResult
   */
  async execute(
    toolName: string,
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const entry = this.tools.get(toolName)

    // 1. Tool 不存在
    if (!entry) {
      this.logger.warn(`Unknown tool requested: ${toolName} by agent ${ctx.agentId}`)
      return {
        success: false,
        error: ToolErrorMapper.toolNotFound(toolName),
      }
    }

    const { definition, handler } = entry

    // 2. 权限检查
    if (!this.authService.canAccess(ctx, toolName, definition.requiresRole)) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Agent ${ctx.agentId} 无权调用 ${toolName}`,
          safeForLLM: true,
        },
      }
    }

    // 3. 限流检查
    if (definition.rateLimit) {
      if (
        !this.authService.checkRateLimit(
          ctx,
          toolName,
          definition.rateLimit.maxRequests,
          definition.rateLimit.windowMs,
        )
      ) {
        return {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: `调用频率过高，请稍后重试（限制: ${definition.rateLimit.maxRequests} 次/${definition.rateLimit.windowMs / 1000}s）`,
            safeForLLM: true,
          },
        }
      }
    }

    const startTime = Date.now()

    // 4. 执行 Handler
    try {
      const result = await handler(args, ctx)

      // 5. 写入认知日志（不阻塞返回）
      this.writeCognitiveLog(
        ctx,
        toolName,
        definition.domain,
        args,
        result,
        startTime,
      )

      return result
    } catch (err) {
      const mappedError = this.errorMapper.map(err)

      // 执行异常同样写入日志
      this.writeCognitiveLog(
        ctx,
        toolName,
        definition.domain,
        args,
        { success: false, error: mappedError },
        startTime,
      )

      return {
        success: false,
        error: mappedError,
      }
    }
  }

  // ============================================
  // 统计
  // ============================================

  /**
   * 获取注册中心统计信息
   */
  getStats(): {
    total: number
    byDomain: Record<string, number>
    industries: string[]
    universalCount: number
  } {
    const all = Array.from(this.tools.values())
    const byDomain: Record<string, number> = {}
    const industries = new Set<string>()
    let universalCount = 0

    for (const { definition } of all) {
      byDomain[definition.domain] = (byDomain[definition.domain] || 0) + 1
      if (!definition.industries || definition.industries.length === 0) {
        universalCount++
      } else {
        definition.industries.forEach((i) => industries.add(i))
      }
    }

    return {
      total: all.length,
      byDomain,
      industries: Array.from(industries),
      universalCount,
    }
  }

  // ============================================
  // 私有
  // ============================================

  /**
   * 异步写入认知日志
   */
  private writeCognitiveLog(
    ctx: ToolContext,
    toolName: string,
    domain: string,
    args: Record<string, unknown>,
    result: ToolResult,
    startTime: number,
  ): void {
    const logId = uuidv4()
    const latencyMs = Date.now() - startTime

    const log = this.cognitiveLogRepo.create({
      id: logId,
      logType: 'event',
      sourceModule: `tool-registry:${domain}`,
      sourceId: toolName,
      level: result.success ? 'info' : 'error',
      title: `Tool: ${toolName}`,
      content: {
        toolName,
        domain,
        args: this.sanitizeArgs(args),
        success: result.success,
        error: result.error,
        latencyMs,
      },
      agentId: ctx.agentId,
      actor: ctx.humanId || ctx.agentId,
      actorType: ctx.humanId ? 'human' : 'agent',
      createdAt: Date.now(),
    })

    // fire-and-forget
    this.cognitiveLogRepo.save(log).catch((err) => {
      this.logger.error(`Failed to write cognitive log: ${err.message}`)
    })
  }

  /**
   * 清理参数中的敏感字段
   */
  private sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
    const safe = { ...args }
    delete safe.password
    delete safe.token
    delete safe.apiKey
    delete safe.secret
    return safe
  }
}
