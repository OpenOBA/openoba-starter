// @ts-nocheck
/**
 * ER-OS Agent Chat Controller — OpenClaw 式会话端点
 * 
 * V2：胖客户端架构 — 后端只做 LLM 代理，前端维护 messages[]
 * POST /eros/tasks/:id/chat → SSE 流式回复
 */

import { Controller, Post, Get, Param, Body, Res, Req, HttpCode, UseGuards, BadRequestException, NotFoundException, Logger } from '@nestjs/common'
import { Response, Request } from 'express'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, IsNull } from 'typeorm'
import { AgentTaskService } from './agent-task.service'
import { AgentExecutorService } from './agent-executor.service'
import { ToolRegistryBridge } from './tool-registry-bridge.service'
import { AgentTask } from './agent-task.entity'
import { DraftSpu } from '../../draft-pool/entities/draft-spu.entity'
import { RunRegistry } from '../stream/run-registry'
import { DeploymentService } from '../../system/deployment.service'
import { EntitySyncService } from '../../system/entity-sync.service'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

interface ChatMessage {
  role: 'system' | 'human' | 'agent' | 'tool'
  content: string
  time?: string
}

@ApiTags('ER-OS · Agent 会话')
@UseGuards(JwtAuthGuard)
@Controller('eros')
export class AgentChatController {
  private readonly logger = new Logger(AgentChatController.name)

  // P1修复：速率限制（内存滑动窗口，单实例）
  private rateLimitMap = new Map<string, { count: number; resetAt: number }>()
  private readonly MAX_MESSAGE_LENGTH = 4000
  private readonly MAX_HISTORY_ENTRIES = 20
  private readonly RATE_LIMIT_MAX = 30  // 每分钟30次
  private readonly RATE_LIMIT_WINDOW_MS = 60_000

