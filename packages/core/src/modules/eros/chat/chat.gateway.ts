/**
 * ERA Chat WebSocket Gateway — 主入口
 *
 * @file chat.gateway.ts
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-21
 * @license BSL-1.1
 *
 * @description
 * 基于 NestJS Socket.IO 的 WebSocket Gateway：
 * - 连接认证：JWT 在 handshake 阶段校验
 * - chat.send → 先 ACK 再异步执行 Agent → chat.event 流式推送
 * - chat.abort → 按 runId + userId 中止
 * - chat.inject → 注入消息到会话（预埋）
 * - 统一事件通道：chat.event 承载所有 StreamEvent 类型
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger, UseGuards } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { AgentExecutorService } from '../task/agent-executor.service'
import { RunRegistry } from '../stream/run-registry'
import { ChatSessionManager } from './chat.session-manager'
import { MessageService } from './message.service'
import { DeliverableService } from '../deliverable/deliverable.service'
import type { StreamEvent } from '../stream/stream-event.types'
import { getAvailableProviders } from '../../erdl/llm/erdl-llm-providers'

/** 从 provider 配置中查找 model id 对应的用户可读名称 */
function getModelDisplayName(rawModelRef: string): string {
  const providers = getAvailableProviders()
  for (const p of providers) {
    for (const m of p.models) {
      if (rawModelRef.includes(m.id)) return m.name
    }
  }
  // 回退：取最后一段
  return rawModelRef.split(' / ').pop() || rawModelRef
}

