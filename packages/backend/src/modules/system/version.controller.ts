import { Controller, Get, Query, Logger } from '@nestjs/common'
import { request as httpsRequest } from 'https'
import { TIMEOUT } from '@openoba/core/dist/common/constants/timeouts'

const DEFAULT_VERSION = '1.4.0-alpha9'

/**
 * 版本检查 / 升级信息控制器
 *
 * 双通道升级检测：
 *   主通道：openoba.com/api/v1/update（官网，用户首选）
 *   降级通道：GitHub Releases API（免费，官网离线时使用）
 *
 * GET /system/version/check?current=1.0.0
 */
@Controller('system/version')
export class VersionController {
  private readonly logger = new Logger(VersionController.name)

  @Get('check')
  async checkUpdate(@Query('current') current?: string) {
    const cur = current || DEFAULT_VERSION
    const deployMode = process.env.OPENOBA_MODE || 'operator'

    // 通道 1：官网升级服务（主）
    try {
      const official = await this.fetchFromOfficial(cur)
      if (official) return { ...official, deployMode }
    } catch (err) {
      this.logger.warn(`官网升级服务不可达: ${(err as Error).message}`)
    }

    // 通道 2：GitHub Releases（降级）
    try {
      const github = await this.fetchFromGitHub(cur)
      if (github) return { ...github, deployMode }
    } catch (err) {
      this.logger.warn(`GitHub 也不可达: ${(err as Error).message}`)
    }

    // 完全离线：静默降级，不触发更新提示
    return { hasUpdate: false, currentVersion: cur, latestVersion: cur, downloadUrl: null, channel: 'offline', deployMode }
  }

  /**
   * 通道 1：openoba.com 官网升级服务
   *
   * API: GET https://openoba.com/api/v1/update?current=1.0.0&product=core
   *
   * 响应格式：
   * {
   *   "hasUpdate": true,
   *   "latestVersion": "1.1.0",
   *   "changelog": "修复了xxx, 新增了xxx",
   *   "downloadUrl": "https://openoba.com/download/core/v1.1.0",
   *   "publishedAt": "2026-06-15T10:00:00Z",
   *   "minVersion": "1.0.0"
   * }
   */
  private fetchFromOfficial(current: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = `https://openoba.com/api/v1/update?current=${encodeURIComponent(current)}&product=core`
      const req = httpsRequest(url, {
        timeout: TIMEOUT.VERSION_CHECK,
        headers: { 'Accept': 'application/json', 'User-Agent': 'OpenOBA-Core' },
      }, (res) => {
        let data = ''
        res.on('data', (c: Buffer) => (data += c.toString()))
        res.on('end', () => {
          try {
            const j = JSON.parse(data)
            resolve({
              hasUpdate: j.hasUpdate ?? false,
              currentVersion: current,
              latestVersion: j.latestVersion ?? null,
              changelog: j.changelog ?? null,
              downloadUrl: j.downloadUrl ?? null,
              publishedAt: j.publishedAt ?? null,
              channel: 'official',
            })
          } catch { resolve(null) }
        })
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
      req.end()
    })
  }

  /**
   * 通道 2：GitHub Releases API（降级）
   */
  private fetchFromGitHub(current: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = 'https://api.github.com/repos/openoba/core/releases/latest'
      const req = httpsRequest(url, {
        timeout: TIMEOUT.VERSION_CHECK,
        headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'OpenOBA-Core' },
      }, (res) => {
        let data = ''
        res.on('data', (c: Buffer) => (data += c.toString()))
        res.on('end', () => {
          try {
            const release = JSON.parse(data)
            const latest = (release.tag_name || '').replace(/^v/, '')
            resolve({
              hasUpdate: this.isNewerVersion(latest, current.replace(/^v/, '')),
              currentVersion: current,
              latestVersion: latest || null,
              changelog: release.body || null,
              downloadUrl: release.html_url || null,
              publishedAt: release.published_at || null,
              channel: 'github',
            })
          } catch { resolve(null) }
        })
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
      req.end()
    })
  }

  /** 比较版本号：仅当 latest > current 时返回 true */
  private isNewerVersion(latest: string, current: string): boolean {
    const l = this.parseVersion(latest)
    const c = this.parseVersion(current)
    if (!l || !c) return false
    for (let i = 0; i < 3; i++) {
      if ((l[i] || 0) > (c[i] || 0)) return true
      if ((l[i] || 0) < (c[i] || 0)) return false
    }
    return false
  }

  private parseVersion(v: string): number[] | null {
    const m = v.match(/^(\d+)\.(\d+)\.(\d+)/)
    if (!m) return null
    return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])]
  }
}
