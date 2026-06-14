// V1.4-b #15: 限流模块 — NestJS 全局提供
// 开发环境自动回退 Memory，生产环境需配置 REDIS_URL

import { Module, Global, Logger, OnModuleInit } from '@nestjs/common'
import { IRateLimiter } from './rate-limiter.interface'
import { MemoryRateLimiter } from './memory-rate-limiter'

@Global()
@Module({
  providers: [
    {
      provide: 'RATE_LIMITER',
      useFactory: (): IRateLimiter => {
        const redisUrl = process.env.REDIS_URL

        if (redisUrl) {
          const logger = new Logger('RateLimiterModule')
          try {
            // 动态 import ioredis（避免编译时未安装报错）
            const Redis = require('ioredis')
            const redis = new Redis(redisUrl, {
              maxRetriesPerRequest: 1,
              lazyConnect: false,
              retryStrategy: (times: number) => {
                if (times > 3) {
                  logger.warn(`Redis 连接失败 ${times} 次，回退到 MemoryRateLimiter`)
                  return null // 停止重试
                }
                return Math.min(times * 200, 2000)
              },
            })

            redis.on('connect', () => logger.log('Redis 限流已启用'))
            redis.on('error', (e: Error) => logger.warn(`Redis 错误: ${e.message}`))

            const { RedisRateLimiter } = require('./redis-rate-limiter')
            return new RedisRateLimiter(redis)
          } catch (e: unknown) {
            logger.warn(`Redis 启用失败，使用 MemoryRateLimiter: ${(e as Error).message}`)
          }
        }

        return new MemoryRateLimiter()
      },
    },
  ],
  exports: ['RATE_LIMITER'],
})
export class RateLimiterModule implements OnModuleInit {
  onModuleInit() {
    // 内存模式：每 5 分钟清理过期记录
    if (!process.env.REDIS_URL) {
      const limiter = new MemoryRateLimiter()
      setInterval(() => limiter.cleanup!(), 5 * 60 * 1000)
    }
  }
}
