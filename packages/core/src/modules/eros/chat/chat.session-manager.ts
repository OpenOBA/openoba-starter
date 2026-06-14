/**
 * ERA Chat Session Manager — WS 连接池与会话管理
 *
 * @file chat.session-manager.ts
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-21
 * @license AGPL-3.0
 */

import { Injectable, Logger } from '@nestjs/common'
import type { Socket } from 'socket.io'

export interface WsClient {
  socket: Socket
  userId: string
  sessionIds: Set<string>
  connectedAt: number
}

@Injectable()
export class ChatSessionManager {
  private readonly logger = new Logger(ChatSessionManager.name)

  /** clientId → WsClient */
  private clients = new Map<string, WsClient>()

  /** userId → Set<clientId> */
  private userClients = new Map<string, Set<string>>()

  /** sessionKey → Set<clientId> */
  private sessionClients = new Map<string, Set<string>>()

  // ═══════════════════════════════════════════
  // 连接管理
  // ═══════════════════════════════════════════

  registerClient(userId: string, socket: Socket): void {
    const client: WsClient = {
      socket,
      userId,
      sessionIds: new Set(),
      connectedAt: Date.now(),
    }

    this.clients.set(socket.id, client)

    // 加入用户房间
    if (!this.userClients.has(userId)) {
      this.userClients.set(userId, new Set())
    }
    this.userClients.get(userId)!.add(socket.id)

    this.logger.log(`Client connected: ${socket.id} (userId=${userId})`)
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId)
    if (!client) return

    // 离开所有 session 房间
    for (const sessionKey of client.sessionIds) {
      client.socket.leave(sessionKey)
      const sessionSet = this.sessionClients.get(sessionKey)
      if (sessionSet) {
        sessionSet.delete(clientId)
        if (sessionSet.size === 0) this.sessionClients.delete(sessionKey)
      }
    }

    // 清理用户索引
    const userSet = this.userClients.get(client.userId)
    if (userSet) {
      userSet.delete(clientId)
      if (userSet.size === 0) this.userClients.delete(client.userId)
    }

    this.clients.delete(clientId)
    this.logger.log(`Client disconnected: ${clientId}`)
  }

  getClient(clientId: string): WsClient | undefined {
    return this.clients.get(clientId)
  }

  // ═══════════════════════════════════════════
  // 会话管理
  // ═══════════════════════════════════════════

  joinSession(clientId: string, sessionKey: string): void {
    const client = this.clients.get(clientId)
    if (!client) return

    client.socket.join(sessionKey)
    client.sessionIds.add(sessionKey)

    if (!this.sessionClients.has(sessionKey)) {
      this.sessionClients.set(sessionKey, new Set())
    }
    this.sessionClients.get(sessionKey)!.add(clientId)
  }

  leaveSession(clientId: string, sessionKey: string): void {
    const client = this.clients.get(clientId)
    if (!client) return

    client.socket.leave(sessionKey)
    client.sessionIds.delete(sessionKey)
  }

  // ═══════════════════════════════════════════
  // 广播
  // ═══════════════════════════════════════════

  /** 向同 session 的所有客户端广播（预埋，M3 启用） */
  broadcastToSession(sessionKey: string, event: string, payload: any, excludeClientId?: string): void {
    const sessionSet = this.sessionClients.get(sessionKey)
    if (!sessionSet) return

    for (const clientId of sessionSet) {
      if (clientId === excludeClientId) continue
      const client = this.clients.get(clientId)
      client?.socket.emit(event, payload)
    }
  }

  // ═══════════════════════════════════════════
  // 统计
  // ═══════════════════════════════════════════

  get activeClientCount(): number {
    return this.clients.size
  }

  get activeSessionCount(): number {
    return this.sessionClients.size
  }
}