@WebSocketGateway({
  path: '/eros/ws',
  // P1-1: CORS 按环境切换（生产只允许指定域名）
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
      : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
  pingInterval: 25000,    // Socket.IO 内置心跳
  pingTimeout: 10000,
  connectTimeout: 10000,
  maxHttpBufferSize: 1e6, // 1MB
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(ChatGateway.name)

  constructor(
    private readonly executor: AgentExecutorService,
    private readonly runRegistry: RunRegistry,
    private readonly sessionManager: ChatSessionManager,
    private readonly messageService: MessageService,
    private readonly deliverableService: DeliverableService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ═══════════════════════════════════════════
  // 连接生命周期
  // ═══════════════════════════════════════════

  handleConnection(client: Socket) {
    try {
      // S1: JWT 校验 — 在 handshake auth.token 中
      const token = client.handshake.auth?.token as string | undefined
      if (!token) {
        this.logger.warn(`WS 连接拒绝: 无 token (client=${client.id})`)
        client.emit('chat.error', { message: '未提供认证令牌' })
        client.disconnect()
        return
      }

      // P0-1+P0-3: 完整 JWT 验签，验证失败立即断开连接
      let userId: string
      try {
        const payload = this.jwtService.verify(token, {
          secret: this.configService.getOrThrow('JWT_SECRET'),
        })
        userId = payload.sub || payload.userId
        if (!userId) {
          this.logger.warn(`WS 连接拒绝: JWT payload 无 userId (client=${client.id})`)
          client.emit('chat.error', { message: '认证令牌无效' })
          client.disconnect()
          return
        }
      } catch (err: any) {
        this.logger.warn(`WS 连接拒绝: JWT 验签失败 (client=${client.id}): ${err.message}`)
        client.emit('chat.error', { message: '认证令牌无效或已过期' })
        client.disconnect()
        return
      }

      this.sessionManager.registerClient(userId, client)
      client.emit('connected', { clientId: client.id })

      this.logger.log(`WS 连接成功: client=${client.id} userId=${userId}`)
    } catch (e: any) {
      this.logger.error(`WS 连接异常: ${e.message}`)
      client.disconnect()
    }
  }

  handleDisconnect(client: Socket) {
    // 中止该客户端的所有活跃 run
    this.runRegistry.abortByClient(client.id)
    this.sessionManager.removeClient(client.id)
  }

  // ═══════════════════════════════════════════
  // chat.send — 核心消息处理
  // ═══════════════════════════════════════════

  @SubscribeMessage('chat.send')
  async handleChatSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionKey?: string; message?: string; history?: any[]; idempotencyKey?: string; model?: string },
  ) {
    const clientInfo = this.sessionManager.getClient(client.id)
    if (!clientInfo) {
      client.emit('chat.error', { message: '未认证' })
      return
    }

    const sessionKey = data.sessionKey || 'default'
    const message = data.message || ''

    // S3: 长度限制
    if (!message || message.length > 4000) {
      client.emit('chat.error', { message: '消息长度需在 1-4000 字符之间' })
      return
    }

    // S10: 输入清洗
    const cleanMessage = message
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/javascript:/gi, '[filtered]')
      .replace(/<[^>]*>/g, '')

    // P0-5: 原子化幂等注册 — check + register 合并
    const abortController = new AbortController()
    const regResult = this.runRegistry.registerIfNew({
      handler: null,
      controller: abortController,
      userId: clientInfo.userId,
      clientId: client.id,
      sessionKey,  // P0-4: 传递 sessionKey 给 RunRegistry
      idempotencyKey: data.idempotencyKey,
    })

    if (regResult.status === 'cached') {
      const cached = regResult.cachedResult
      if (cached) {
        client.emit('chat.event', { runId: cached.runId, type: 'content', delta: cached.partialContent })
        client.emit('chat.done', { runId: cached.runId })
      }
      return
    }
    if (regResult.status === 'in_flight') {
      client.emit('chat.error', { message: '消息正在处理中，请稍后' })
      return
    }

    const runId = regResult.runId

    // M1-6: 先 ACK
    client.emit('chat.started', { runId })

    // 加入 session 房间
    this.sessionManager.joinSession(client.id, sessionKey)

    // S7: 仅记录元数据
    this.logger.log(`WS chat.send: runId=${runId} userId=${clientInfo.userId} session=${sessionKey}`)

    // M3.3: 持久化用户消息
    this.messageService.append(sessionKey, { role: 'human', content: cleanMessage }).catch(() => {})

    // 清洗 history
    const cleanHistory = (data.history || []).map((h: any) => ({
      role: h.role,
      content: (h.content || '').replace(/<[^>]*>/g, ''),
    }))

    // 异步执行 Agent
    try {
      await this.executor.chatExecute(
        cleanHistory,
        cleanMessage,
        (event: StreamEvent) => {
          if (abortController.signal.aborted) return

          // 累积内容（中止后保留）
          if (event.type === 'content' && event.delta) {
            this.runRegistry.appendContent(runId, event.delta)
          }

          // M2: StreamEvent → chat.event 统一通道
          client.emit('chat.event', { runId, ...event })
        },
        { userId: clientInfo.userId, agentCode: 'tanghaoran', model: data.model },
      )

      if (!abortController.signal.aborted) {
        // M3.3: 持久化 Agent 回复
        this.messageService.append(sessionKey, {
          role: 'agent',
          content: this.runRegistry.getPartialContent(runId),
        }).catch(() => {})
        const usedModel = this.executor.getUsedModel() || data.model || ''
        const modelDisplay = getModelDisplayName(usedModel)
        client.emit('chat.done', { runId, model: modelDisplay, agentName: 'AI 执行官' })

        // B4: 自动创建交付物
        this.tryCreateDeliverable(sessionKey, runId).catch(err =>
          this.logger.warn(`[Deliverable] 自动创建交付物失败: ${err.message}`)
        )
      }
    } catch (e: any) {
      if (e?.name === 'AbortError' || abortController.signal.aborted) {
        client.emit('chat.aborted', {
          runId,
          partialContent: this.runRegistry.getPartialContent(runId),
        })
      } else {
        this.logger.error(`WS chat error [${runId}]:`, e instanceof Error ? e.message : String(e))
        client.emit('chat.error', { runId, message: '会话处理失败，请重试' })
      }
    } finally {
      this.runRegistry.unregister(runId)
    }
  }

  // ═══════════════════════════════════════════
  // chat.abort — 主动中止
  // ═══════════════════════════════════════════

  @SubscribeMessage('chat.abort')
  handleChatAbort(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { runId: string },
  ) {
    const clientInfo = this.sessionManager.getClient(client.id)
    if (!clientInfo) {
      client.emit('chat.error', { message: '未认证' })
      return
    }

    // S5: 权限校验
    const ok = this.runRegistry.abort(data.runId, clientInfo.userId)
    if (ok) {
      const partialContent = this.runRegistry.getPartialContent(data.runId)
      client.emit('chat.aborted', { runId: data.runId, partialContent })
      this.logger.log(`WS chat.abort: runId=${data.runId} userId=${clientInfo.userId}`)
    } else {
      client.emit('chat.error', { runId: data.runId, message: '会话不存在或无权中止' })
    }
  }

  // ═══════════════════════════════════════════
  // chat.inject — 注入消息（预埋 M3）
  // ═══════════════════════════════════════════

  @SubscribeMessage('chat.inject')
  handleChatInject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionKey: string; message: string; label?: string },
  ) {
    const clientInfo = this.sessionManager.getClient(client.id)
    if (!clientInfo) {
      client.emit('chat.error', { message: '未认证' })
      return
    }

    // 广播给同 session 所有客户端
    this.sessionManager.broadcastToSession(data.sessionKey, 'chat.injected', {
      sessionKey: data.sessionKey,
      message: data.message,
      label: data.label,
    }, client.id)

    client.emit('chat.injected', { sessionKey: data.sessionKey, message: data.message })
    this.logger.log(`WS chat.inject: session=${data.sessionKey}`)
  }

  // ═══════════════════════════════════════════
  // chat.history — 获取历史（预埋 M3）
  // ═══════════════════════════════════════════

  @SubscribeMessage('chat.history')
  async handleChatHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionKey: string; limit?: number },
  ) {
    // P1-2: 权限隔离 — 必须已认证
    const clientInfo = this.sessionManager.getClient(client.id)
    if (!clientInfo) {
      client.emit('chat.error', { message: '未认证' })
      return
    }

    // P1-2: sessionKey 格式校验（MessageService 也会校验，但这里做早期拦截）
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(data.sessionKey)) {
      client.emit('chat.error', { message: '非法的会话标识' })
      return
    }

    try {
      const messages = await this.messageService.getHistory(data.sessionKey, data.limit || 50)
      client.emit('chat.history', {
        sessionKey: data.sessionKey,
        messages,
      })
    } catch (err: any) {
      this.logger.warn(`chat.history 拒绝: ${err.message}`)
      client.emit('chat.error', { message: '无法获取会话历史' })
    }
  }

  /**
   * B4: Agent 对话完成时，自动创建交付物
   * 从 PartAgent 输出中提取文件内容，写入 deliverables/ 目录
   */
  private async tryCreateDeliverable(sessionKey: string, runId: string) {
    // sessionKey 可能是 taskId，尝试解析
    const taskId = sessionKey
    if (!taskId) return

    const partialContent = this.runRegistry.getPartialContent(runId)
    if (!partialContent || partialContent.length < 50) return

    // 从 content 中提取标题（第一行 # 开头或前 80 字）
    const firstLine = partialContent.split('\n')[0]?.replace(/^#+\s*/, '').trim() || ''
    const title = firstLine || partialContent.substring(0, 80)

    // 获取工作区根目录（从环境变量或默认值）
    const rootDir = process.env.ERA_WORKSPACE || process.cwd()

    try {
      await this.deliverableService.createDeliverable({
        taskId,
        taskTitle: title,
        userType: process.env.DEPLOYMENT_MODE || 'operator',
        createdBy: 'ERA Agent',
        rootDir,
        changelog: 'Agent 自动交付',
        files: [{
          name: 'output.md',
          size: Buffer.byteLength(partialContent, 'utf-8'),
          content: partialContent,
        }],
      })
    } catch (err: any) {
      this.logger.warn(`[Deliverable] ${taskId}: ${err.message}`)
    }
  }
}