  // P1-3: rateLimitMap 定期清理（5分钟间隔）
  private rateLimitCleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly taskService: AgentTaskService,
    private readonly executor: AgentExecutorService,
    private readonly toolBridge: ToolRegistryBridge,
    private readonly runRegistry: RunRegistry,
    @InjectRepository(AgentTask) private taskRepo: Repository<AgentTask>,
    @InjectRepository(DraftSpu) private draftSpuRepo: Repository<DraftSpu>,
    private readonly deployment: DeploymentService,
    private readonly entitySync: EntitySyncService,
  ) {
    // P1-3: 启动 rateLimitMap 定期清理
    this.rateLimitCleanupTimer = setInterval(() => {
      const now = Date.now()
      let cleaned = 0
      for (const [key, entry] of this.rateLimitMap) {
        if (entry.resetAt <= now) {
          this.rateLimitMap.delete(key)
          cleaned++
        }
      }
      if (cleaned > 0) {
        this.logger.debug(`Rate limit cleanup: ${cleaned} entries removed`)
      }
    }, 5 * 60_000)
  }

  // ═══════════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════════

  /** 速率限制检查 */
  private checkRateLimit(req: Request): void {
    const jwtPayload = (req as any)?.user
    const identifier = jwtPayload?.userId || jwtPayload?.sub || (req as any)?.ip || 'unknown'
    const now = Date.now()
    const entry = this.rateLimitMap.get(identifier)
    if (entry && entry.resetAt > now && entry.count >= this.RATE_LIMIT_MAX) {
      throw new BadRequestException('请求过于频繁，请稍后再试')
    }
    if (!entry || entry.resetAt <= now) {
      this.rateLimitMap.set(identifier, { count: 1, resetAt: now + this.RATE_LIMIT_WINDOW_MS })
    } else {
      entry.count++
    }
  }

  /** 提取 JWT userId */
  private getUserId(req: Request): string {
    const jwtPayload = (req as any)?.user
    return jwtPayload?.userId || jwtPayload?.sub || 'unknown'
  }

  /** S3+S10: 输入清洗 */
  private cleanInput(text: string): string {
    return text.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/javascript:/gi, '[filtered]').replace(/<[^>]*>/g, '')
  }

  /** 错误分类器 */
  private classifyError(e: any): string {
    const msg = (e instanceof Error ? e.message : String(e)).toLowerCase()
    if (msg.includes('timeout') || msg.includes('etimedout')) return 'timeout'
    if (msg.includes('econnrefused') || msg.includes('enotfound') || msg.includes('econnreset')) return 'network'
    if (msg.includes('api key') || msg.includes('unauthorized') || msg.includes('401') || msg.includes('403')) return 'auth'
    if (msg.includes('no llm provider') || msg.includes('not configured')) return 'no_provider'
    if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many')) return 'rate_limited'
    if (msg.includes('max rounds') || msg.includes('max_rounds')) return 'max_rounds'
    return 'internal'
  }

  /** 用户友好的错误消息 */
  private getUserFriendlyMessage(errorType: string, e: any): string {
    const detail = e instanceof Error ? e.message : String(e)
    switch (errorType) {
      case 'timeout':
        return `?? LLM 响应超时 — DeepSeek 接口处理时间过长。请稍后重试，或尝试简化任务描述。`
      case 'network':
        return `?? 网络连接异常 — 无法连接到 LLM 服务（${detail.substring(0, 80)}）。请检查网络后重试。`
      case 'auth':
        return `?? API Key 异常 — LLM 认证失败。请联系管理员检查 API Key 配置。`
      case 'no_provider':
        return `?? 没有可用的 LLM Provider — 请检查 .env 中的 DEEPSEEK_API_KEY 配置。`
      case 'rate_limited':
        return `?? API 频次限制 — 请求过于频繁，请等待 30 秒后重试。`
      case 'max_rounds':
        return `?? 任务执行轮次已达上限（12 轮）— Agent 已尽力但任务较复杂。建议拆分为多个小任务。`
      default:
        return `?? 服务内部异常：${detail.substring(0, 120)}。请将错误信息截图给管理员。`
    }
  }

  /** 设置 SSE 通用 headers */
  private setupSSE(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()
    const socket = (res as any).socket
    if (socket) socket.setNoDelay(true)
  }

  // ═══════════════════════════════════════════
  // M1 新端点：ACK + Stream + Abort
  // ═══════════════════════════════════════════

  /**
   * M1-2+M1-3 合并: POST /eros/chat — 一步式 SSE 流（ACK + Stream 在同一个 POST 中）
   * 解决前端两步 fetch 的 404 时序问题
   */
  @Post('chat')
  @ApiOperation({ summary: '[M1] Agent SSE 流式会话（一步式 ACK+Stream）' })
  async chatUnified(
    @Body() body: { message: string; history?: ChatMessage[]; idempotencyKey?: string; sessionKey?: string },
    @Res() res: Response,
    @Req() req: Request,
  ) {
    // S3: 长度限制
    if (!body.message || body.message.length > this.MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(`消息长度需在 1-${this.MAX_MESSAGE_LENGTH} 字符之间`)
    }
    if (body.history && body.history.length > this.MAX_HISTORY_ENTRIES) {
      throw new BadRequestException(`历史消息最多 ${this.MAX_HISTORY_ENTRIES} 条`)
    }

    // S1+S2: 速率限制
    this.checkRateLimit(req)

    const userId = this.getUserId(req)

    // S3+S10: 输入清洗
    const cleanMessage = this.cleanInput(body.message)

    // P0-5: 原子化幂等注册
    const abortController = new AbortController()
    const regResult = this.runRegistry.registerIfNew({
      handler: null,
      controller: abortController,
      userId,
      sessionKey: body.sessionKey,
      idempotencyKey: body.idempotencyKey,
    })

    if (regResult.status === 'cached') {
      return res.json(regResult.cachedResult)
    }
    if (regResult.status === 'in_flight') {
      return res.status(409).json({ status: 'in_flight', message: '消息正在处理中' })
    }

    const runId = regResult.runId

    this.logger.log(`Chat: runId=${runId} userId=${userId} historyLen=${body.history?.length || 0}`)

    // 设置 SSE（在同一 response 上）
    this.setupSSE(res)

    const send = (data: Record<string, unknown>) => {
      if (res.writableEnded) return
      if (abortController.signal.aborted) {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ type: 'aborted', partialContent: this.runRegistry.getPartialContent(runId) })}\n\n`)
          res.end()
        }
        return
      }
      if (data.type === 'content' && data.delta) {
        this.runRegistry.appendContent(runId, data.delta as string)
      }
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    // M1-6: 先 ACK（在 SSE 流上发送第一条消息）
    send({ type: 'ack', runId, status: 'started' })

    // 心跳定时器
    const heartbeatTimer = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(heartbeatTimer)
        return
      }
      send({ type: 'heartbeat', ts: new Date().toISOString() })
    }, 25000)

    // S8: 客户端断开
    const onClose = () => {
      if (!res.writableEnded) {
        clearInterval(heartbeatTimer)
        abortController.abort()
        this.logger.debug(`SSE disconnected: runId=${runId}`)
      }
    }
    req.on('close', onClose)

    // 清洗 history
    const cleanHistory = (body.history || []).map(h => ({
      ...h,
      content: this.cleanInput(h.content || ''),
    }))

    try {
      // ?? @ 全知模式检测
      const isFullMode = /@(唐浩然|浩然)\b/.test(cleanMessage)
      if (isFullMode) this.logger.log(`?? @全知模式触发`)
      await this.executor.chatExecute(cleanHistory, cleanMessage, (event) => {
        if (abortController.signal.aborted) return
        send(event)
      }, { userId, agentCode: 'tanghaoran', forceFullMode: isFullMode })
      if (!abortController.signal.aborted) {
        // 【两级审批流】Agent 修改代码后，自动推送变更报告事件
        // 检测 sessionDeltaFiles → 如果有修改 → 推 delta_report
        const deltaSummary = this.executor.getDeltaSummary()
        if (deltaSummary.count > 0) {
          // 检测 entity 文件改动，生成 migration SQL
          let migrationSql: string | null = null
          try {
            const migResult = await this.entitySync.generateMigrationForFiles(deltaSummary.files)
            if (migResult.migrations.length > 0) {
              migrationSql = migResult.allSql
              this.logger.log(`?? 检测到 ${migResult.migrations.length} 个 entity 变更，已生成 migration`)
            }
          } catch (e: any) {
            this.logger.warn('Migration 生成失败: ' + (e?.message || String(e)))
          }

          let delta: any
          try {
            delta = this.deployment.createDelta({
              type: 'feat',
              summary: `Agent 修改了 ${deltaSummary.count} 个文件`,
              files: deltaSummary.files,
              migrationSql: migrationSql || undefined,
            })
            send({
              type: 'delta_report',
              deltaId: delta.id,
              summary: delta.summary,
              files: delta.files,
              migrationSql: delta.migrationSql || null,
              actions: [
                { action: 'apply_staging', label: '?? 申请测试', type: 'primary' },
                { action: 'discard', label: '?? 放弃变更', type: 'default' },
              ],
            })
          } catch (e: any) {
            this.logger.warn('Delta 报告推送失败: ' + (e?.message || String(e)))
            // 降级：推送简化版报告
            send({
              type: 'delta_report',
              deltaId: 'DELTA-' + Date.now().toString(36),
              summary: `Agent 修改了 ${deltaSummary.count} 个文件`,
              files: deltaSummary.files,
              actions: [
                { action: 'apply_staging', label: '?? 申请测试', type: 'primary' },
                { action: 'discard', label: '?? 放弃变更', type: 'default' },
              ],
            })
          }
          this.executor.clearDeltaFiles()
        }
        // H18: queryWithToolsStream 的 while 循环已结束 → 推送最终回复 + done
        send({ type: 'done' })
      }
    } catch (e: any) {
      if (e?.name === 'AbortError' || abortController.signal.aborted) {
        send({ type: 'aborted', partialContent: this.runRegistry.getPartialContent(runId) })
      } else {
        // 分类错误信息，让前端展示明确的诊断
        const errorType = this.classifyError(e)
        this.logger.error(`Chat error [${runId}]: ${errorType} — ${e instanceof Error ? e.message : String(e)}`)
        send({
          type: 'error',
          errorType,
          message: this.getUserFriendlyMessage(errorType, e),
          detail: e instanceof Error ? e.message : String(e),
          recoverable: errorType !== 'no_provider' && errorType !== 'fatal',
        })
      }
    } finally {
      clearInterval(heartbeatTimer)
      req.off('close', onClose)
      if (!res.writableEnded) res.end()
      this.runRegistry.unregister(runId)
    }
  }
  @ApiOperation({ summary: '[M1] 启动 Agent 会话 — 立即返回 runId' })
  async chatStart(
    @Body() body: { message: string; history?: ChatMessage[]; idempotencyKey?: string; sessionKey?: string },
    @Req() req: Request,
  ) {
    // S3: 长度限制
    if (!body.message || body.message.length > this.MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(`消息长度需在 1-${this.MAX_MESSAGE_LENGTH} 字符之间`)
    }
    if (body.history && body.history.length > this.MAX_HISTORY_ENTRIES) {
      throw new BadRequestException(`历史消息最多 ${this.MAX_HISTORY_ENTRIES} 条`)
    }

    // S1+S2: 速率限制
    this.checkRateLimit(req)

    // S5: 提取用户ID
    const userId = this.getUserId(req)

    // S3+S10: 输入清洗
    const cleanMessage = this.cleanInput(body.message)

    // P0-5: 原子化幂等注册
    const abortController = new AbortController()
    const regResult = this.runRegistry.registerIfNew({
      handler: null,  // 延迟绑定 — stream 端点才设置
      controller: abortController,
      userId,
      sessionKey: body.sessionKey,
      idempotencyKey: body.idempotencyKey,
    })

    if (regResult.status === 'cached') {
      return regResult.cachedResult
    }
    if (regResult.status === 'in_flight') {
      return { status: 'in_flight', message: '消息正在处理中，请稍后' }
    }

    const runId = regResult.runId

    // S7: 仅记录元数据，不记录消息内容
    this.logger.log(`Chat started: runId=${runId} userId=${userId} historyLen=${body.history?.length || 0}`)

    // 异步执行 Agent（不阻塞 ACK 返回）
    const cleanHistory = (body.history || []).map(h => ({
      ...h,
      content: this.cleanInput(h.content || ''),
    }))

    this.runRegistry.get(runId)!.handler = async (res: Response) => {
      this.setupSSE(res)
      const send = (data: Record<string, unknown>) => {
        if (res.writableEnded) return
        // S8: AbortController 检查
        if (abortController.signal.aborted) {
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ type: 'aborted', partialContent: this.runRegistry.getPartialContent(runId) })}\n\n`)
            res.end()
          }
          return
        }
        // 累积部分内容（中止后保留）
        if (data.type === 'content' && data.delta) {
          this.runRegistry.appendContent(runId, data.delta as string)
        }
        res.write(`data: ${JSON.stringify(data)}\n\n`)
      }

      // M1-5: 心跳定时器
      const heartbeatTimer = setInterval(() => {
        if (res.writableEnded) {
          clearInterval(heartbeatTimer)
          return
        }
        send({ type: 'heartbeat', ts: new Date().toISOString() })
      }, 25000)

      // S8: 客户端断开时中止
      const onClose = () => {
        if (!res.writableEnded) {
          clearInterval(heartbeatTimer)
          abortController.abort()
          this.logger.debug(`SSE client disconnected: runId=${runId}`)
        }
      }
      req.on('close', onClose)

      try {
        // ?? @ 全知模式检测：用户消息包含 @唐浩然 / @浩然 → forceFullMode
        const isFullMode = /@(唐浩然|浩然)\b/.test(cleanMessage)
        if (isFullMode) this.logger.log(`?? @全知模式触发: ${cleanMessage.substring(0, 50)}`)

        await this.executor.chatExecute(cleanHistory, cleanMessage, (event) => {
          if (abortController.signal.aborted) return
          send(event)
        }, { userId, agentCode: 'tanghaoran', forceFullMode: isFullMode })
        if (!abortController.signal.aborted) {
          send({ type: 'done' })
        }
      } catch (e: any) {
        if (e?.name === 'AbortError' || abortController.signal.aborted) {
          send({ type: 'aborted', partialContent: this.runRegistry.getPartialContent(runId) })
        } else {
          this.logger.error(`Chat error [${runId}]:`, e instanceof Error ? e.message : String(e))
          send({ type: 'error', message: '会话处理失败，请重试' })
        }
      } finally {
        clearInterval(heartbeatTimer)
        req.off('close', onClose)
        if (!res.writableEnded) res.end()
        this.runRegistry.unregister(runId)
      }
    }

    // ? 立即返回 ACK
    return { runId, status: 'started' }
  }

  /**
   * M1-3: GET /eros/chat/:runId/stream — SSE 流
   */
  @Get('chat/:runId/stream')
  @ApiOperation({ summary: '[M1] 连接 Agent SSE 流' })
  async chatStream(
    @Param('runId') runId: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const entry = this.runRegistry.get(runId)
    if (!entry) {
      throw new NotFoundException('会话不存在或已过期')
    }

    // S5: 权限校验 — 仅创建者可连接
    const userId = this.getUserId(req)
    if (entry.userId !== userId) {
      throw new BadRequestException('无权访问此会话')
    }

    if (!entry.handler) {
      throw new BadRequestException('会话未就绪，请稍后重试')
    }

    // S8: 客户端断开时中止
    req.on('close', () => {
      if (!entry.controller.signal.aborted) {
        entry.controller.abort()
        this.logger.debug(`Stream client disconnected: runId=${runId}`)
      }
    })

    try {
      await entry.handler(res)
    } catch (e: any) {
      if (!res.writableEnded) {
        this.logger.error(`Stream error [${runId}]:`, e instanceof Error ? e.message : String(e))
        res.status(500).end()
      }
    }
  }

  /**
   * M1-4: POST /eros/chat/abort-by-session — 按 sessionKey 中止
   */
  @Post('chat/abort-by-session')
  @HttpCode(200)
  @ApiOperation({ summary: '[M1] 按会话中止 Agent（前端简化方案）' })
  async chatAbortBySession(
    @Body() body: { sessionKey: string },
    @Req() req: Request,
  ) {
    const userId = this.getUserId(req)
    let aborted = 0
    // P0-4: 按 sessionKey 过滤，不再中止该用户所有 run
    const runIds = this.runRegistry.getRunIdsBySessionKey(body.sessionKey)
    for (const runId of runIds) {
      if (this.runRegistry.abort(runId, userId)) aborted++
    }
    this.logger.log(`Abort by session: userId=${userId} session=${body.sessionKey} aborted=${aborted}`)
    return { aborted, sessionKey: body.sessionKey }
  }
  @HttpCode(200)
  @ApiOperation({ summary: '[M1] 中止 Agent 会话' })
  async chatAbort(
    @Param('runId') runId: string,
    @Req() req: Request,
  ) {
    const userId = this.getUserId(req)
    const ok = this.runRegistry.abort(runId, userId)
    if (!ok) {
      throw new NotFoundException('会话不存在或无权中止')
    }
    this.logger.log(`Chat aborted: runId=${runId} userId=${userId}`)
    return { runId, status: 'aborted' }
  }

  /** 首页 Chat — 无任务ID的通用会话 */
  @Post('home/chat')
  @ApiOperation({ summary: '首页 Agent 会话（无任务绑定）' })
  async homeChat(
    @Body() body: { message: string; history?: ChatMessage[] },
    @Res() res: Response,
  ) {
    // P1修复：输入长度限制
    if (!body.message || body.message.length > this.MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(`消息长度需在 1-${this.MAX_MESSAGE_LENGTH} 字符之间`)
    }
    if (body.history && body.history.length > this.MAX_HISTORY_ENTRIES) {
      throw new BadRequestException(`历史消息最多 ${this.MAX_HISTORY_ENTRIES} 条`)
    }

    // P1修复：速率限制（按IP）
    // H11修复：优先用JWT userId限流，降级到IP
    const jwtPayload = (res.req as any)?.user
    const identifier = jwtPayload?.userId || jwtPayload?.sub || (res.req as any)?.ip || 'unknown'
    const now = Date.now()
    const entry = this.rateLimitMap.get(identifier)
    if (entry && entry.resetAt > now && entry.count >= this.RATE_LIMIT_MAX) {
      throw new BadRequestException('请求过于频繁，请稍后再试')
    }
    if (!entry || entry.resetAt <= now) {
      this.rateLimitMap.set(identifier, { count: 1, resetAt: now + this.RATE_LIMIT_WINDOW_MS })
    } else {
      entry.count++
    }
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    const socket = (res as any).socket
    if (socket) socket.setNoDelay(true)

    // P1修复：客户端断开时取消 LLM 请求
    const abortController = new AbortController()
    const req = res.req
    req.on('close', () => {
      if (!res.writableEnded) {
        abortController.abort()
        this.logger.log('SSE client disconnected, LLM request cancelled')
      }
    })

    const send = (data: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    try {
      const isFullMode = /@(唐浩然|浩然)\b/.test(body.message || '')
      const result = await this.executor.chatExecute(
        body.history || [],
        body.message,
          (event) => send(event),
          { userId: this.getUserId(req), agentCode: 'tanghaoran', forceFullMode: isFullMode },
      )
      send({ type: 'done' })
      res.end()
    } catch (e: any) {
      send({ type: 'error', text: e?.message || '会话失败' })
      res.end()
    }
  }

  /**
   * Agent Tool 发现端点
   * 返回当前 Agent 可用的所有 Tool 定义（LLM Function Calling 格式）
   */
  @Get('agent-tools')
  @ApiOperation({ summary: '获取 Agent 可用工具列表' })
  getAgentTools() {
    const agentId = 'agent-main'
    const tools = this.toolBridge.toLLMTools(agentId)
    const promptFragment = this.toolBridge.getSystemPromptTools(agentId)
    const stats = { total: tools.length }

    return {
      success: true,
      data: {
        agentId,
        toolCount: tools.length,
        tools,
        promptFragment,
        stats,
      },
    }
  }

  /** Smart Boot — Agent 启动时主动问候 */
  @Get('smart-boot')
  @ApiOperation({ summary: '智能启动：Agent 主动总结未完成任务并提议下一步' })
  async smartBoot() {
    const [pendingTasks, reviewedDrafts, draftDrafts] = await Promise.all([
      this.taskRepo.find({ where: { status: 'processing' as any }, order: { createdAt: 'DESC' }, take: 5 }),
      this.draftSpuRepo.find({ where: { status: 'reviewed', deletedAt: IsNull() } as any, order: { createdAt: 'DESC' }, take: 10 }),
      this.draftSpuRepo.find({ where: { status: 'draft', deletedAt: IsNull() } as any, order: { createdAt: 'DESC' }, take: 10 }),
    ])

    const lines: string[] = []
    lines.push('早上好 Henry ??')
    lines.push('')

    if (pendingTasks.length > 0) {
      lines.push(`**进行中的任务 (${pendingTasks.length})：**`)
      for (const t of pendingTasks) {
        lines.push(`  ? ${t.title || t.taskNo} — ${t.currentPhase || 'processing'}${t.retryCount > 0 ? ` (重试${t.retryCount}次)` : ''}`)
      }
      lines.push('')
    }

    if (reviewedDrafts.length > 0) {
      lines.push(`**待入库草稿 (${reviewedDrafts.length})：**`)
      for (const d of reviewedDrafts.slice(0, 5)) {
        lines.push(`  ? ${d.spuName} — ${d.gender === 'female' ? '女款' : d.gender === 'male' ? '男款' : '中性'} ${d.seriesCode || ''}`)
      }
      if (reviewedDrafts.length > 5) lines.push(`  ... 还有 ${reviewedDrafts.length - 5} 个`)
      lines.push('')
    }

    if (draftDrafts.length > 0) {
      lines.push(`**草稿池中 (${draftDrafts.length})：**`)
      for (const d of draftDrafts.slice(0, 3)) {
        lines.push(`  ? ${d.spuName} — 待审核`)
      }
      lines.push('')
    }

    if (pendingTasks.length === 0 && reviewedDrafts.length === 0 && draftDrafts.length === 0) {
      lines.push('当前没有待处理的任务或草稿。')
      lines.push('')
    }

    lines.push('需要我做什么？直接说就好。')

    return {
      greeting: lines.join('\n'),
      pendingTasks: pendingTasks.length,
      reviewedDrafts: reviewedDrafts.length,
      draftDrafts: draftDrafts.length,
    }
  }

  @Post('tasks/:id/chat')
  @ApiOperation({ summary: '发送消息 → Agent SSE 流式回复（V2 无状态）' })
  async chat(
    @Param('id') id: string,
    @Body() body: { message: string; history?: ChatMessage[] },
    @Res() res: Response,
    @Req() req: Request,
  ) {
    // M02修复：旧版chat端点同样限制输入
    if (!body.message || body.message.length > this.MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(`消息长度需在 1-${this.MAX_MESSAGE_LENGTH} 字符之间`)
    }
    if (body.history && body.history.length > this.MAX_HISTORY_ENTRIES) {
      throw new BadRequestException(`历史消息最多 ${this.MAX_HISTORY_ENTRIES} 条`)
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')  // 禁用 nginx 缓冲
    res.flushHeaders()

    // 禁用 TCP Nagle 算法，确保每个 write 立即发送
    const socket = (res as any).socket
    if (socket) socket.setNoDelay(true)

    const send = (data: Record<string, unknown>) => {
      const s = `data: ${JSON.stringify(data)}\n\n`
      if (data.type !== 'token') this.logger.debug(`SSE: type=${data.type}`)
      res.write(s)
    }

    try {
      // H17修复：移除用户消息日志泄露，仅记录元数据
      this.logger.debug(`AgentChat: taskId=${id} history=${body.history?.length || 0}条`)

      const history = body.history || []
      const isFullMode = /@(唐浩然|浩然)\b/.test(body.message || '')

      const result = await this.executor.chatExecute(
        history,
        body.message,
          (event) => send(event),
          { userId: this.getUserId(req), agentCode: 'tanghaoran', forceFullMode: isFullMode },
      )

      if (result?.content) {
        this.logger.debug(`AgentChat: reply done model=${result.model || ''}`)
      }

      send({ type: 'done' })
      res.end()
    } catch (e: any) {
      send({ type: 'error', message: e?.message || '会话失败' })
      res.end()
    }
  }

  /** 旧端点兼容（V1），逐步废弃 */
  @Post('tasks/:id/message')
  @ApiOperation({ summary: '[废弃] 旧版发送消息' })
  async sendMessage(
    @Param('id') id: string,
    @Body() body: { message: string; history?: ChatMessage[] },
    @Res() res: Response,
    @Req() req: Request,
  ) {
    // 代理到新端点
    return this.chat(id, body, res, req)
  }

  @Post('tasks/:id/export-md')
  @HttpCode(200)
  @ApiOperation({ summary: '导出方案为 MD 文件' })
  async exportMd(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    try {
      const task = await (this.taskService as any).findOne(id)
      if (!task) { res.status(404).json({ error: '任务不存在' }); return }

      const proposals = task.proposals || []
      if (proposals.length === 0) { res.status(400).json({ error: '暂无方案' }); return }

      const last = proposals[proposals.length - 1]
      const content = (last.content || '').replace(
        /---\n?? \*\*本次报告元数据[\s\S]*$/,
        '',
      ).trim()

      const dir = path.join(process.cwd(), 'uploads', 'tasks', id)
      const fileName = `方案_V${last.version}_${new Date().toISOString().slice(0,10)}.md`
      const filePath = path.join(dir, fileName)
      const fileUrl = `/uploads/tasks/${id}/${encodeURIComponent(fileName)}`

      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(filePath, content, 'utf-8')

      res.json({
        fileName,
        url: fileUrl,
        size: Buffer.byteLength(content, 'utf-8'),
      })
    } catch (e: any) {
      // M02修复：不泄露内部错误信息
      this.logger.error(`export-md failed:`, e instanceof Error ? e.message : String(e))
      res.status(500).json({ error: '导出失败，请稍后重试' })
    }
  }
}
