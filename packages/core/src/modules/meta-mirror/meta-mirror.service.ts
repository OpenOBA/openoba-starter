/**
 * 元镜（Meta-Mirror）— 主服务
 *
 * 启动时调度扫描 → 比较 hash → 生成 knowledge markdown
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import * as path from 'path'
import { EntityScanner } from './scanners/entity.scanner'
import { APIScanner } from './scanners/api.scanner'
import { ModuleScanner } from './scanners/module.scanner'
import { RuleScanner } from './scanners/rule.scanner'
import { KnowledgeWriter } from './generators/knowledge-writer.generator'
import { DepGraphGenerator } from './generators/depgraph.generator'
import { ErdlAuditScanner } from './scanners/erdl-audit.scanner'
import type { EnhancedRuleInfo } from './scanners/rule.scanner'
import { ContextInjector } from './generators/context-injector.generator'
import { ManifestService } from './manifest'
import type { ConventionInfo, MirrorRefs, InjectedContext } from './types'

@Injectable()
export class MetaMirrorService implements OnModuleInit {
  private readonly logger = new Logger(MetaMirrorService.name)
  private readonly projectRoot: string

  constructor(
    private readonly entityScanner: EntityScanner,
    private readonly apiScanner: APIScanner,
    private readonly moduleScanner: ModuleScanner,
    private readonly ruleScanner: RuleScanner,
    private readonly writer: KnowledgeWriter,
    private readonly depGraph: DepGraphGenerator,
    private readonly contextInjector: ContextInjector,
    private readonly erdlAudit: ErdlAuditScanner,
    private readonly manifest: ManifestService,
  ) {
    // process.cwd() = backend/，projectRoot = backend/.. = Phase-0-地基
    this.projectRoot = path.resolve(process.cwd(), '..')
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('='.repeat(50))
    this.logger.log('🔮 元镜（Meta-Mirror）引擎启动')
    this.logger.log('='.repeat(50))

    try {
      const needsRegen = this.manifest.needsRegen(this.projectRoot)

      if (!needsRegen) {
        const m = this.manifest.load()
        this.logger.log(`  ✓ 系统无变更 · ${m?.entityCount || '?'}实体 · ${m?.apiCount || '?'}API · ${m?.generatedAt}`)
        this.logger.log('🔮 元镜就绪 · 反观自照')
        return
      }

      await this.regenerate()
    } catch (e: unknown) {
      this.logger.error(`元镜启动失败: ${(e as Error).message}`)
    }
  }

  /** 强制重新扫描 + 生成 */
  async regenerate(): Promise<void> {
    // 源码在 backend/src（不是根目录/src）
    const srcDir = path.join(this.projectRoot, 'backend', 'src')

    // Step 1: 扫描
    this.logger.log('  ⚡ 扫描源码...')
    const entities = this.entityScanner.scan(srcDir)
    const apis = this.apiScanner.scan(srcDir)
    const modules = this.moduleScanner.scan(srcDir)
    const rules = this.ruleScanner.scan(this.projectRoot)
    const conventions = this.extractConventions()

    // Step 2: 统计
    const apiCount = apis.reduce((s, a) => s + a.endpoints.length, 0)
    this.logger.log(`  📊 扫描完成: ${entities.length}实体 ${apiCount}API ${rules.length}规则 ${modules.length}模块`)

    // Step 3: 生成 Markdown
    this.logger.log('  📝 生成知识文件...')
    await this.writer.writeAll(entities, apis, modules, rules, conventions)

    // V2.0: 生成依赖图
    this.logger.log('  🕸️ 生成依赖图...')
    const depGraph = this.depGraph.generate(entities)
    await this.depGraph.write(depGraph, path.join(process.cwd(), 'knowledge'))

    // Step 4: 保存 Manifest
    const sourceHash = this.manifest.computeSourceHash(this.projectRoot)
    this.manifest.save({
      sourceHash,
      entityCount: entities.length,
      apiCount,
      moduleCount: modules.length,
      ruleCount: rules.length,
      generatedAt: new Date().toISOString(),
    })

    // V2.0 P1: ERDL ↔ DTO 一致性审计
    this.logger.log('  🔍 ERDL ↔ DTO 一致性审计...')
    const enhancedRules = (this.ruleScanner as unknown as { scanEnhanced?: Function }).scanEnhanced?.(this.projectRoot) || rules
    const outputDir = path.join(process.cwd(), 'knowledge')
    // DTO 扫描器通过 EntityScanner 间接获取
    const dtoScanner = new (require('./scanners/dto.scanner').DtoScanner)()
    const dtos = dtoScanner.scan(path.join(this.projectRoot, 'backend', 'src'))
    const auditReport = this.erdlAudit.audit(enhancedRules as unknown as EnhancedRuleInfo[], dtos, entities)
    this.erdlAudit.writeReport(auditReport, outputDir)

    this.logger.log(`  ✅ 元镜知识图谱已更新 · ${new Date().toISOString()}`)
    this.logger.log('🔮 元镜就绪 · 反观自照')
  }

  /** 提取编码约定 */
  private extractConventions(): ConventionInfo {
    const fs = require('fs')

    const namingPatterns: Record<string, string> = {
      'Entity 类名': 'PascalCase (Order)',
      '表名': 'snake_case (order)',
      'DTO 类名': 'XxxDto (CreateOrderDto)',
      'Controller': 'XxxController (OrderController)',
      'Service': 'XxxService (OrderService)',
      'Module': 'XxxModule (OrderModule)',
      '文件名': 'kebab-case (order.service.ts)',
      '列名': 'snake_case (order_no)',
    }

    const techStack: Record<string, string> = {
      '后端框架': 'NestJS 10',
      'ORM': 'TypeORM 0.3',
      '数据库': 'MySQL',
      '缓存': 'Redis',
      '前端': 'Vue 3.5 + Element Plus 2.13',
      '语言': 'TypeScript 5',
      'AI 模型': 'DeepSeek V4 + Qwen3.6',
      '协议': 'REST + WebSocket + MCP',
    }

    // 提取 ESLint 规则（从 .eslintrc.js 如果有的话读取）
    const eslintPath = path.join(this.projectRoot, '.eslintrc.js')
    const eslintRules: string[] = []
    if (fs.existsSync(eslintPath)) {
      try {
        const content = fs.readFileSync(eslintPath, 'utf-8')
        const ruleMatches = content.match(/'[^']+'/g) || []
        eslintRules.push(...ruleMatches.slice(0, 10).map((s: string) => s.replace(/'/g, '')))
      } catch (e: unknown) {
        this.logger.debug(`.eslintrc 解析失败: ${(e as Error).message}`)
      }
    }

    // tsconfig
    const tsconfigPath = path.join(this.projectRoot, 'tsconfig.json')
    let tsconfig: Record<string, unknown> = {}
    if (fs.existsSync(tsconfigPath)) {
      try { tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8')) } catch (e: unknown) {
        // JSON 带注释（如 tsconfig.json 的 // H10备注），strip 后重试
        try {
          const raw = fs.readFileSync(tsconfigPath, 'utf-8')
          const cleaned = raw.replace(/(['"]?)\s*\/\/\s.*$/gm, '$1').replace(new RegExp(',\\s*\\}'), '}')
          tsconfig = JSON.parse(cleaned)
        } catch (e: unknown) { this.logger.debug(`tsconfig strip 后仍解析失败: ${(e as Error).message}`) }
      }
    }

    return {
      namingPatterns,
      techStack,
      directoryStructure: [
        'backend/src/modules/ — 业务模块',
        'backend/src/common/ — 公共组件',
        'backend/src/migrations/ — 数据库迁移',
        'backend/erdl/ — ERDL 规则文件',
        'frontend/src/views/ — 页面',
        'frontend/src/api/ — API 封装',
        'frontend/src/composables/ — 组合式函数',
        'skills/ — SKILL 定义',
      ],
      eslintRules,
      tsconfig,
    }
  }

  // ═══════════════════════════════════════════
  // V2.0 L3: SKILL × 元镜交互
  // ═══════════════════════════════════════════

  /**
   * 🔮 根据 SKILL 的 mirror_refs 注入精准上下文
   * 
   * @param mirrorRefs - SKILL 声明的知识需求
   * @returns System Prompt 上下文块（200-500 tokens）
   */
  injectContextForSkill(mirrorRefs: MirrorRefs): InjectedContext | null {
    return this.contextInjector.inject(mirrorRefs)
  }

  /** 获取实体索引（供 ContextInjector 快速查找） */
  getEntityIndex(): Record<string, unknown> {
    const indexPath = path.join(process.cwd(), 'knowledge', 'entities', '_index.md')
    if (require('fs').existsSync(indexPath)) {
      // 返回简化索引
      return { available: true }
    }
    return { available: false }
  }
}
