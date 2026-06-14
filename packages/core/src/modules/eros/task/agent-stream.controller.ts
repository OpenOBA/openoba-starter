/**
 * ER-OS SSE Stream Controller — 流式推送 Agent 执行过程
 * 
 * 前端通过 EventSource 连接，后端边收 token 边推送。
 */

import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common'
import { Response } from 'express'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { AgentTaskService } from './agent-task.service'
import { AgentExecutorService } from './agent-executor.service'
import { SSESafeWriter } from '../stream/sse-safe-writer'

@Controller('eros/tasks')
@UseGuards(JwtAuthGuard)
export class AgentStreamController {
  constructor(
    private readonly taskService: AgentTaskService,
    private readonly executor: AgentExecutorService,
  ) {}

  @Get(':id/stream')
  async stream(@Param('id') id: string, @Res() res: Response) {
    // 🔑 使用 SSE 安全写入器
    const sse = new SSESafeWriter({
      res,
      label: `task-stream-${id.slice(-6)}`,
      trace: process.env.APP_ENV === 'development',
      heartbeatMs: 25000,
    })
    sse.setup()

    try {
      const task = await (this.taskService as any).findOne(id)
      if (!task) { sse.error({ message: '任务不存在' }); return }

      // 仅 drafted 状态允许流式（Agent 首次分析）
      if (task.status !== 'drafted') {
        // 任务已完成 → 直接返回 done
        sse.write({ type: 'done', taskNo: task.taskNo, taskId: task.id })
        sse.done()
        return
      }

      const result = await this.executor.streamExecute(id, (e) => {
        if (e.type === 'content') {
          sse.write({ type: 'token', delta: e.delta })
        } else {
          sse.write({ type: 'event', data: JSON.stringify(e) })
        }
      })

      // Agent 完成后 → submitReport
      if (result?.content) {
        const metaFooter = this.executor.buildReportFooter()
        await this.taskService.submitReport(
          { taskId: id, content: result.content + metaFooter },
          'agent',
        )
      }

      const updatedTask = await (this.taskService as any).findOne(id)
      sse.write({ type: 'done', taskNo: updatedTask?.taskNo, taskId: id })
      sse.done()
    } catch (e: any) {
      sse.error({ message: e?.message || '流式输出失败' })
    }
  }
}
