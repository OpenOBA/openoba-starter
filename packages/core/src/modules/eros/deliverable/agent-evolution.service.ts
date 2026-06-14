import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'

@Injectable()
export class AgentEvolutionService {
  private readonly logger = new Logger(AgentEvolutionService.name)

  /**
   * 为新 Agent 初始化 evolution.md
   */
  async initEvolution(agentName: string, workspaceRoot: string): Promise<string> {
    const agentsDir = path.join(workspaceRoot, 'workspace', 'agents', agentName)
    const evolutionPath = path.join(agentsDir, 'evolution.md')

    if (!fs.existsSync(agentsDir)) {
      fs.mkdirSync(agentsDir, { recursive: true })
    }

    if (fs.existsSync(evolutionPath)) {
      this.logger.log(`[Evolution] ${agentName} 的 evolution.md 已存在，跳过`)
      return evolutionPath
    }

    const content = `# Agent 进化记录：${agentName}

> 记录此 Agent 的能力迭代、模型升级、技能新增和重要决策。
> 由 ERA 系统自动维护，Agent 执行任务后可追加。

---

## ${new Date().toISOString().slice(0, 10)} — 初始化

- Agent 注册并激活
- 工作空间：${workspaceRoot}
- 状态：首次运行

---
`
    fs.writeFileSync(evolutionPath, content, 'utf-8')
    this.logger.log(`[Evolution] ${agentName} 的 evolution.md 已创建`)
    return evolutionPath
  }

  /**
   * 追加进化记录
   */
  async appendEvolution(
    agentName: string,
    workspaceRoot: string,
    entry: { date?: string; changes: string[] },
  ): Promise<void> {
    const evolutionPath = path.join(workspaceRoot, 'workspace', 'agents', agentName, 'evolution.md')
    if (!fs.existsSync(evolutionPath)) {
      await this.initEvolution(agentName, workspaceRoot)
    }

    const date = entry.date || new Date().toISOString().slice(0, 10)
    const lines = [
      '',
      `## ${date}${entry.changes.length === 0 ? '' : ''}`,
      ...entry.changes.map(c => `- ${c}`),
      '',
    ]

    fs.appendFileSync(evolutionPath, lines.join('\n'), 'utf-8')
    this.logger.log(`[Evolution] ${agentName} 进化记录已更新`)
  }
}
