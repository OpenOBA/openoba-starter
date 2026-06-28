/**
 * 元镜 Manifest — hash 快照 + 变更检测
 */

import { Injectable, Logger } from '@nestjs/common'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import type { MirrorManifest } from './types'

@Injectable()
export class ManifestService {
  private readonly logger = new Logger(ManifestService.name)
  private manifestPath: string

  constructor() {
    this.manifestPath = path.join(process.cwd(), 'knowledge', '_manifest.json')
  }

  /** 计算源码 Hash */
  computeSourceHash(projectRoot: string): string {
    const hash = crypto.createHash('sha256')

    // V1.6.0修复: projectRoot 已是 monorepo 根，源码在 packages/core/src
    const srcDir = path.join(projectRoot, 'packages', 'core', 'src')
    this.hashDirectory(hash, srcDir)

    // ERDL 文件
    const erdlDir = path.join(projectRoot, 'packages', 'core', 'erdl')
    if (fs.existsSync(erdlDir)) this.hashDirectory(hash, erdlDir)

    // 配置文件
    for (const f of ['package.json', 'tsconfig.json', '.eslintrc.js', '.eslintrc.json']) {
      const fp = path.join(projectRoot, 'packages', 'core', f)
      if (fs.existsSync(fp)) hash.update(fs.readFileSync(fp))
    }

    return hash.digest('hex')
  }

  private hashDirectory(hash: crypto.Hash, dir: string) {
    if (!fs.existsSync(dir)) return
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'dist') continue
        this.hashDirectory(hash, path.join(dir, e.name))
      } else if (e.isFile() && /\.(ts|erdl)$/.test(e.name)) {
        hash.update(fs.readFileSync(path.join(dir, e.name)))
      }
    }
  }

  /** 加载 manifest */
  load(): MirrorManifest | null {
    if (!fs.existsSync(this.manifestPath)) return null
    try {
      return JSON.parse(fs.readFileSync(this.manifestPath, 'utf-8'))
    } catch {
      return null
    }
  }

  /** 保存 manifest */
  save(stats: Omit<MirrorManifest, 'files'> & { files?: Record<string, string> }) {
    const dir = path.dirname(this.manifestPath)
    fs.mkdirSync(dir, { recursive: true })

    const manifest: MirrorManifest = {
      ...stats,
      files: stats.files || {},
      generatedAt: new Date().toISOString(),
    }

    fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
    this.logger.debug(`Manifest 已保存: ${this.manifestPath}`)
  }

  /** 是否需要重新生成 */
  needsRegen(projectRoot: string): boolean {
    const manifest = this.load()
    if (!manifest) return true

    // V1.6.0: 兜底检查 — manifest 存在但知识文件缺失 → 强制 regenerate
    const indexPath = path.join(path.dirname(this.manifestPath), 'entities', '_index.md')
    if (!fs.existsSync(indexPath)) {
      this.logger.warn('知识文件缺失，强制重新生成')
      return true
    }

    const currentHash = this.computeSourceHash(projectRoot)
    const needs = manifest.sourceHash !== currentHash

    if (needs) {
      this.logger.log(`检测到代码变更（hash: ${manifest.sourceHash.substring(0, 8)} → ${currentHash.substring(0, 8)}）`)
    }

    return needs
  }
}
