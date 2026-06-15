/**
 * 秒镜科技 · ERDL — Enterprise Resource Definition Language
 *
 * @file ERDL Registry — 运行时注册中心
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
 * 管理所有已加载的 ERDL 定义（Entity/Rule/Agent/KB）。
 * 特性：
 * - 运行时内存注册（Map 存储）
 * - 支持热替换（通过文件哈希检测变化）
 * - 提供查询接口（供 LLM Bridge、Schema Generator 使用）
 * - 按命名空间隔离，支持多行业扩展
 */

import { Injectable, Logger } from '@nestjs/common'
import * as path from 'path'
import { ERDLAST, AliasMap, AliasesRegistry, ERDLActionDef } from '../parser/erdl-parser'
import { RuleDefinition, RuleConditionGroup } from './rule-definition'
import { ERDLValidator } from './erdl-validator'

// ============================================
// 类型定义
// ============================================

/**
 * Entity 注册信息
 */
export interface EntityRegistration {
  /** 命名空间 */
  namespace: string
  /** Entity 名称 */
  name: string
  /** V1.3: 数据库物理表名 */
  table?: string
  /** V1.3: 主键列名 */
  primaryKey?: string
  /** Entity 属性定义 */
  properties: Record<string, unknown>
  /** Entity 元数据（知识关联、图标、分类等） */
  metadata?: Record<string, unknown>
  /** 源文件路径（用于热替换检测） */
  sourceFile?: string
  /** 注册时间 */
  loadedAt: Date
}

/**
 * Agent 注册信息
 */
export interface AgentRegistration {
  /** Agent 名称 */
  name: string
  /** 命名空间 */
  namespace: string
  /** Agent 定义 */
  definition: Record<string, unknown>
  /** 源文件路径 */
  sourceFile?: string
}

/**
 * 知识库注册信息
 */
export interface KnowledgeBaseRegistration {
  /** 知识库名称 */
  name: string
  /** 命名空间 */
  namespace: string
  /** 知识库定义 */
  definition: Record<string, unknown>
  /** 源文件路径 */
  sourceFile?: string
}

// ============================================
// ERDL Registry 核心类
// ============================================

/**
 * ERDL 运行时注册中心
 *
 * 管理所有从 .erdl 文件加载的定义，供 Rule Engine、LLM Bridge、
 * Schema Generator 等组件查询使用。
 *
 * @example
 * ```typescript
 * const registry = new ERDLRegistry()
 * const ast = ERDLParser.parse('./erdl/eyewear.erdl')
 * registry.register(ast, './erdl/eyewear.erdl')
 *
 * const entity = registry.getEntity('industry.eyewear', 'ProductSpu')
 * console.log(entity?.properties)
 * ```
 */
@Injectable()
export class ERDLRegistry {
  private readonly logger = new Logger(ERDLRegistry.name)

  /** Entity 注册表：key = "namespace.name" */
  private entities = new Map<string, EntityRegistration>()

  /** 规则注册表：key = rule id */
  private rules = new Map<string, RuleDefinition>()

  /** Agent 注册表：key = "namespace.name" */
  private agents = new Map<string, AgentRegistration>()

  /** 知识库注册表：key = "namespace.name" */
  private knowledgeBases = new Map<string, KnowledgeBaseRegistration>()

  /** Live-ERDL: 同步策略注册表 */
  private syncPolicies = new Map<string, any>()

  /** Live-ERDL: 语义层配置 */
  private semanticLayer: any = null

  /** Live-ERDL V1.2: 别名映射表 { EntityName → { alias → fieldName } } */
  private aliases = new Map<string, AliasMap>()

  /** V1.5: Action 定义表 { actionName → ERDLActionDef } */
  private actionDefs = new Map<string, ERDLActionDef>()

  /** 文件哈希映射：用于热替换检测（key = 文件路径） */
  private fileHashes = new Map<string, string>()

  /** V2.0: ERDL Schema 校验器 */
  private readonly validator = new ERDLValidator()

