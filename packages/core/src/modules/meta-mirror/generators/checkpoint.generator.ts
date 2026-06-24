/**
 * 回滚安全网 — Checkpoint 快照 + 回滚路径自动生成
 *
 * @file checkpoint.generator.ts
 * @author 唐浩然（OpenOBA AI 执行官）
 * @since 2026-06-24
 *
 * 解决我们踩过的坑：
 *   - 6/19: 50 commits 找不到安全回滚点
 *   - 回滚时 core/dist 不对齐 → 加了代码不生效
 *   - 回滚后不知道要重启什么服务
 *   - 数据库 schema 和代码版本不匹配
 */

import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import * as crypto from 'crypto'

// ── 类型 ──

/** 关键操作前的快照 */
export interface Checkpoint {
  id: string
  timestamp: string
  reason: string                       // 为什么创建 checkpoint
  versions: {
    root: string
    core: string
    frontend: string
  }
  gitStatus: {
    branch: string
    headCommit: string
    dirtyFiles: string[]
  }
  keyFiles: Array<{
    path: string
    sha256: string
  }>
  dbSchema: {
    tableCount?: number
    snapshotFile?: string
  }
}

/** 回滚路径 — 从当前状态回到 checkpoint 的安全步骤 */
export interface RollbackPath {
  fromCheckpoint: Checkpoint
  toCheckpoint: Checkpoint
  steps: Array<{
    order: number
    description: string
    command: string
    risk: 'low' | 'medium' | 'high'
    reversible: boolean
  }>
  totalSteps: number
  estimatedTimeMinutes: number
}

/** 回滚安全网报告 */
export interface RollbackSafetyReport {
  generatedAt: string
  currentCheckpoint: Checkpoint
  history: Checkpoint[]                // 最近 N 个 checkpoint
  availableRollbacks: Array<{
    checkpoint: Checkpoint
    distance: number                   // 相隔多少个 commits
    safe: boolean                      // 是否安全回滚（无 schema 冲突）
  }>
  recommendations: string[]
}

@Injectable()
export class CheckpointGenerator {
  private readonly logger = new Logger(CheckpointGenerator.name)
  private readonly checkpointDir: string

  constructor() {
    this.checkpointDir = path.join(process.cwd(), 'knowledge', 'checkpoints')
    fs.mkdirSync(this.checkpointDir, { recursive: true })
  }

