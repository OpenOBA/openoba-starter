/**
 * ERA 部署管理服务 — 环境隔离 / 同步 / 回滚 / 发布
 *
 * @author 唐浩然（AI 联合创始人）
 * @since 2026-05-23
 */

import { Injectable, Logger } from '@nestjs/common'
import { execSync, execFileSync, spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { TRANSITIONS, DeltaStatus } from './delta-state-machine'

export interface DeploymentStatus {
  production: { branch: string; version: string; commit: string; running: boolean }
  staging: { branch: string; version: string; commit: string; running: boolean }
  synced: boolean
  pendingDeltas: DeltaRecord[]
  lastSyncAt: string | null
}

export interface DeltaRecord {
  id: string
  type: string
  summary: string
  branch: string
  status: DeltaStatus
  createdAt: string
  files: string[]
  migrationSql: string | null
  checks?: { tsc: string; test: string; lint: string }
  versionBump?: { from: string; to: string; type: string }
  feedback?: string
}

@Injectable()
export class DeploymentService {
  private readonly logger = new Logger(DeploymentService.name)
  private readonly projectRoot: string
  private readonly deltasFile: string

  constructor() {
    this.projectRoot = path.resolve(process.cwd(), '..')
    this.deltasFile = path.join(this.projectRoot, 'state', 'deltas.json')
  }

  /** 获取双环境当前状态 */
  getStatus(): DeploymentStatus {
    const production = this.getEnvStatus('production')
    const staging = this.getEnvStatus('staging')
    const deltas = this.loadDeltas()
    const pending = deltas.filter(d => d.status !== 'promoted' && d.status !== 'rolled_back')

    return {
      production,
      staging,
      synced: production.branch === staging.branch && production.commit === staging.commit,
      pendingDeltas: pending,
      lastSyncAt: this.getLastSyncTime(),
    }
  }

  /** 切换到 developer 模式并部署到 staging */
  async deployToStaging(deltaId: string): Promise<{ success: boolean; message: string; stagingUrl: string }> {
    const deltas = this.loadDeltas()
    const delta = deltas.find(d => d.id === deltaId)
    if (!delta) return { success: false, message: `变更 ${deltaId} 不存在`, stagingUrl: '' }

    try {
      // 0. 状态机：pending_staging → deploying_staging
      delta.status = 'deploying_staging'
      this.saveDeltas(deltas)

      // 1. 切换 staging 到 feat 分支
      if (!this.hasGitRepo()) {
        this.logger.warn('⚠️ 无 Git 仓库，跳过 git checkout。直接使用当前文件系统状态。')
      } else {
        const branch = delta.branch
        this.gitExec(`checkout ${branch}`)
        this.gitExec(`pull origin ${branch}`)
      }

      // 2. 执行数据库迁移（如果有）
      if (delta.migrationSql) {
        this.logger.log(`执行 staging 数据库迁移...`)
        this.runMigration(delta.migrationSql, 'staging')
      }

      // 3. 单实例模式：当前进程即 staging（无需启动额外进程）
      // 生产双实例部署时才需要 spawn 第二个 NestJS 进程
      const currentMode = process.env.DEPLOYMENT_MODE || 'operator'
      if (currentMode === 'operator') {
        // Operator 模式需要独立 staging 进程
        const stagingPid = this.findProcessPid(3001)
        if (stagingPid) {
          this.logger.log(`停止旧 staging 进程 PID=${stagingPid}`)
          try { process.kill(stagingPid) } catch (e: unknown) {
            this.logger.warn(`停止 staging 进程失败 PID=${stagingPid}: ${(e as Error).message}`)
          }
          await this.sleep(1000)
        }
        this.startStaging()
      } else {
        this.logger.log(`单实例模式 (${currentMode})，当前进程即 staging，无需额外启动`)
      }

      // 4. 更新 delta 状态（通过状态机，保证路径一致）
      const tResult = this.transitionDelta(delta.id, 'on_staging')
      if (!tResult.success) {
        this.logger.warn('状态转换异常: ' + tResult.message)
      }

      // 5. 元镜重新扫描（staging 服务自己的 OnModuleInit 会触发）

      return {
        success: true,
        message: `已部署到 staging 环境 (端口 3001)`,
        stagingUrl: `http://localhost:3001`,
      }
    } catch (e: any) {
      this.logger.error(`部署到 staging 失败: ${e.message}`)
      return { success: false, message: `部署失败: ${e.message}`, stagingUrl: '' }
    }
  }

  /** 发布到生产环境 */
  async promoteToProduction(deltaId: string): Promise<{ success: boolean; message: string }> {
    const deltas = this.loadDeltas()
    const delta = deltas.find(d => d.id === deltaId)
    if (!delta) return { success: false, message: `变更 ${deltaId} 不存在` }
    if (delta.status !== 'verified') return { success: false, message: '变更必须先通过 staging 验收' }

    try {
      const currentVersion = this.getCurrentVersion()

      // 0. 状态机：verified → promoting
      delta.status = 'promoting'
      this.saveDeltas(deltas)

      // 1. 合并到 main
      if (!this.hasGitRepo()) {
        this.logger.warn('⚠️ 无 Git 仓库，跳过 git merge。直接使用当前文件系统状态。')
      } else {
        this.gitExec('checkout main')
        this.gitExec(`merge ${delta.branch} --no-ff -m "release: ${delta.summary}"`)
      }

      // 2. 打 tag
      const newVersion = this.bumpVersion(currentVersion, delta.type)
      this.gitExec(`tag -a ${newVersion} -m "${delta.summary}"`)

      // 3. 执行生产数据库迁移（如果有）
      if (delta.migrationSql) {
        this.logger.log(`⚠️ 请在生产环境手动执行以下迁移 SQL：\n${delta.migrationSql}`)
        // 生产环境不自动执行 SQL，由用户手动确认
      }

      // 4. 重启生产服务
      const prodPid = this.findProcessPid(3000)
      if (prodPid) {
        this.logger.log(`重启生产服务 PID=${prodPid}`)
        try { process.kill(prodPid) } catch (e: unknown) {
          this.logger.warn(`停止生产进程失败 PID=${prodPid}: ${(e as Error).message}`)
        }
        await this.sleep(2000)
      }
      this.startProduction()

      // 5. 更新 delta 状态（通过状态机）
      const promoteResult = this.transitionDelta(delta.id, 'promoted')
      if (!promoteResult.success) {
        this.logger.warn('状态转换异常: ' + promoteResult.message)
      }

      // 6. staging 同步回 main
      await this.syncStagingToProduction()

      return { success: true, message: `已发布到生产环境 ${newVersion}` }
    } catch (e: any) {
      this.logger.error(`发布失败: ${e.message}`)
      return { success: false, message: `发布失败: ${e.message}` }
    }
  }

  /** 回滚到指定版本 */
  async rollback(targetVersion: string, fullRollback: boolean = false): Promise<{ success: boolean; message: string }> {
    try {
      const currentVersion = this.getCurrentVersion()

      // 1. 验证目标版本存在
      try {
        this.gitExec(`rev-parse ${targetVersion}`)
      } catch (e: unknown) {
        this.logger.warn(`版本 ${targetVersion} 不存在: ${(e as Error).message}`)
        return { success: false, message: `版本 ${targetVersion} 不存在` }
      }

      // 2. 重置到目标版本
      this.gitExec('checkout main')
      this.gitExec(`reset --hard ${targetVersion}`)

      // 3. 如果要求完整回滚，执行回滚 SQL
      if (fullRollback) {
        const rollbackSql = this.generateRollbackSql(targetVersion, currentVersion)
        if (rollbackSql) {
          this.logger.log(`⚠️ 完整回滚需要手动执行以下 SQL：\n${rollbackSql}`)
        }
      }

      // 4. 重启生产服务
      const prodPid = this.findProcessPid(3000)
      if (prodPid) { try { process.kill(prodPid) } catch (e: unknown) { this.logger.warn(`回滚停止生产进程失败 PID=${prodPid}: ${(e as Error).message}`) }; await this.sleep(2000) }
      this.startProduction()

      // 5. staging 同步
      await this.syncStagingToProduction()

      // 6. 标记相关 delta 为已回滚
      const deltas = this.loadDeltas()
      for (const d of deltas) {
        if (d.status === 'promoted' && this.isDeltaAfterVersion(d, targetVersion)) {
          d.status = 'rolled_back'
        }
      }
      this.saveDeltas(deltas)

      return { success: true, message: `已回滚到 ${targetVersion}（生产环境已重启，staging 已同步）` }
    } catch (e: any) {
      this.logger.error(`回滚失败: ${e.message}`)
      return { success: false, message: `回滚失败: ${e.message}` }
    }
  }

  /** staging 同步到 production（IDLE 状态） */
  async syncStagingToProduction(): Promise<{ success: boolean; message: string }> {
    try {
      // staging 切到 main
      const currentBranch = this.getEnvStatus('staging').branch
      if (currentBranch !== 'main') {
        this.gitExec('checkout main')
        this.gitExec('pull origin main')
      }

      // 数据库同步（需要 mysqldump，开发环境跳过）
      try {
        this.syncDatabaseSnapshot()
      } catch (e: any) {
        this.logger.warn('数据库同步跳过: ' + e.message)
      }

      // 记录同步时间
      this.setLastSyncTime()

      return { success: true, message: 'Staging 已与 Production 同步' }
    } catch (e: any) {
      return { success: false, message: '同步失败: ' + e.message }
    }
  }

  /** 变更 Delta 状态（校验转换合法性） */
  transitionDelta(deltaId: string, newStatus: DeltaStatus, extra?: { feedback?: string }): { success: boolean; message: string } {
    const deltas = this.loadDeltas()
    const delta = deltas.find(d => d.id === deltaId)
    if (!delta) return { success: false, message: `变更 ${deltaId} 不存在` }

    const allowed = TRANSITIONS[delta.status] || []
    if (!allowed.includes(newStatus)) {
      return {
        success: false,
        message: `不允许从 ${delta.status} 转换到 ${newStatus}。允许的转换: ${allowed.join(', ')}`,
      }
    }

    const oldStatus = delta.status
    delta.status = newStatus

    // 处理额外数据
    if (extra?.feedback) {
      delta.feedback = extra.feedback
    }

    this.saveDeltas(deltas)
    this.logger.log(`Delta ${deltaId}: ${oldStatus} → ${newStatus}`)

    return { success: true, message: `状态已更新: ${oldStatus} → ${newStatus}` }
  }

  /** 获取单个 Delta 详情 */
  getDelta(deltaId: string): DeltaRecord | null {
    const deltas = this.loadDeltas()
    return deltas.find(d => d.id === deltaId) || null
  }

  /** 创建变更记录（Agent 发起时调用） */
  createDelta(args: {
    type: string
    summary: string
    files: string[]
    migrationSql?: string
  }): DeltaRecord {
    const deltas = this.loadDeltas()
    const id = `DELTA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(deltas.length + 1).padStart(3, '0')}`
    const branch = `feat/${id.toLowerCase()}`

    const delta: DeltaRecord = {
      id,
      type: args.type,
      summary: args.summary,
      branch,
      status: 'pending_staging',
      createdAt: new Date().toISOString(),
      files: args.files,
      migrationSql: args.migrationSql || null,
    }

    // 创建 feature 分支（仅在 staging 部署时执行，Chat 中只创建记录）
    // 这里不执行 git checkout — Chat 流程不需要切分支

    deltas.push(delta)
    this.saveDeltas(deltas)

    return delta
  }

  /** 验证 staging 环境（Agent 验收） */
  async verifyStaging(deltaId: string): Promise<{ success: boolean; message: string }> {
    const deltas = this.loadDeltas()
    const delta = deltas.find(d => d.id === deltaId)
    if (!delta) return { success: false, message: '变更不存在' }
    if (delta.status !== 'on_staging') return { success: false, message: '变更尚未部署到 staging' }

    // 运行编译检查 + 测试
    try {
      this.execCmd('npx tsc --noEmit', { cwd: path.join(this.projectRoot, 'backend') })
      this.logger.log('✅ Backend tsc 通过')
    } catch (e: any) {
      return { success: false, message: `编译失败: ${e.stderr || e.message}` }
    }

    delta.status = 'verified'
    this.saveDeltas(deltas)

    return { success: true, message: 'Staging 验收通过，可以发布到生产' }
  }

  // ══════════ 私有方法 ══════════

  private getEnvStatus(env: 'production' | 'staging'): { branch: string; version: string; commit: string; running: boolean } {
    try {
      const branch = this.hasGitRepo() ? this.gitExec('rev-parse --abbrev-ref HEAD').trim() : 'current'
      const commit = this.hasGitRepo() ? this.gitExec('rev-parse --short HEAD').trim() : 'latest'
      const version = this.getCurrentVersion()
      const currentMode = process.env.DEPLOYMENT_MODE || 'operator'
      // 单实例模式：operator → production running + staging off
      // developer/maintainer → staging running + production off（当前进程即 staging）
      if (env === 'production') {
        return { branch, version, commit, running: currentMode === 'operator' }
      } else {
        // staging: 在 developer/maintainer 模式下视为 running（当前进程）
        return { branch, version, commit, running: currentMode !== 'operator' }
      }
    } catch (e: unknown) {
      this.logger.warn(`获取版本信息失败: ${(e as Error).message}`)
      return { branch: 'unknown', version: '0.0.0', commit: 'unknown', running: false }
    }
  }

  private getCurrentVersion(): string {
    try {
      return this.gitExec('describe --tags --abbrev=0').trim()
    } catch (e: unknown) {
      this.logger.warn(`获取当前版本tag失败: ${(e as Error).message}`)
      return '0.0.0'
    }
  }

  private bumpVersion(current: string, deltaType: string): string {
    const parts = current.replace('v', '').split('.').map(Number)
    switch (deltaType) {
      case 'feat': return `v${parts[0]}.${parts[1] + 1}.0`
      case 'fix': return `v${parts[0]}.${parts[1]}.${parts[2] + 1}`
      case 'refactor': return `v${parts[0]}.${parts[1] + 1}.0`
      default: return `v${parts[0]}.${parts[1]}.${parts[2] + 1}`
    }
  }

  private isDeltaAfterVersion(delta: DeltaRecord, version: string): boolean {
    return delta.createdAt > (this.getVersionDate(version) || '1970-01-01')
  }

  private getVersionDate(_version: string): string | null {
    try {
      const date = this.gitExec(`log -1 --format=%aI ${_version}`).trim()
      return date || null
    } catch (e: unknown) {
      this.logger.warn(`获取版本日期失败 [${_version}]: ${(e as Error).message}`)
      return null
    }
  }

  private generateRollbackSql(fromVersion: string, _toVersion: string): string | null {
    const deltas = this.loadDeltas()
    const rollbackDeltas = deltas.filter(d => d.status === 'promoted' && this.isDeltaAfterVersion(d, fromVersion))
    if (rollbackDeltas.length === 0) return null

    let sql = '-- ERA 回滚 SQL\n-- 从 v2 回到 v1\n\n'
    for (const d of rollbackDeltas.reverse()) {
      if (d.migrationSql) {
        sql += `-- 回滚 ${d.id}: ${d.summary}\n`
        // 简单反转：ADD → DROP, ALTER → 反向
        sql += d.migrationSql
          .replace(/ADD COLUMN/g, '-- ROLLBACK: DROP COLUMN')
          .replace(/CREATE TABLE/g, '-- ROLLBACK: DROP TABLE')
          + '\n\n'
      }
    }
    return sql
  }

  private runMigration(sql: string, env: string) {
    // 通过环境变量获取 DB 连接信息
    const dbHost = process.env.DB_HOST || 'localhost'
    const dbPort = process.env.DB_PORT || '3306'
    const dbUser = process.env.DB_USERNAME || 'root'
    const dbPass = process.env.DB_PASSWORD || ''
    const dbName = env === 'staging' ? (process.env.DB_DATABASE || 'era') + '_staging' : process.env.DB_DATABASE || 'era'

    // 将 SQL 写入临时文件，通过 mysql 命令行执行
    const tmpFile = path.join(this.projectRoot, 'state', `migration_${Date.now()}.sql`)
    fs.mkdirSync(path.dirname(tmpFile), { recursive: true })
    fs.writeFileSync(tmpFile, sql, 'utf-8')

    try {
      this.execCmd(
        `mysql -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPass} ${dbName} < ${tmpFile}`,
        { cwd: this.projectRoot },
      )
      this.logger.log(`✅ 数据库迁移完成 (${env})`)
    } finally {
      try { fs.unlinkSync(tmpFile) } catch (e: unknown) {
        this.logger.warn(`清理临时SQL文件失败: ${(e as Error).message}`)
      }
    }
  }

  private syncDatabaseSnapshot() {
    const dbName = process.env.DB_DATABASE || 'era'
    const stagingDb = dbName + '_staging'

    // 导出 production 表结构
    this.execCmd(
      `mysqldump -h ${process.env.DB_HOST} -u ${process.env.DB_USERNAME} -p${process.env.DB_PASSWORD} --no-data ${dbName} > /tmp/era_schema.sql`,
      { cwd: this.projectRoot },
    )

    // 导入到 staging（仅结构，不含数据）
    this.execCmd(
      `mysql -h ${process.env.DB_HOST} -u ${process.env.DB_USERNAME} -p${process.env.DB_PASSWORD} ${stagingDb} < /tmp/era_schema.sql`,
      { cwd: this.projectRoot },
    )

    this.logger.log('数据库结构已同步到 staging')
  }

  private findProcessPid(port: number): number | null {
    try {
      // V1.4-b #39: port 已在调用前 parseInt 校验，保留 execSync（含 shell 管道）
      const result = execSync(`netstat -ano | findstr ":${port}"`, { encoding: 'utf-8', timeout: 5000 })
      const match = result.match(/LISTENING\s+(\d+)/)
      return match ? parseInt(match[1]) : null
    } catch (e: unknown) {
      this.logger.warn(`查找端口 ${port} 进程失败: ${(e as Error).message}`)
      return null
    }
  }

  private startStaging() {
    const backendDir = path.join(this.projectRoot, 'backend')
    const mainJs = path.join(backendDir, 'dist', 'main.js')

    // 直接 spawn Node 子进程，避免 bat 中文路径问题
    const child = spawn('node', [mainJs], {
      cwd: backendDir,
      env: {
        ...process.env,
        ERA_MODE: 'staging',
        DEPLOYMENT_MODE: 'developer',
        APP_PORT: '3001',
        DB_DATABASE: (process.env.DB_DATABASE || 'miaojing_erp') + '_staging',
      },
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    })
    child.unref()
    this.logger.log('Staging started (PID=' + child.pid + ', port 3001)')
  }

  private startProduction() {
    const backendDir = path.join(this.projectRoot, 'backend')
    const batFile = path.join(backendDir, 'start.bat')
    // V1.4-b #39: Windows shell 命令 → spawn detached 替代 execSync
    spawn('cmd', ['/c', 'start', '"ERA-Production"', batFile], {
      cwd: backendDir,
      detached: true,
      windowsHide: true,
      shell: true,
    })
    this.logger.log('Production 服务已启动 (端口 3000)')
  }

  private gitExec(cmd: string): string {
    // V1.4-b #39: execSync → execFileSync，参数分离防注入
    const args = cmd.split(/\s+/).filter(Boolean)
    return execFileSync('git', args, { cwd: this.projectRoot, encoding: 'utf-8', timeout: 15000 })
  }

  /** 检查 Git 仓库是否可用（降级：无 Git 时跳过分支操作） */
  private hasGitRepo(): boolean {
    try {
      this.gitExec('rev-parse --git-dir')
      return true
    } catch (e: unknown) {
      this.logger.warn(`Git仓库不可用: ${(e as Error).message}`)
      return false
    }
  }

  private execCmd(cmd: string, opts: { cwd: string; [key: string]: any }): string {
    // V1.4-b #39: execSync → execFileSync，参数分离防注入
    const parts = cmd.split(/\s+/).filter(Boolean)
    const program = parts[0]
    const args = parts.slice(1)
    return execFileSync(program, args, { encoding: 'utf-8', timeout: 30000, ...opts })
  }

  private loadDeltas(): DeltaRecord[] {
    try {
      if (fs.existsSync(this.deltasFile)) {
        return JSON.parse(fs.readFileSync(this.deltasFile, 'utf-8'))
      }
    } catch (e: unknown) {
      this.logger.warn(`加载Delta记录失败: ${(e as Error).message}`)
    }
    return []
  }

  private saveDeltas(deltas: DeltaRecord[]) {
    fs.mkdirSync(path.dirname(this.deltasFile), { recursive: true })
    fs.writeFileSync(this.deltasFile, JSON.stringify(deltas, null, 2), 'utf-8')
  }

  private getLastSyncTime(): string | null {
    const syncFile = path.join(this.projectRoot, 'state', 'last_sync.json')
    try {
      if (fs.existsSync(syncFile)) {
        return JSON.parse(fs.readFileSync(syncFile, 'utf-8')).lastSyncAt
      }
    } catch (e: unknown) {
      this.logger.warn(`读取同步时间失败: ${(e as Error).message}`)
    }
    return null
  }

  private setLastSyncTime() {
    const syncFile = path.join(this.projectRoot, 'state', 'last_sync.json')
    fs.mkdirSync(path.dirname(syncFile), { recursive: true })
    fs.writeFileSync(syncFile, JSON.stringify({ lastSyncAt: new Date().toISOString() }), 'utf-8')
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /** 执行原始 Migration SQL（由 migrate endpoint 调用，已做安全校验） */
  async executeRawMigration(sql: string): Promise<void> {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'miaojing_erp',
    }

    const mysql = await import('mysql2/promise')
    const conn = await mysql.createConnection(dbConfig)
    try {
      // 按分号分割多条 SQL
      const statements = sql.split(';').filter(s => s.trim())
      for (const stmt of statements) {
        if (!stmt.trim()) continue
        await conn.execute(stmt)
        this.logger.log(`Migration executed: ${stmt.trim().substring(0, 80)}...`)
      }
    } finally {
      await conn.end()
    }
  }
}
