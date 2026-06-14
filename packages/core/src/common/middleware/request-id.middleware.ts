/**
 * 全局请求追踪 Middleware
 *
 * 为每个请求注入 X-Request-ID，并同时注入 Logger 上下文。
 * 配合 Swagger 生产禁用。
 *
 * @file request-id.middleware.ts
 * @since 2026-06-01
 */
import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP')

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID()
    req.headers['x-request-id'] = requestId
    res.setHeader('X-Request-ID', requestId)

    const start = Date.now()
    res.on('finish', () => {
      const duration = Date.now() - start
      if (res.statusCode >= 400) {
        this.logger.warn(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms [${requestId}]`)
      }
    })

    next()
  }
}
