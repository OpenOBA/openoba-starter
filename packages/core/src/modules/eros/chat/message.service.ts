/**
 * ERA Chat Message Service — JSONL 会话持久化
 *
 * @file message.service.ts
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-22
 * @license BSL-1.1
 */

import { Injectable, Logger, Optional } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { ChatMessage } from './chat-message.entity'

export interface ChatMessageRecord {
  role: 'human' | 'agent' | 'system'
  content: string
  time?: string
  reactTimeline?: Array<{
    kind: string
    text?: string
    name?: string
    args?: Record<string, unknown>
    status?: string
    result?: string
    durationMs?: number
    ts?: number
  }>
}

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name)
  private readonly baseDir: string

  /** P0-2: sessionKey 白名单校验 — 仅允许字母数字下划线连字符 */
  private static readonly SESSION_KEY_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/

  constructor(
    @Optional() @InjectRepository(ChatMessage)
    private readonly repo?: Repository<ChatMessage>,
  ) {
    this.baseDir = path.join(process.cwd(), 'data', 'chat-sessions')
    fs.mkdirSync(this.baseDir, { recursive: true })
  }

  /**
   * P0-2: 校验 sessionKey，禁止路径遍历
   * @returns normalized sessionKey，非法时抛出 Error
   */
  private validateSessionKey(sessionKey: string): string {
    if (!sessionKey || !MessageService.SESSION_KEY_PATTERN.test(sessionKey)) {
      throw new Error(`非法的 sessionKey: 仅允许字母数字下划线连字符 (1-128字符)，收到: ${sessionKey.substring(0, 32)}`)
    }
    return sessionKey
  }

  /**
   * 追加一条消息到会话 JSONL
   */
  async append(sessionKey: string, message: ChatMessageRecord): Promise<void> {
    const key = this.validateSessionKey(sessionKey)  // P0-2

    // DB 写入（优先）
    if (this.repo) {
      try {
        await this.repo.save({
          sessionKey: key,
          role: message.role,
          content: message.content,
          reactTimeline: message.reactTimeline || null,
        })
      } catch (e: unknown) {
        this.logger.warn(`DB 写入失败，fallback 到 JSONL: ${(e as Error).message}`)
      }
    }

    // JSONL 追加（向后兼容）
    const filePath = path.join(this.baseDir, `${key}.jsonl`)
    const line = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString(),
    })
    // 追加模式（不阻塞），每行独立写入
    fs.appendFileSync(filePath, line + '\n', 'utf-8')
    this.logger.debug(`Message appended: session=${sessionKey}`)
  }

  /**
   * 获取会话历史
   */
  async getHistory(sessionKey: string, limit = 50): Promise<ChatMessageRecord[]> {
    const key = this.validateSessionKey(sessionKey)  // P0-2

    // DB 优先
    if (this.repo) {
      try {
        const rows = await this.repo.find({
          where: { sessionKey: key },
          order: { createdAt: 'ASC' },
          take: limit,
        })
        if (rows.length > 0) {
          return rows.map((r) => ({
            role: r.role as ChatMessageRecord['role'],
            content: r.content,
            time: r.createdAt?.toISOString(),
            reactTimeline: r.reactTimeline || undefined,
          }))
        }
      } catch (e: unknown) {
        this.logger.warn(`DB 查询失败，fallback 到 JSONL: ${(e as Error).message}`)
      }
    }

    // JSONL fallback
    const filePath = path.join(this.baseDir, `${key}.jsonl`)
    if (!fs.existsSync(filePath)) return []

    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)

    const messages = lines.slice(-limit).map(line => {
      try { return JSON.parse(line) } catch { return null }
    }).filter(Boolean) as ChatMessageRecord[]

    return messages

    return messages
  }

  /**
   * 保存完整消息数组（覆盖写入）
   */
  async saveAll(sessionKey: string, messages: ChatMessageRecord[]): Promise<void> {
    const key = this.validateSessionKey(sessionKey)  // P0-2
    const filePath = path.join(this.baseDir, `${key}.jsonl`)
    const content = messages.map(m => JSON.stringify({
      ...m,
      timestamp: new Date().toISOString(),
    })).join('\n') + '\n'
    fs.writeFileSync(filePath, content, 'utf-8')
    this.logger.debug(`Session saved: ${sessionKey} (${messages.length} messages)`)
  }

  /**
   * 获取会话 Token 用量估算（粗略：平均每字 1.5 token）
   */
  async getTokenEstimate(sessionKey: string): Promise<{ totalChars: number; estimatedTokens: number }> {
    const messages = await this.getHistory(sessionKey, 999)
    const totalChars = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0)
    return {
      totalChars,
      estimatedTokens: Math.ceil(totalChars * 1.5),
    }
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionKey: string): Promise<void> {
    const key = this.validateSessionKey(sessionKey)  // P0-2

    // DB 删除
    if (this.repo) {
      try {
        await this.repo.delete({ sessionKey: key })
      } catch (e: unknown) {
        this.logger.warn(`DB 删除失败: ${(e as Error).message}`)
      }
    }

    // JSONL 删除
    const filePath = path.join(this.baseDir, `${key}.jsonl`)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      this.logger.log(`Session deleted: ${sessionKey}`)
    }
  }

  /** 列出所有会话 */
  listSessions(): string[] {
    return fs.readdirSync(this.baseDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => f.replace('.jsonl', ''))
  }
}
