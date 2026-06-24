/**
 * 版本守护生成器 — 版本号一致性检查、CHANGELOG 追踪、Commit 审计
 *
 * @file version-guard.generator.ts
 * @author 唐浩然（OpenOBA AI 执行官）
 * @since 2026-06-24
 *
 * 解决我们踩过的坑：
 *   - 6/19: 50 commits 没有版本标记，回滚困难
 *   - CHANGELOG 断档，不知道"改了哪些、谁改的、为什么"
 *   - 版本号分散在 3 个 package.json，不一致时前端/后端行为不匹配
 *   - 提交信息不规范，无法自动生成 release note
 */

import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

// ── 类型定义 ──

/** 版本号信息（从 package.json 提取） */
export interface VersionInfo {
  source: string              // 文件路径
  version: string             // 1.4.0-alpha9
  major: number               // 1
  minor: number               // 4
  patch: number               // 0
  preRelease?: string         // alpha9
}

/** 版本一致性检查结果 */
export interface VersionConsistencyReport {
  consistent: boolean
  versions: VersionInfo[]
  conflicts: Array<{
    source1: string
    version1: string
    source2: string
    version2: string
  }>
  recommendation: string
}

/** 单个 commit 信息 */
export interface CommitAuditEntry {
  hash: string                // 短 hash
  fullHash: string            // 完整 hash
  message: string
  author: string
  date: string
  filesChanged: number
  passesConvention: boolean   // 是否符合提交规范
  warnings: string[]          // 规范检查警告
}

/** Commit 规范审计报告 */
export interface CommitAuditReport {
  totalCommits: number
  sinceTag: string
  conventionalRatio: number   // 符合规范的比例
  byType: Record<string, number>  // feat:3 / fix:2 / chore:1
  entries: CommitAuditEntry[]
  unwrittenChangelogItems: string[]  // 有 commit 但没有 CHANGELOG 的内容
}

/** 完整版本守护报告 */
export interface VersionGuardReport {
  generatedAt: string
  currentVersion: VersionInfo
  versionConsistency: VersionConsistencyReport
  commitAudit: CommitAuditReport
  changelogStatus: {
    exists: boolean
    lastUpdated: string
    unreleasedEntries: number
    needsUpdate: boolean
  }
  recommendations: string[]
}

@Injectable()
export class VersionGuardGenerator {
  private readonly logger = new Logger(VersionGuardGenerator.name)

  /**
   * 生成完整版本守护报告
   */
  generate(projectRoot: string): VersionGuardReport {
    const currentVersion = this.readVersion(projectRoot)
    const versionConsistency = this.checkConsistency(projectRoot)
    const commitAudit = this.auditCommits(projectRoot)
    const changelogStatus = this.checkChangelog(projectRoot, commitAudit)

    const recommendations: string[] = []

    if (!versionConsistency.consistent) {
      recommendations.push(`🔴 版本号不一致！${versionConsistency.conflicts.length} 处冲突需修复`)
    }

    if (commitAudit.conventionalRatio < 0.8) {
      recommendations.push(`🟡 提交规范遵守率 ${(commitAudit.conventionalRatio * 100).toFixed(0)}% 低于 80%`)
    }

    if (changelogStatus.needsUpdate) {
      recommendations.push(`🟡 CHANGELOG.md 需更新 — ${changelogStatus.unreleasedEntries} 条未记录变更`)
    }

    if (currentVersion.preRelease) {
      recommendations.push(`🔵 当前为预发布版本 (${currentVersion.preRelease})，考虑发布正式版时移除 pre-release 标签并打 tag`)
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ 版本状态健康')
    }

    return {
      generatedAt: new Date().toISOString(),
      currentVersion,
      versionConsistency,
      commitAudit,
      changelogStatus,
      recommendations,
    }
  }

