/**
 * 秒镜科技 · ERDL — Enterprise Resource Definition Language
 *
 * @file ERDL Hot Reload — 文件热重载 Watcher
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-01
 * @license BSL-1.1
 *
 * Copyright (c) 2026 深圳市秒镜科技有限公司
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * @description
 * 文件热重载 Watcher，监听 erdl/ 目录下 .erdl 文件的变化。
 * 文件变化时自动重新解析并热替换注册表中的定义，
 * 实现"改规则不重启"的 Wow Moment。
 *
 * 生产环境下自动禁用（通过 NODE_ENV=production 判断）。
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import * as chokidar from 'chokidar'
import { ERDLParser } from '../parser/erdl-parser'
import { ERDLRegistry } from './erdl-registry'
import { EntityProxyService } from './entity-proxy.service'

/**
 * ERDL 文件热重载 Watcher
 *
 * 工作原理：
 * 1. NestJS 模块初始化时，扫描 erdl/ 目录加载所有 .erdl 文件
 * 2. 使用 chokidar 监听文件变化
 * 3. 文件变化 → 重新 parse → registry.hotReplace()
 * 4. Rule Engine 自动使用新规则，无需重启 NestJS
 */
@Injectable()
export class ERDLHotReload implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ERDLHotReload.name)
  private watcher: chokidar.FSWatcher | null = null

  constructor(
    private readonly registry: ERDLRegistry,
    private readonly proxy: EntityProxyService,
  ) {}

  /**
   * 模块初始化时启动文件监听
   */
  async onModuleInit(): Promise<void> {
    // 生产环境下禁用热重载
    if (process.env.NODE_ENV === 'production') {
      this.logger.log('[ERDL] Hot reload disabled in production mode')
      return
    }

    const erdlDir = path.join(process.cwd(), 'erdl')

    if (!fs.existsSync(erdlDir)) {
      this.logger.log(`[ERDL] ERDL directory not found: ${erdlDir}, skipping hot reload`)
      return
    }

    // 初始加载所有 .erdl 文件
    await this.loadAll(erdlDir)

    // 启动文件监听
    this.watcher = chokidar.watch(erdlDir, {
      ignoreInitial: true,
      ignored: /(^|[\/\\])\../, // 忽略隐藏文件
    })

    this.watcher
      .on('change', (filePath) => {
        this.logger.log(`[ERDL] 📝 File changed: ${path.basename(filePath)}`)
        void this.reloadFile(filePath)
      })
      .on('add', (filePath) => {
        this.logger.log(`[ERDL] 📄 New file: ${path.basename(filePath)}`)
        void this.loadFile(filePath)
      })
      .on('unlink', (filePath) => {
        this.logger.log(`[ERDL] 🗑️ File removed: ${path.basename(filePath)}`)
        this.registry['unregisterSource']?.(filePath)
      })

    this.logger.log(`[ERDL] 🔥 Hot reload watching: ${erdlDir}`)
  }

  /**
   * 模块销毁时关闭文件监听
   */
  onModuleDestroy(): void {
    this.watcher?.close()
  }

  // ============================================
  // 私有方法
  // ============================================

  /** 加载目录下所有 .erdl 文件 */
  private async loadAll(dir: string): Promise<void> {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.erdl'))
    if (files.length === 0) {
      this.logger.log('[ERDL] No .erdl files found')
      return
    }

    for (const file of files) {
      await this.loadFile(path.join(dir, file))
    }

    this.logger.log(`[ERDL] Initial load complete: ${files.length} file(s)`)
  }

  /** 加载单个 .erdl 文件 */
  private async loadFile(filePath: string): Promise<void> {
    try {
      // V2.0: Schema 校验 — 不合法则拒绝加载
      if (!this.registry.validateFile(filePath)) {
        this.logger.error(`[ERDL] ❌ ${path.basename(filePath)} 校验失败，拒绝加载`)
        return
      }

      const ast = ERDLParser.parse(filePath)
      this.registry.register(ast, filePath)
    } catch (error) {
      this.logger.error(
        `[ERDL] Failed to load ${path.basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /** 重新加载单个文件（热替换）— P1修复：热替换后自动刷新EntityProxy */
  private async reloadFile(filePath: string): Promise<void> {
    try {
      // V2.0: 热替换前先校验
      if (!this.registry.validateFile(filePath)) {
        this.logger.error(`[ERDL] ❌ ${path.basename(filePath)} 校验失败，拒绝热替换`)
        return
      }

      const ast = ERDLParser.parse(filePath)
      const replaced = this.registry.hotReplace(ast, filePath)
      if (replaced) {
        this.logger.log(`[ERDL] ✅ Hot reload complete: ${path.basename(filePath)}`)
        // P1修复：热替换后刷新EntityProxy映射缓存
        this.proxy.refreshMappings('industry.eyewear')
      } else {
        this.logger.log(`[ERDL] ⏭️ No changes: ${path.basename(filePath)}`)
      }
    } catch (error) {
      this.logger.error(
        `[ERDL] Failed to reload ${path.basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}
