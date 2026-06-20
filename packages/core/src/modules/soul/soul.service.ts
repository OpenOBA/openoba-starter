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
    const l2Blocks: string[] = []
    if (needs.codePath) {
      l2Blocks.push(this.buildCodePathContext())
    }
    if (needs.entities) {
      l2Blocks.push(this.buildEntityContext(needs.entityFields))
    }
    if (needs.inventory) {
      l2Blocks.push(this.buildInventoryContext())
    }
    if (needs.draftPool) {
      l2Blocks.push(this.buildDraftPoolContext())
    }
    if (needs.orgInfo) {
      const orgInfo = await this.orgInfoBuilder.get()
      if (orgInfo) l2Blocks.push(this.orgInfoBuilder.build(orgInfo))
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
  // L2 · 各环境上下文构建器
  // ═══════════════════════════════════════════

  /** 项目路径地图（元镜自省——帮助 LLM 了解系统结构） */
  private buildCodePathContext(): string {
    return `
【系统地图】

后端引擎模块: backend/src/modules/
├── erdl/（ERDL 协议核心：解析/规则引擎/LLM桥接）
├── eros/（Agent 执行引擎 + Chat + 知识库）
├── meta-mirror/（元镜自省引擎）
├── soul/（Agent 统一人格构建器）
├── tool-registry/（工具注册中心）
├── system/（用户/角色/权限/审计/部署）
├── auth/（认证）
└── health/（健康检查）

ERDL 规则文件: backend/erdl/

修改建议：理解模块间依赖后再修改。
`.trim()
  }

  /** Entity 列表（引擎层模块自动扫描生成） */
  private buildEntityContext(fullFields: boolean): string {
    const erdlHint = `
🌐 ERDL 翻译器可用：你用语义字段名操作 Entity，系统自动翻译为物理列名。
不确定 Entity 结构时先用 erdl_crud read 查看字段。`
    return `
【可用 Entity】通过元镜自省引擎动态获取。如需操作数据库，先调用 erdl_crud read 了解表结构。
${erdlHint}
`.trim()
  }

  private buildInventoryContext(): string {
    return `
【引擎层】库存操作为行业模块功能，需加载对应行业规则文件后可用。
`.trim()
  }

  private buildDraftPoolContext(): string {
    return `
【引擎层】草稿池为行业模块功能，需加载对应行业规则文件后可用。
`.trim()
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
      const logs: any[] = await this.manifestRepo.manager.query(
        `SELECT title, content, created_at
         FROM cognitive_log
         WHERE agent_id = ? OR actor = ?
         ORDER BY created_at DESC
         LIMIT 5`,
        [agentCode, agentCode],
      )
      if (logs.length > 0) {
        const summaries = logs.map((l: any) => {
          const time = new Date(l.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
          return `- ${time} ${l.title}`
        })
        lines.push('【最近记忆】\n' + summaries.join('\n'))
      }
    } catch (e: unknown) {
      this.logger.debug(`cognitive_log 查询失败（表可能未初始化）: ${(e as Error).message}`)
    }

    // V1.3 专利对齐 — L3 持久记忆注入（agent_memory）
    try {
      const memories: any[] = await this.manifestRepo.manager.query(
        `SELECT category, severity, title, content, scope, hit_count
         FROM agent_memory
         WHERE (agent_code = ? OR scope = 'global')
           AND status IN ('active', 'reinforced')
         ORDER BY hit_count DESC
         LIMIT 8`,
        [agentCode],
      )
      if (memories.length > 0) {
        const memoryLines = memories.map((m: any) => {
          const levelIcon = m.severity === 'block' ? '⛔' : m.severity === 'warning' ? '⚠️' : '💡'
          return `${levelIcon} [${m.category}] ${m.title}: ${m.content}`
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
    let manifest: any = null
    try {
      manifest = await this.manifestRepo.findOne({
        where: { agentCode, status: 'active' },
      })
    } catch (e: any) {
      this.logger.warn(`Agent 查询失败: ${e.message}`)
    }

    if (!manifest) {
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
        const rows: any[] = await this.manifestRepo.manager.query(
          `SELECT u.real_name, u.username, r.role_code, r.role_name
           FROM sys_user u
           LEFT JOIN sys_user_role ur ON ur.user_id COLLATE utf8mb4_unicode_ci = u.user_id COLLATE utf8mb4_unicode_ci
           LEFT JOIN sys_role r ON r.role_id COLLATE utf8mb4_unicode_ci = ur.role_id COLLATE utf8mb4_unicode_ci
           WHERE u.user_id COLLATE utf8mb4_unicode_ci = ? AND u.is_deleted = 0`,
          [manifest.userId],
        )
        if (rows.length > 0) {
          realName = rows[0].real_name || rows[0].username || ''
          roleCodes = rows.filter((r: any) => r.role_code).map((r: any) => r.role_code)
          roleNames = rows.filter((r: any) => r.role_name).map((r: any) => r.role_name)
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
    return this.buildSystemPrompt('openoba-main', 'task', taskType)
  }

  async buildChatSystemPrompt(userMessage?: string): Promise<string> {
    return this.buildSystemPrompt('openoba-main', 'chat', undefined, userMessage)
  }

  async buildFullSystemPrompt(): Promise<string> {
    return this.buildSystemPrompt('openoba-main', 'full')
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
    } catch (e: any) {
      this.logger.warn(`认知日志写入失败: ${e.message}`)
    }
  }
}
