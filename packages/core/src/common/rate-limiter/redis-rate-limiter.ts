// V1.4-b #15: Redis 限流器（多实例部署）
// 依赖 ioredis，若 REDIS_URL 未配置则回退到 MemoryRateLimiter

import { RateLimiter } from './rate-limiter.interface'
import { Logger } from '@nestjs/common'

interface IRedisClient {
  hgetall(key: string): Promise<Record<string, string>>
  hset(key: string, ...args: string[]): Promise<number>
  del(key: string): Promise<number>
  pexpireat(key: string, timestamp: number): Promise<number>
  expire(key: string, seconds: number): Promise<number>
}

export class RedisRateLimiter implements RateLimiter {
  private readonly logger = new Logger(RedisRateLimiter.name)
  private redis: IRedisClient

  constructor(redisClient: IRedisClient) {
    this.redis = redisClient
  }

  async attempt(key: string, maxAttempts: number, windowMs: number) {
    const now = Date.now()
    const redisKey = `ratelimit:${key}`

    try {
      const entry = await this.redis.hgetall(redisKey)
      const count = parseInt(entry.count || '0', 10)
      const lockUntil = parseInt(entry.lockUntil || '0', 10)

      // 锁定中
      if (lockUntil > now) {
        return { remaining: -1, lockedUntil: lockUntil }
      }

      // 窗口过期，重置
      if (lockUntil && lockUntil <= now) {
        await this.redis.del(redisKey)
      }

      const newCount = count + 1
      const newLockUntil = newCount >= maxAttempts ? now + windowMs : 0

      await this.redis.hset(redisKey, 'count', newCount.toString(), 'lockUntil', newLockUntil.toString())

      // TTL：窗口过期自动清理
      if (newLockUntil > 0) {
        await this.redis.pexpireat(redisKey, newLockUntil)
      } else {
        await this.redis.expire(redisKey, Math.ceil(windowMs / 1000))
      }

      return {
        remaining: Math.max(maxAttempts - newCount, -1),
        lockedUntil: newLockUntil,
      }
    } catch (e: unknown) {
      this.logger.error(`Redis 限流异常 [${key}]: ${(e as Error).message}`)
      // Redis 故障时回退到安全模式：不阻断（允许通过）
      return { remaining: maxAttempts, lockedUntil: 0 }
    }
  }

  async reset(key: string) {
    try {
      await this.redis.del(`ratelimit:${key}`)
    } catch (e: unknown) {
      this.logger.warn(`Redis 重置失败 [${key}]: ${(e as Error).message}`)
    }
  }
}
