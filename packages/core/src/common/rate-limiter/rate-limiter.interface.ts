// V1.4-b #15: 限流器接口 — Memory/Redis 双实现
// 所有 Memory Map 限流统一迁移到本接口

export interface IRateLimiter {
  /**
   * 检查是否超出限制。一次调用 = 一次计数。
   * @returns 剩余尝试次数，-1 表示已被锁定
   */
  attempt(key: string, maxAttempts: number, windowMs: number): Promise<{ remaining: number; lockedUntil: number }>

  /** 重置指定 key 的计数 */
  reset(key: string): Promise<void>

  /** 定期清理过期记录（Memory 实现需要，Redis 端可空） */
  cleanup?(): void
}
