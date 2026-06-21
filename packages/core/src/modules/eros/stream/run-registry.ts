/**
 * ER-OS Run Registry — Agent 执行生命周期管理
 *
 * @file run-registry.ts
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-21
 * @license BSL-1.1
 *
 * @description
 * 管理所有正在运行的 Agent 会话（run）：
 * - 注册 → chat.start 时将 handler + AbortController 存入
 * - 获取 → chat.stream 时取出 handler 执行 SSE 流
 * - 中止 → chat.abort 时调用 AbortController，保留部分内容
 * - 清理 → 定时器每 5 分钟清除过期 run（防内存泄漏）
 * - 幂等 → 三层防护（cached / in_flight / 新建）
 */

import { Injectable, Logger } from '@nestjs/common'
import type { Response } from 'express'

export interface RunEntry {
  /** SSE 流执行函数（接收 Response 对象） */
  handler: ((res: Response) => Promise<void>) | null
  /** 中止控制器 */
  controller: AbortController
  /** 创建时间戳 */
  createdAt: number
  /** 创建者 JWT userId（用于中止权限校验） */
  userId: string
  /** 客户端 ID（WS 模式下使用） */
  clientId?: string
  /** P0-4: 会话 key（用于按 session 过滤中止） */
  sessionKey?: string
  /** 已生成的部分内容（中止后保留） */
  partialContent: string
  /** 幂等 key（用于去重） */
  idempotencyKey?: string
}

@Injectable()
export class RunRegistry {
  private readonly logger = new Logger(RunRegistry.name)

  /** 活跃 run 注册表 */
  private runs = new Map<string, RunEntry>()

  /** run 过期时间：30 分钟 */
  private readonly TTL_MS = 30 * 60 * 1000

  /** 清理间隔：5 分钟 */
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000