  /**
   * V2.0: 基于 AST 校验 .erdl 文件
   *
   * 先通过 ERDLParser 解析（YAML + Zod），再用 AST 做语义校验。
   * 不再使用行级文本解析。
   *
   * @returns true = 校验通过, false = 校验失败
   */
  validateFile(filePath: string): boolean {
    const fileName = require('path').basename(filePath)
    let ast: ERDLAST

    try {
      const { ERDLParser } = require('../parser/erdl-parser')
      ast = ERDLParser.parse(filePath)
    } catch (e) {
      this.logger.error(`[ERDL] ❌ ${fileName} 解析失败，已拒绝`)
      this.logger.error(`  错误: ${e instanceof Error ? e.message : String(e)}`)
      return false
    }

    const report = this.validator.validateFromAst(ast, fileName)

    if (!report.valid) {
      this.logger.error('='.repeat(60))
      this.logger.error(`❌ ERDL 校验失败 · ${require('path').basename(filePath)}`)
      this.logger.error('='.repeat(60))
      for (const issue of report.issues) {
        const prefix = issue.severity === 'ERROR' ? '❌' : '⚠️'
        this.logger.error(`  ${prefix} [${issue.rule}] ${issue.message}`)
        if (issue.section) this.logger.error(`     位置: ${issue.section}`)
        if (issue.line) this.logger.error(`     行号: ${issue.line}`)
      }
      this.logger.error('='.repeat(60))
      this.logger.error('ERDL 加载已阻止。请修复以上错误后重启服务。')
      this.logger.error('='.repeat(60))
      return false
    }

    if (report.warnings > 0) {
      this.logger.warn(`ERDL 校验通过但存在 ${report.warnings} 个警告`)
      for (const issue of report.issues.filter(i => i.severity === 'WARNING')) {
        this.logger.warn(`  ⚠️ [${issue.rule}] ${issue.message}`)
      }
    }

    return true
  }

  /**
   * 注册一个 ERDL AST
   *
   * 将 AST 中的所有定义（Entity/Rulesets/Agents/KnowledgeBases）
   * 注册到运行时内存中。
   *
   * @param ast 已解析的 ERDL AST
   * @param sourceFile 源文件路径（可选，用于热替换追踪）
   */
  register(ast: ERDLAST, sourceFile?: string): void {
    const { namespace } = ast

    // 注册 Entity
    if (ast.entities) {
      for (const [name, entity] of Object.entries(ast.entities)) {
        const key = this.makeKey(namespace, name)
        this.entities.set(key, {
          namespace,
          name,
          table: entity.table,
          primaryKey: entity.primaryKey,
          properties: entity.properties,
          metadata: entity.metadata as Record<string, unknown> | undefined,
          sourceFile,
          loadedAt: new Date(),
        })
        this.logger.log(`[ERDL] Entity registered: ${key}`)
      }
    }

    // 注册 Rulesets 中的规则
    if (ast.rulesets) {
      for (const [rulesetName, ruleset] of Object.entries(ast.rulesets)) {
        const allRules = [
          ...(ruleset.policies || []),
          ...(ruleset.validations || []),
        ]
        for (const rule of allRules) {
          const ruleId = `rule-${namespace}-${rulesetName}-${rule.name.toLowerCase().replace(/\s+/g, '-')}`
          const ruleDef: RuleDefinition = {
            id: ruleId,
            name: rule.name,
            namespace,
            entity: rule.entity || 'Unknown',
            trigger: rule.trigger,
            priority: rule.priority,
            tier: rule.tier,
            condition: (rule.condition ?? { logic: 'AND', conditions: [] }) as RuleConditionGroup,
            actions: rule.actions || [],
            isActive: true,
            createdAt: new Date(),
            version: 1,
          }
          this.rules.set(ruleId, ruleDef)
          this.logger.log(`[ERDL] Rule registered: ${ruleDef.name} (${ruleDef.tier})`)
        }
      }
    }

    // 注册 Agents
    if (ast.agents) {
      for (const [name, definition] of Object.entries(ast.agents)) {
        const key = this.makeKey(namespace, name)
        this.agents.set(key, {
          name,
          namespace,
          definition: definition as Record<string, unknown>,
          sourceFile,
        })
        this.logger.log(`[ERDL] Agent registered: ${key}`)
      }
    }

    // 注册 Knowledge Bases
    if (ast.knowledgeBases) {
      for (const [name, definition] of Object.entries(ast.knowledgeBases)) {
        const key = this.makeKey(namespace, name)
        this.knowledgeBases.set(key, {
          name,
          namespace,
          definition: definition as Record<string, unknown>,
          sourceFile,
        })
        this.logger.log(`[ERDL] KnowledgeBase registered: ${key}`)
      }
    }

    // Live-ERDL: 注册 sync_policy
    if (ast.sync_policy) {
      for (const [name, policy] of Object.entries(ast.sync_policy)) {
        this.syncPolicies.set(this.makeKey(namespace, name), policy)
        this.logger.log(`[ERDL] SyncPolicy registered: ${name}`)
      }
    }

    // Live-ERDL V1.2: 注册 aliases（行业黑话映射）
    if (ast.aliases) {
      for (const [entityName, aliasMap] of Object.entries(ast.aliases)) {
        const key = this.makeKey(namespace, entityName)
        const existing = this.aliases.get(key) || {}
        // 合并：新条目覆盖旧条目
        this.aliases.set(key, { ...existing, ...aliasMap as AliasMap })
        this.logger.log(`[ERDL] Aliases registered: ${key} (${Object.keys(aliasMap).length} mappings)`)
      }
    }

    // Live-ERDL: 注册 semantic_layer
    if (ast.semantic_layer) {
      this.semanticLayer = ast.semantic_layer
      this.logger.log('[ERDL] SemanticLayer registered')
    }

    // V1.5: 注册 Actions
    if (ast.actions) {
      for (const [name, action] of Object.entries(ast.actions)) {
        this.actionDefs.set(name, action as ERDLActionDef)
        this.logger.log(`[ERDL] Action registered: ${name} (${Object.keys(action.params || {}).length} params)`)
      }
    }

    // 记录文件哈希
    if (sourceFile) {
      this.fileHashes.set(sourceFile, this.computeHash(ast))
    }
  }

