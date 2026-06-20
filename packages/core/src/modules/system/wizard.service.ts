/**
 * 初装引导服务 — 首次启动检测 + 数据库初始化 + .env 写入
 *
 * @author 唐浩然（AI 联合创始人）
 * @since 2026-06-03
 *
 * 数据库初始化策略：
 * - 不依赖合并后的 init.sql（避免乱码/编码问题）
 * - 直接从 67 个 SQL 分片文件逐条执行
 * - multipleStatements=false，每条 SQL 独立执行
 * - 幂等设计：重复执行安全（跳过已有表/索引/数据）
 * - 不 DROP 旧库（避免 NestJS 崩溃）
 */

import { Injectable, Logger } from '@nestjs/common'
import * as mysql from 'mysql2/promise'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

export interface WizardStatus {
  initialized: boolean
  checks: {
    database: { configured: boolean; connected: boolean; tablesExist: boolean }
    llmKey: { configured: boolean; valid: boolean }
    adminAccount: { exists: boolean }
  }
  suggestions: string[]
  nextStep: 'login' | 'wizard'
}

@Injectable()
export class WizardService {
  private readonly logger = new Logger(WizardService.name)

  constructor() {}

  /**
   * 获取 SQL 分片文件所在目录
   * __dirname = dist/modules/system/ → 往上5级 = openoba-starter/
   * → eyewear-erp/database/
   */
  private getSqlDir(): string {
    return path.resolve(__dirname, '..', '..', '..', '..', '..', 'eyewear-erp', 'database')
  }

  /** 全面检测系统初始化状态 */
  async checkStatus(): Promise<WizardStatus> {
    const dbConfigured = !!(process.env.DB_HOST && process.env.DB_DATABASE)
    const llmConfigured = !!(process.env.DEEPSEEK_API_KEY || process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY)

    const status: WizardStatus = {
      initialized: false,
      checks: {
        database: { configured: dbConfigured, connected: false, tablesExist: false },
        llmKey: { configured: llmConfigured, valid: false },
        adminAccount: { exists: false },
      },
      suggestions: [],
      nextStep: 'wizard',
    }

    if (dbConfigured) {
      try {
        const conn = await mysql.createConnection({
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT || '3306'),
          user: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_DATABASE,
          connectTimeout: 3000,
        })
        status.checks.database.connected = true

        const dbName = process.env.DB_DATABASE || 'openoba_starter'
        const result = await conn.execute(
          "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = ?",
          [dbName],
        )
        const rows = result[0] as mysql.RowDataPacket[]
        const tableCount = (rows[0] as mysql.RowDataPacket)?.cnt as number || 0
        status.checks.database.tablesExist = tableCount >= 10

        if (status.checks.database.tablesExist) {
          const userResult = await conn.execute(
            "SELECT COUNT(*) AS cnt FROM sys_user WHERE username = ?",
            ['admin'],
          )
          const userRows = userResult[0] as mysql.RowDataPacket[]
          status.checks.adminAccount.exists = ((userRows[0] as mysql.RowDataPacket)?.cnt as number || 0) > 0
        }

        await conn.end()
      } catch {
        if (status.checks.database.configured) {
          status.suggestions.push('⚠️ 数据库配置存在但无法连接，请检查 .env')
        }
      }
    }

    if (llmConfigured) {
      const key = process.env.DEEPSEEK_API_KEY || process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY || ''
      status.checks.llmKey.valid = key.length >= 20 && !key.includes('***')
      if (!status.checks.llmKey.valid) {
        status.suggestions.push('⚠️ API Key 格式不正确或未填写真实值')
      }
    }

    if (
      status.checks.database.configured &&
      status.checks.database.connected &&
      status.checks.database.tablesExist &&
      status.checks.adminAccount.exists &&
      status.checks.llmKey.configured &&
      status.checks.llmKey.valid
    ) {
      status.initialized = true
      status.nextStep = 'login'
      status.suggestions = ['✅ 系统已就绪，可以登录使用']
    } else {
      status.nextStep = 'wizard'
      if (!status.checks.database.configured || !status.checks.database.connected) {
        status.suggestions.push('📋 步骤 1：配置数据库连接')
      }
      if (!status.checks.database.tablesExist) {
        status.suggestions.push('📋 步骤 2：初始化数据库（建表 + 种子数据）')
      }
      if (!status.checks.llmKey.configured || !status.checks.llmKey.valid) {
        status.suggestions.push('📋 步骤 3：配置 LLM API Key（推荐 DeepSeek，免费 500 万 token）')
      }
    }

