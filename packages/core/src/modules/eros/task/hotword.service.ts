/**
 * Live-ERDL 热词服务 — 引擎层
 *
 * 提供热词雷达基础设施：定时扫描、认知日志存储、查询接口。
 * 具体的业务映射表（BUSINESS_MAP）由行业模块通过 registerMapping() 注入。
 * 无行业模块时，热词雷达以"纯监测"模式运行（记录原始热词，不映射）。
 *
 * @file hotword.service.ts
 * @since 2026-06-01
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CognitiveLog } from './cognitive-log.entity'

const crypto = require('crypto')
function uid() { return crypto.randomUUID().replace(/-/g, '') }

export interface HotwordEntry {
  word: string
  time: string
  trend: 'up' | 'new' | 'stable'
  source: string
  mappedTo?: string
  score?: number
}

/**
 * 业务映射表 — 行业模块在启动时注入
 * 示例：{ '多巴胺': '高饱和色镜框（粉/橙）' }
 */
@Injectable()
export class HotwordService implements OnModuleInit {
  private readonly logger = new Logger(HotwordService.name)
  private cache: HotwordEntry[] = []
  private timer: ReturnType<typeof setInterval> | null = null

  /** 行业模块注册的业务映射表 */
  private businessMap: Record<string, string> = {}

  /** 行业模块注册的热词种子库 */
  private seedWords: string[] = []

  constructor(
    @InjectRepository(CognitiveLog)
    private readonly logRepo: Repository<CognitiveLog>,
  ) {}

  async onModuleInit() {
    this.logger.log('🔥 Live-ERDL 热词雷达启动 · [引擎模式] 等待行业模块注入映射表')
    this.logger.log('   提示: 调用 HotwordService.registerMapping() 注入业务映射')

    // 首次加载
    await this.refresh()

    // 每 1 小时刷新
    this.timer = setInterval(() => this.refresh(), 60 * 60 * 1000)
  }

  /**
   * 行业模块注入业务映射表和种子词库
   * 调用后热词雷达即刻生效
   */
  registerMapping(businessMap: Record<string, string>, seedWords?: string[]) {
    this.businessMap = { ...businessMap }
    this.seedWords = seedWords || Object.keys(businessMap)
    this.logger.log(`✅ 业务映射注入完成 · ${this.seedWords.length} 个热词种子`)
    // 立即刷新以使用新映射
    this.refresh()
  }

  /** 获取当前热词列表 */
  getHotwords(): HotwordEntry[] {
    return this.cache
  }

  /** 刷新热词 */
  async refresh() {
    this.logger.log('🔄 Live-ERDL 拉取热点...')

    try {
      // Step 1: 从 cognitive_log 提取最近 24h 的高频词
      const existingWords = await this.extractFromLogs()

      // Step 2: 合并当前热词
      const now = new Date()
      const hour = now.getHours()
      const daySeed = now.getDate()
      const seed = (daySeed * 13 + hour * 7) % 10

      let hotwords: HotwordEntry[]

      if (this.seedWords.length > 0) {
        // 有行业映射 — 基于种子词库生成模拟热词
        hotwords = this.seedWords
          .filter(() => crypto.randomInt(100) > 30)
          .slice(0, 6)
          .map((word, i) => {
            const trendRoll = (i + seed) % 3
            return {
              word,
              time: `${String(hour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
              trend: (trendRoll === 0 ? 'up' : trendRoll === 1 ? 'new' : 'stable') as 'up' | 'new' | 'stable',
              source: ['小红书', '抖音', '微博', '微信'][i % 4],
              mappedTo: this.businessMap[word],
              score: crypto.randomInt(31) + 70,
            }
          })
          .sort((a, b) => (b.score || 0) - (a.score || 0))
      } else {
        // 纯引擎模式 — 仅基于认知日志已有数据
        hotwords = [...existingWords]
      }

      // 混合已有的认知日志高频词
      for (const ew of existingWords) {
        if (!hotwords.find(h => h.word === ew.word)) {
          hotwords.push(ew)
        }
      }

      this.cache = hotwords.slice(0, 8)

      // Step 3: 写 cognitive_log
      for (const hw of this.cache.slice(0, 4)) {
        await this.logRepo.save({
          id: uid(),
          logType: 'event',
          sourceModule: 'live-erdl',
          sourceId: null,
          level: 'info',
          title: `热词: ${hw.word}`,
          content: {
            word: hw.word,
            trend: hw.trend,
            source: hw.source,
            mappedTo: hw.mappedTo,
            score: hw.score,
          },
          agentId: null,
          actor: 'Live-ERDL',
          actorType: 'system',
          createdAt: Date.now(),
        } as Record<string, unknown>)
      }

      this.logger.log(`✅ Live-ERDL 更新完成 · ${this.cache.length} 个热词`)
    } catch (e: unknown) {
      this.logger.error(`Live-ERDL 刷新失败: ${(e as Error).message}`)
    }
  }

  /** 从 cognitive_log 提取最近语义热点 */
  private async extractFromLogs(): Promise<HotwordEntry[]> {
    try {
      const logs = await this.logRepo.find({
        where: { sourceModule: 'live-erdl' },
        order: { createdAt: 'DESC' } as Record<string, unknown>,
        take: 20,
      })

      const wordMap = new Map<string, { count: number; source: string; mappedTo?: string }>()
      for (const log of logs) {
        const content = log.content as Record<string, unknown>
        if (!content?.word) continue
        const entry = wordMap.get(content.word as string) || { count: 0, source: (content.source as string) || '', mappedTo: content.mappedTo as string | undefined }
        entry.count++
        wordMap.set(content.word as string, entry)
      }

      return [...wordMap.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([word, info], i) => ({
          word,
          time: '历史',
          trend: (info.count > 2 ? 'up' : 'stable') as 'up' | 'stable',
          source: info.source,
          mappedTo: info.mappedTo || this.businessMap[word],
        }))
    } catch {
      return []
    }
  }
}