  /**
   * 获取 Entity 定义
   *
   * @param namespace 命名空间
   * @param name Entity 名称
   * @returns Entity 注册信息，不存在时返回 undefined
   */
  getEntity(namespace: string, name: string): EntityRegistration | undefined {
    return this.entities.get(this.makeKey(namespace, name))
  }

  /**
   * 获取所有 Entity 定义
   * @returns Entity 注册列表
   */
  getAllEntities(): EntityRegistration[] {
    return Array.from(this.entities.values())
  }

  /**
   * 获取规则定义
   *
   * @param id 规则 ID
   * @returns 规则定义，不存在时返回 undefined
   */
  getRule(id: string): RuleDefinition | undefined {
    return this.rules.get(id)
  }

  /**
   * 获取所有规则定义
   * @returns 规则定义列表
   */
  getAllRules(): RuleDefinition[] {
    return Array.from(this.rules.values())
  }

  /**
   * 按触发器筛选规则
   *
   * @param trigger 触发器标识
   * @returns 匹配的规则列表
   */
  getRulesByTrigger(trigger: string): RuleDefinition[] {
    return this.getAllRules().filter((r) => r.trigger === trigger)
  }

  /**
   * 获取 Agent 定义
   *
   * @param namespace 命名空间
   * @param name Agent 名称
   * @returns Agent 注册信息
   */
  getAgent(namespace: string, name: string): AgentRegistration | undefined {
    return this.agents.get(this.makeKey(namespace, name))
  }

  /**
   * 获取所有 Agent 定义
   * @returns Agent 注册列表
   */
  getAllAgents(): AgentRegistration[] {
    return Array.from(this.agents.values())
  }

  /**
   * 获取知识库定义
   *
   * @param namespace 命名空间
   * @param name 知识库名称
   * @returns 知识库注册信息
   */
  getKnowledgeBase(namespace: string, name: string): KnowledgeBaseRegistration | undefined {
    return this.knowledgeBases.get(this.makeKey(namespace, name))
  }

  /**
   * 获取所有知识库定义
   * @returns 知识库注册列表
   */
  getAllKnowledgeBases(): KnowledgeBaseRegistration[] {
    return Array.from(this.knowledgeBases.values())
  }

  /** Live-ERDL: 获取所有同步策略 */
  getSyncPolicies(): Map<string, any> {
    return this.syncPolicies
  }

  /** Live-ERDL: 获取语义层配置 */
  getSemanticLayer(): any {
    return this.semanticLayer
  }

  /** V1.5: 获取 Action 定义 */
  getActionDef(name: string): ERDLActionDef | undefined {
    return this.actionDefs.get(name)
  }

