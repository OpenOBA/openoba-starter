/**
 * ERA SOUL 模块 — 核心服务 V2
 *
 * 分层注入模型（模仿 OpenClaw 启动协议）：
 *   L0 · 系统灵魂（所有Agent，永远注入，可缓存）
 *   L1 · 身份铁律（按 agentType 注入）
 *   L2 · 环境认知（按需注入：关键词触发）
 *   L3 · 任务上下文（动态加载：认知日志 + 任务描述）
 *
 * 三种模式：
 *   chat  — 日常对话（轻量注入，关键词触发 L2）
 *   task  — 任务流转（按 taskType 注入 L2）
 *   full  — @ 全知模式（完整注入，对齐 OpenClaw 体验）
 *
 * @file soul.service.ts
 * @author OpenOBA
 * @since 2026-05-25
 */

import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AgentManifest } from '../system/agent/agent-manifest.entity'
import { SYSTEM_SOUL, SYSTEM_SOUL_FULL } from './soul-content/system-soul'
import { AgentIdentityBuilder } from './agent-identity.builder'
import { OrgInfoBuilder } from './org-info.builder'
import { RoleCapabilityBuilder } from './role-capability.builder'
import { IronRulesBuilder } from './iron-rules.builder'
import { MirrorKnowledgeReader } from './mirror-knowledge-reader'
import { AgentIdentity } from './soul.types'

/** 注入模式 */
export type SoulMode = 'chat' | 'task' | 'full'

/** L2 环境上下文需求 */
export interface ContextNeeds {
  /** 是否注入代码路径地图 */
  codePath: boolean
  /** 是否注入 Entity 列表 */
  entities: boolean
  /** 是否注入完整 Entity 字段 */
  entityFields: boolean
  /** 是否注入库存操作规则 */
  inventory: boolean
  /** 是否注入草稿池规则 */
  draftPool: boolean
  /** 是否注入组织信息 */
  orgInfo: boolean
}

@Injectable()
export class SoulService {
  private readonly logger = new Logger(SoulService.name)

  constructor(
    @InjectRepository(AgentManifest)
    private readonly manifestRepo: Repository<AgentManifest>,
    private readonly identityBuilder: AgentIdentityBuilder,
    private readonly orgInfoBuilder: OrgInfoBuilder,
    private readonly capabilityBuilder: RoleCapabilityBuilder,
    private readonly ironRulesBuilder: IronRulesBuilder,
    private readonly mirror: MirrorKnowledgeReader,
  ) {}

  // ═══════════════════════════════════════════
  // 核心入口 V2：分层构建
  // ═══════════════════════════════════════════

