/**
 * MigrationRunner — Git 操作 + 数据库迁移 + 进程查找
 *
 * 从 DeploymentService 提取的独立服务，
 * 负责底层 Git 命令执行、数据库迁移、版本/分支查询、进程查找。
 *
 * @author 唐浩然（AI 联合创始人）
 * @since 2026-06-21
 */

import { Injectable, Logger } from '@nestjs/common'
import { execSync, execFileSync } from 'child_process'
import { DataSource } from 'typeorm'
import { TIMEOUT } from '../../common/constants/timeouts'
import * as path from 'path'

@Injectable()
export class MigrationRunner {
  private readonly logger = new Logger(MigrationRunner.name)
  private readonly projectRoot: string

  constructor(
    private readonly dataSource: DataSource,
  ) {
    this.projectRoot = path.resolve(process.cwd(), '..')
  }

  /** 执行 Git 命令 */
  gitExec(cmd: string): string {
    const args = cmd.split(/\s+/).filter(Boolean)
    return execFileSync('git', args, { cwd: this.projectRoot, encoding: 'utf-8', timeout: TIMEOUT.GIT_CMD })
  }

  /** 检查 Git 仓库是否可用 */
  hasGitRepo(): boolean {
    try {
      this.gitExec('rev-parse --git-dir')
      return true
    } catch (e: unknown) {
      this.logger.warn(`Git仓库不可用: ${(e as Error).message}`)
      return false
    }
  }

  /** 获取当前分支名 */
  getCurrentBranch(): string {
    try {
      return this.gitExec('rev-parse --abbrev-ref HEAD').trim()
    } catch (e: unknown) {
      this.logger.warn(`获取当前分支失败: ${(e as Error).message}`)
      return 'unknown'
    }
  }

  /** 获取当前版本 tag */
  getCurrentVersion(): string {
    try {
      return this.gitExec('describe --tags --abbrev=0').trim()
    } catch (e: unknown) {
      this.logger.warn(`获取当前版本tag失败: ${(e as Error).message}`)
      return '0.0.0'
    }
  }

  /** 执行数据库迁移 */
  async runMigration(sql: string, env: string): Promise<void> {
    const dbName = env === 'staging'
      ? (process.env.DB_DATABASE || 'openoba_core') + '_staging'
      : process.env.DB_DATABASE || 'openoba_core'

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()

    try {
      await queryRunner.startTransaction()
      await queryRunner.query(`USE \`${dbName}\``)

      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const stmt of statements) {
        await queryRunner.query(stmt)
      }

      await queryRunner.commitTransaction()
      this.logger.log(`✅ 数据库迁移完成 (${env})`)
    } undefined {
      await queryRunner.rollbackTransaction()
      this.logger.error(`数据库迁移失败，已回滚: ${e.message}`)
      throw e
    } finally {
      await queryRunner.release()
    }
  }

  /** 查找监听指定端口的进程 PID */
  findProcessPid(port: number): number | null {
    try {
      const result = execSync(`netstat -ano | findstr ":${port}"`, { encoding: 'utf-8', timeout: TIMEOUT.MYSQL_PROBE })
      const match = result.match(/LISTENING\s+(\d+)/)
      return match ? parseInt(match[1]) : null
    } catch (e: unknown) {
      this.logger.warn(`查找端口 ${port} 进程失败: ${(e as Error).message}`)
      return null
    }
  }
}
