/**
 * 秒镜科技 · ERDL — FileReader Service
 *
 * @file FileReaderService — Agent 文件读取能力
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-15
 * @license AGPL-3.0
 *
 * @description
 * 为 ERA Agent 提供工作区内文件读取能力。
 * 支持格式：.md .txt .json .csv .xlsx .docx .pdf .html .sql .erdl
 *
 * 安全红线：
 * - 路径必须在 WORKSPACE_ROOTS 白名单内
 * - 禁止 ../ 路径穿越
 * - 单文件最大 10MB
 * - 禁止读取 .env / secrets / .git 等敏感文件
 */

import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'

// ═══════════════════════════════════════════
// 安全常量
// ═══════════════════════════════════════════

/** 工作区根目录白名单（所有文件操作必须在此范围内） */
const WORKSPACE_ROOTS = [
  'C:\\Users\\99tan\\mj',
] as const

/** 禁止访问的文件/目录模式 */
const DENY_PATTERNS = [
  /\.env$/i,
  /\.git[\\/\\\\]/i,
  /node_modules[\\/\\\\]/i,
  /\.openclaw[\\/\\\\]identity/i,
  /\.openclaw[\\/\\\\]devices/i,
  /auth-state\.json$/i,
  /auth-profiles\.json$/i,
  /secrets?[\\/\\\\]/i,
  /credentials?[\\/\\\\]/i,
  /api-?keys?[\\/\\\\]/i,
  /\.ssh[\\/\\\\]/i,
]

/** 单文件最大读取大小 */
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/** 目录列表最大条目数 */
const MAX_DIR_ENTRIES = 500

// ═══════════════════════════════════════════
// 类型
// ═══════════════════════════════════════════

export interface FileReadResult {
  ok: boolean
  path: string
  type: string
  size: number
  content: string
  /** 结构化解析结果（json/csv/xlsx 等） */
  parsed?: unknown
  error?: string
}

export interface DirListResult {
  ok: boolean
  path: string
  entries: DirEntry[]
  total: number
  error?: string
}

export interface DirEntry {
  name: string
  type: 'file' | 'directory'
  size?: number
  ext?: string
}

// ═══════════════════════════════════════════
// FileReaderService
// ═══════════════════════════════════════════

@Injectable()
export class FileReaderService {
  private readonly logger = new Logger(FileReaderService.name)

