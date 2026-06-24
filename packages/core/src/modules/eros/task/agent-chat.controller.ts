// @ts-nocheck
/**
 * ER-OS Agent Chat Controller �� OpenClaw ʽ�Ự�˵�
 * 
 * V2���ֿͻ��˼ܹ� �� ���ֻ�� LLM ������ǰ��ά�� messages[]
 * POST /eros/tasks/:id/chat �� SSE ��ʽ�ظ�
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

import { ChatMessage, cleanInput, getUserId, classifyError, getUserFriendlyMessage, MAX_MESSAGE_LENGTH, MAX_HISTORY_ENTRIES, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from './dto/agent-chat.dto'
import { MessageService } from '../chat/message.service'

@ApiTags('ER-OS �� Agent �Ự')
@UseGuards(JwtAuthGuard)
@Controller('eros')
export class AgentChatController {
  private readonly logger = new Logger(AgentChatController.name)

  private rateLimitMap = new Map<string, { count: number; resetAt: number }>()

  // P1-3: rateLimitMap ����������5���Ӽ����
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
    private readonly messageService: MessageService,
  ) {
    // P1-3: ���� rateLimitMap ��������
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

  // �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T
  // ��������
  // �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T

  /** �������Ƽ�� */
  private checkRateLimit(req: Request): void {
    const jwtPayload = (req as import("express").Request)?.user
    const identifier = jwtPayload?.userId || jwtPayload?.sub || (req as import("express").Request)?.ip || 'unknown'
    const now = Date.now()
    const entry = this.rateLimitMap.get(identifier)
    if (entry && entry.resetAt > now && entry.count >= RATE_LIMIT_MAX) {
      throw new BadRequestException('�������Ƶ�������Ժ�����')
    }
    if (!entry || entry.resetAt <= now) {
      this.rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    } else {
      entry.count++
    }
  }

  /** ��ȡ JWT userId */
  private getUserId(req: Request): string {
    return getUserId(req)
  }

  /** S3+S10: ������ϴ */
  private cleanInput(text: string): string {
    return cleanInput(text)
  }

  /** ��������� */
  private classifyError(e: unknown): string {
    return classifyError(e)
  }

  /** �û��ѺõĴ�����Ϣ */
  private getUserFriendlyMessage(errorType: string, e: unknown): string {
    return getUserFriendlyMessage(e)
  }

  /** ���� SSE ͨ�� headers */
  private setupSSE(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()
    const socket = (res as import("express").Response).socket
    if (socket) socket.setNoDelay(true)
  }

  // ═══════════════════════════════════════════
  // V2: 会话消息持久化读取
  // ═══════════════════════════════════════════

  /**
   * GET /eros/chat/:sessionKey/messages — 从 chat_message 表恢复完整对话历史
   */
  @Get('chat/:sessionKey/messages')
  @ApiOperation({ summary: '[V2] 获取会话完整消息历史（含 ReAct 时间线）' })
  async getChatMessages(@Param('sessionKey') sessionKey: string) {
    const messages = await this.messageService.getHistory(sessionKey, 500)
    return { sessionKey, messages }
  }

  // �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T
  // M1 �¶˵㣺ACK + Stream + Abort
  // �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T

  /**
   * M1-2+M1-3 �ϲ�: POST /eros/chat �� һ��ʽ SSE ����ACK + Stream ��ͬһ�� POST �У�
   * ���ǰ������ fetch �� 404 ʱ������
   */
  @Post('chat')
  @ApiOperation({ summary: '[M1] Agent SSE ��ʽ�Ự��һ��ʽ ACK+Stream��' })
  async chatUnified(
    @Body() body: { message: string; history?: ChatMessage[]; idempotencyKey?: string; sessionKey?: string },
    @Res() res: Response,
    @Req() req: Request,
  ) {
    // S3: ��������
    if (!body.message || body.message.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(`��Ϣ�������� 1-${MAX_MESSAGE_LENGTH} �ַ�֮��`)
    }
    if (body.history && body.history.length > MAX_HISTORY_ENTRIES) {
      throw new BadRequestException(`��ʷ��Ϣ��� ${MAX_HISTORY_ENTRIES} ��`)
    }

    // S1+S2: ��������
    this.checkRateLimit(req)

    const userId = this.getUserId(req)

    // S3+S10: ������ϴ
    const cleanMessage = this.cleanInput(body.message)

    // P0-5: ԭ�ӻ��ݵ�ע��
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
      return res.status(409).json({ status: 'in_flight', message: '��Ϣ���ڴ�����' })
    }

    const runId = regResult.runId

    this.logger.log(`Chat: runId=${runId} userId=${userId} historyLen=${body.history?.length || 0}`)

    // ���� SSE����ͬһ response �ϣ�
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

    // M1-6: �� ACK���� SSE ���Ϸ��͵�һ����Ϣ��
    send({ type: 'ack', runId, status: 'started' })

    // ������ʱ��
    const heartbeatTimer = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(heartbeatTimer)
        return
      }
      send({ type: 'heartbeat', ts: new Date().toISOString() })
    }, 25000)

    // S8: �ͻ��˶Ͽ�
    const onClose = () => {
      if (!res.writableEnded) {
        clearInterval(heartbeatTimer)
        abortController.abort()
        this.logger.debug(`SSE disconnected: runId=${runId}`)
      }
    }
    req.on('close', onClose)

    // ��ϴ history
    const cleanHistory = (body.history || []).map(h => ({
      ...h,
      content: this.cleanInput(h.content || ''),
    }))

    // V2: 持久化用户消息
    if (body.sessionKey) {
      this.messageService.append(body.sessionKey, { role: 'human', content: cleanMessage }).catch(
        (e: unknown) => this.logger.warn(`SSE持久化用户消息失败: ${(e as Error)?.message || e}`),
      )
    }

    // V2: 本地收集 reactTimeline
    const reactTimeline: Array<{
      kind: string; text?: string; name?: string;
      args?: Record<string, unknown>; status?: string;
      result?: string; durationMs?: number;
    }> = []

    try {
      // ?? @ ȫ֪ģʽ���
      const isFullMode = /@(唐浩然|浩然)\b/.test(cleanMessage)
      if (isFullMode) this.logger.log(`?? @全知模式触发`)
      await this.executor.chatExecute(cleanHistory, cleanMessage, (event) => {
        if (abortController.signal.aborted) return

        // V2: 收集 ReAct 时间线（合并流式增量 thought，合并 tool_start/tool_end）
        if (event.type === 'thought') {
          const last = reactTimeline[reactTimeline.length - 1]
          if (last?.kind === 'thought') {
            last.text = (last.text || '') + (event.text || '')
          } else {
            reactTimeline.push({ kind: 'thought', text: event.text })
          }
        } else if (event.type === 'tool_start') {
          reactTimeline.push({ kind: 'tool', name: event.tool, args: event.args, status: 'running' })
        } else if (event.type === 'tool_end') {
          for (let i = reactTimeline.length - 1; i >= 0; i--) {
            const item = reactTimeline[i]
            if (item.kind === 'tool' && item.name === event.tool && item.status === 'running') {
              item.status = 'done'
              item.result = event.result
              item.durationMs = event.durationMs
              break
            }
          }
        } else if (event.type === 'observation') {
          reactTimeline.push({ kind: 'observation', text: event.text })
        }

        send(event)
      }, { userId, agentCode: 'tanghaoran', forceFullMode: isFullMode })
      if (!abortController.signal.aborted) {
        // V2: 持久化 Agent 回复（含 reactTimeline）
        const agentContent = this.runRegistry.getPartialContent(runId)
        if (body.sessionKey) {
          this.messageService.append(body.sessionKey, {
            role: 'agent',
            content: agentContent,
            reactTimeline: reactTimeline.length > 0 ? reactTimeline : undefined,
          }).catch((e: unknown) => this.logger.warn(`SSE持久化Agent回复失败: ${(e as Error)?.message || e}`))
        }
        // ��������������Agent �޸Ĵ�����Զ����ͱ�������¼�
        // ��� sessionDeltaFiles �� ������޸� �� �� delta_report
        const deltaSummary = this.executor.getDeltaSummary()
        if (deltaSummary.count > 0) {
          // ��� entity �ļ��Ķ������� migration SQL
          let migrationSql: string | null = null
          try {
            const migResult = await this.entitySync.generateMigrationForFiles(deltaSummary.files)
            if (migResult.migrations.length > 0) {
              migrationSql = migResult.allSql
              this.logger.log(`?? ��⵽ ${migResult.migrations.length} �� entity ����������� migration`)
            }
          } catch (e: unknown) {
            this.logger.warn('Migration ����ʧ��: ' + (e?.message || String(e)))
          }

          let delta: Record<string, unknown>
          try {
            delta = this.deployment.createDelta({
              type: 'feat',
              summary: `Agent �޸��� ${deltaSummary.count} ���ļ�`,
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
                { action: 'apply_staging', label: '?? �������', type: 'primary' },
                { action: 'discard', label: '?? �������', type: 'default' },
              ],
            })
          } catch (e: unknown) {
            this.logger.warn('Delta ��������ʧ��: ' + (e?.message || String(e)))
            send({
              type: 'delta_report',
              deltaId: 'DELTA-' + Date.now().toString(36),
              summary: `Agent �޸��� ${deltaSummary.count} ���ļ�`,
              files: deltaSummary.files,
              actions: [
                { action: 'apply_staging', label: '?? �������', type: 'primary' },
                { action: 'discard', label: '?? �������', type: 'default' },
              ],
            })
          }
          this.executor.clearDeltaFiles()
        }
        // H18: queryWithToolsStream �� while ѭ���ѽ��� �� �������ջظ� + done
        send({ type: 'done' })
      }
    } catch (e: unknown) {
      if (e?.name === 'AbortError' || abortController.signal.aborted) {
        send({ type: 'aborted', partialContent: this.runRegistry.getPartialContent(runId) })
      } else {
        // ���������Ϣ����ǰ��չʾ��ȷ�����
        const errorType = this.classifyError(e)
        this.logger.error(`Chat error [${runId}]: ${errorType} �� ${e instanceof Error ? e.message : String(e)}`)
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


  /**
   * M1-4: POST /eros/chat/abort-by-session �� �� sessionKey ��ֹ
   */
  @Post('chat/abort-by-session')
  @HttpCode(200)
  @ApiOperation({ summary: '[M1] ���Ự��ֹ Agent��ǰ�˼򻯷�����' })
  async chatAbortBySession(
    @Body() body: { sessionKey: string },
    @Req() req: Request,
  ) {
    const userId = this.getUserId(req)
    let aborted = 0
    // P0-4: �� sessionKey ���ˣ�������ֹ���û����� run
    const runIds = this.runRegistry.getRunIdsBySessionKey(body.sessionKey)
    for (const runId of runIds) {
      if (this.runRegistry.abort(runId, userId)) aborted++
    }
    this.logger.log(`Abort by session: userId=${userId} session=${body.sessionKey} aborted=${aborted}`)
    return { aborted, sessionKey: body.sessionKey }
  }
  @HttpCode(200)
  @ApiOperation({ summary: '[M1] ��ֹ Agent �Ự' })
  async chatAbort(
    @Param('runId') runId: string,
    @Req() req: Request,
  ) {
    const userId = this.getUserId(req)
    const ok = this.runRegistry.abort(runId, userId)
    if (!ok) {
      throw new NotFoundException('�Ự�����ڻ���Ȩ��ֹ')
    }
    this.logger.log(`Chat aborted: runId=${runId} userId=${userId}`)
    return { runId, status: 'aborted' }
  }

  /** ��ҳ Chat �� ������ID��ͨ�ûỰ */
  @Post('home/chat')
  @ApiOperation({ summary: '��ҳ Agent �Ự��������󶨣�' })
  async homeChat(
    @Body() body: { message: string; history?: ChatMessage[] },
    @Res() res: Response,
  ) {
    // P1�޸������볤������
    if (!body.message || body.message.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(`��Ϣ�������� 1-${MAX_MESSAGE_LENGTH} �ַ�֮��`)
    }
    if (body.history && body.history.length > MAX_HISTORY_ENTRIES) {
      throw new BadRequestException(`��ʷ��Ϣ��� ${MAX_HISTORY_ENTRIES} ��`)
    }

    // P1�޸����������ƣ���IP��
    // H11�޸���������JWT userId������������IP
    const jwtPayload = (res.req as import("express").Request)?.user
    const identifier = jwtPayload?.userId || jwtPayload?.sub || (res.req as import("express").Request)?.ip || 'unknown'
    const now = Date.now()
    const entry = this.rateLimitMap.get(identifier)
    if (entry && entry.resetAt > now && entry.count >= RATE_LIMIT_MAX) {
      throw new BadRequestException('�������Ƶ�������Ժ�����')
    }
    if (!entry || entry.resetAt <= now) {
      this.rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    } else {
      entry.count++
    }
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    const socket = (res as import("express").Response).socket
    if (socket) socket.setNoDelay(true)

    // P1�޸����ͻ��˶Ͽ�ʱȡ�� LLM ����
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
      const isFullMode = /@(�ƺ�Ȼ|��Ȼ)\b/.test(body.message || '')
      const result = await this.executor.chatExecute(
        body.history || [],
        body.message,
          (event) => send(event),
          { userId: this.getUserId(req), agentCode: 'tanghaoran', forceFullMode: isFullMode },
      )
      send({ type: 'done' })
      res.end()
    } catch (e: unknown) {
      send({ type: 'error', text: e?.message || '�Ựʧ��' })
      res.end()
    }
  }

  /**
   * Agent Tool ���ֶ˵�
   */
  @Get('agent-tools')
  @ApiOperation({ summary: '��ȡ Agent ���ù����б�' })
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

  /** Smart Boot �� Agent ����ʱ�����ʺ� */
  @Get('smart-boot')
  @ApiOperation({ summary: '����������Agent �����ܽ�δ�������������һ��' })
  async smartBoot() {
    const [pendingTasks, reviewedDrafts, draftDrafts] = await Promise.all([
      this.taskRepo.find({ where: { status: 'processing' }, order: { createdAt: 'DESC' }, take: 5 }),
      this.draftSpuRepo.find({ where: { status: 'reviewed', deletedAt: IsNull() } , order: { createdAt: 'DESC' }, take: 10 }),
      this.draftSpuRepo.find({ where: { status: 'draft', deletedAt: IsNull() } , order: { createdAt: 'DESC' }, take: 10 }),
    ])

    const lines: string[] = []
    lines.push('���Ϻ� Henry ??')
    lines.push('')

    if (pendingTasks.length > 0) {
      lines.push(`**�����е����� (${pendingTasks.length})��**`)
      for (const t of pendingTasks) {
        lines.push(`  ? ${t.title || t.taskNo} �� ${t.currentPhase || 'processing'}${t.retryCount > 0 ? ` (����${t.retryCount}��)` : ''}`)
      }
      lines.push('')
    }

    if (reviewedDrafts.length > 0) {
      lines.push(`**�����ݸ� (${reviewedDrafts.length})��**`)
      for (const d of reviewedDrafts.slice(0, 5)) {
        lines.push(`  ? ${d.spuName} �� ${d.gender === 'female' ? 'Ů��' : d.gender === 'male' ? '�п�' : '����'} ${d.seriesCode || ''}`)
      }
      if (reviewedDrafts.length > 5) lines.push(`  ... ���� ${reviewedDrafts.length - 5} ��`)
      lines.push('')
    }

    if (draftDrafts.length > 0) {
      lines.push(`**�ݸ���� (${draftDrafts.length})��**`)
      for (const d of draftDrafts.slice(0, 3)) {
        lines.push(`  ? ${d.spuName} �� �����`)
      }
      lines.push('')
    }

    if (pendingTasks.length === 0 && reviewedDrafts.length === 0 && draftDrafts.length === 0) {
      lines.push('��ǰû�д������������ݸ塣')
      lines.push('')
    }

    lines.push('��Ҫ����ʲô��ֱ��˵�ͺá�')

    return {
      greeting: lines.join('\n'),
      pendingTasks: pendingTasks.length,
      reviewedDrafts: reviewedDrafts.length,
      draftDrafts: draftDrafts.length,
    }
  }


  @Post('tasks/:id/export-md')
  @HttpCode(200)
  @ApiOperation({ summary: '��������Ϊ MD �ļ�' })
  async exportMd(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    try {
      const task = await (this.taskService as unknown as { findOne: (id: string) => Promise<unknown> }).findOne(id)
      if (!task) { res.status(404).json({ error: '���񲻴���' }); return }

      const proposals = task.proposals || []
      if (proposals.length === 0) { res.status(400).json({ error: '���޷���' }); return }

      const last = proposals[proposals.length - 1]
      const content = (last.content || '').replace(
        /---\n?? \*\*���α���Ԫ����[\s\S]*$/,
        '',
      ).trim()

      const dir = path.join(process.cwd(), 'uploads', 'tasks', id)
      const fileName = `����_V${last.version}_${new Date().toISOString().slice(0,10)}.md`
      const filePath = path.join(dir, fileName)
      const fileUrl = `/uploads/tasks/${id}/${encodeURIComponent(fileName)}`

      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(filePath, content, 'utf-8')

      res.json({
        fileName,
        url: fileUrl,
        size: Buffer.byteLength(content, 'utf-8'),
      })
    } catch (e: unknown) {
      // M02�޸�����й¶�ڲ�������Ϣ
      this.logger.error(`export-md failed:`, e instanceof Error ? e.message : String(e))
      res.status(500).json({ error: '����ʧ�ܣ����Ժ�����' })
    }
  }
}