  /**
   * 创建关键操作前的安全快照
   *
   * @param projectRoot 项目根目录
   * @param reason 快照原因（如 "Before 开始 Chat 持久化改造"）
   */
  createCheckpoint(projectRoot: string, reason: string): Checkpoint {
    const id = `CKP-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`

    // 版本信息
    const versions = {
      root: this.readPackageVersion(path.join(projectRoot, 'package.json')),
      core: this.readPackageVersion(path.join(projectRoot, 'packages', 'core', 'package.json')),
      frontend: this.readPackageVersion(path.join(projectRoot, 'frontend', 'package.json')),
    }

    // Git 状态
    let gitStatus = { branch: 'unknown', headCommit: 'unknown', dirtyFiles: [] as string[] }
    try {
      gitStatus.branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: projectRoot, encoding: 'utf-8' }).trim()
      gitStatus.headCommit = execSync('git rev-parse HEAD', { cwd: projectRoot, encoding: 'utf-8' }).trim()
      const dirty = execSync('git status --porcelain', { cwd: projectRoot, encoding: 'utf-8' }).trim()
      gitStatus.dirtyFiles = dirty ? dirty.split('\n').map(l => l.trim().substring(3)) : []
    } catch (e: unknown) {
      this.logger.warn(`Git 状态获取失败: ${(e as Error).message}`)
    }

    // 关键文件 SHA256
    const keyFiles = this.hashKeyFiles(projectRoot)

    // 数据库 schema 快照
    const dbSchema = this.snapshotDB(projectRoot, id)

    const checkpoint: Checkpoint = {
      id,
      timestamp: new Date().toISOString(),
      reason,
      versions,
      gitStatus,
      keyFiles,
      dbSchema,
    }

    // 持久化到文件
    const cpPath = path.join(this.checkpointDir, `${id}.json`)
    fs.writeFileSync(cpPath, JSON.stringify(checkpoint, null, 2), 'utf-8')
    this.logger.log(`🔖 Checkpoint 创建: ${id} — ${reason}`)

    // 同时更新索引文件
    this.updateIndex()

    return checkpoint
  }

  /**
   * 读取历史 checkpoints
   */
  getHistory(): Checkpoint[] {
    const files = fs.readdirSync(this.checkpointDir)
      .filter(f => f.startsWith('CKP-') && f.endsWith('.json'))
      .sort()
    return files.map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(this.checkpointDir, f), 'utf-8')) as Checkpoint
      } catch { return null }
    }).filter(Boolean) as Checkpoint[]
  }

  /**
   * 生成回滚安全网报告
   */
  generate(projectRoot: string): RollbackSafetyReport {
    // 如果没有最近的 checkpoint，自动创建一个
    const history = this.getHistory()
    const latest = history[history.length - 1]
    const current = this.createCheckpoint(projectRoot, 'Auto — 元镜像扫描')

    const availableRollbacks = history.map(cp => {
      let distance = 0
      try {
        const output = execSync(
          `git rev-list --count ${cp.gitStatus.headCommit}..HEAD`,
          { cwd: projectRoot, encoding: 'utf-8' },
        ).trim()
        distance = parseInt(output, 10) || 0
      } catch { /* git not available */ }

      // 检查 schema 兼容性
      const safe = this.checkSchemaCompatibility(cp, current)

      return { checkpoint: cp, distance, safe }
    })

    const recommendations: string[] = []

    // 找到最近的安全回滚点
    const nearestSafe = availableRollbacks.find(r => r.safe)
    if (nearestSafe) {
      recommendations.push(`✅ 最近安全回滚点: ${nearestSafe.checkpoint.id} (${nearestSafe.distance} commits 距离)`)
    } else {
      recommendations.push('⚠️ 未找到安全回滚点，建议先手动验证 schema 兼容性')
    }

    // 检查是否有未提交变更
    if (current.gitStatus.dirtyFiles.length > 0) {
      recommendations.push(`🔴 当前有 ${current.gitStatus.dirtyFiles.length} 个未提交文件，回滚前务必 commit`)
    }

    // 版本一致性
    const versions = Object.values(current.versions)
    const allSame = versions.every(v => v === versions[0])
    if (!allSame) {
      recommendations.push('🟡 当前 monorepo 版本不一致，回滚后可能需手动对齐')
    }

    return {
      generatedAt: new Date().toISOString(),
      currentCheckpoint: current,
      history,
      availableRollbacks,
      recommendations,
    }
  }

  /**
   * 生成从 checkpoint A 到 B 的回滚路径
   */
  generateRollbackPath(from: Checkpoint, to: Checkpoint, projectRoot: string): RollbackPath {
    const steps: RollbackPath['steps'] = []

    // Step 1: 确认回滚目标
    steps.push({
      order: 1,
      description: `确认回滚目标: ${to.id} (${to.reason})`,
      command: `git log --oneline ${to.gitStatus.headCommit}..HEAD`,
      risk: 'low',
      reversible: true,
    })

    // Step 2: Git 回滚
    steps.push({
      order: 2,
      description: 'Git 回滚到 checkpoint',
      command: `git reset --hard ${to.gitStatus.headCommit}`,
      risk: 'high',
      reversible: false,
    })

    // Step 3: 检查 core 是否需要重编
    const corePkg = path.join(projectRoot, 'packages', 'core', 'package.json')
    const currentCoreVer = this.readPackageVersion(corePkg)
    if (currentCoreVer !== to.versions.core) {
      steps.push({
        order: 3,
        description: 'Core 版本变化 → 重新编译 core',
        command: 'cd packages/core && npx tsc -p tsconfig.json',
        risk: 'medium',
        reversible: true,
      })
    }

    // Step 4: 重装依赖（如有 package.json 变化）
    steps.push({
      order: 4,
      description: '重新安装依赖（确保 lockfile 对齐）',
      command: 'npm install',
      risk: 'low',
      reversible: true,
    })

    // Step 5: Build 验证
    steps.push({
      order: 5,
      description: '构建验证',
      command: 'npm run build:backend',
      risk: 'low',
      reversible: true,
    })

    // Step 6: Test
    steps.push({
      order: 6,
      description: '跑测试确认回滚成功',
      command: 'npm test',
      risk: 'low',
      reversible: true,
    })

    // Step 7: 重启后端
    steps.push({
      order: 7,
      description: '杀掉旧后端进程，重新启动',
      command: '# netstat -ano | findstr :3000 → Stop-Process -Id <PID> -Force → npm run start:backend',
      risk: 'medium',
      reversible: true,
    })

    return {
      fromCheckpoint: from,
      toCheckpoint: to,
      steps,
      totalSteps: steps.length,
      estimatedTimeMinutes: Math.ceil(steps.length * 1.5),
    }
  }

  /**
   * 将回滚安全网报告写入 Markdown
   */
  writeReport(report: RollbackSafetyReport, outputDir: string): void {
    let md = '# 🔄 回滚安全网\n\n'
    md += `> 元镜自动生成 · ${report.generatedAt.split('T')[0]}\n\n`

    // 当前快照
    const c = report.currentCheckpoint
    md += '## 📌 当前 Checkpoint\n\n'
    md += `| 属性 | 值 |\n|------|----|\n`
    md += `| ID | \`${c.id}\` |\n`
    md += `| 时间 | ${c.timestamp} |\n`
    md += `| 分支 | ${c.gitStatus.branch} |\n`
    md += `| HEAD | \`${c.gitStatus.headCommit.substring(0, 12)}\` |\n`
    md += `| 版本 (root) | ${c.versions.root} |\n`
    md += `| 版本 (core) | ${c.versions.core} |\n`
    md += `| 版本 (frontend) | ${c.versions.frontend} |\n`
    if (c.gitStatus.dirtyFiles.length > 0) {
      md += `| ⚠️ 未提交文件 | ${c.gitStatus.dirtyFiles.length} 个 |\n`
    }
    md += '\n'

    // 历史回滚点
    md += '## 📊 回滚点列表\n\n'
    md += '| Checkpoint | 时间 | 原因 | Commits距离 | 安全？ |\n'
    md += '|------------|------|------|-----------|-------|\n'
    for (const r of report.availableRollbacks.slice(-10)) {
      const safe = r.safe ? '✅' : '⚠️'
      md += `| \`${r.checkpoint.id}\` | ${r.checkpoint.timestamp.substring(0, 19)} | ${r.checkpoint.reason} | ${r.distance} | ${safe} |\n`
    }
    md += '\n'

    // 建议
    md += '## 💡 回滚建议\n\n'
    for (const r of report.recommendations) {
      md += `- ${r}\n`
    }
    md += '\n'

    // 回滚路径示例
    if (report.availableRollbacks.length > 0 && report.availableRollbacks[0].distance > 0) {
      const target = report.availableRollbacks[0].checkpoint
      md += '## 🗺️ 回滚路径示例\n\n'
      md += `从当前 → \`${target.id}\`:\n\n`
      md += '```\n'
      md += `git reset --hard ${target.gitStatus.headCommit.substring(0, 12)}\n`
      md += `cd packages/core && npx tsc -p tsconfig.json\n`
      md += `npm run build:backend\n`
      md += `npm test\n`
      md += '```\n\n'
    }

    fs.writeFileSync(path.join(outputDir, 'rollback-safety-net.md'), md, 'utf-8')
    this.logger.log(`CheckpointGenerator: 回滚安全网写入 rollback-safety-net.md`)
  }

  // ── Private helpers ──

  private readPackageVersion(pkgPath: string): string {
    try {
      return JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).version || '?'
    } catch {
      return '?'
    }
  }

  private hashKeyFiles(projectRoot: string): Checkpoint['keyFiles'] {
    const keyPatterns = [
      'package.json',
      'packages/core/package.json',
      'frontend/package.json',
      'tsconfig.json',
      '.eslintrc.js',
    ]
    const results: Checkpoint['keyFiles'] = []
    for (const rel of keyPatterns) {
      const full = path.join(projectRoot, rel)
      if (fs.existsSync(full)) {
        const content = fs.readFileSync(full, 'utf-8')
        results.push({ path: rel, sha256: crypto.createHash('sha256').update(content).digest('hex').substring(0, 16) })
      }
    }
    return results
  }

  private snapshotDB(projectRoot: string, checkpointId: string): Checkpoint['dbSchema'] {
    // 对 SQLite 文件或 init-structure.sql 做快照
    const schemaFiles = [
      path.join(projectRoot, 'packages', 'backend', 'init-structure.sql'),
      path.join(projectRoot, 'packages', 'backend', 'data', 'openoba.sqlite'),
    ]
    for (const f of schemaFiles) {
      if (fs.existsSync(f)) {
        const snapshotDir = path.join(this.checkpointDir, 'schemas')
        fs.mkdirSync(snapshotDir, { recursive: true })
        const dest = path.join(snapshotDir, `${checkpointId}-${path.basename(f)}`)
        fs.copyFileSync(f, dest)
        return { snapshotFile: dest }
      }
    }
    return {}
  }

  private checkSchemaCompatibility(from: Checkpoint, to: Checkpoint): boolean {
    // 简化：如果两个 checkpoint 都有 schema snapshot 且 hash 相同，则安全
    if (!from.dbSchema.snapshotFile || !to.dbSchema.snapshotFile) return true  // 无法判断 → 假设安全
    try {
      const fromHash = crypto.createHash('sha256').update(
        fs.readFileSync(from.dbSchema.snapshotFile)
      ).digest('hex')
      const toHash = crypto.createHash('sha256').update(
        fs.readFileSync(to.dbSchema.snapshotFile)
      ).digest('hex')
      return fromHash === toHash
    } catch {
      return true
    }
  }

  /** 更新索引文件 (JSON) */
  private updateIndex(): void {
    const history = this.getHistory()
    const index = history.map(c => ({
      id: c.id,
      timestamp: c.timestamp,
      reason: c.reason,
      version: c.versions.root,
      headCommit: c.gitStatus.headCommit.substring(0, 12),
      dirtyFiles: c.gitStatus.dirtyFiles.length,
    }))
    fs.writeFileSync(
      path.join(this.checkpointDir, '_index.json'),
      JSON.stringify(index, null, 2),
      'utf-8',
    )
  }
}