  /**
   * 读取文件内容（自动检测格式）
   *
   * @param filePath 文件相对路径（相对于工作区根目录）
   * @param maxLines 最大返回行数（0=无限制）
   * @returns 文件读取结果
   */
  async readFile(filePath: string, maxLines = 0): Promise<FileReadResult> {
    try {
      // ① 安全校验
      const absPath = this.resolveSafePath(filePath)
      if (!absPath) {
        return { ok: false, path: filePath, type: '', size: 0, content: '', error: '路径不在允许的工作区内' }
      }

      if (!fs.existsSync(absPath)) {
        return { ok: false, path: filePath, type: '', size: 0, content: '', error: '文件不存在' }
      }

      const stat = fs.statSync(absPath)
      if (stat.isDirectory()) {
        return { ok: false, path: filePath, type: '', size: 0, content: '', error: '路径是目录，请使用 list_files' }
      }

      if (stat.size > MAX_FILE_SIZE) {
        return { ok: false, path: filePath, type: '', size: stat.size, content: '', error: `文件过大 (${(stat.size / 1024 / 1024).toFixed(1)}MB > 10MB)` }
      }

      // ② 格式检测
      const ext = path.extname(absPath).toLowerCase()

      // ③ 读取 + 解析
      let content: string
      let parsed: unknown

      switch (ext) {
        case '.json':
          content = fs.readFileSync(absPath, 'utf-8')
          try { parsed = JSON.parse(content) } catch { /* keep as text */ }
          break

        case '.csv':
          content = fs.readFileSync(absPath, 'utf-8')
          parsed = this.parseCSV(content)
          break

        case '.xlsx':
        case '.xls':
          content = await this.readExcel(absPath)
          break

        case '.docx':
          content = await this.readDocx(absPath)
          break

        case '.pdf':
          content = await this.readPdf(absPath)
          break

        case '.html':
        case '.htm':
          content = await this.readHtml(absPath)
          break

        default:
          // .md .txt .sql .erdl .yml .yaml .ts .js .json 等 → 纯文本
          content = fs.readFileSync(absPath, 'utf-8')
          break
      }

      // ④ 行列限制
      if (maxLines > 0) {
        const lines = content.split('\n')
        if (lines.length > maxLines) {
          content = lines.slice(0, maxLines).join('\n') + `\n\n... (${lines.length - maxLines} 行已截断)`
        }
      }

      return {
        ok: true,
        path: filePath,
        type: ext,
        size: stat.size,
        content,
        parsed,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      this.logger.error(`readFile failed: ${filePath} - ${msg}`)
      return { ok: false, path: filePath, type: '', size: 0, content: '', error: msg }
    }
  }

  /**
   * 列出目录内容
   *
   * @param dirPath 目录相对路径
   * @param pattern 文件名过滤（如 "*.md"）
   * @param recursive 是否递归遍历子目录（默认 false）
   * @returns 目录列表结果
   */
  listFiles(dirPath: string, pattern?: string, recursive = false): DirListResult {
    try {
      const absPath = this.resolveSafePath(dirPath)
      if (!absPath) {
        return { ok: false, path: dirPath, entries: [], total: 0, error: '路径不在允许的工作区内' }
      }

      if (!fs.existsSync(absPath)) {
        return { ok: false, path: dirPath, entries: [], total: 0, error: '目录不存在' }
      }

      const stat = fs.statSync(absPath)
      if (!stat.isDirectory()) {
        return { ok: false, path: dirPath, entries: [], total: 0, error: '路径不是目录' }
      }

      const entries: DirEntry[] = []

      if (recursive) {
        this.walkDir(absPath, dirPath, pattern || undefined, entries, 0, 5)
      } else {
        this.scanDir(absPath, pattern || undefined, entries)
      }

      // 排序：目录在前，文件在后，按名称
      entries.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      return { ok: true, path: dirPath, entries, total: entries.length }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return { ok: false, path: dirPath, entries: [], total: 0, error: msg }
    }
  }

  /** 扫描单层目录 */
  private scanDir(absPath: string, pattern: string | undefined, entries: DirEntry[]): void {
    const files = fs.readdirSync(absPath)
    for (const name of files) {
      const fullPath = path.join(absPath, name)
      if (this.isDenied(fullPath)) continue

      const s = fs.statSync(fullPath)
      const ext = path.extname(name).toLowerCase()

      if (pattern && !this.matchPattern(name, pattern)) continue

      entries.push({
        name,
        type: s.isDirectory() ? 'directory' : 'file',
        size: s.isFile() ? s.size : undefined,
        ext: s.isFile() ? ext || undefined : undefined,
      })

      if (entries.length >= MAX_DIR_ENTRIES) return
    }
  }

  /** 递归遍历目录树（depth-limit=5 防止过深） */
  private walkDir(absPath: string, relBase: string, pattern: string | undefined, entries: DirEntry[], depth: number, maxDepth: number): void {
    if (depth > maxDepth) return
    if (entries.length >= MAX_DIR_ENTRIES) return

    const files = fs.readdirSync(absPath)
    for (const name of files) {
      if (entries.length >= MAX_DIR_ENTRIES) return

      const fullPath = path.join(absPath, name)
      if (this.isDenied(fullPath)) continue

      const s = fs.statSync(fullPath)
      const ext = path.extname(name).toLowerCase()
      const relPath = path.join(relBase, name).replace(/\\/g, '/')

      if (s.isDirectory()) {
        entries.push({
          name: relPath + '/',
          type: 'directory',
        })
        this.walkDir(fullPath, relPath, pattern, entries, depth + 1, maxDepth)
      } else if (s.isFile()) {
        if (pattern && !this.matchPattern(name, pattern)) continue
        entries.push({
          name: relPath,
          type: 'file',
          size: s.size,
          ext: ext || undefined,
        })
      }
    }
  }

  // ═══════════════════════════════════════════
  // 安全方法
  // ═══════════════════════════════════════════

  /**
   * 解析相对路径为绝对路径，并校验在工作区范围内
   * @returns 安全的绝对路径，或 null（校验失败）
   */
  private resolveSafePath(relativePath: string): string | null {
    // 规范化（消除 ../ 穿越）
    const normalized = path.normalize(relativePath).replace(/^\.(\\|\/)+/, '')

    // 对每个白名单根目录尝试
    for (const root of WORKSPACE_ROOTS) {
      const absPath = path.resolve(root, normalized)

      // 确保解析后的路径仍在根目录下
      if (absPath.toLowerCase().startsWith(root.toLowerCase() + '\\') || absPath.toLowerCase() === root.toLowerCase()) {
        // 检查禁止模式
        if (this.isDenied(absPath)) {
          this.logger.warn(`[FileReader] 拒绝访问敏感路径: ${absPath}`)
          return null
        }
        return absPath
      }
    }

    this.logger.warn(`[FileReader] 路径不在工作区: ${relativePath}`)
    return null
  }

  /** 检查路径是否命中禁止模式 */
  private isDenied(absPath: string): boolean {
    for (const pattern of DENY_PATTERNS) {
      if (pattern.test(absPath)) return true
    }
    return false
  }

  /** 简单的通配符匹配（支持 * 和 ?） */
  private matchPattern(name: string, pattern: string): boolean {
    const regex = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
    return new RegExp(`^${regex}$`, 'i').test(name)
  }

  // ═══════════════════════════════════════════
  // 格式解析
  // ═══════════════════════════════════════════

  /** 解析 CSV 为结构化数组 */
  private parseCSV(content: string): Array<Record<string, string>> {
    const lines = content.trim().split('\n')
    if (lines.length < 2) return []

    const headers = this.splitCSVLine(lines[0])
    const rows: Array<Record<string, string>> = []

    for (let i = 1; i < lines.length; i++) {
      const values = this.splitCSVLine(lines[i])
      if (values.length === 0) continue
      const row: Record<string, string> = {}
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] || ''
      }
      rows.push(row)
    }