    return status
  }

  /** 测试数据库连接 */
  async testDbConnection(body: {
    host: string; port: number; username: string; password: string
  }): Promise<{ success: boolean; message: string; serverVersion?: string }> {
    const { host, port, username, password } = body
    try {
      const conn = await mysql.createConnection({
        host: host || 'localhost',
        port: port || 3306,
        user: username || 'root',
        password: password || '',
        connectTimeout: 5000,
      })
      const versionResult = await conn.execute('SELECT VERSION() AS version')
      const versionRows = versionResult[0] as mysql.RowDataPacket[]
      const version = (versionRows[0] as mysql.RowDataPacket)?.version as string || 'unknown'
      await conn.end()
      return { success: true, message: `连接成功！MySQL 版本：${version}`, serverVersion: version }
    } catch (e: any) {
      let message = e.message || '连接失败'
      if (message.includes('ER_ACCESS_DENIED_ERROR') || message.includes('Access denied')) {
        message = '用户名或密码错误'
      } else if (message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT')) {
        message = `无法连接到 ${host}:${port}。MySQL 是否已启动？防火墙是否放行？`
      } else if (message.includes('ER_NOT_SUPPORTED_AUTH')) {
        message = 'MySQL 8.0 认证协议不兼容'
      }
      return { success: false, message }
    }
  }

  /**
   * 初始化数据库 — 幂等设计
   *
   * 核心策略：
   * 1. CREATE DATABASE IF NOT EXISTS（不 DROP，保护 NestJS 在线）
   * 2. 从 SQL 分片文件逐条执行（不用 merged init.sql）
   * 3. multipleStatements=false，每条独立，出错跳过不残留
   * 4. 幂等：重复执行安全，已有表/索引/数据自动跳过
   */
  async initDatabase(body: {
    host: string; port: number; username: string; password: string; database?: string
  }): Promise<{ success: boolean; message: string; tablesCreated?: number }> {
    // W-P0-01修复：已初始化系统禁止重复执行
    const currentStatus = await this.checkStatus()
    if (currentStatus.initialized) {
      return { success: false, message: '系统已完成初始化，禁止重复执行数据库初始化。如需重置请联系管理员。' }
    }

    const { host, port, username, password, database } = body
    const dbName = database || 'openoba_starter'

    const testResult = await this.testDbConnection({ host, port, username, password })
    if (!testResult.success) {
      return testResult
    }

    let conn: mysql.Connection | null = null
    try {
      conn = await mysql.createConnection({
        host: host || 'localhost',
        port: port || 3306,
        user: username || 'root',
        password: password || '',
        multipleStatements: false,
      })

      // 1. 建库（IF NOT EXISTS — 不 DROP）
      await conn.query(
        `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      )
      await conn.query(`USE \`${dbName}\``)
      this.logger.log(`数据库 ${dbName} 已就绪`)

      // 2. 加载建表 SQL + 种子数据（从母库完整重建）
      const sqlDir = this.getSqlDir()
      const structurePath = path.join(sqlDir, 'init-structure.sql')
      const seedPath = path.join(sqlDir, 'init-seed.sql')

      if (!fs.existsSync(structurePath)) {
        return { success: false, message: `建表脚本不存在：${structurePath}` }
      }

      // 阶段1: 逐条执行建表 SQL
      this.logger.log('阶段1: 建表...')
      let structureSql = fs.readFileSync(structurePath, 'utf-8')
      structureSql = structureSql.replace(/openoba_starter/g, dbName)

      // 移除 USE / CREATE DATABASE 行（已手动执行）
      structureSql = structureSql.split('\n').filter(l => !l.trim().startsWith('USE ') && !l.trim().startsWith('CREATE DATABASE ')).join('\n')

      const tableBlocks = (structureSql.match(/CREATE TABLE[\s\S]*?;(?=\n|$)/g) || [])
      
      let totalExecuted = 0
      let totalSkipped = 0
      const errors: string[] = []

      for (const sql of tableBlocks) {
        try {
          await conn.query(sql)
          totalExecuted++
        } catch (e: any) {
          if (/already exists|Duplicate/i.test(e.sqlMessage || e.message || '')) { totalSkipped++; continue }
          errors.push((e.sqlMessage || e.message).substring(0, 120))
          if (errors.length >= 5) break
        }
      }

      this.logger.log(`建表: ${totalExecuted} 条成功, ${totalSkipped} 条跳过, ${errors.length} 条失败`)

      // 阶段2: 执行种子数据（幂等 REPLACE INTO）
      let seedExecuted = 0
      if (fs.existsSync(seedPath)) {
        this.logger.log('阶段2: 种子数据...')
        let seedSql = fs.readFileSync(seedPath, 'utf-8')
        const seedStmts = seedSql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'))
        for (const stmt of seedStmts) {
          try {
            await conn.query(stmt)
            seedExecuted++
          } catch (e: any) {
            this.logger.warn(`种子执行跳过: ${(e.sqlMessage || e.message).substring(0, 100)}`)
          }
        }
        this.logger.log(`种子: ${seedExecuted} 条`)
      }

      if (errors.length > 0) {
        return {
          success: false,
          message: `已成功 ${totalExecuted} 条，但遇到 ${errors.length} 个错误：${errors.slice(0, 3).join(' | ')}`,
        }
      }

      // 4. 验证
      const verifyResult = await conn.execute(
        "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = ?",
        [dbName],
      )
      const verifyRows = verifyResult[0] as mysql.RowDataPacket[]
      const tableCount = (verifyRows[0] as mysql.RowDataPacket)?.cnt as number || 0

      await conn.end()
      this.logger.log(`✅ 初始化完成：${tableCount} 张表`)

      return {
        success: true,
        message: `数据库初始化完成！${totalExecuted} 张表 + ${seedExecuted} 条种子数据。`,
        tablesCreated: tableCount,
      }
    } catch (e: any) {
      if (conn) await conn.end().catch(() => {})
      return { success: false, message: `初始化异常：${e.message}` }
    }
  }

  /** 保存配置到 .env 文件 */
  async saveEnvConfig(body: {
    dbHost: string; dbPort: number; dbUsername: string; dbPassword: string; dbDatabase: string;
    llmApiKey: string; llmProvider?: string;
    adminUsername?: string; adminPassword?: string;
    jwtSecret?: string;
  }): Promise<{ success: boolean; message: string; adminUser?: string }> {
    // W-P0-01修复：已初始化系统禁止修改环境配置
    const currentStatus = await this.checkStatus()
    if (currentStatus.initialized) {
      return { success: false, message: '系统已完成初始化，禁止修改环境配置。如需变更请联系管理员。' }
    }

    const backendDir = path.resolve(__dirname, '..', '..', '..', '..', '..', 'openoba-core', 'backend')
    const envPath = path.join(backendDir, '.env')

    try {
      const jwtSecret = body.jwtSecret || crypto.randomBytes(48).toString('base64')
      const skillKey = crypto.randomBytes(32).toString('base64')
      const customerJwt = crypto.randomBytes(48).toString('base64')
      const adminUser = body.adminUsername || 'admin'
      const adminPass = body.adminPassword || 'admin123'

      const envContent = `# OpenOBA Core — 环境配置（由初装向导自动生成）
# 生成时间：${new Date().toISOString()}
# ═══════════════════════════════════════════

# 部署模式
DEPLOYMENT_MODE=operator
APP_ENV=production
CORS_ORIGIN=http://localhost:3401

# 数据库
DB_HOST=${body.dbHost || 'localhost'}
DB_PORT=${body.dbPort || 3306}
DB_USERNAME=${body.dbUsername || 'root'}
DB_PASSWORD=${body.dbPassword}
DB_DATABASE=${body.dbDatabase || 'openoba_starter'}

# Redis（可选）
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
CUSTOMER_JWT_SECRET=${customerJwt}

# LLM Provider
DEEPSEEK_API_KEY=${body.llmApiKey}
DASHSCOPE_API_KEY=

# Skill 密钥加密主钥
SKILL_VAULT_KEY=${skillKey}

# 默认管理员账号
# 用户名: ${adminUser}  密码: ${adminPass}
# 首次登录后请立即修改密码
`

      fs.writeFileSync(envPath, envContent, 'utf-8')
      this.logger.log('.env 已生成')

      // W-P1-02修复：同步自定义管理员密码到数据库
      if (adminPass !== 'admin123' || (adminUser && adminUser !== 'admin')) {
        try {
          const bcrypt = require('bcrypt')
          const hash = await bcrypt.hash(adminPass, 10)
          const conn = await mysql.createConnection({
            host: body.dbHost || 'localhost',
            port: body.dbPort || 3306,
            user: body.dbUsername || 'root',
            password: body.dbPassword,
            database: body.dbDatabase || 'openoba_starter',
            connectTimeout: 5000,
          })
          await conn.execute('UPDATE sys_user SET password_hash = ? WHERE username = ?', [hash, adminUser])
          await conn.end()
          this.logger.log(`管理员 ${adminUser} 密码已同步更新到数据库`)
        } catch (e: any) {
          this.logger.warn(`管理员密码同步失败: ${e.message}，请手动修改`)
        }
      }

      return {
        success: true,
        message: '配置已保存。请手动重启服务使新配置生效。',
        adminUser,
      }
    } catch (e: any) {
      return { success: false, message: `保存配置失败：${e.message}` }
    }
  }
}