  /**
   * 读取根 package.json 版本号
   */
  private readVersion(projectRoot: string): VersionInfo {
    const pkgPath = path.join(projectRoot, 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    const [major, minor, patch] = (pkg.version as string).split('.').map(Number)
    const preMatch = (pkg.version as string).match(/-(\w+)/)
    return {
      source: pkgPath,
      version: pkg.version,
      major, minor, patch,
      preRelease: preMatch?.[1],
    }
  }

  /**
   * 检查 monorepo 中所有 package.json 版本一致性
   */
  checkConsistency(projectRoot: string): VersionConsistencyReport {
    const versionFiles = [
      'package.json',
      'packages/core/package.json',
      'frontend/package.json',
    ].map(f => path.join(projectRoot, f))

    const versions: VersionInfo[] = []
    for (const f of versionFiles) {
      if (!fs.existsSync(f)) continue
      try {
        const pkg = JSON.parse(fs.readFileSync(f, 'utf-8'))
        const v = pkg.version as string
        const [major, minor, patch] = v.split('.').map(Number)
        const preMatch = v.match(/-(\w+)/)
        versions.push({
          source: path.relative(projectRoot, f),
          version: v,
          major, minor, patch,
          preRelease: preMatch?.[1],
        })
      } catch (e: unknown) {
        this.logger.warn(`读取 ${path.basename(f)} 失败: ${(e as Error).message}`)
      }
    }

    const conflicts: VersionConsistencyReport['conflicts'] = []
    for (let i = 0; i < versions.length; i++) {
      for (let j = i + 1; j < versions.length; j++) {
        if (versions[i].version !== versions[j].version) {
          conflicts.push({
            source1: versions[i].source,
            version1: versions[i].version,
            source2: versions[j].source,
            version2: versions[j].version,
          })
        }
      }
    }

    return {
      consistent: conflicts.length === 0,
      versions,
      conflicts,
      recommendation: conflicts.length === 0
        ? '所有 package.json 版本一致'
        : `请统一版本号为 ${versions[0].version}`,
    }
  }

  /**
   * 审计最近 commits — 检查规范遵守情况
   */
  auditCommits(projectRoot: string): CommitAuditReport {
    let output = ''
    try {
      output = execSync(
        'git log --oneline --since="2 weeks ago" --format="%h|||%H|||%s|||%an|||%aI" -50',
        { cwd: projectRoot, encoding: 'utf-8', maxBuffer: 1024 * 1024 },
      )
    } catch (e: unknown) {
      this.logger.warn(`git log 失败: ${(e as Error).message}`)
      return { totalCommits: 0, sinceTag: 'unknown', conventionalRatio: 0, byType: {}, entries: [], unwrittenChangelogItems: [] }
    }

    // 获取最近的 tag
    let sinceTag = 'HEAD'
    try {
      sinceTag = execSync('git describe --tags --abbrev=0 2>nul', { cwd: projectRoot, encoding: 'utf-8' }).trim() || 'HEAD'
    } catch { /* no tags yet */ }

    // 检查是否遵循 Conventional Commits
    const commitLines = output.trim().split('\n').filter(Boolean)
    const entries: CommitAuditEntry[] = []
    const byType: Record<string, number> = {}

    for (const line of commitLines) {
      const [hash, fullHash, message, author, date] = line.split('|||')
      // Conventional Commits 检查: <type>(<scope>): <description>
      const conventionalMatch = message.match(/^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\([\w-]+\))?:\s/)
      const warnings: string[] = []

      if (!conventionalMatch) {
        warnings.push('不符合 Conventional Commits 规范')
      } else {
        const type = conventionalMatch[1]
        byType[type] = (byType[type] || 0) + 1
      }

      if (message.length > 72) {
        warnings.push('提交信息超过 72 字符')
      }

      entries.push({
        hash,
        fullHash,
        message,
        author,
        date,
        filesChanged: 0, // 不阻塞地从 git diff stat 获取
        passesConvention: warnings.length === 0,
        warnings,
      })
    }

    // 生成 unwritten changelog items
    const unwritten: string[] = []
    for (const e of entries) {
      if (e.passesConvention && e.message.match(/^(feat|fix)/)) {
        unwritten.push(`- ${e.message} (${e.hash})`)
      }
    }

    return {
      totalCommits: entries.length,
      sinceTag,
      conventionalRatio: entries.length > 0
        ? entries.filter(e => e.passesConvention).length / entries.length
        : 0,
      byType,
      entries: entries.slice(0, 20),  // 只保留最近 20 条
      unwrittenChangelogItems: unwritten.slice(0, 20),
    }
  }