  /**
   * 🔑 分层构建 Agent 的 System Prompt
   *
   * @param agentCode - Agent 编码
   * @param mode      - 注入模式 (chat/task/full)
   * @param taskType  - 任务类型（task 模式必传）
   * @param userMessage - 用户消息（chat 模式用于关键词检测）
   */
  async buildSystemPrompt(
    agentCode: string,
    mode: SoulMode = 'chat',
    taskType?: string,
    userMessage?: string,
  ): Promise<string> {
    const identity = await this.resolveAgentIdentity(agentCode)
    const needs = this.detectContextNeeds(mode, taskType, userMessage)

    // ── L0 · 系统灵魂 ──
    const l0 = mode === 'full' ? SYSTEM_SOUL_FULL : SYSTEM_SOUL

    // ── L1 · 身份铁律 ──
    const l1 = [
      this.identityBuilder.build(identity),
      this.ironRulesBuilder.build(identity, taskType),
    ].filter(Boolean).join('\n\n')

    // ── L2 · 环境认知（按需）──
    // V1.6.0: 从元镜知识文件动态读取，不再返回占位符
    const mirrorKnowledge = this.mirror.read()
    const l2Blocks: string[] = []
    if (needs.codePath) {
      l2Blocks.push(mirrorKnowledge.codePath)
    }
    if (needs.entities) {
      l2Blocks.push(mirrorKnowledge.entityIndex)
    }
    if (needs.entityFields && mirrorKnowledge.available) {
      // 全字段模式：从 _index 提取所有 entity 名，注入前3个关键 Entity 详情
      const entNames = this.extractTopEntitiesFromIndex(mirrorKnowledge.entityIndex, 3)
      for (const name of entNames) {
        const detail = mirrorKnowledge.entityDetail(name)
        if (detail) l2Blocks.push(detail)
      }
    }
    if (needs.inventory && mirrorKnowledge.available) {
      // 从交互点手册读取库存规则
      const interactionsPath = 'knowledge/era-erp-interactions.md'
      const fs = require('fs')
      if (fs.existsSync(interactionsPath)) {
        const content = fs.readFileSync(interactionsPath, 'utf-8')
        const stockSection = (content.split('## 库存')[1] || content.split('## inventory')[1] || '').substring(0, 400)
        if (stockSection) l2Blocks.push('【库存操作规则】（元镜注入）\n' + stockSection.trim())
      }
    }
    if (needs.draftPool && mirrorKnowledge.available) {
      // 草稿池规则——从 Entity 定义推断
      l2Blocks.push('【草稿池】（元镜注入）\n- draft_create: 在草稿池中创建 SPU/SKU，需人工审核后上架\n- 来源标记为 ai，可在草稿池页面查看、编辑、审核')
    }
    if (needs.orgInfo) {
      const orgInfo = await this.orgInfoBuilder.get()
      if (orgInfo) l2Blocks.push(this.orgInfoBuilder.build(orgInfo))
    }
    // 注入 API 概览（轻量，仅当 entities 需要时）
    if (needs.entities && mirrorKnowledge.apiOverview) {
      l2Blocks.push(mirrorKnowledge.apiOverview)
    }
    const l2 = l2Blocks.join('\n\n')

    // ── L3 · 任务上下文 ──
    const l3 = await this.buildTaskContext(agentCode, userMessage)

    // ── 组装 ──
    const layers = [
      l0,
      l1 || '',
      l2 || '',
      l3 || '',
    ].filter(s => s.length > 0)

    const prompt = layers.join('\n\n---\n\n')
    this.logger.log(
      `SoulPrompt V2 | agent=${agentCode} type=${identity.agentType} ` +
      `mode=${mode} task=${taskType || 'none'} ` +
      `needs=${JSON.stringify(needs)} ` +
      `layers=${layers.length} length=${prompt.length}`,
    )

    return prompt
  }

  // ═══════════════════════════════════════════
  // 关键词检测 → 确定 L2 环境注入内容
  // ═══════════════════════════════════════════

  private detectContextNeeds(
    mode: SoulMode,
    taskType?: string,
    userMessage?: string,
  ): ContextNeeds {
    // full 模式 → 全部注入
    if (mode === 'full') {
      return {
        codePath: true, entities: true, entityFields: true,
        inventory: true, draftPool: true, orgInfo: true,
      }
    }

    // task 模式 → 按 taskType 注入
    if (mode === 'task' && taskType) {
      return this.needsForTaskType(taskType)
    }

    // chat 模式 → 按关键词检测
    const msg = (userMessage || '').toLowerCase()
    return {
      codePath: /代码|修改|修复|file|编辑|编译|bug|fix|前端|后端|vue|ts/.test(msg),
      entities: /商品|spu|sku|订单|客户|库存|入库|出库|上架|数据|查询|entity/.test(msg),
      entityFields: /创建|写入|insert|update|delete|修改.*表/.test(msg),
      inventory: /库存|入库|出库|stock|inventory/.test(msg),
      draftPool: /草稿|draft|设计.*新品|生成.*方案/.test(msg),
      orgInfo: /同事|谁在|岗位|agent.*列表|组织/.test(msg),
    }
  }

  private needsForTaskType(taskType: string): ContextNeeds {
    switch (taskType) {
      case 'product_listing':
        return {
          codePath: false, entities: true, entityFields: true,
          inventory: true, draftPool: true, orgInfo: false,
        }
      case 'tech_support':
        return {
          codePath: true, entities: true, entityFields: true,
          inventory: false, draftPool: false, orgInfo: true,
        }
      case 'content_creation':
        return {
          codePath: false, entities: true, entityFields: false,
          inventory: false, draftPool: true, orgInfo: false,
        }
      case 'customer_service':
        return {
          codePath: false, entities: true, entityFields: false,
          inventory: false, draftPool: false, orgInfo: false,
        }
      default:
        return {
          codePath: false, entities: true, entityFields: false,
          inventory: false, draftPool: false, orgInfo: false,
        }
    }
  }

