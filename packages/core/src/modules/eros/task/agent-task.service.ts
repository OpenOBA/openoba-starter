/* eslint-disable @typescript-eslint/no-explicit-any -- CORE 泛型/第三方库约束 */
/**
 * ER-OS Agent Task Engine — 任务工作流引擎 Service
 *
 * @file AgentTaskService
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-04
 * @license BSL-1.1
 *
 * @description
 * ER-OS 核心服务，实现：
 * 1. 9 状态任务状态机（drafted→proposed→...→completed）
 * 2. Task Report 格式化 + Human Approval 解析
 * 3. 汇报链（L0/L1/L2）+ 超时升级
 * 4. 异常自处理链（auto_retry → escalate_to_human → escalation_timeout → escalate_to_L0）
 * 5. 所有事件写入 cognitive_log
 */

import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThan } from 'typeorm'
import { Cron } from '@nestjs/schedule'
import * as crypto from 'crypto'
import { AgentTask, AgentTaskStatus, ReportFrequency } from './agent-task.entity'
import { ReportTarget } from './report-target.entity'
import { AgentRegistry } from './agent-registry.entity'
import { CognitiveLog } from './cognitive-log.entity'
import type {
  CreateAgentTaskDto,
  UpdateAgentTaskDto,
  QueryAgentTaskDto,
  TaskReportDto,
  ApprovalDto,
  DeliverDto,
  EscalateDto,
} from './dto/agent-task.dto'
import { AgentExecutorService } from './agent-executor.service'
import { STATE_TRANSITIONS, validateTransition, parseApprovalComment } from './task-state-machine'
import type { ParsedApproval } from './task-state-machine'

