/**
 * OpenOBA ERA — SSE Safe Writer
 *
 * @file sse-safe-writer.ts
 * @author 唐浩然 (OpenOBA AI 执行官)
 * @since 2026-06-07
 * @license BSL-1.1
 *
 * @description
 * 解决 SSE (Server-Sent Events) 传输中文/emoji 乱码问题的安全写入器：
 *
 * 问题根因：
 * 1. Content-Type 缺少 charset=utf-8 → 代理/浏览器可能误判编码
 * 2. res.write(string) 在 HTTP chunked transfer 中可能将多字节 UTF-8
 *    字符切在不同 chunk 边界 → 前端 TextDecoder(stream:true) 产生 U+FFFD
 *
 * 解决方案：
 * 1. 统一 Content-Type: text/event-stream; charset=utf-8
 * 2. 使用 Buffer.from(s, 'utf-8') 显式编码，确保每个 write 的 buffer 完整
 * 3. 设置 TCP_NODELAY 减少 Nagle 合并
 * 4. 内置写入追踪日志（生产环境可关闭）
 */

import { Response } from 'express'
import { Logger } from '@nestjs/common'

export interface SSESafeWriterOptions {
  /** 响应对象 */
  res: Response
  /** 日志标签（用于追踪，默认 'SSE'） */
  label?: string
  /** 是否启用写入追踪日志（默认 false，仅开发环境） */
  trace?: boolean
  /** 心跳间隔 ms（0 = 不发送心跳） */
  heartbeatMs?: number
  /** 写入前回调，可用于累积内容 */
  onBeforeWrite?: (data: Record<string, unknown>) => void
}

export class SSESafeWriter {
  private readonly logger: Logger
  private readonly res: Response
  private readonly label: string
  private readonly trace: boolean
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private writeCount = 0
  private byteCount = 0
  private lastEventType = ''

  constructor(private readonly options: SSESafeWriterOptions) {
    this.res = options.res
    this.label = options.label || 'SSE'
    this.trace = options.trace || false
    this.logger = new Logger(`SSE:${this.label}`)
  }

  /**
   * 初始化 SSE 连接：设置 headers + TCP 优化
   */
  setup(): void {
    // 🔑 核心修复：Content-Type 必须声明 charset=utf-8
    this.res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    this.res.setHeader('Cache-Control', 'no-cache')
    this.res.setHeader('Connection', 'keep-alive')
    this.res.setHeader('X-Accel-Buffering', 'no') // 禁用 nginx 缓冲
    this.res.flushHeaders()

    // TCP_NODELAY：禁用 Nagle 算法，每个 write 立即发送
    const socket = (this.res as any).socket
    if (socket) {
      socket.setNoDelay(true)
      // 设置 TCP keepalive（60s 空闲后探测，防止中间代理断开长连接）
      socket.setKeepAlive(true, 60_000)
    }

    // 心跳（保持连接）
    if (this.options.heartbeatMs && this.options.heartbeatMs > 0) {
      this.heartbeatTimer = setInterval(() => {
        if (this.res.writableEnded) {
          this.stopHeartbeat()
          return
        }
        this.write({ type: 'heartbeat', ts: new Date().toISOString() })
      }, this.options.heartbeatMs)
    }

    if (this.trace) {
      this.logger.log(`SSE 连接已建立 (NoDelay=${!!socket})`)
    }
  }

  /**
   * 🔑 安全写入 SSE 数据行
   *
   * 使用 Buffer.from() 显式 UTF-8 编码，确保多字节字符完整写入。
   * 配合 TCP_NODELAY，每个 write 调用产生一个独立的 TCP segment，
   * 避免 chunked transfer 边界切在 UTF-8 多字节序列中间。
   */
  write(data: Record<string, unknown>): void {
    if (this.res.writableEnded) return

    // 调用写入前回调（用于 runRegistry 累积内容等）
    this.options.onBeforeWrite?.(data)

    // 🔑 安全序列化 + 显式 UTF-8 Buffer
    const jsonStr = JSON.stringify(data)
    const sseFrame = `data: ${jsonStr}\n\n`

    try {
      const buffer = Buffer.from(sseFrame, 'utf-8')
      this.res.write(buffer)

      this.writeCount++
      this.byteCount += buffer.length

      // 🔍 追踪日志：记录事件类型 + 前80字符（用于定位乱码来源）
      const evtType = data.type as string || 'unknown'
      if (this.trace || evtType !== this.lastEventType) {
        const preview = jsonStr.length > 80
          ? jsonStr.substring(0, 80) + '...'
          : jsonStr
        this.logger.debug(`#${this.writeCount} [${evtType}] ${buffer.length}B | ${preview}`)
        this.lastEventType = evtType
      }

      // 🔍 特殊事件：tool_end 额外记录完整 result 前 120 字符的 hex 校验
      if (evtType === 'tool_end' && data.result) {
        const resultStr = String(data.result)
        const preview = resultStr.substring(0, 120)
        const hex = Buffer.from(preview, 'utf-8').toString('hex')
        if (this.trace) {
          this.logger.debug(`[tool_end hex]: ${hex.substring(0, 200)}`)
        }
      }
    } catch (err: any) {
      this.logger.error(`SSE write 失败: ${err.message}`)
    }
  }

  /** 发送 done 事件并结束连接 */
  done(): void {
    if (this.res.writableEnded) return
    this.write({ type: 'done' })
    if (this.trace) {
      this.logger.log(`SSE 连接结束: ${this.writeCount} 个事件, ${this.byteCount} 字节`)
    }
    this.stopHeartbeat()
    this.res.end()
  }

  /** 发送 error 事件并结束连接 */
  error(data: { type?: string; message: string; [key: string]: unknown }): void {
    if (this.res.writableEnded) return
    this.write({ type: 'error', ...data })
    this.stopHeartbeat()
    this.res.end()
  }

  /** 发送 aborted 事件并结束 */
  aborted(partialContent?: string): void {
    if (this.res.writableEnded) return
    this.write({ type: 'aborted', partialContent })
    this.stopHeartbeat()
    this.res.end()
  }

  /** 停止心跳 */
  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /** 检查连接是否已结束 */
  get isEnded(): boolean {
    return this.res.writableEnded
  }

  /** 获取写入统计 */
  get stats(): { writes: number; bytes: number } {
    return { writes: this.writeCount, bytes: this.byteCount }
  }
}