  // ═══════════════════════════════════════════
  // L2 · 辅助：从元镜实体索引提取前 N 个实体名
  // ═══════════════════════════════════════════

  private extractTopEntitiesFromIndex(indexText: string, max: number): string[] {
    const names: string[] = []
    for (const line of indexText.split('\n')) {
      const match = line.match(/📦 \w+: (.+)/)
      if (match) {
        for (const ent of match[1].split(',')) {
          const name = ent.trim().split('(')[0]
          if (name && names.length < max) names.push(name)
        }
      }
    }
    return names
  }

  // ═══════════════════════════════════════════
  // L3 · 任务上下文（认知日志）
  // ═══════════════════════════════════════════

  private async buildTaskContext(
    agentCode: string,
    userMessage?: string,
  ): Promise<string> {
    const lines: string[] = []

    // 最近认知日志（跨会话记忆闭环）
    try {
      const logs: Record<string, unknown>[] = await this.manifestRepo.manager.query(
        `SELECT title, content, created_at
         FROM cognitive_log
         WHERE agent_id = ? OR actor = ?
         ORDER BY created_at DESC
         LIMIT 5`,
        [agentCode, agentCode],
      )
      if (logs.length > 0) {
        const summaries = logs.map((l: Record<string, unknown>) => {
          const time = new Date(l['created_at'] as string).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
          return `- ${time} ${l['title'] as string}`
        })
        lines.push('【最近记忆】\n' + summaries.join('\n'))
      }
    } catch (e: unknown) {
      this.logger.debug(`cognitive_log 查询失败（表可能未初始化）: ${(e as Error).message}`)
    }

    // V1.3 专利对齐 — L3 持久记忆注入（agent_memory）
    try {
      const memories: Record<string, unknown>[] = await this.manifestRepo.manager.query(
        `SELECT category, severity, title, content, scope, hit_count
         FROM agent_memory
         WHERE (owner_agent = ? OR scope = 'global')
           AND status IN ('active', 'reinforced')
         ORDER BY hit_count DESC
         LIMIT 8`,
        [agentCode],
      )
      if (memories.length > 0) {
        const memoryLines = memories.map((m: Record<string, unknown>) => {
          const levelIcon = m['severity'] as string === 'block' ? '⛔' : m['severity'] as string === 'warning' ? '⚠️' : '💡'
          return `${levelIcon} [${m['category'] as string}] ${m['title'] as string}: ${m['content'] as string}`
        })
        lines.push('📚 历史经验教训：\n' + memoryLines.join('\n'))
      }
    } catch (e: unknown) {
      this.logger.debug(`agent_memory 查询失败（表可能未初始化）: ${(e as Error).message}`)
    }

    return lines.join('\n\n')
  }

  /** 公开身份解析方法（供 chatExecute 权限过滤使用） */
  async resolveIdentity(agentCode: string): Promise<AgentIdentity> {
    return this.resolveAgentIdentity(agentCode)
  }

  // ═══════════════════════════════════════════
  // Agent 身份解析（同 V1，保持不变）
  // ═══════════════════════════════════════════

