// V1.4-b #15: 内存限流器（默认实现）
// 单实例部署时使用，多实例部署需 RedisRateLimiter

import { RateLimiter } from './rate-limiter.interface'

export class MemoryRateLimiter implements RateLimiter {
  private readonly store = new Map<string, { count: number; lockUntil: number }>()

  async attempt(key: string, maxAttempts: number, windowMs: number) {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || entry.lockUntil < now) {
      this.store.set(key, { count: 1, lockUntil: 0 })
      return { remaining: maxAttempts - 1, lockedUntil: 0 }
    }

    if (entry.lockUntil > now) {
      return { remaining: -1, lockedUntil: entry.lockUntil }
    }

    entry.count++
    if (entry.count >= maxAttempts) {
      entry.lockUntil = now + windowMs
    }
    this.store.set(key, entry)

    return {
      remaining: Math.max(maxAttempts - entry.count, -1),
      lockedUntil: entry.lockUntil,
    }
  }

  async reset(key: string) {
    this.store.delete(key)
  }

  /** 定期清理过期条目 */
  cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (entry.lockUntil < now) this.store.delete(key)
    }
  }
}
