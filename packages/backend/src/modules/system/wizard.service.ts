/**
 * 初装引导服务 v2 — 分步执行：建库建表 + 种子数据
 *
 * @author 唐浩然（AI 联合创始人）
 * @since 2026-06-04
 */
import { Injectable, Logger } from '@nestjs/common'
import * as mysql from 'mysql2/promise'
import * as fs from 'fs'
import * as path from 'path'

@Injectable()
export class WizardService {
  private readonly logger = new Logger(WizardService.name)

  /** SQL 文件目录：openoba-starter/eyewear-erp/database/ */
  private getSqlDir(): string {
    return path.resolve(__dirname, '..', '..', '..', '..', '..', 'eyewear-erp', 'database')
  }

  /** 测试数据库连接 */
  async testDbConnection(body: {
    host: string; port: number; username: string; password: string
  }): Promise<{ success: boolean; message: string; serverVersion?: string }> {
    const { host, port, username, password } = body
    try {
      const conn = await mysql.createConnection({
        host: host || 'localhost', port: port || 3306,
        user: username || 'root', password: password || '',
        connectTimeout: 5000,
      })
      const [rows] = await conn.execute('SELECT VERSION() AS version')
      const version = (rows as any[])[0]?.version || 'unknown'
      await conn.end()
      return { success: true, message: `连接成功！MySQL ${version}`, serverVersion: version }
    } catch (e: any) {
      let msg = e.message || '连接失败'
      if (/Access denied/i.test(msg)) msg = '用户名或密码错误'
      else if (/ECONNREFUSED|ETIMEDOUT/i.test(msg)) msg = `无法连接 ${host}:${port}，MySQL 是否启动？`
      return { success: false, message: msg }
    }
  }

  /** 步骤2：建库 + 建表 */
  async createTables(body: {
    host: string; port: number; username: string; password: string; database?: string
  }): Promise<{ success: boolean; message: string; tableCount?: number }> {
    const { host, port, username, password, database } = body
    const dbName = database || 'openoba_starter'

    const conn = await mysql.createConnection({
      host: host || 'localhost', port: port || 3306,
      user: username || 'root', password: password || '',
      multipleStatements: false,
    })

    try {
      // 1. 建库
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
      await conn.query(`USE \`${dbName}\``)
      this.logger.log(`Database ${dbName} ready`)

      // 2. 读 structure SQL
      const sqlPath = path.join(this.getSqlDir(), 'init-structure.sql')
      if (!fs.existsSync(sqlPath)) return { success: false, message: `建表脚本不存在：${sqlPath}` }

      let sql = fs.readFileSync(sqlPath, 'utf-8')
      // 移除 USE/DROP DATABASE 行
      sql = sql.split('\n').filter(l => !l.trim().startsWith('USE ') && !l.trim().startsWith('CREATE DATABASE ') && !l.trim().startsWith('DROP DATABASE ')).join('\n')
      
      // 按 CREATE TABLE 分块
      const createBlocks: string[] = sql.match(/CREATE TABLE[\s\S]*?;\n/g) || []
      const dropBlocks: string[] = sql.match(/DROP TABLE[\s\S]*?;\n/g) || []
      const blocks = createBlocks.concat(dropBlocks)

      let executed = 0, skipped = 0
      for (const block of blocks) {
        try {
          await conn.query(block)
          executed++
        } catch (e: any) {
          if (/already exists|Duplicate/i.test(e.sqlMessage || e.message || '')) { skipped++; continue }
          this.logger.warn(`SQL skip: ${(e.sqlMessage || e.message).substring(0, 100)}`)
          skipped++
        }
      }

      // 3. 验证
      const [rows] = await conn.execute(
        "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = ?", [dbName]
      )
      const tableCount = (rows as any[])[0]?.cnt || 0
      this.logger.log(`Tables: ${tableCount}`)

      return { success: true, message: `建表完成：${tableCount} 张表`, tableCount }
    } catch (e: any) {
      return { success: false, message: `建表失败：${e.message}` }
    } finally {
      await conn.end()
    }
  }

  /** 步骤3：灌入种子数据 */
  async seedDb(body: {
    host: string; port: number; username: string; password: string; database?: string
  }): Promise<{ success: boolean; message: string }> {
    const { host, port, username, password, database } = body
    const dbName = database || 'openoba_starter'

    const conn = await mysql.createConnection({
      host: host || 'localhost', port: port || 3306,
      user: username || 'root', password: password || '',
      multipleStatements: false,
    })

    try {
      await conn.query(`USE \`${dbName}\``)

      const seedPath = path.join(this.getSqlDir(), 'init-seed.sql')
      if (!fs.existsSync(seedPath)) return { success: false, message: `种子脚本不存在：${seedPath}` }

      const seedSql = fs.readFileSync(seedPath, 'utf-8')
      const stmts = seedSql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'))

      let ok = 0, skip = 0
      for (const stmt of stmts) {
        try {
          await conn.query(stmt)
          ok++
        } catch (e: any) {
          if (/Duplicate|already exists/i.test(e.sqlMessage || e.message || '')) { skip++; continue }
          this.logger.warn(`Seed skip: ${(e.sqlMessage || e.message).substring(0, 80)}`)
        }
      }

      this.logger.log(`Seed: ${ok} ok, ${skip} skipped`)
      return { success: true, message: `种子数据导入完成` }
    } catch (e: any) {
      return { success: false, message: `种子导入失败：${e.message}` }
    } finally {
      await conn.end()
    }
  }

  /** 检测系统状态 */
  async checkStatus(): Promise<any> {
    const dbConfigured = !!(process.env.DB_HOST && process.env.DB_DATABASE)
    let connected = false, tablesExist = false, adminExists = false
    if (dbConfigured) {
      try {
        const conn = await mysql.createConnection({
          host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '3306'),
          user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
          database: process.env.DB_DATABASE, connectTimeout: 3000,
        })
        connected = true
        const dbName = process.env.DB_DATABASE || 'openoba_starter'
        const [rows] = await conn.execute(
          "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = ?",
          [dbName]
        )
        tablesExist = (rows as any[])[0]?.cnt >= 10
        if (tablesExist) {
          const [ur] = await conn.execute("SELECT COUNT(*) AS cnt FROM sys_user WHERE username = 'admin'")
          adminExists = (ur as any[])[0]?.cnt > 0
        }
        await conn.end()
      } catch { /* ignore */ }
    }
    const initialized = connected && tablesExist && adminExists
    return {
      initialized,
      checks: {
        database: { configured: dbConfigured, connected, tablesExist },
        adminAccount: { exists: adminExists },
      },
      nextStep: initialized ? 'login' : 'wizard',
    }
  }
}