  /** 幂等缓存：已完成的 run（key → result），5 分钟过期 */
  private completedRuns = new Map<string, { result: { runId: string; partialContent: string }; createdAt: number }>()
  private readonly COMPLETED_TTL_MS = 5 * 60 * 1000

  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL_MS)
    // Node.js 不阻止进程退出
    if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      this.cleanupTimer.unref()
    }
  }

  // ═══════════════════════════════════════════
  // 公共 API
  // ═══════════════════════════════════════════

  /**
   * 注册新 run
   * @returns runId
   */
  register(entry: Omit<RunEntry, 'partialContent' | 'createdAt'> & { createdAt?: number; sessionKey?: string }): string {
    const runId = crypto.randomUUID()
    this.runs.set(runId, {
      ...entry,
      partialContent: '',
      createdAt: entry.createdAt ?? Date.now(),
    })
    this.logger.log(`Run 注册: ${runId} (userId=${entry.userId})`)
    return runId
  }

  /**
   * 获取 run（用于 stream 端点取出 handler 执行）
   */
  get(runId: string): RunEntry | undefined {
    const entry = this.runs.get(runId)
    if (!entry) return undefined
    // 检查是否过期
    if (Date.now() - entry.createdAt > this.TTL_MS) {
      this.runs.delete(runId)
      return undefined
    }
    return entry
  }

  /**
   * 更新已生成的部分内容（流式过程中累积）
   */
  appendContent(runId: string, delta: string): void {
    const entry = this.runs.get(runId)
    if (entry) {
      entry.partialContent += delta
    }
  }

  /**
   * 中止 run — 调用 AbortController + 保留部分内容
   * @returns 是否成功中止
   */
  abort(runId: string, userId?: string): boolean {
    const entry = this.runs.get(runId)
    if (!entry) return false

    // S5: 权限校验 — 仅创建者可中止
    if (userId && entry.userId !== userId) {
      this.logger.warn(`中止权限拒绝: runId=${runId} requester=${userId} owner=${entry.userId}`)
      return false
    }

    try {
      entry.controller.abort()
    } catch (e: unknown) {
      this.logger.error(`AbortController 调用失败 [${runId}]: ${(e as Error).message}`)
    }
    // 不立即删除 — stream 端点需要读取 partialContent
    // cleanup 会在一段时间后清除
    this.logger.log(`Run 已中止: ${runId}`)
    return true
  }

  /**
   * 按客户端 ID 批量中止（WS 断开时）
   */
  abortByClient(clientId: string): void {
    for (const [runId, entry] of this.runs) {
      if (entry.clientId === clientId) {
        try { entry.controller.abort() } catch (e: unknown) {
          this.logger.debug(`abort 失败（控制器可能已关闭）: ${(e as Error).message}`)
        }
        this.logger.log(`Run 因客户端断开而中止: ${runId} (client=${clientId})`)
      }
    }
    // 延迟清理（给 stream 端点时间读 partialContent）
    setTimeout(() => {
      for (const [runId, entry] of this.runs) {
        if (entry.clientId === clientId) this.runs.delete(runId)
      }
    }, 5000)
  }

  /**
   * 注销 run（正常完成时调用）
   */
  unregister(runId: string): void {
    const entry = this.runs.get(runId)
    if (entry) {
      // 存入 completedRuns（幂等缓存）
      if (entry.idempotencyKey) {
        this.completedRuns.set(entry.idempotencyKey, {
          result: { runId, partialContent: entry.partialContent },
          createdAt: Date.now(),
        })
      }
    }
    this.runs.delete(runId)
    this.logger.debug(`Run 已注销: ${runId}`)
  }

  /**
   * 三层幂等检查
   * @returns 'new' | 'cached' | 'in_flight'
   */
  checkIdempotent(idempotencyKey: string): 'new' | 'cached' | 'in_flight' {
    // 第 1 层：已完成缓存
    const cached = this.completedRuns.get(idempotencyKey)
    if (cached && Date.now() - cached.createdAt < this.COMPLETED_TTL_MS) {
      return 'cached'
    }

    // 第 2 层：正在运行中
    for (const [, entry] of this.runs) {
      if (entry.idempotencyKey === idempotencyKey) {
        return 'in_flight'
      }
    }

    // 第 3 层：新请求
    return 'new'
  }

  /**
   * P0-5: 原子化幂等注册 — check + register 合并为单次操作
   * 消除 TOCTOU 风险（JS 单线程但逻辑分散导致的不一致）
   * @returns { runId, status } — status 为 'new' | 'cached' | 'in_flight'
   */
  registerIfNew(entry: Omit<RunEntry, 'partialContent' | 'createdAt'> & { createdAt?: number; sessionKey?: string }): {
    runId: string
    status: 'new' | 'cached' | 'in_flight'
    cachedResult?: { runId: string; partialContent: string }
  } {
    if (!entry.idempotencyKey) {
      // 无幂等 key → 直接注册
      const runId = this.register(entry)
      return { runId, status: 'new' }
    }

    // 第 1 层：已完成缓存
    const cached = this.completedRuns.get(entry.idempotencyKey)
    if (cached && Date.now() - cached.createdAt < this.COMPLETED_TTL_MS) {
      return { runId: cached.result.runId, status: 'cached', cachedResult: cached.result }
    }

    // 第 2 层：正在运行中
    for (const [, existing] of this.runs) {
      if (existing.idempotencyKey === entry.idempotencyKey) {
        return { runId: '', status: 'in_flight' }
      }
    }

    // 第 3 层：新请求 — 立即注册（check + register 之间无中断）
    const runId = this.register(entry)
    return { runId, status: 'new' }
  }

  /**
   * 获取幂等缓存的结果
   */
  getCachedResult(idempotencyKey: string): { runId: string; partialContent: string } | null {
    const cached = this.completedRuns.get(idempotencyKey)
    if (cached && Date.now() - cached.createdAt < this.COMPLETED_TTL_MS) {
      return cached.result
    }
    this.completedRuns.delete(idempotencyKey)
    return null
  }

  /**
   * 获取 run 的部分内容（中止后）
   */
  getPartialContent(runId: string): string {
    return this.runs.get(runId)?.partialContent || ''
  }

  /**
   * 获取活跃 run 数量（监控用）
   */
  get activeCount(): number {
    return this.runs.size
  }

  /**
   * 按 userId 获取所有活跃 runId（中止用）
   */
  getRunIdsByUserId(userId: string): string[] {
    const ids: string[] = []
    for (const [runId, entry] of this.runs) {
      if (entry.userId === userId) ids.push(runId)
    }
    return ids
  }

  /**
   * P0-4: 按 sessionKey 获取所有活跃 runId
   */
  getRunIdsBySessionKey(sessionKey: string): string[] {
    const ids: string[] = []
    for (const [runId, entry] of this.runs) {
      if (entry.sessionKey === sessionKey) ids.push(runId)
    }
    return ids
  }

  // ═══════════════════════════════════════════
  // 内部方法
  // ═══════════════════════════════════════════

  /**
   * S8: 定期清理过期 run 和 completedRuns
   */
  private cleanup(): void {
    const now = Date.now()
    let cleanedRuns = 0
    let cleanedCompleted = 0

    for (const [runId, entry] of this.runs) {
      if (now - entry.createdAt > this.TTL_MS) {
        try { entry.controller.abort() } catch (e: unknown) {
          this.logger.debug(`TTL abort 失败（控制器可能已关闭）: ${(e as Error).message}`)
        }
        this.runs.delete(runId)
        cleanedRuns++
      }
    }

    for (const [key, entry] of this.completedRuns) {
      if (now - entry.createdAt > this.COMPLETED_TTL_MS) {
        this.completedRuns.delete(key)
        cleanedCompleted++
      }
    }

    if (cleanedRuns > 0 || cleanedCompleted > 0) {
      this.logger.debug(`清理: ${cleanedRuns} 个过期 run, ${cleanedCompleted} 个过期缓存`)
    }
  }

  /**
   * 销毁（停止定时器）
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }
}