  /**
   * 检查 CHANGELOG.md 状态
   */
  private checkChangelog(
    projectRoot: string,
    audit: CommitAuditReport,
  ): VersionGuardReport['changelogStatus'] {
    const changelogPath = path.join(projectRoot, 'CHANGELOG.md')
    const exists = fs.existsSync(changelogPath)

    let lastUpdated = '未知'
    let unreleasedEntries = 0

    if (exists) {
      const stat = fs.statSync(changelogPath)
      lastUpdated = stat.mtime.toISOString()
      
      // 数一下 [Unreleased] 小节下的条目
      try {
        const content = fs.readFileSync(changelogPath, 'utf-8')
        const unreleasedMatch = content.match(/## \[Unreleased\]([\s\S]*?)(?=## \[|$)/)
        if (unreleasedMatch) {
          // 数 ### 标题
          unreleasedEntries = (unreleasedMatch[1].match(/### /g) || []).length
        }
      } catch (e: unknown) {
        this.logger.warn(`CHANGELOG 解析失败: ${(e as Error).message}`)
      }
    }

    // 如果有新的 feat/fix 提交但 CHANGELOG 未更新
    const hasNewFeatOrFix = audit.byType.feat > 0 || audit.byType.fix > 0
    const needsUpdate = !exists || (hasNewFeatOrFix && unreleasedEntries === 0)

    return { exists, lastUpdated, unreleasedEntries, needsUpdate }
  }

  /**
   * 将版本守护报告写入 Markdown
   */
  writeReport(report: VersionGuardReport, outputDir: string): void {
    let md = '# 🛡️ 版本守护报告\n\n'
    md += `> 元镜自动生成 · ${report.generatedAt.split('T')[0]}\n\n`

    // 当前版本
    md += '## 📦 当前版本\n\n'
    md += `**${report.currentVersion.version}**`
    if (report.currentVersion.preRelease) md += `（预发布: \`${report.currentVersion.preRelease}\`）`
    md += '\n\n'

    // 版本一致性
    md += '## 🔗 版本一致性\n\n'
    const vc = report.versionConsistency
    md += `状态: ${vc.consistent ? '✅ 一致' : '🔴 不一致'}\n\n`
    md += '| 文件 | 版本 |\n|------|------|\n'
    for (const v of vc.versions) {
      md += `| \`${v.source}\` | ${v.version} |\n`
    }
    for (const c of vc.conflicts) {
      md += `\n⚠️ **冲突**: \`${c.source1}\` = ${c.version1} vs \`${c.source2}\` = ${c.version2}\n`
      md += `> ${vc.recommendation}\n`
    }
    md += '\n'

    // Commit 审计
    md += '## 📋 Commit 审计\n\n'
    const ca = report.commitAudit
    md += `| 指标 | 值 |\n|------|----|\n`
    md += `| 统计区间 | ${ca.sinceTag} → HEAD (${ca.totalCommits} commits) |\n`
    md += `| 规范遵守率 | ${(ca.conventionalRatio * 100).toFixed(0)}% |\n`

    if (Object.keys(ca.byType).length > 0) {
      md += '\n### 提交类型分布\n\n'
      md += '| 类型 | 数量 |\n|------|------|\n'
      for (const [type, count] of Object.entries(ca.byType)) {
        const emoji: Record<string, string> = {
          feat: '✨', fix: '🐛', docs: '📝', refactor: '♻️',
          perf: '⚡', test: '✅', chore: '🔧', style: '💄',
          ci: '👷', build: '📦', revert: '⏪',
        }
        md += `| ${emoji[type] || '📌'} ${type} | ${count} |\n`
      }
    }

    if (ca.entries.length > 0) {
      md += '\n### 最近 Commits\n\n'
      md += '| Hash | 信息 | 作者 | 日期 |\n|------|------|------|------|\n'
      for (const e of ca.entries.slice(0, 15)) {
        const icon = e.passesConvention ? '✅' : '⚠️'
        const shortMsg = e.message.length > 60 ? e.message.substring(0, 57) + '...' : e.message
        md += `| \`${e.hash}\` ${icon} | ${shortMsg} | ${e.author} | ${e.date.substring(0, 10)} |\n`
      }
    }
    md += '\n'

    // CHANGELOG 状态
    md += '## 📝 CHANGELOG 状态\n\n'
    const cs = report.changelogStatus
    md += `| 指标 | 值 |\n|------|----|\n`
    md += `| 文件存在 | ${cs.exists ? '✅' : '❌'} |\n`
    md += `| 最后更新 | ${cs.lastUpdated} |\n`
    md += `| [Unreleased] 条目 | ${cs.unreleasedEntries} |\n`
    md += `| 需要更新 | ${cs.needsUpdate ? '🔴 是' : '✅ 否'} |\n\n`

    if (ca.unwrittenChangelogItems.length > 0) {
      md += '### 待写入 CHANGELOG 的变更\n\n'
      for (const item of ca.unwrittenChangelogItems.slice(0, 10)) {
        md += `${item}\n`
      }
      md += '\n'
    }

    // 建议
    md += '## 💡 建议\n\n'
    for (const r of report.recommendations) {
      md += `- ${r}\n`
    }
    md += '\n'

    // 同时生成人类可读的 summary JSON（供前端面板）
    const summaryPath = path.join(outputDir, 'version-guard.json')
    fs.writeFileSync(summaryPath, JSON.stringify(report, null, 2), 'utf-8')

    const mdPath = path.join(outputDir, 'version-guard-report.md')
    fs.writeFileSync(mdPath, md, 'utf-8')
    this.logger.log(`VersionGuardGenerator: 报告写入 version-guard-report.md + version-guard.json`)
  }

  /**
   * 暴露给外部工具的方法：检查版本号一致性
   */
  quickCheck(projectRoot: string): { ok: boolean; issues: string[] } {
    const vc = this.checkConsistency(projectRoot)
    if (vc.consistent) return { ok: true, issues: [] }
    return {
      ok: false,
      issues: vc.conflicts.map(c => `${c.source1}:${c.version1} ≠ ${c.source2}:${c.version2}`),
    }
  }
}
