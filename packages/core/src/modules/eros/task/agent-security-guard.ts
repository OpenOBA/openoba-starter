/**
 * OpenOBA · Agent Security Guard
 *
 * @file Agent 工具安全校验 — SSRF 防护 / 路径穿越 / 命令注入
 * @author 唐浩然（OpenOBA AI 联合创始人）
 * @since 2026-06-21
 * @license BSL-1.1
 *
 * 从 agent-executor.service.ts（组D）拆分而来
 * 用于：web_fetch / file_edit / git_diff 等工具的输入安全校验
 */

import { Injectable, Logger } from '@nestjs/common'
import * as path from 'path'
import type { IAgentSecurityGuard } from './agent-tools.interface'

@Injectable()
export class AgentSecurityGuard implements IAgentSecurityGuard {
  private readonly logger = new Logger(AgentSecurityGuard.name)

  /**
   * SSRF 防护：校验抓取 URL 不指向内网/IPv6 回环/链路本地
   */
  validateFetchUrl(url: string): void {
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`不支持的协议: ${parsed.protocol}`)
      }
      const h = parsed.hostname.toLowerCase()
      // IPv4 内网 + IPv6 回环 + IPv6 映射 + 链路本地
      if (
        /^((127\.|10\.|192\.168\.|169\.254\.)\d+\.\d+(\.\d+)?|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|localhost|0\.0\.0\.0)$/.test(
          h,
        )
      ) {
        throw new Error(`禁止访问内网地址: ${h}`)
      }
      if (
        h === '::1' ||
        h.startsWith('fc') ||
        h.startsWith('fe80') ||
        h.startsWith('::ffff:')
      ) {
        throw new Error(`禁止访问内网/IPv6映射地址: ${h}`)
      }
    } catch (e: any) {
      if (e.message?.includes('禁止访问') || e.message?.includes('不支持')) {
        throw e
      }
      throw new Error(`无效URL: ${url}`)
    }
  }

  /**
   * 路径穿越防护：校验文件编辑路径不越出工作区
   */
  validateFilePath(filePath: string): void {
    const resolved = path.resolve(filePath)
    const cwd = process.cwd()
    if (!resolved.startsWith(cwd)) {
      throw new Error(`路径越界: ${filePath} 不在当前工作区 ${cwd}`)
    }
    // 禁止访问 .git / node_modules / .env 等敏感路径
    const segments = resolved.split(path.sep)
    for (const seg of segments) {
      if (['.git', 'node_modules', '.env'].includes(seg)) {
        throw new Error(`禁止访问敏感路径: ${filePath}`)
      }
    }
  }

  /**
   * 命令注入防护：校验 Git 模式参数
   */
  validateGitMode(mode: string): void {
    // 仅允许 --name-only / --stat 等安全参数
    if (mode && !/^(--name-only|--stat|--cached|--staged)$/.test(mode)) {
      throw new Error(`不支持的 Git 模式: ${mode}`)
    }
  }
}