  /** V1.5: 获取所有 Action 定义 */
  getAllActionDefs(): Map<string, ERDLActionDef> {
    return this.actionDefs
  }

  /** V1.5: 获取指定 Entity 的别名映射表 */
  getAliasMap(namespace: string, entityName: string): AliasMap | undefined {
    return this.aliases.get(this.makeKey(namespace, entityName))
  }

  /**
   * Live-ERDL V1.2: 获取所有别名映射
   * @returns 按命名空间+Entity组织的别名表
   */
  getAliases(): Map<string, AliasMap> {
    return this.aliases
  }

  /**
   * Live-ERDL V1.2: 解析别名 → 标准字段名
   *
   * 在用户输入 "标签" → 找到映射 "label" → 返回标准字段名
   * 如果没有映射，返回原始输入（即认为输入本身就是标准字段名）
   *
   * @param namespace 命名空间
   * @param entityName Entity 名称
   * @param term 用户输入的术语（可能是别名/黑话）
   * @returns 标准字段名，未映射时返回原文
   */
  resolveAlias(namespace: string, entityName: string, term: string): string {
    const key = this.makeKey(namespace, entityName)
    const aliasMap = this.aliases.get(key)
    if (!aliasMap) return term

    // 精确匹配
    if (aliasMap[term]) return aliasMap[term]

    // 大小写不敏感匹配
    const lower = term.toLowerCase()
    for (const [alias, field] of Object.entries(aliasMap)) {
      if (alias.toLowerCase() === lower) return field
    }

    // 未匹配，返回原词
    return term
  }

  /**
   * Live-ERDL V1.2: 获取反向别名（标准字段 → 所有别名列表）
   * 用于 Prompt 注入：告诉 LLM 这些别名都指向同一个字段
   *
   * @param namespace 命名空间
   * @param entityName Entity 名称
   * @returns { fieldName → [alias1, alias2, ...] }
   */
  getReverseAliases(namespace: string, entityName: string): Record<string, string[]> {
    const key = this.makeKey(namespace, entityName)
    const aliasMap = this.aliases.get(key)
    if (!aliasMap) return {}

    const reverse: Record<string, string[]> = {}
    for (const [alias, field] of Object.entries(aliasMap)) {
      if (!reverse[field]) reverse[field] = []
      reverse[field].push(alias)
    }
    return reverse
  }

  /**
   * Live-ERDL V1.2: 添加单条别名映射
   * 用于运行时从对话中自动沉淀
   *
   * @param namespace 命名空间
   * @param entityName Entity 名称
   * @param alias 行业术语/黑话
   * @param fieldName 标准字段名
   */
  addAlias(namespace: string, entityName: string, alias: string, fieldName: string): void {
    const key = this.makeKey(namespace, entityName)
    const existing = this.aliases.get(key) || {}
    existing[alias] = fieldName
    this.aliases.set(key, existing)
    this.logger.log(`[ERDL] Alias added: ${key}.${alias} → ${fieldName}`)
  }

  /**
   * 热替换：检测文件变化 → 清除旧定义 → 重新注册
   *
   * 通过比较文件哈希判断是否需要更新。如果文件内容未变化，
   * 则跳过重新注册，节省资源。
   *
   * @param ast 新的 ERDL AST
   * @param sourceFile 源文件路径
   * @returns 是否发生了实际替换（true=有变化并已替换，false=无变化跳过）
   */
  hotReplace(ast: ERDLAST, sourceFile: string): boolean {
    const newHash = this.computeHash(ast)
    const oldHash = this.fileHashes.get(sourceFile)

    if (newHash === oldHash) {
      this.logger.debug(`[ERDL] No changes detected, skipping hot replace: ${sourceFile}`)
      return false
    }

    this.logger.log(`[ERDL] Hot replace detected: ${sourceFile}`)

    // 清除该源文件注册的所有定义
    this.unregisterSource(sourceFile)

    // 重新注册
    this.register(ast, sourceFile)

    this.logger.log(`[ERDL] ✅ Hot replace complete: ${sourceFile}`)
    return true
  }