  private async resolveAgentIdentity(agentCode: string): Promise<AgentIdentity> {
    let manifest: AgentManifest | null = null
    try {
      manifest = await this.manifestRepo.findOne({
        where: { agentCode, status: 'active' },
      })
    } catch (e: unknown) {
      this.logger.warn(`Agent 查询失败: ${(e as Error).message}`)
    }

    if (!manifest) {
      // V1.6.0: 已知核心 Agent 硬编码兜底 — 防止 DB 空表导致降级为 sub/L1
      const KNOWN_MAIN_AGENTS = new Set(['tanghaoran', 'main-agent', 'main_agent', 'agent-main'])
      if (KNOWN_MAIN_AGENTS.has(agentCode)) {
        this.logger.warn(`Agent ${agentCode} 未注册，使用 Main Agent 兜底身份（L4全权限）`)
        return {
          agentCode,
          agentName: '唐浩然（OpenOBA AI 执行官）',
          agentType: 'main',
          icon: '🤖',
          roleCodes: ['admin'],
          roleNames: ['AI 执行官'],
          securityClearance: 'L4',
          status: 'active',
        }
      }

      this.logger.warn(`Agent ${agentCode} 未注册，使用兜底身份`)
      return {
        agentCode, agentName: `${agentCode} 的 AI 助手`, agentType: 'sub',
        icon: '👤', roleCodes: [], roleNames: [], securityClearance: 'L1', status: 'unknown',
      }
    }

    let realName = ''
    let roleCodes: string[] = []
    let roleNames: string[] = []

    if (manifest.userId) {
      try {
        const rows: Record<string, unknown>[] = await this.manifestRepo.manager.query(
          `SELECT u.real_name, u.username, r.role_code, r.role_name
           FROM sys_user u
           LEFT JOIN sys_user_role ur ON ur.user_id COLLATE utf8mb4_unicode_ci = u.user_id COLLATE utf8mb4_unicode_ci
           LEFT JOIN sys_role r ON r.role_id COLLATE utf8mb4_unicode_ci = ur.role_id COLLATE utf8mb4_unicode_ci
           WHERE u.user_id COLLATE utf8mb4_unicode_ci = ? AND u.is_deleted = 0`,
          [manifest.userId],
        )
        if (rows.length > 0) {
          realName = (rows[0]['real_name'] as string) || (rows[0]['username'] as string) || ''
          roleCodes = rows.filter((r: Record<string, unknown>) => r['role_code']).map((r: Record<string, unknown>) => r['role_code'] as string)
          roleNames = rows.filter((r: Record<string, unknown>) => r['role_name']).map((r: Record<string, unknown>) => r['role_name'] as string)
        }
      } catch (e: unknown) {
        this.logger.debug(`用户信息查询失败（表可能未初始化）: ${(e as Error).message}`)
      }
    }

    return {
      agentCode: manifest.agentCode || agentCode,
      agentName: manifest.agentName || `${agentCode} 的 AI 助手`,
      agentType: manifest.agentType || 'sub',
      icon: manifest.agentType === 'main' ? '🤖' : '👤',
      securityClearance: manifest.securityClearance || 'L1',
      userId: manifest.userId,
      realName, roleCodes, roleNames,
      capabilitiesJson: manifest.capabilitiesJson,
      status: manifest.status || 'active',
    }
  }

  // ═══════════════════════════════════════════
  // 便捷方法
  // ═══════════════════════════════════════════

  async buildMainSystemPrompt(taskType?: string): Promise<string> {
    return this.buildSystemPrompt('main-agent', 'task', taskType)
  }

  async buildChatSystemPrompt(userMessage?: string): Promise<string> {
    return this.buildSystemPrompt('main-agent', 'chat', undefined, userMessage)
  }

  async buildFullSystemPrompt(): Promise<string> {
    return this.buildSystemPrompt('main-agent', 'full')
  }

  async buildUserSystemPrompt(userId: string, taskType?: string): Promise<string> {
    return this.buildSystemPrompt(`user-${userId}`, 'task', taskType)
  }

  // ═══════════════════════════════════════════
  // 认知日志闭环
  // ═══════════════════════════════════════════

  /** 写入认知日志（Agent 对话结束后调用） */
  async logCognitive(agentCode: string, title: string, content: Record<string, unknown>): Promise<void> {
    try {
      const id = require('crypto').randomUUID().replace(/-/g, '')
      await this.manifestRepo.manager.query(
        `INSERT INTO cognitive_log (id, log_type, source_module, level, title, content, agent_id, actor, actor_type, created_at)
         VALUES (?, 'event', 'soul', 'info', ?, ?, ?, ?, 'agent', ?)`,
        [id, title, JSON.stringify(content), agentCode, agentCode, Date.now()],
      )
      this.logger.log(`🧠 认知日志: ${title}`)
    } catch (e: unknown) {
      this.logger.warn(`认知日志写入失败: ${(e as Error).message}`)
    }
  }
}
