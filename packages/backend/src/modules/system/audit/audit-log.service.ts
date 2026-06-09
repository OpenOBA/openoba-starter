import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLog } from './audit-log.entity'

export interface CreateAuditLogDto {
  actorType: string
  actorId: string
  actorName?: string
  category: string
  action: string
  resource?: string
  detail?: string
  dataDomain?: string
  sensitivity?: string
  wasMasked?: boolean
  exportTarget?: string
  sourceIp?: string
  result?: string
  errorMessage?: string
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  /**
   * 写入审计日志
   *
   * 调用方只需提供必填字段，系统自动补充时间戳。
   */
  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    const log = this.auditRepo.create({
      ...dto,
      actionTime: new Date(),
      result: dto.result || 'success',
    })
    return this.auditRepo.save(log)
  }

  /**
   * 查询审计日志（分页 + 筛选）
   */
  async findAll(query: {
    page?: number
    pageSize?: number
    actorType?: string
    actorId?: string
    category?: string
    dataDomain?: string
    sensitivity?: string
    exportTarget?: string
    result?: string
    startTime?: string
    endTime?: string
  }): Promise<{ items: AuditLog[]; total: number }> {
    const { page = 1, pageSize = 20 } = query
    const qb = this.auditRepo.createQueryBuilder('log')

    if (query.actorType) qb.andWhere('log.actorType = :actorType', { actorType: query.actorType })
    if (query.actorId) qb.andWhere('log.actorId = :actorId', { actorId: query.actorId })
    if (query.category) qb.andWhere('log.category = :category', { category: query.category })
    if (query.dataDomain) qb.andWhere('log.dataDomain = :dataDomain', { dataDomain: query.dataDomain })
    if (query.sensitivity) qb.andWhere('log.sensitivity = :sensitivity', { sensitivity: query.sensitivity })
    if (query.exportTarget) qb.andWhere('log.exportTarget = :exportTarget', { exportTarget: query.exportTarget })
    if (query.result) qb.andWhere('log.result = :result', { result: query.result })
    if (query.startTime) qb.andWhere('log.actionTime >= :start', { start: query.startTime })
    if (query.endTime) qb.andWhere('log.actionTime <= :end', { end: query.endTime })

    qb.orderBy('log.actionTime', 'DESC')
    qb.skip((page - 1) * pageSize).take(pageSize)

    const [items, total] = await qb.getManyAndCount()
    return { items, total }
  }

  /**
   * 获取 Agent 行为摘要（按 category 聚合）
   */
  async getAgentSummary(agentId: string, days = 7): Promise<Record<string, number>> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const result = await this.auditRepo
      .createQueryBuilder('log')
      .select('log.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('log.actorId = :agentId', { agentId })
      .andWhere('log.actionTime >= :start', { start: startDate })
      .groupBy('log.category')
      .getRawMany()

    const summary: Record<string, number> = {}
    for (const row of result) {
      summary[row.category] = Number(row.count)
    }
    return summary
  }
}