  /**
   * 获取注册统计信息
   * @returns 各类定义的数量
   */
  getStats(): {
    entities: number
    rules: number
    agents: number
    knowledgeBases: number
    syncPolicies: number
    aliases: number
    files: number
  } {
    // 计算总别名数
    let aliasCount = 0
    for (const [, aliasMap] of this.aliases) {
      aliasCount += Object.keys(aliasMap).length
    }
    return {
      entities: this.entities.size,
      rules: this.rules.size,
      agents: this.agents.size,
      knowledgeBases: this.knowledgeBases.size,
      syncPolicies: this.syncPolicies.size,
      aliases: aliasCount,
      files: this.fileHashes.size,
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  /** 生成注册表 key */
  private makeKey(namespace: string, name: string): string {
    return `${namespace}.${name}`
  }

  /** 清除指定源文件注册的所有定义 */
  private unregisterSource(sourceFile: string): void {
    // 清除 Entity
    for (const [key, reg] of this.entities) {
      if (reg.sourceFile === sourceFile) {
        this.entities.delete(key)
        this.logger.log(`[ERDL] Entity unregistered: ${key}`)
      }
    }

    // 清除 Rules（通过 sourceFile 关联较复杂，这里简化处理：
    // 实际应用中可在 RuleDefinition 中记录 sourceFile）
    // 暂时不删除规则，由后续 register 覆盖

    // 清除 Agent
    for (const [key, reg] of this.agents) {
      if (reg.sourceFile === sourceFile) {
        this.agents.delete(key)
        this.logger.log(`[ERDL] Agent unregistered: ${key}`)
      }
    }

    // 清除 Knowledge Base
    for (const [key, reg] of this.knowledgeBases) {
      if (reg.sourceFile === sourceFile) {
        this.knowledgeBases.delete(key)
        this.logger.log(`[ERDL] KnowledgeBase unregistered: ${key}`)
      }
    }

    // Live-ERDL V1.2: 清除该源文件注册的 aliases
    // P1修复：alias key格式为 namespace.entityName，sourceFile为文件路径，
    // 两者永不匹配。改用 basename 匹配。
    const sourceBase = path.basename(sourceFile, '.erdl')
    for (const [key] of this.aliases) {
      // key格式: "namespace.EntityName"，其中namespace通常含文件名
      // 例如 sourceBase="eyewear" → 匹配 "industry.eyewear.*"
      if (key.includes(sourceBase)) {
        this.aliases.delete(key)
        this.logger.log(`[ERDL] Aliases unregistered: ${key}`)
      }
    }
  }

  /**
   * 卸载指定 .erdl 文件的所有注册内容
   * 删除源文件 + 从内存注册表移除所有关联项
   *
   * @param sourceFile 源文件路径（相对于 backend/erdl/）
   * @returns 卸载统计
   */
  unregisterFile(sourceFile: string): { removed: { entities: number; rules: number; agents: number; knowledgeBases: number }; deletedFile: boolean } {
    let entities = 0, rules = 0, agents = 0, knowledgeBases = 0

    // 从各 Map 中移除匹配 sourceFile 的条目
    for (const [key, e] of this.entities) {
      if (e.sourceFile === sourceFile) { this.entities.delete(key); entities++ }
    }
    for (const [key, r] of this.rules) {
      if ((r as any).sourceFile === sourceFile) { this.rules.delete(key); rules++ }
    }
    for (const [key, a] of this.agents) {
      if (a.sourceFile === sourceFile) { this.agents.delete(key); agents++ }
    }
    for (const [key, kb] of this.knowledgeBases) {
      if (kb.sourceFile === sourceFile) { this.knowledgeBases.delete(key); knowledgeBases++ }
    }
    this.fileHashes.delete(sourceFile)

    // 删除物理文件
    let deletedFile = false
    try {
      const fs = require('fs')
      const filePath = path.resolve(process.cwd(), 'erdl', sourceFile)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        deletedFile = true
        this.logger.log(`[ERDL] 文件已删除: ${sourceFile}`)
      }
    } catch (e: any) {
      this.logger.error(`[ERDL] 删除文件失败: ${e.message}`)
    }

    this.logger.log(`[ERDL] 卸载完成: ${entities} Entity, ${rules} Rule, ${agents} Agent, ${knowledgeBases} KB`)
    return { removed: { entities, rules, agents, knowledgeBases }, deletedFile }
  }

  /** 计算 AST 哈希（用于变化检测） */
  private computeHash(ast: ERDLAST): string {
    const str = JSON.stringify(ast)
    return require('crypto').createHash('sha256').update(str).digest('hex').substring(0, 16)
  }
}
