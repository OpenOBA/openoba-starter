import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThan } from 'typeorm'
import { CognitiveLog } from '../task/cognitive-log.entity'
import * as fs from 'fs'
import * as path from 'path'

@Injectable()
export class LogArchiveService {
  private readonly logger = new Logger(LogArchiveService.name)

  private readonly retentionDays = Number(process.env.LOG_RETENTION_DAYS) || 90

  constructor(
    @InjectRepository(CognitiveLog)
    private readonly logRepo: Repository<CognitiveLog>,
  ) {}

  /**
   * 每天凌晨 3:00 检查并归档过期认知日志
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async archiveExpiredLogs() {
    const cutoff = Date.now() - this.retentionDays * 86400000

    const expired = await this.logRepo.find({
      where: { createdAt: LessThan(cutoff) },
      order: { createdAt: 'ASC' },
      take: 1000,
    })

    if (expired.length === 0) {
      return
    }

    // 按月份分组写入文件系统
    const groups: Record<string, CognitiveLog[]> = {}
    for (const log of expired) {
      const d = new Date(log.createdAt)
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!groups[month]) groups[month] = []
      groups[month].push(log)
    }

    const rootDir = process.env.ERA_WORKSPACE || process.cwd()
    const archiveDir = path.join(rootDir, 'logs')

    for (const [month, logs] of Object.entries(groups)) {
      const monthDir = path.join(archiveDir, month)
      fs.mkdirSync(monthDir, { recursive: true })

      const filePath = path.join(monthDir, `cognitive-${new Date().toISOString().slice(0, 10)}.jsonl`)
      const lines = logs.map(l => JSON.stringify({
        id: l.id,
        sourceId: l.sourceId,
        agentId: l.agentId,
        actor: l.actor,
        actorType: l.actorType,
        title: l.title,
        level: l.level,
        logType: l.logType,
        createdAt: new Date(l.createdAt).toISOString(),
      }))
      fs.appendFileSync(filePath, lines.join('\n') + '\n', 'utf-8')

      const ids = logs.map(l => l.id)
      await this.logRepo.delete(ids)
    }

    this.logger.log(`[Archive] 已归档 ${expired.length} 条过期日志 → ${archiveDir}`)
  }

  /** 手动触发归档 */
  async manualArchive(beforeDays?: number) {
    const cutoff = Date.now() - (beforeDays || this.retentionDays) * 86400000

    const expired = await this.logRepo.find({
      where: { createdAt: LessThan(cutoff) },
      take: 500,
    })

    if (expired.length > 0) {
      const rootDir = process.env.ERA_WORKSPACE || process.cwd()
      const archiveDir = path.join(rootDir, 'logs', 'manual')
      fs.mkdirSync(archiveDir, { recursive: true })

      const filePath = path.join(archiveDir, `cognitive-manual-${Date.now()}.jsonl`)
      const lines = expired.map(l => JSON.stringify({
        id: l.id, sourceId: l.sourceId, agentId: l.agentId,
        actor: l.actor, title: l.title, level: l.level,
        createdAt: new Date(l.createdAt).toISOString(),
      }))
      fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8')

      const ids = expired.map(l => l.id)
      await this.logRepo.delete(ids)
    }

    return { archived: expired.length }
  }
}