    return rows
  }

  private splitCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = false
          }
        } else {
          current += ch
        }
      } else {
        if (ch === '"') {
          inQuotes = true
        } else if (ch === ',') {
          result.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
    }
    result.push(current.trim())
    return result
  }

  /** 读取 Excel (.xlsx/.xls) → 文本 */
  private async readExcel(absPath: string): Promise<string> {
    try {
      const XLSX = require('xlsx')
      const workbook = XLSX.readFile(absPath)
      const parts: string[] = []
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const csv = XLSX.utils.sheet_to_csv(sheet)
        parts.push(`[Sheet: ${sheetName}]\n${csv}`)
      }
      return parts.join('\n\n')
    } catch {
      return `[Excel 文件: ${path.basename(absPath)}，xlsx 解析需安装 xlsx 包]`
    }
  }

  /** 读取 Word (.docx) → 纯文本 */
  private async readDocx(absPath: string): Promise<string> {
    try {
      const mammoth = require('mammoth')
      const result = await mammoth.extractRawText({ path: absPath })
      return result.value
    } catch {
      return `[Word 文件: ${path.basename(absPath)}，docx 解析需安装 mammoth 包]`
    }
  }

  /** 读取 PDF → 纯文本 */
  private async readPdf(absPath: string): Promise<string> {
    try {
      const pdfParse = require('pdf-parse')
      const dataBuffer = fs.readFileSync(absPath)
      const data = await pdfParse(dataBuffer)
      return data.text
    } catch {
      return `[PDF 文件: ${path.basename(absPath)}，pdf 解析需安装 pdf-parse 包]`
    }
  }

  /** 读取 HTML → 纯文本（去标签） */
  private async readHtml(absPath: string): Promise<string> {
    try {
      const cheerio = require('cheerio')
      const html = fs.readFileSync(absPath, 'utf-8')
      const $ = cheerio.load(html)
      // 去除 script/style
      $('script, style, noscript').remove()
      // 提取 body 文字（保留标题结构）
      const title = $('title').text().trim()
      const body = $('body').text().trim()
      // 清理多余空白
      const clean = body.replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ')
      return title ? `# ${title}\n\n${clean}` : clean
    } catch {
      try {
        // fallback: 简单去标签
        const html = fs.readFileSync(absPath, 'utf-8')
        return html.replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim()
      } catch {
        return `[HTML 文件: ${path.basename(absPath)}]`
      }
    }
  }
}