function uid(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

function taskNo(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  // M09修复：使用 crypto.randomInt 替代 Math.random
  const seq = String(crypto.randomInt(1, 1000)).padStart(3, '0')
  return `TASK-${y}${m}${d}-${seq}`
}

function nowMs(): number {
  return Date.now()
}

@Injectable()
export class AgentTaskService {
  private readonly logger = new Logger(AgentTaskService.name)

  constructor(
    @InjectRepository(AgentTask)
    private taskRepo: Repository<AgentTask>,
    @InjectRepository(ReportTarget)
    private reportTargetRepo: Repository<ReportTarget>,
    @InjectRepository(AgentRegistry)
    private agentRegistryRepo: Repository<AgentRegistry>,
    @InjectRepository(CognitiveLog)
    private logRepo: Repository<CognitiveLog>,
    @Inject(forwardRef(() => AgentExecutorService))
    private agentExecutor: AgentExecutorService,
  ) {}

  // ═══════════════════════════════════════════
  // 任务 CRUD
  // ═══════════════════════════════════════════

  /** 创建任务 */
  async create(dto: CreateAgentTaskDto, createdBy = 'system'): Promise<AgentTask> {
    try {
    // 验证汇报对象存在
    const target = await this.reportTargetRepo.findOneBy({ id: dto.reportTo })
    if (!target) throw new BadRequestException('汇报对象不存在')

    // 构建结构化上下文
    const context: Record<string, unknown> = {
      ...(dto.context || {}),
    }
    if (dto.subject) context['任务主体'] = dto.subject
    if (dto.requirements) context['内容要求'] = dto.requirements

    const task = this.taskRepo.create({
      id: uid(),
      taskNo: taskNo(),
      title: dto.title,
      type: dto.type,
      createdBy: dto.createdBy || createdBy,
      reportTo: dto.reportTo,
      escalateTo: dto.escalateTo || target.parentId || undefined,
      escalationHours: dto.escalationHours ?? 48,
      reportFrequency: (dto.reportFrequency as ReportFrequency) || 'every_step' as ReportFrequency,
      context,
      agentId: dto.agentId || undefined,
      totalPhases: dto.totalPhases || 0,
      status: 'drafted',
    })

    const saved = await this.taskRepo.save(task)

    await this.writeLog('system', saved.id, '任务已创建', {
      action: 'created',
      taskNo: saved.taskNo,
      title: saved.title,
      reportTo: saved.reportTo,
    })

    // 异步激活 Agent 分析（不阻塞创建响应）
    // skipAnalyze=true → Chat 模式走 SSE 路径，不触发后台分析
    if (!dto.skipAnalyze) {
      this.logger.log(`Dispatching Agent analyze for task ${saved.taskNo}`)
      setImmediate(() => {
        this.agentExecutor.analyzeAndReport(saved.id).then((r) => {
          if (r) this.logger.log(`Agent analyze complete for ${saved.taskNo}`)
        }).catch((e) => {
          this.logger.error(`Agent analyze error for ${saved.id}: ${(e as Error).message}`)
        })
      })
    }

    return saved
    } catch (error) {
      throw new BadRequestException(`创建任务失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /** 查询任务列表 */
  async query(q: QueryAgentTaskDto): Promise<{ items: AgentTask[]; total: number }> {
    const qb = this.taskRepo.createQueryBuilder('t')
    if (q.status) qb.andWhere('t.status = :status', { status: q.status })
    if (q.type) qb.andWhere('t.type = :type', { type: q.type })
    if (q.reportTo) qb.andWhere('t.reportTo = :reportTo', { reportTo: q.reportTo })
    if (q.agentId) qb.andWhere('t.agentId = :agentId', { agentId: q.agentId })
    if (q.search) {
      qb.andWhere('(t.taskNo LIKE :search OR t.title LIKE :search)', { search: `%${q.search}%` })
    }

    const page = q.page || 1
    const pageSize = q.pageSize || 20
    qb.orderBy('t.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize)

    const [items, total] = await qb.getManyAndCount()
    return { items, total }
  }

  /** 获取任务详情 */
  async findOne(id: string): Promise<AgentTask> {
    const task = await this.taskRepo.findOneBy({ id })
    if (!task) throw new NotFoundException('任务不存在')
    return task
  }

  /** 更新任务（仅 drafted 状态可编辑基本信息） */
  async update(id: string, dto: UpdateAgentTaskDto): Promise<AgentTask> {
    const task = await this.findOne(id)
    if (task.status !== 'drafted') {
      throw new BadRequestException('仅 drafted 状态可编辑任务')
    }
    if (dto.title !== undefined) task.title = dto.title
    if (dto.reportTo !== undefined) task.reportTo = dto.reportTo
    if (dto.reportFrequency !== undefined) task.reportFrequency = dto.reportFrequency as ReportFrequency
    if (dto.context !== undefined) task.context = dto.context
    return this.taskRepo.save(task)
  }

  // ═══════════════════════════════════════════
  // Task Report — Agent 向人类汇报
  // ═══════════════════════════════════════════

  /**
   * Agent 出方案 → 汇报给审批人
   * 状态 drafted → proposed
   */
  async submitReport(dto: TaskReportDto, agentId?: string): Promise<{ task: AgentTask; report: string }> {
    const task = await this.findOne(dto.taskId)

    // 状态校验
    if (!['drafted', 'revised', 'proposed'].includes(task.status)) {
      throw new BadRequestException(`当前状态 ${task.status} 不允许提交汇报`)
    }

    // 记录版本
    const proposals = (task.proposals || []) as Array<{ version: number; content: string; timestamp: string; status: string }>
    const version = proposals.length + 1
    proposals.push({
      version,
      content: dto.content,
      timestamp: new Date().toISOString(),
      status: 'submitted',
    })

    const previousStatus = task.status
    task.status = 'proposed'
    task.proposals = proposals
    if (agentId) task.agentId = agentId

    const saved = await this.taskRepo.save(task)

    // 生成格式化汇报消息
    const reportText = this.formatTaskReport(saved, dto)

    // 日志
    await this.writeLog(agentId || 'agent', saved.id, `Task Report #${version}`, {
      action: 'task_report',
      version,
      content: dto.content,
      previousStatus,
      newStatus: 'proposed',
    })

    return { task: saved, report: reportText }
  }

  // ═══════════════════════════════════════════
  // Human Approval — 人类审批
  // ═══════════════════════════════════════════

  /**
   * 审批人处理任务汇报
   *
   * approved  → proposed → executing
   * rejected  → proposed → revised
   */
  async approve(dto: ApprovalDto, actorName?: string): Promise<AgentTask> {
    const task = await this.findOne(dto.taskId)

    validateTransition(task.status, 'executing')  // 强制状态转换校验

    const parsed = parseApprovalComment(dto.comment || dto.action)
    const finalAction = dto.action === 'approved' ? dto.action : parsed.action

    switch (finalAction) {
      case 'approved': {
        // 通过：进入执行阶段
        task.status = 'executing'
        task.currentPhase = 1
        if (!task.totalPhases) task.totalPhases = 1

        await this.taskRepo.save(task)

        await this.writeLog(actorName || 'human', task.id, '任务已批准，开始执行', {
          action: 'approved',
          comment: dto.comment,
          newStatus: 'executing',
        })

        // 异步触发 Agent 自动执行（不阻塞审批响应）
        setImmediate(() => {
          this.agentExecutor.executeTask(task.id).catch((e) => {
            this.logger.error(`Agent auto-execute error for ${task.id}:`, e)
          })
        })

        return task
      }

      case 'rejected': {
        // 驳回：不改任务状态，给最新提案追加反馈，触发 Agent 返工
        // 任务保持在 proposed，但最新 proposal 标记为 rejected
        const proposals = (task.proposals || []) as Array<{
          version: number
          content: string
          timestamp: string
          status: string
          feedback?: {
            reason: string
            suggestions?: string
            rejectedAt: string
            rejectedBy: string
          }
        }>

        if (proposals.length > 0) {
          const latest = proposals[proposals.length - 1]
          latest.status = 'rejected'
          latest.feedback = {
            reason: dto.rejectReason || dto.comment || '未说明原因',
            suggestions: dto.suggestions,
            rejectedAt: new Date().toISOString(),
            rejectedBy: actorName || 'human',
          }
        }

        // 将补充的上下文合并到任务 context
        if (dto.additionalContext) {
          const ctx = (task.context || {}) as Record<string, unknown>
          const roundKey = `第${proposals.length}轮补充`
          ctx[roundKey] = dto.additionalContext
          task.context = ctx
        }

        task.proposals = proposals

        await this.taskRepo.save(task)

        await this.writeLog(actorName || 'human', task.id, '方案被驳回，Agent 返工修改', {
          action: 'rejected',
          comment: dto.comment,
          rejectReason: dto.rejectReason,
          suggestions: dto.suggestions,
          round: proposals.length,
        })

        // 异步触发 Agent 返工（重新分析+汇报）
        setImmediate(() => {
          this.agentExecutor.analyzeAndReport(task.id).catch((e) => {
            this.logger.error(`Agent rework error for ${task.id}:`, e)
          })
        })

        return task
      }

      case 'partial': {
        // 部分通过
        task.status = 'executing'

        await this.taskRepo.save(task)

        await this.writeLog(actorName || 'human', task.id, '任务获批（含修改意见）', {
          action: 'approved',
          comment: dto.comment,
          modifications: parsed.modifications,
          newStatus: 'executing',
        })

        return task
      }

      default:
        throw new BadRequestException(`不支持的审批动作: ${dto.action}`)
    }
  }

  // ═══════════════════════════════════════════
  // 任务交付 / 发布 / 完成
  // ═══════════════════════════════════════════

  /** Agent 交付任务 */
  async deliver(dto: DeliverDto, agentId?: string): Promise<AgentTask> {
    const task = await this.findOne(dto.taskId)
    if (task.status !== 'executing') {
      throw new BadRequestException(`当前状态 ${task.status} 不允许交付`)
    }

    task.status = 'delivered'
    if (dto.deliverables) {
      const existing = (task.deliverables || []) as Array<{ type: string; url: string; status: string }>
      task.deliverables = [...existing, ...dto.deliverables]
    }

    const saved = await this.taskRepo.save(task)

    await this.writeLog(agentId || 'agent', saved.id, '任务已交付', {
      action: 'delivered',
      deliverables: dto.deliverables,
    })

    return saved
  }

  /** 人工发布完成 */
  async publish(id: string, actorName?: string): Promise<AgentTask> {
    const task = await this.findOne(id)
    if (task.status !== 'delivered') {
      throw new BadRequestException(`当前状态 ${task.status} 不允许发布`)
    }

    task.status = 'published'
    const saved = await this.taskRepo.save(task)

    await this.writeLog(actorName || 'human', saved.id, '任务已发布', { action: 'published' })
    return saved
  }

  /** 验收完成 */
  async complete(id: string, actorName?: string): Promise<AgentTask> {
    const task = await this.findOne(id)
    if (task.status !== 'published') {
      throw new BadRequestException(`当前状态 ${task.status} 不允许完成`)
    }

    task.status = 'completed'
    const saved = await this.taskRepo.save(task)

    await this.writeLog(actorName || 'human', saved.id, '任务已完成', { action: 'completed' })
    return saved
  }

  // ═══════════════════════════════════════════
  // 异常处理
  // ═══════════════════════════════════════════

  /** 取消任务（任务记录保留，日志完整） */
  async cancel(id: string, actorName?: string): Promise<AgentTask> {
    const task = await this.findOne(id)
    if (['completed', 'cancelled', 'aborted'].includes(task.status)) {
      throw new BadRequestException('已完成/已取消/已中止的任务不能再次取消')
    }

    task.status = 'cancelled'
    const saved = await this.taskRepo.save(task)

    await this.writeLog(actorName || 'human', saved.id, '任务已取消', { action: 'cancelled' })
    return saved
  }

  /** 中止任务（异常/超时中断，记录保留） */
  async abort(id: string, actorName?: string): Promise<AgentTask> {
    const task = await this.findOne(id)
    if (['completed', 'cancelled', 'aborted'].includes(task.status)) {
      throw new BadRequestException('已完成/已取消/已中止的任务不能再次中止')
    }

    task.status = 'aborted' as AgentTaskStatus
    const saved = await this.taskRepo.save(task)

    await this.writeLog(actorName || 'system', saved.id, '任务已中止', { action: 'aborted' })
    return saved
  }

  /** 删除任务（任何状态均可删除，用户自行判断有效性；同步清理 cognitive_log） */
  async delete(id: string, actorName?: string): Promise<{ deleted: boolean }> {
    const task = await this.findOne(id)  // 确保任务存在

    // 删除关联的 cognitive_log
    await this.logRepo.delete({ sourceId: id, sourceModule: 'agent_task' })

    // 删除任务本身
    await this.taskRepo.delete(id)

    this.logger.log(`任务 ${id} 已删除（含日志清理）`)
    return { deleted: true }
  }

  /**
   * Agent 执行异常时调用
   * 自动重试 → 升级到人 → 超时升级到 L0
   */
  async handleError(id: string, errorInfo: string, agentId?: string): Promise<AgentTask> {
    const task = await this.findOne(id)
    if (task.status !== 'executing') {
      throw new BadRequestException(`当前状态 ${task.status} 不能触发错误处理`)
    }

    // 原子递增重试计数（P1修复：防止并发覆盖）
    await this.taskRepo.increment({ id: task.id }, 'retryCount', 1)
    task.retryCount += 1  // 同步本地引用

    if (task.retryCount < task.maxRetries) {
      // 自动重试
      await this.taskRepo.save(task)
      await this.writeLog(agentId || 'agent', task.id, `自动重试 ${task.retryCount}/${task.maxRetries}`, {
        action: 'auto_retry',
        retryCount: task.retryCount,
        error: errorInfo,
      })
      return task
    }

    // 重试次数耗尽 → 升级
    task.status = 'escalated'
    task.retryCount = 0
    const saved = await this.taskRepo.save(task)

    await this.writeLog(agentId || 'agent', saved.id, '重试次数耗尽，任务已升级', {
      action: 'escalated',
      error: errorInfo,
      escalateTo: saved.escalateTo,
    })

    return saved
  }

  /** 手动升级或降级 */
  async escalate(dto: EscalateDto, actorName?: string): Promise<AgentTask> {
    const task = await this.findOne(dto.taskId)

    validateTransition(task.status, 'escalated')  // P1-7: 强制状态校验

    task.status = 'escalated'
    if (dto.escalateTo) task.escalateTo = dto.escalateTo

    const saved = await this.taskRepo.save(task)

    await this.writeLog(actorName || 'system', saved.id, '任务已升级', {
      action: 'escalated',
      reason: dto.reason,
      escalateTo: saved.escalateTo,
    })

    return saved
  }

  /** 从升级状态恢复到执行 */
  async resumeFromEscalated(id: string, actorName?: string): Promise<AgentTask> {
    const task = await this.findOne(id)
    if (task.status !== 'escalated') {
      throw new BadRequestException('仅 escalated 状态可恢复执行')
    }

    task.status = 'executing'
    const saved = await this.taskRepo.save(task)

    await this.writeLog(actorName || 'human', saved.id, '从升级状态恢复执行', { action: 'resume' })
    return saved
  }

  // ═══════════════════════════════════════════
  // 超时检查
  // ═══════════════════════════════════════════

  /** 检查超时未审批的任务并自动升级 */
  async checkEscalationDeadlines(): Promise<number> {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const overdue = await this.taskRepo.find({
      where: {
        status: 'proposed',
        updatedAt: LessThan(cutoff),
      },
    })

    for (const task of overdue) {
      task.status = 'escalated'
      // 沿汇报链升级
      if (task.escalateTo) {
        const parent = await this.reportTargetRepo.findOneBy({ id: task.escalateTo })
        if (parent?.parentId) {
          task.reportTo = task.escalateTo
          task.escalateTo = parent.parentId
        }
      }
      await this.taskRepo.save(task)

      await this.writeLog('system', task.id, '超时未审批，自动升级', {
        action: 'escalation_timeout',
        escalatedTo: task.escalateTo,
      })
    }

    return overdue.length
  }

  // ═══════════════════════════════════════════
  // 查询辅助
  // ═══════════════════════════════════════════

  /** 获取任务的完整日志 */
  async getLogs(taskId: string): Promise<CognitiveLog[]> {
    return this.logRepo.find({
      where: { sourceId: taskId, sourceModule: 'agent_task' },
      order: { createdAt: 'ASC' },
    })
  }

  /** 获取某审批人的待处理任务 */
  async getPendingApprovals(reportTo: string): Promise<AgentTask[]> {
    return this.taskRepo.find({
      where: { reportTo, status: 'proposed' },
      order: { createdAt: 'DESC' },
    })
  }

  /** 获取统计 */
  async getStats(reportTo?: string): Promise<Record<string, number>> {
    const where: any = {}
    if (reportTo) where.reportTo = reportTo

    const [proposed, executing, completed, escalated] = await Promise.all([
      this.taskRepo.countBy({ ...where, status: 'proposed' }),
      this.taskRepo.countBy({ ...where, status: 'executing' }),
      this.taskRepo.countBy({ ...where, status: 'completed' }),
      this.taskRepo.countBy({ ...where, status: 'escalated' }),
    ])

    return { proposed, executing, completed, escalated }
  }

  // ═══════════════════════════════════════════
  // 汇报消息格式化
  // ═══════════════════════════════════════════

  /** 生成格式化的 Task Report 消息 */
  private formatTaskReport(task: AgentTask, dto: TaskReportDto): string {
    const proposals = (task.proposals || []) as Array<{ version: number; content: string; timestamp: string; status: string }>
    const version = proposals.length

    const lines = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━',
      `📋 Task Report #${version}`,
      '━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `任务编号：${task.taskNo}`,
      `任务名称：${task.title}`,
      `当前阶段：阶段 ${task.currentPhase || 1}`,
      `汇报对象：${task.reportTo}`,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '📊 工作摘要',
      dto.content,
      '',
    ]

    if (dto.attachments && dto.attachments.length > 0) {
      lines.push('📎 附件')
      dto.attachments.forEach((a) => lines.push(`  · ${a.name} — ${a.url}`))
      lines.push('')
    }

    if (dto.decisions && dto.decisions.length > 0) {
      lines.push('⚠️ 需决策')
      dto.decisions.forEach((d) => lines.push(`  ☐ ${d}`))
      lines.push('')
    }

    lines.push(
      '━━━━━━━━━━━━━━━━━━━━━━━━━',
      '⏳ Awaiting Human Approval | 回复"通过"/"驳回"+修改意见',
      '━━━━━━━━━━━━━━━━━━━━━━━━━',
    )

    return lines.join('\n')
  }

  // ═══════════════════════════════════════════
  // 认知日志写入
  // ═══════════════════════════════════════════

  private async writeLog(
    actor: string,
    taskId: string,
    title: string,
    content: Record<string, unknown>,
  ): Promise<void> {
    const log = this.logRepo.create({
      id: uid(),
      logType: (content.action as string)?.includes('rule') ? 'rule_proposal' : 'task_report',
      sourceModule: 'agent_task',
      sourceId: taskId,
      level: content.action === 'escalated' ? 'warn' : 'info',
      title,
      content,
      actor,
      actorType: actor === 'system' ? 'system' : actor === 'human' ? 'human' : 'agent',
      agentId: actor !== 'human' ? actor : undefined,
      createdAt: nowMs(),
    })
    await this.logRepo.save(log)
  }

  /**
   * 定时检测执行超时任务并自动恢复
   * 每 5 分钟扫描一次，将超过 15 分钟无响应的 executing 任务标记为 escalated
   */
  @Cron('*/5 * * * *')
  async recoverStaleExecutingTasks() {
    const STALE_THRESHOLD_MS = 15 * 60 * 1000
    const staleTime = new Date(Date.now() - STALE_THRESHOLD_MS)

    try {
      const staleTasks = await this.taskRepo.find({
        where: { status: 'executing' as AgentTaskStatus, updatedAt: LessThan(staleTime) as any },
      })

      for (const task of staleTasks) {
        this.logger.warn(`Recovering stale task: ${task.taskNo} (idle since ${task.updatedAt})`)
        task.status = 'escalated' as AgentTaskStatus
        await this.taskRepo.save(task)
        await this.writeLog('system', task.id, '任务执行超时，自动升级', {
          action: 'auto_escalate',
          previousStatus: 'executing',
          newStatus: 'escalated',
          idleSince: task.updatedAt,
        })
      }

      if (staleTasks.length > 0) {
        this.logger.log(`Auto-recovered ${staleTasks.length} stale executing tasks`)
      }
    } catch (e: unknown) {
      this.logger.error(`Stale task recovery failed: ${(e as Error).message}`)
    }
  }
}
