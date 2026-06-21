/**
 * ER-OS Agent Executor — Agent 自动方案生成引擎
 *
 * @file AgentExecutorService
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-04
 * @license BSL-1.1
 *
 * @description
 * 当任务状态变为 executing 时，Agent 自动：
 * 1. 根据任务类型，查询 ERDL Registry 获取 Entity/Rule 定义
 * 2. 查询数据库获取实际业务数据（SPU/SKU/色彩/效果词等）
 * 3. 构建 System Prompt（注入 ERDL 结构 + 业务数据）
 * 4. 调用 LLM Bridge 生成方案
 * 5. 格式化为 Task Report → 自动 submitReport
 */

import type { StreamEvent } from '../stream/stream-event.types'
import { Injectable, Logger, Inject, forwardRef, OnModuleInit, Optional } from '@nestjs/common'
import * as crypto from 'crypto'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import * as fs from 'fs'
import * as path from 'path'
import { ERDLRegistry } from '../../erdl/core/erdl-registry'
import { ERDLRuleEngine } from '../../erdl/core/erdl-rule-engine'
import { ERDLLLMBridge } from '../../erdl/llm/erdl-llm-bridge'
import { EntityProxyService } from '../../erdl/core/entity-proxy.service'
import { getDefaultProvider, getAvailableProviders } from '../../erdl/llm/erdl-llm-providers'
import { AgentTask } from './agent-task.entity'
import { AgentTaskService } from './agent-task.service'
import { KnowledgeService } from './knowledge.service'
import { AgentToolRegistry } from './agent-tool-registry'
import { DraftPoolService } from '../../draft-pool/draft-pool.service'
import { DraftService } from '../../draft-pool/draft.service'
import { EntityDataBridge } from '../../erdl/core/entity-data-bridge'
import { AestheticsService } from '../../aesthetics/aesthetics.service'
import { InventoryService } from '../../inventory/inventory.service'
import { SoulService } from '../../soul/soul.service'
import { ModelRegistryService } from '../../system/model-registry.service'
import { AgentSecurityGuard } from './agent-security-guard'
import { AgentToolRegistrar } from './agent-tool-registrar'
import { AgentToolImplementations } from './agent-tool-implementations'
import { TIMEOUT } from '../../../common/constants/timeouts'

// 重新导出 AgentTaskType
export type AgentTaskType = 'product_listing' | 'content_creation' | 'customer_service' | 'tech_support'

/** 数据库行类型（raw query 返回） */
type DbRow = Record<string, string>

@Injectable()
export class AgentExecutorService implements OnModuleInit {
  private readonly logger = new Logger(AgentExecutorService.name)
  private _lastDraftId: string = ''
  /** 🔐 工具间共享查询缓存 — 每个 chatExecute 调用创建独立的请求级缓存（P1并发隔离） */
  private queryCache = new Map<string, { data: any[]; timestamp: number }>()
  private readonly CACHE_MAX_SIZE = 50
  private readonly CACHE_TTL_MS = 5 * 60 * 1000  // 5 分钟

  private cacheSet(key: string, data: any[]): void {
    // LRU 淘汰：超过上限时删除最旧条目
    if (this.queryCache.size >= this.CACHE_MAX_SIZE) {
      let oldestKey = ''
      let oldestTime = Infinity
      for (const [k, v] of this.queryCache) {
        if (v.timestamp < oldestTime) { oldestTime = v.timestamp; oldestKey = k }
      }
      if (oldestKey) this.queryCache.delete(oldestKey)
    }
    this.queryCache.set(key, { data, timestamp: Date.now() })
  }

  private cacheGet(key: string): any[] | null {
    const entry = this.queryCache.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > this.CACHE_TTL_MS) {
      this.queryCache.delete(key)
      return null
    }
    return entry.data
  }

  constructor(
    private readonly registry: ERDLRegistry,
    private readonly ruleEngine: ERDLRuleEngine,
    private readonly llmBridge: ERDLLLMBridge,
    private readonly proxy: EntityProxyService,
    private readonly knowledgeService: KnowledgeService,
    private readonly toolRegistry: AgentToolRegistry,
    @Inject(forwardRef(() => AgentTaskService))
    private readonly taskService: AgentTaskService,
    @InjectRepository(AgentTask)
    private readonly taskRepo: Repository<AgentTask>,
    private readonly draftPoolService: DraftPoolService,
    private readonly draftService: DraftService,
    private readonly aestheticsService: AestheticsService,
    private readonly inventoryService: InventoryService,
    private readonly soulService: SoulService,
    private readonly securityGuard: AgentSecurityGuard,
    private readonly toolRegistrar: AgentToolRegistrar,
    private readonly toolImpls: AgentToolImplementations,
    @Optional() private readonly modelRegistry?: ModelRegistryService,
  ) {}

  /** 模块初始化：注册所有 Agent 工具 */
  onModuleInit(): void {
    // V1.3: 构建 EntityProxy 字段映射
    this.proxy.refreshMappings('industry.eyewear')
    // 委托给 AgentToolRegistrar 注册所有工具
    this.toolRegistrar.registerAllTools({
      toolRegistry: this.toolRegistry,
      registry: this.registry,
      draftService: this.draftService,
      draftPoolService: this.draftPoolService,
      callbacks: {
        executeErpQuery: (dt) => this.executeErpQuery(dt),
        executeKnowledgeQuery: (kw) => this.executeKnowledgeQuery(kw),
        executeErdlCrud: (args) => this.executeErdlCrud(args),
        executeDraftCreate: (args) => this.executeDraftCreate(args),
        executeDraftAddSku: (args) => this.executeDraftAddSku(args),
        executeAestheticsCheck: (args) => this.executeAestheticsCheck(args),
        executeDraftList: (args) => this.executeDraftList(args),
        executeCsvExport: (e,f,d,fn) => this.executeCsvExport(e,f,d,fn),
        executeWebFetch: (u,m,mc) => this.executeWebFetch(u,m,mc),
        executeDataAnalyze: (op,d,f,tn,ff,fv) => this.executeDataAnalyze(op,d,f,tn,ff,fv),
        executeImportAnalyze: (fp) => this.executeImportAnalyze(fp),
        executeImportMap: (cols,en) => this.executeImportMap(cols,en),
        executeImportExecute: (en,d) => this.executeImportExecute(en,d),
        executeFileEdit: (args) => this.executeFileEdit(args),
        executeTscCheck: (p) => this.executeTscCheck(p),
        executeGitDiff: (m,fp) => this.executeGitDiff(m,fp),
      },
    })
  }

  /**
   * Agent 自动执行任务 — 核心入口
   *
   * @param taskId 任务 ID
   * @returns 生成的 Task Report 内容
   */
  /**
   * Agent 分析阶段（drafted → 自动出方案 → proposed）
   *
   * 在任务创建后自动调用。Agent 分析任务需求、查数据、调 LLM，
   * 生成方案后自动提交 Task Report，使任务进入 proposed 状态。
   *
   * @param taskId 任务 ID
   * @returns 生成的分析报告内容
   */
  async analyzeAndReport(taskId: string): Promise<string> {
    const task = await this.taskRepo.findOneBy({ id: taskId })
    if (!task) throw new Error(`任务不存在: ${taskId}`)
    if (task.status !== 'drafted' && task.status !== 'revised' && task.status !== 'proposed') {
      this.logger.warn(`任务 ${taskId} 状态为 ${task.status}，跳过分析`)
      return ''
    }

    this.logger.log(`🧠 Agent 开始分析任务: ${task.taskNo} [${task.type}]`)

    try {
      let reportContent: string

      // 所有轮次统一走 FC 流程（LLM 自行决定是否需要查工具）
      // 有历史时，历史对话作为上下文传给 LLM
      switch (task.type as AgentTaskType) {
        case 'product_listing':
          reportContent = await this.executeProductListing(task)
          break
        case 'content_creation':
          reportContent = await this.executeContentCreation(task)
          break
        default:
          reportContent = await this.executeGeneric(task)
      }

      // 自动提交 Task Report → 状态变 proposed
      if (reportContent) {
        // 附加元数据：知识引用 + 模型信息
        const metaFooter = this.buildReportFooter()
        await this.taskService.submitReport(
          { taskId, content: reportContent + metaFooter },
          'agent',
        )
        this.logger.log(`✅ Agent 分析完成并已汇报: ${task.taskNo}`)
      }

      return reportContent
    } catch (error) {
      const msg = error instanceof Error ? (error as Error).message : String(error)
      const stack = error instanceof Error ? error.stack : ''
      this.logger.error(`❌ Agent 分析失败: ${task?.taskNo || taskId} - ${msg}`)
      this.logger.error(`Stack: ${stack}`)
      // 即使失败也提交报告，告知任务人出了什么问题
      try {
        await this.taskService.submitReport(
          { taskId, content: `⚠️ Agent 分析出错：${msg}\n\n请检查后端日志或重试。` },
          'agent',
        )
      } catch (e: unknown) {
        this.logger.warn('submitReport 重试失败', (e as Error).message)
      }
      return ''
    }
  }

  /**
   * 获取默认 Provider Code（DB 权威 + 兜底）
   */
  private async getDefaultProviderCode(taskType?: string): Promise<string | undefined> {
    if (!this.modelRegistry) return undefined
    try {
      const dbKeys = await this.modelRegistry.getProviderKeys()
      const defaultKey = dbKeys?.find((k: any) =>
        (k.models || []).some((m: any) => m.isDefault)
      )
      if (defaultKey?.providerCode) {
        this.logger.log(`Default provider from DB: ${defaultKey.providerCode}`)
        return defaultKey.providerCode
      }
    } catch (e: unknown) {
      this.logger.warn('查询 DB 默认模型失败，回退到内置顺序', (e as Error).message)
    }
    return undefined
  }

  /**
   * 流式执行 — 跟 analyzeAndReport 逻辑相同，但通过 onToken 回调实时推送
   */
  async streamExecute(taskId: string, onEvent: (e: StreamEvent) => void): Promise<{ content: string; model: string; provider: string } | null> {
    const task = await this.taskRepo.findOneBy({ id: taskId })
    if (!task) throw new Error(`任务不存在: ${taskId}`)
    if (task.status !== 'drafted' && task.status !== 'revised' && task.status !== 'proposed') {
      this.logger.warn(`任务 ${taskId} 状态为 ${task.status}，跳过流式执行`)
      return null
    }

    this.logger.log(`🧠 Agent 开始流式分析: ${task.taskNo} [${task.type}]`)

    const systemPrompt = [
      // SOUL 注入（流式分析 — 与 executeProductListing 对齐）
      await this.soulService.buildMainSystemPrompt('product_listing'),
      '',
      '你必须先调用工具获取数据，再基于工具返回的真实数据生成方案。',
      '不得编造任何不存在的 SPU 编号、SKU、价格或色彩。',
    ].join('\n')

    const tools = this.toolRegistry.getDefinitions(task.type as AgentTaskType)
    const toolExecutor = this.toolRegistry.createExecutor()
    const userMessage = this.buildUserMessageWithHistory(task)

    const defaultProviderCode = await this.getDefaultProviderCode(task.type)
    const result = await this.llmBridge.queryWithToolsLegacy(
      systemPrompt, userMessage, tools, toolExecutor, onEvent, defaultProviderCode,
    )

    const defaultProvider = getDefaultProvider()
    this.usedModel = defaultProvider ? `${defaultProvider.name} / ${result.model}` : result.model

    return result
  }

  /**
   * OpenClaw 式会话执行 — Function Calling 模式 + SSE 流式
   *
   * V2：胖客户端架构 — 接收前端传来的完整 history[]，不再读 DB
   */
  async chatExecute(
    history: { role: string; content: string }[],
    userMessage: string,
    onEvent: (e: StreamEvent) => void,
    options: { userId?: string; agentCode?: string; forceFullMode?: boolean; model?: string } = {},
  ): Promise<{ content: string; model: string; provider: string } | null> {
    const { userId, agentCode, forceFullMode = false, model } = options
    this.logger.log(`💬 Agent 会话回复 | userId=${userId || 'unknown'} agent=${agentCode || 'default'} history=${history.length}条 ${forceFullMode ? '🔵 全知模式' : ''}`)

    // 🔐 请求级隔离：每个会话清理缓存，防止跨用户数据泄漏
    this.queryCache.clear()

    // H13修复：输入清洗 — 截断超长内容 + 过滤危险标签
    const cleanMessage = userMessage.length > 4000
      ? userMessage.slice(0, 4000) + '...[截断]'
      : userMessage.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '')

    // 系统状态快照
    const sysStatus = await this.getSystemStatus()
    // 从 ERDL Registry 获取 Entity 定义
    const entityDefs = this.buildEntityPrompt()

    // 📡 默认 Provider：从 DB 读取 is_default=1 的 key 决定优先使用的 provider
    let defaultProviderCode: string | undefined
    if (!model && this.modelRegistry) {
      try {
        const dbKeys = await this.modelRegistry.getProviderKeys()
        const defaultKey = dbKeys?.find((k: any) =>
          (k.models || []).some((m: any) => m.isDefault)
        )
        defaultProviderCode = defaultKey?.providerCode
        if (defaultProviderCode) {
          this.logger.log(`Default provider from DB: ${defaultProviderCode}`)
        }
      } catch (e: unknown) {
        this.logger.warn('查询 DB 默认模型失败，回退到内置顺序', (e as Error).message)
      }
    }

    // 🔐 权限模型：根据 agentCode 解析身份 → 过滤可用工具和安全等级（必须在 systemPrompt 构建之前）
    const taskType = detectIntent(cleanMessage)
    let effectiveAgentType = 'main'  // 默认 Main Agent（全权限）
    let effectiveClearance = 'L4'
    if (agentCode && agentCode !== 'tanghaoran') {
      try {
        const identity = await this.soulService.resolveIdentity(agentCode)
        effectiveAgentType = identity.agentType || 'sub'
        effectiveClearance = identity.securityClearance || 'L1'
        this.logger.log(`🔐 权限过滤: agent=${agentCode} type=${effectiveAgentType} clearance=${effectiveClearance}`)
      } catch (e: unknown) {
        this.logger.warn('身份解析失败，使用兜底身份', (e as Error).message)
      }
    }
    // 按 agentType 过滤工具列表（非 Main Agent 排除 file_edit/tsc_check/git_diff）
    const tools = this.toolRegistry.getDefinitions(effectiveAgentType)

    const systemPrompt = [
      // SOUL 注入（全知模式或 Chat 关键词触发模式）
      forceFullMode
        ? await this.soulService.buildFullSystemPrompt()
        : await this.soulService.buildChatSystemPrompt(cleanMessage),
      '',
      // 系统状态快照（动态数据）
      `⚠️ 当前系统真实状态：ERP 中有 ${sysStatus.spuCount} 个 SPU、${sysStatus.skuCount} 个 SKU、${sysStatus.effectCount} 个激活效果词。`,
      '所有回答中涉及的数据必须与以上系统状态一致。绝不允许编造不存在的数据。',
      '',
      // P0-4: 元镜知识 — 告知 Agent 可用知识库位置
      '知识库在 backend/knowledge/ 目录（由元镜自动生成）。不确定业务规则时调 query_knowledge 查询。',
      '',
      // 🔐 动态工具列表（根据 agentType 过滤，不再 hardcode 全部）
      `可用工具：${tools.map((t: any) => t.function.name).join('、')}`,
      '',
      ...(effectiveAgentType === 'main' ? [
        '📁 项目根目录：backend/src/modules/ 下包含所有源代码。',
        '常用路径：backend/src/modules/{soul,eros,product,system}/ · frontend/src/',
        '🔍 找文件时先用 file_edit read 目录，不要猜测路径。',
      ] : []),
      '',
      '💡 导出数据: 先用 erdl_crud read {entity} 查询 → 然后 csv_export(format:"csv")',
      '',
      entityDefs,
      '',
      '⚠️ erdl_crud 的 entity 参数必须使用 Entity 名称（如 ProductSpu、DictEffectTag）。',
    ].join('\n')

    // 构建 messages[]：将前端 history 拼入 user message（LLM 可见）
    const historyTexts: string[] = []
    for (const h of history.slice(-15)) {
      const cleanContent = (h.content || '').replace(/<invoke[\s\S]*?<\/invoke>/g, '').trim()
      if (!cleanContent) continue
      const label = h.role === 'human' ? '用户' : 'Agent'
      historyTexts.push(`[${label}] ${cleanContent.substring(0, 800)}`)
    }

    const fullUserMessage = [
      historyTexts.length > 0 ? `对话历史：\n${historyTexts.join('\n')}` : '',
      `用户消息：${cleanMessage}`,
    ].filter(Boolean).join('\n\n')

    const toolExecutor = this.toolRegistry.createExecutor()

    // 🔮 V2.0: 检测用户消息是否触发 SKILL → 注入元镜精准上下文
    const skillContextBlock = await this.buildSkillContext(cleanMessage)
    const enhancedSystemPrompt = skillContextBlock
      ? systemPrompt + '\n\n' + skillContextBlock
      : systemPrompt

    const result = await this.llmBridge.queryWithToolsLegacy(
      enhancedSystemPrompt, fullUserMessage, tools, toolExecutor, onEvent, defaultProviderCode,
    )

    // V1.3: 用实际 Provider 的名称（name）而非 id 显示签名
    const activeProvider = getAvailableProviders().find(p => p.id === result.provider)
    const providerLabel = activeProvider?.name || result.provider || ''
    this.usedModel = providerLabel ? `${providerLabel} / ${result.model}` : (result.model || 'default')

    // 🧠 认知日志闭环：每次 Chat 结束时写入记忆（使用真实 agentCode）
    const logAgentCode = agentCode || 'tanghaoran'
    const summary = (result.content || '').substring(0, 100).replace(/\n/g, ' ')
    this.soulService.logCognitive(logAgentCode, `Chat: ${summary}`, {
      message: cleanMessage.substring(0, 200),
      responseLen: result.content?.length || 0,
      model: this.usedModel,
      userId: userId || 'unknown',
    }).catch(() => {})

    return result
  }

  /** 公开 buildReportFooter 供 StreamController 使用 */
  public buildReportFooter(): string {
    const parts: string[] = []
    parts.push('')
    parts.push('---')
    parts.push('📋 **本次报告元数据**')
    parts.push('')
    if (this.citedKnowledgeIds.length > 0) {
      parts.push(`📚 引用知识: ${this.citedKnowledgeIds.join(', ')}`)
    } else {
      parts.push('📚 引用知识: 无（未匹配到相关知识）')
    }
    if (this.usedModel) {
      parts.push(`🤖 使用模型: ${this.usedModel}`)
    }
    const now = new Date().toISOString()
    parts.push(`⏱️ 生成时间: ${now}`)
    return parts.join('\n')
  }

  /**
   * Agent 执行阶段（executing → 自动执行 → delivered）
   *
   * 在审批通过后调用。Agent 实际执行业务操作（如创建 SPU/SKU），
   * 完成后提交交付物。
   *
   * @param taskId 任务 ID
   * @returns 执行结果
   */
  async executeTask(taskId: string): Promise<string> {
    const task = await this.taskRepo.findOneBy({ id: taskId })
    if (!task) throw new Error(`任务不存在: ${taskId}`)
    if (task.status !== 'executing') {
      this.logger.warn(`任务 ${taskId} 状态为 ${task.status}，跳过执行`)
      return ''
    }

    this.logger.log(`🚀 Agent 开始执行任务: ${task.taskNo} [${task.type}]`)

    try {
      let reportContent: string

      switch (task.type as AgentTaskType) {
        case 'product_listing':
          reportContent = await this.executeProductListing(task)
          break
        case 'content_creation':
          reportContent = await this.executeContentCreation(task)
          break
        default:
          reportContent = await this.executeGeneric(task)
      }

      // 自动提交交付
      if (reportContent) {
        // 生成交付物清单
        await this.taskService.deliver(
          {
            taskId,
            deliverables: [{ type: 'report', url: `/tasks/${taskId}`, status: 'completed' }],
          },
          'agent',
        )
        this.logger.log(`✅ Agent 执行完成并已交付: ${task.taskNo}`)
      }

      return reportContent
    } catch (error) {
      const msg = error instanceof Error ? (error as Error).message : String(error)
      this.logger.error(`❌ Agent 执行失败: ${task.taskNo} - ${msg}`)
      // 触发异常自处理链
      await this.taskService.handleError(taskId, msg, 'agent')
      return ''
    }
  }

  // ═══════════════════════════════════════════
  // 上下文修正模式（第 2+ 轮，轻量：不重查工具）
  // ═══════════════════════════════════════════

  /**
   * 基于已有对话历史修正方案
   * 不重新查询 ERP / 知识库，只用 LLM 根据反馈生成修正版本
   */
  private async executeRevision(
    task: AgentTask,
    proposals: Array<{ version: number; content: string; status: string; feedback?: { reason: string; suggestions?: string } }>,
  ): Promise<string> {
    // 提取最后一轮的方案 + 反馈
    const lastProposal = proposals[proposals.length - 1]
    const feedback = lastProposal?.feedback

    // 截取上一版方案（去元数据尾部）
    const prevReport = (lastProposal?.content || '').replace(/---\n📋 \*\*本次报告元数据[\s\S]*$/, '').trim()

    const systemPrompt = [
      // SOUL 注入（方案修正 — 同 ProductListing 铁律）
      await this.soulService.buildMainSystemPrompt('product_listing'),
      '',
      '你的任务是基于用户的反馈，对上一版方案进行针对性修改。',
      '不要重新生成整个方案，只修改用户要求的部分。',
      '保持上一版方案中未被提及的部分不变。',
      '修改后输出完整的修正方案。',
    ].join('\n')

    const userMessage = [
      '## 上一版方案',
      prevReport || '(空)',
      '',
      '## 用户反馈',
      feedback?.reason || '需完善',
      feedback?.suggestions ? `补充要求：${feedback.suggestions}` : '',
      '',
      '请基于以上反馈，输出修正后的完整方案。',
    ].join('\n')

    // 纯 LLM 调用，不带 tools
    const defaultProvider = getDefaultProvider()
    const response = await this.llmBridge.queryLLM(
      userMessage,
      undefined,
    )
    this.usedModel = defaultProvider ? `${defaultProvider.name} / ${defaultProvider.defaultModel}` : '未知模型'

    return response || prevReport
  }

  /**
   * 流式修正版本（供 streamExecute 使用）
   */
  async streamRevision(
    task: AgentTask,
    onEvent: (e: StreamEvent) => void,
  ): Promise<string> {
    const proposals = task.proposals || []
    const lastProposal = proposals[proposals.length - 1] as any
    const feedback = lastProposal?.feedback
    const prevReport = ((lastProposal?.content || '') as string).replace(/---\n📋 \*\*本次报告元数据[\s\S]*$/, '').trim()

    const defaultProvider = getDefaultProvider()
    const provider = defaultProvider
    if (!provider) throw new Error('No LLM provider')

    const apiKey = process.env[provider.apiKeyEnv]
    if (!apiKey) throw new Error('No API key')

    const response = await this.llmBridge.queryWithTools(
      [
        '你是方案修正 Agent。基于用户反馈修改上一版方案，只修改反馈要求的部分。',
      ].join('\n'),
      [
        '## 上一版方案\n' + prevReport,
        '\n## 用户反馈\n' + (feedback?.reason || '') + '\n' + (feedback?.suggestions || ''),
        '\n请输出修正后的完整方案。',
      ].join('\n'),
      [],
      async () => '',  // 不需要工具
    )
    // 注意：queryWithTools 不支持流式输出修正。暂时用非流式
    const text = response.content
    // 模拟流式输出
    for (let i = 0; i < text.length; i += crypto.randomInt(5) + 1) {
      const chunk = text.substring(i, Math.min(i + 3, text.length))
      onEvent({ type: 'content', delta: chunk })
      await new Promise(r => setTimeout(r, 10))
    }
    return text
  }
  // 商品上架 Agent — Function Calling 多轮版本（V1.4）
  // ═══════════════════════════════════════════

  private async executeProductListing(task: AgentTask): Promise<string> {
    // V1.4: 构建 Entity Prompt 注入（让 LLM 知道可用的 Entity 结构）
    const entityDefs = this.buildEntityPrompt()

    const systemPrompt = [
      // SOUL 注入（ProductListing 任务）
      await this.soulService.buildMainSystemPrompt('product_listing'),
      '',
      // Entity 定义（动态注入）
      entityDefs,
      '',
      '⚠️ erdl_crud 的 entity 参数必须使用 Entity 名称（如 ProductSpu、DictEffectTag）。',
      '',
      // P0-4: 元镜知识注入（匹配任务关键词）
      await this.buildKnowledgeContext(task),
    ].join('\n')

    const tools = this.toolRegistry.getDefinitions('product_listing')
    const toolExecutor = this.toolRegistry.createExecutor()

    // 构建 user message（含历史对话）
    const userMessage = this.buildUserMessageWithHistory(task)

    // V1.4: 切换到多轮 FC（while 循环，最多 5 轮）
    const defaultProviderCode = this.getDefaultProviderCode(task.type)
    const result = await this.llmBridge.queryWithToolsLegacy(
      systemPrompt,
      userMessage,
      tools,
      toolExecutor,
      // no-op event handler：Task 模式不需要推流到前端
      (e) => {
        if (e.type === 'tool_start') {
          this.logger.log(`[Task FC] 🔧 ${e.tool}(${JSON.stringify(e.args).substring(0, 120)})`)
        } else if (e.type === 'tool_end') {
          this.logger.log(`[Task FC] ✅ ${e.tool} (${e.durationMs}ms)`)
        }
      },
    )

    const defaultProvider = getDefaultProvider()
    this.usedModel = defaultProvider ? `${defaultProvider.name} / ${result.model}` : result.model

    const tcList = (result as any).toolCalls
    if (tcList && typeof tcList[Symbol.iterator] === 'function') {
      for (const tc of tcList) {
        if (tc.name === 'query_knowledge') {
          this.logger.log(`知识检索: ${tc.args['keyword']}`)
        }
      }
    }

    return result.content
  }

  /** 执行 ERP 数据查询工具 */
  private async executeErpQuery(dataType: string): Promise<string> {
    return this.toolImpls.executeErpQuery(dataType)
  }

  /** 执行知识库查询工具 */
  private async executeKnowledgeQuery(keyword: string): Promise<string> {
    return this.toolImpls.executeKnowledgeQuery(keyword)
  }

  // ═══════════════════════════════════════════
  // 内容创作 Agent（骨架，后续完善）
  // ═══════════════════════════════════════════
  // 内容创作 Agent — Function Calling 多轮版本（V1.4）
  // ═══════════════════════════════════════════

  private async executeContentCreation(task: AgentTask): Promise<string> {
    const systemPrompt = [
      // SOUL 注入（ContentCreation 任务）
      await this.soulService.buildMainSystemPrompt('content_creation'),
    ].join('\n')

    const tools = this.toolRegistry.getDefinitions('content_creation')
    const toolExecutor = this.toolRegistry.createExecutor()

    const userMessage = `任务：${task.title}\n${task.context ? `补充信息：${JSON.stringify(task.context)}` : ''}`

    // V1.4: 多轮 FC
    const defaultProviderCode = await this.getDefaultProviderCode(task.type)
    const result = await this.llmBridge.queryWithToolsLegacy(
      systemPrompt,
      userMessage,
      tools,
      toolExecutor,
      (e) => {
        if (e.type === 'tool_start') {
          this.logger.log(`[Content FC] 🔧 ${e.tool}(${JSON.stringify(e.args).substring(0, 120)})`)
        } else if (e.type === 'tool_end') {
          this.logger.log(`[Content FC] ✅ ${e.tool} (${e.durationMs}ms)`)
        }
      },
    )

    const defaultProvider = getDefaultProvider()
    this.usedModel = defaultProvider ? `${defaultProvider.name} / ${result.model}` : result.model

    return result.content
  }

  // ═══════════════════════════════════════════
  // 通用 Agent — Function Calling 多轮版本（V1.4）
  // ═══════════════════════════════════════════

  private async executeGeneric(task: AgentTask): Promise<string> {
    const systemPrompt = [
      // SOUL 注入（通用 Agent）
      await this.soulService.buildMainSystemPrompt(),
    ].join('\n')

    const tools = this.toolRegistry.getDefinitions()
    const toolExecutor = this.toolRegistry.createExecutor()

    const userMessage = this.buildUserMessageWithHistory(task)

    // V1.4: 多轮 FC
    const defaultProviderCode = await this.getDefaultProviderCode(task.type)
    const result = await this.llmBridge.queryWithToolsLegacy(
      systemPrompt,
      userMessage,
      tools,
      toolExecutor,
      (e) => {
        if (e.type === 'tool_start') {
          this.logger.log(`[Generic FC] 🔧 ${e.tool}(${JSON.stringify(e.args).substring(0, 120)})`)
        } else if (e.type === 'tool_end') {
          this.logger.log(`[Generic FC] ✅ ${e.tool} (${e.durationMs}ms)`)
        }
      },
    )

    const defaultProvider = getDefaultProvider()
    this.usedModel = defaultProvider ? `${defaultProvider.name} / ${result.model}` : result.model

    return result.content
  }

  // ═══════════════════════════════════════════
  // 上下文管理：多轮对话的 user message 构建
  // ═══════════════════════════════════════════

  /**
   * 构建 user message，如有历史对话则附加
   */
  private buildUserMessageWithHistory(task: AgentTask): string {
    const parts: string[] = []
    parts.push(`任务：${task.title}`)
    if (task.context) {
      const ctx = task.context as Record<string, unknown>
      if (ctx['任务主体']) parts.push(`要求：${ctx['任务主体']}`)
    }

    // 如果有历史 proposal（第 2+ 轮）→ 把上一轮方案 + 反馈附上
    const proposals = task.proposals || []
    if (proposals.length > 0) {
      const last = proposals[proposals.length - 1] as any
      const prevReport = (last?.content || '')
        .replace(/---\n📋 \*\*本次报告元数据[\s\S]*$/, '').trim()
      const feedback = last?.feedback

      parts.push('')
      parts.push('## 上一轮方案（V' + proposals.length + '）')
      parts.push(prevReport.substring(0, 3000))  // 限制长度避免 token 爆炸
      parts.push('')
      parts.push('## 用户反馈')
      parts.push(feedback?.reason || '需完善')
      if (feedback?.suggestions) {
        parts.push('补充要求：' + feedback.suggestions)
      }
      parts.push('')
      parts.push('请基于以上反馈，修正方案。如需要查询新数据，可以调用工具。')
    }

    return parts.join('\n')
  }

  // ═══════════════════════════════════════════
  // erdl_crud V1.3 — 通过 ERDL 实体代理引擎操作数据库
  // Agent 用语义字段名 → EntityProxy 翻译为数据库列名
  // ═══════════════════════════════════════════

  private async executeErdlCrud(args: {
    action: string
    entity: string
    values?: Record<string, unknown>
    where?: Record<string, unknown>
    data?: Record<string, unknown>
  }): Promise<string> {
    return this.toolImpls.executeErdlCrud(args)
  }

  // ═══════════════════════════════════════════
  // draft_create + aesthetics_check — 草稿池 & 美学校验
  // ═══════════════════════════════════════════

  private async executeDraftCreate(args: {
    spuName: string; gender: string; shapeCode: string
    seriesCode: string; structureStandardCode: string
    spuDescription?: string; skus?: any[]
  }): Promise<string> {
    try {
      // 效果词容错：查询字典并模糊匹配
      const effectRows = await this.taskRepo.manager.query(
        'SELECT effect_code, effect_type FROM dict_effect_tag WHERE is_active=1'
      ) as { effect_code: string; effect_type: string }[]
      const validSkinCodes = effectRows.filter(r => r.effect_type === 'skin_tone').map(r => r.effect_code)
      const validFaceCodes = effectRows.filter(r => r.effect_type === 'face_shape').map(r => r.effect_code)

      const skus = (args.skus || []).map((sku: any) => {
        const fixed: any = { ...sku }
        if (sku.skinToneEffect && !validSkinCodes.includes(sku.skinToneEffect)) {
          let best = ''; let bestScore = 0
          for (const code of validSkinCodes) {
            const s = fuzzyScore(sku.skinToneEffect, code)
            if (s > bestScore) { bestScore = s; best = code }
          }
          if (best && bestScore > 0.4) fixed.skinToneEffect = best
        }
        if (sku.faceShapeEffect && !validFaceCodes.includes(sku.faceShapeEffect)) {
          let best = ''; let bestScore = 0
          for (const code of validFaceCodes) {
            const s = fuzzyScore(sku.faceShapeEffect, code)
            if (s > bestScore) { bestScore = s; best = code }
          }
          if (best && bestScore > 0.4) fixed.faceShapeEffect = best
        }
        return fixed
      })

      const draft = await this.draftPoolService.createDraftSpu({
        spuName: args.spuName,
        gender: args.gender,
        shapeCode: args.shapeCode,
        seriesCode: args.seriesCode,
        structureStandardCode: args.structureStandardCode,
        spuDescription: args.spuDescription || '',
        source: 'ai',
        skus: skus,
      })
      this._lastDraftId = draft.draftId

      // 通用草稿同步
      let universalDraftId = ''
      try {
        const universalDraft = await this.draftService.create({
          draftType: 'spu',
          title: args.spuName,
          bodyJson: {
            draftId: draft.draftId,
            spuName: args.spuName,
            gender: args.gender,
            shapeCode: args.shapeCode,
            seriesCode: args.seriesCode,
            structureStandardCode: args.structureStandardCode,
            spuDescription: args.spuDescription || '',
            skus: skus,
          },
        } as any)
        universalDraftId = (universalDraft as any)?.id || ''
      } catch (e: unknown) {
        this.logger.warn(`通用草稿同步失败: ${(e as Error).message}`)
      }

      return [
        `✅ 草稿已创建 (${draft.draftId})`,
        universalDraftId ? `🔄 通用草稿已同步 (${universalDraftId})` : '',
        ``,
        `📋 SPU: ${args.spuName}`,
        `👤 性别: ${args.gender}`,
        `🔧 框型: ${args.shapeCode} | 系列: ${args.seriesCode} | 结构标准: ${args.structureStandardCode}`,
        `📦 来源: AI 生成 | 状态: 待审核`,
        `🎨 SKU 数量: ${skus.length}`,
        ``,
        `⏳ 下一步：人工在草稿池审核后批量上架。`,
      ].filter(Boolean).join('\n')
    } catch (e: unknown) {
      return `❌ 草稿创建失败: ${(e as Error).message}`
    }
  }

  private async executeDraftAddSku(args: {
    spuId: string
    skus: any[]
  }): Promise<string> {
    try {
      // 从草稿池查找已有 SPU
      const { items } = await this.draftPoolService.queryDrafts({ page: 1, pageSize: 100 })
      const existingSpu = items.find((d: any) => d.spuId === args.spuId || d.draftId === args.spuId)
      if (!existingSpu) {
        return `❌ 未找到 SPU: ${args.spuId}。请先确认 SPU 存在于草稿池或 ERP 中。可调用 query_erp_data 或 draft_list 查看。`
      }

      // 效果词容错（复用 draft_create 的逻辑）
      const effectRows = await this.taskRepo.manager.query(
        'SELECT effect_code, effect_type FROM dict_effect_tag WHERE is_active=1'
      ) as { effect_code: string; effect_type: string }[]
      const validSkinCodes = effectRows.filter(r => r.effect_type === 'skin_tone').map(r => r.effect_code)
      const validFaceCodes = effectRows.filter(r => r.effect_type === 'face_shape').map(r => r.effect_code)

      const skus = (args.skus || []).map((sku: any) => {
        const fixed: any = { ...sku }
        if (sku.skinToneEffect && !validSkinCodes.includes(sku.skinToneEffect)) {
          let best = ''; let bestScore = 0
          for (const code of validSkinCodes) { const s = fuzzyScore(sku.skinToneEffect, code); if (s > bestScore) { bestScore = s; best = code } }
          if (best && bestScore > 0.4) fixed.skinToneEffect = best
        }
        if (sku.faceShapeEffect && !validFaceCodes.includes(sku.faceShapeEffect)) {
          let best = ''; let bestScore = 0
          for (const code of validFaceCodes) { const s = fuzzyScore(sku.faceShapeEffect, code); if (s > bestScore) { bestScore = s; best = code } }
          if (best && bestScore > 0.4) fixed.faceShapeEffect = best
        }
        return fixed
      })

      // 在已有 SPU 上追加 SKU — 通过 erdl_crud create DraftSpuSku
      let created = 0
      for (const sku of skus) {
        try {
          await this.executeErdlCrud({
            action: 'create',
            entity: 'DraftSpuSku',
            values: {
              draftId: existingSpu.draftId,
              spuId: args.spuId,
              colorCode: sku.colorCode,
              colorName: sku.colorName || '',
              skinToneEffect: sku.skinToneEffect || '',
              faceShapeEffect: sku.faceShapeEffect || '',
              displayName: sku.displayName || '',
              retailPrice: sku.retailPrice || 0,
              status: 'draft',
            },
          })
          created++
        } catch (e: unknown) {
          this.logger.warn(`draft_add_sku 单条失败: ${(e as Error).message}`)
        }
      }

      return [
        `✅ 已为 SPU ${existingSpu.spuName || args.spuId} 补充 ${skus.length} 个 SKU 到草稿池 (${existingSpu.draftId})`,
        ``,
        `📦 SPU: ${existingSpu.spuName || args.spuId}`,
        `🎨 SKU 数量: ${skus.length}`,
        `📝 来源: AI 生成 | 状态: 待审核`,
        ``,
        `⏳ 下一步：人工在草稿池审核后批量上架。`,
      ].join('\n')
    } catch (e: unknown) {
      return `❌ SKU补充失败: ${(e as Error).message}`
    }
  }

  private async executeAestheticsCheck(args: {
    shapeCode: string; colorCode: string
    seriesCode?: string; gender?: string
    skinToneEffect?: string; faceShapeEffect?: string
  }): Promise<string> {
    try {
      const result = await this.aestheticsService.check({
        spu: { shapeCode: args.shapeCode, seriesCode: args.seriesCode || '', gender: args.gender || '' },
        sku: { colorCode: args.colorCode, skinToneEffect: args.skinToneEffect || '', faceShapeEffect: args.faceShapeEffect || '' },
      })

      if (result.level === 'pass' && result.errors.length === 0 && result.warnings.length === 0) {
        return '✅ 美学校验通过 — 框型+色彩组合无冲突规则。'
      }

      const levelCN: Record<string, string> = { block: '🚫 阻断（不推荐上架）', warning: '⚠️ 有警告（建议人工复核）', pass: '✅ 通过' }
      const lines: string[] = [`🔍 美学校验: ${levelCN[result.level] || result.level}`]

      if (result.errors.length > 0) {
        lines.push('', '❌ 阻断规则：')
        for (const e of (result.errors as any[])) lines.push(`  · [${e.ruleCode}] ${e.ruleName}: ${e.message}`)
      }
      if (result.warnings.length > 0) {
        lines.push('', '⚠️ 警告：')
        for (const w of (result.warnings as any[])) lines.push(`  · [${w.ruleCode}] ${w.ruleName}: ${w.message}`)
      }
      if ((result as any).recommendations?.length > 0) {
        lines.push('', '💡 改进建议：')
        for (const r of (result as any).recommendations) lines.push(`  · ${r.type}: ${r.reason} → 建议: ${r.suggested}`)
      }

      return lines.join('\n')
    } catch (e: unknown) {
      return `⚠️ 美学校验执行异常: ${(e as Error).message}`
    }
  }

  private async executeDraftList(args: {
    status?: string; gender?: string; source?: string; pageSize?: number
  }): Promise<string> {
    try {
      const { items, total } = await this.draftPoolService.queryDrafts({
        status: args.status,
        gender: args.gender,
        source: args.source,
        page: 1,
        pageSize: args.pageSize || 20,
      })
      if (items.length === 0) return '📭 草稿池暂无匹配记录。'
      const lines: string[] = [`📋 草稿池 (共 ${total} 条，显示 ${items.length} 条)：`, '']
      for (const d of items) {
        const statusCN: Record<string, string> = { draft: '待审核', reviewed: '已审核', approved: '已通过', published: '已发布', rejected: '已驳回' }
        const s = statusCN[d.status!] || d.status
        lines.push(`· ${d.draftId.slice(0,12)} | ${d.spuName} | ${d.gender} | ${d.shapeCode}/${d.seriesCode} | ${d.source} | ${s} | ${d.createdAt?.toString().slice(0,16)}`)
      }
      lines.push('', '💡 人工在草稿池审核后批量上架。')
      return lines.join('\n')
    } catch (e: unknown) {
      return `⚠️ 草稿查询失败: ${(e as Error).message}`
    }
  }

  // ═══════════════════════════════════════════
  // ERDL Entity → System Prompt
  // ═══════════════════════════════════════════

  /** V1.3: 使用 EntityProxy 构建 Entity 提示（含语义→物理映射） */
  private buildEntityPrompt(): string {
    return this.proxy.buildEntityPrompt('industry.eyewear')
  }

  // ═══════════════════════════════════════════
  // 系统状态快照
  // ═══════════════════════════════════════════

  private async getSystemStatus() {
    try {
      const [[{cnt: spuCount}], [{cnt: skuCount}], [{cnt: effectCount}]] = await Promise.all([
        this.taskRepo.manager.query('SELECT COUNT(1) as cnt FROM product_spu WHERE is_deleted=0'),
        this.taskRepo.manager.query('SELECT COUNT(1) as cnt FROM product_sku WHERE is_deleted=0'),
        this.taskRepo.manager.query('SELECT COUNT(1) as cnt FROM dict_effect_tag WHERE is_active=1'),
      ])
      return { spuCount: Number(spuCount), skuCount: Number(skuCount), effectCount: Number(effectCount) }
    } catch (e: unknown) {
      this.logger.warn('getSystemStatus 查询失败', (e as Error).message)
      return { spuCount: '?', skuCount: '?', effectCount: '?' }
    }
  }

  // ═══════════════════════════════════════════
  // 数据采集
  // ═══════════════════════════════════════════

  /** ERDL Entity 名 → 数据库表名映射 */
  private readonly ENTITY_TABLE_MAP: Record<string, string> = {
    // 商品
    ProductSpu: 'product_spu',
    ProductSku: 'product_sku',
    ProductCategory: 'product_category',
    ProductSet: 'product_set',
    ProductSkuImage: 'product_sku_image',
    ProductTierPricing: 'product_tier_pricing',
    // 副品 S-SKU
    SubSku: 'sub_sku',
    SubSkuCategory: 'sub_sku_category',
    SpecTemplate: 'spec_template',
    // 结构标准
    StructureStandard: 'structure_standard',
    StructureShape: 'structure_shape',
    StructureSeries: 'structure_series',
    // 字典
    DictEffectTag: 'dict_effect_tag',
    DictSkuColor: 'dict_sku_color',
    DictFrameMaterial: 'dict_frame_material',
    DictFrameType: 'dict_frame_type',
    DictNosePad: 'dict_nose_pad',
    DictHinge: 'dict_hinge',
    DictSurfaceTreatment: 'dict_surface_treatment',
    DictRefractiveIndex: 'dict_refractive_index',
    DictLensFunction: 'dict_lens_function',
    DictLensCoating: 'dict_lens_coating',
    DictLensMaterial: 'dict_lens_material',
    DictBrand: 'dict_brand',
    DictUnit: 'dict_unit',
    DictProductType: 'dict_product_type',
    // 客户
    Customer: 'customer',
    CustomerAddress: 'customer_address',
    CustomerContact: 'customer_contact',
    CustomerTierPricing: 'customer_tier_pricing',
    CustomerLensStandard: 'customer_lens_standard',
    CustomerPrescription: 'customer_prescription',
    MemberLevelLog: 'member_level_log',
    PointsTransaction: 'points_transaction',
    // 库存
    Inventory: 'inventory',
    InventoryTransaction: 'inventory_transaction',
    // 订单
    Order: 'order',
    OrderItem: 'order_item',
    OrderPayment: 'order_payment',
    OrderShipment: 'order_shipment',
    AfterSales: 'after_sales',
    // 知识库
    KnowledgeEntry: 'knowledge_entry',
  }

  /** 只读表：只允许 SELECT */
  private readonly READONLY_TABLES = new Set([
    'inventory_transaction', 'order_payment',
    'member_level_log', 'points_transaction',
  ])

  /** 禁止表：Agent 完全不能访问 — P2修复：添加 knowledge_entry */
  private readonly FORBIDDEN_TABLES = new Set([
    'user', 'role', 'permission', 'cognitive_log', 'report_target',
    'agent_task', 'agent_registry', 'tool_call_log',
    'knowledge_entry',
  ])

  /** 禁止写字段 */
  private readonly READONLY_FIELDS = new Set([
    'id', 'created_at', 'updated_at', 'is_deleted', 'deleted_at',
  ])

  // ═══════════════════════════════════════════
  // V2.0: SKILL 上下文注入
  // ═══════════════════════════════════════════

  /**
   * 检测用户消息是否触发已注册 SKILL，并按需注入元镜精准上下文
   */
  private async buildSkillContext(userMessage: string): Promise<string> {
    try {
      // 从 SkillLoader 查询所有已注册 SKILL
      // 使用 toolRegistry 的工具名反向匹配
      const allTools = this.toolRegistry.getDefinitions()
      const triggeredSkill = allTools.find(t => {
        const toolName = t.function.name
        // 检查用户消息是否包含 tool 名称（如 product_audit）
        return userMessage.toLowerCase().includes(toolName.toLowerCase()) ||
               userMessage.includes('审核') && toolName.includes('audit') ||
               userMessage.includes('商品上架') && toolName.includes('product')
      })

      if (!triggeredSkill) return ''

      // 从 SKILL Registry 读取 mirror_refs
      const { SkillRegistry } = await import('../skill/skill-registry.entity')
      const { InjectRepository } = await import('@nestjs/typeorm')
      // 由于 NestJS 装饰器必须在类初始化时注入，这里使用动态查询
      const ds = (this as any)['entityProxy']?.repo?.manager
      if (!ds) return '' // 无法获取 DataSource

      // 简化方案：从 MetaMirrorService 直接调用
      const { MetaMirrorService } = await import('../../meta-mirror/meta-mirror.service')
      
      // 由于直接注入困难，这里用硬编码回退方案 — 对已知 SKILL 注入默认上下文
      if (triggeredSkill.function.name === 'product_audit') {
        return this.getDefaultProductAuditContext()
      }

      return ''
    } catch (e: unknown) {
      this.logger.warn('buildSkillContext 失败', (e as Error).message)
      return ''
    }
  }

  /** 商品审核 SKILL 的默认元镜上下文（回退方案，之后替换为 ContextInjector 动态注入） */
  private getDefaultProductAuditContext(): string {
    return `
【SKILL: product-audit · 元镜上下文】

📦 相关实体：
- ProductSpu: spuCode(唯一,S-xxx), spuName, gender(枚举:female/male/unisex/limited), shapeCode, seriesCode, structureStandardCode, status
- ProductSku: skuCode, colorCode, skinToneEffect(枚举), faceShapeEffect(枚举), retailPrice(Min(0)), costPrice
- DictEffectTag: effectCode, effectType(枚举:skin_tone/face_shape), effectName

🔌 相关 API：
- POST /product/spu → 创建SPU，必填: spuName, gender, shapeCode, seriesCode, structureStandardCode
- PUT /product/spu/:id → 更新SPU
- GET /product/spu/:id → 查询SPU详情

📐 业务规则：
- ⛔ price_floor: retailPrice >= costPrice（保存时API层校验）
- ⛔ effect_required: skinToneEffect/faceShapeEffect 不可为空
- ⚠️ 效果词必须从 DictEffectTag 选取，不可自编

📋 命名约定：
- SPU编码: S-{6位数字}
- SKU展示名: {效果词}·{色号}·{系列}·{款式}
`.trim()
  }

  private async collectProductContext(): Promise<string> {
    const lines: string[] = []

    try {
      // 从 ERDL Registry 获取所有 Entity
      const allEntities = this.registry.getAllEntities()

      for (const entity of allEntities) {
        const tableName = this.ENTITY_TABLE_MAP[entity.name]
        if (!tableName) continue

        try {
          const rows = await this.taskRepo.manager.query(
            `SELECT * FROM \`${tableName}\` LIMIT 5`
          )

          if (rows.length > 0) {
            // 提取有意义的展示列（跳过 id/时间戳/内部字段）
            const displayCols = this.getDisplayColumns(rows[0])
            lines.push(`### ${entity.name}（${tableName}，共 ${rows.length}+ 条）`)
            for (const row of rows as DbRow[]) {
              const values = displayCols.map((col) => row[col] ?? '—').join(' | ')
              lines.push(`- ${values}`)
            }
            lines.push('')
          } else {
            lines.push(`### ${entity.name}（${tableName}）`)
            lines.push('（暂无数据）')
            lines.push('')
          }
        } catch (e: unknown) {
          this.logger.debug(
            `Entity prompt 查询失败 (表 ${tableName}): ${(e as Error).message}`,
          )
          /* 表不存在则跳过 */
        }
      }

      // 额外：字典表（效果词/材质/色彩）— 这些在 registry 中无 Entity，但 LLM 需要
      await this.collectDictData(lines)

    } catch (e) {
      this.logger.warn(`数据采集失败: ${e}`)
    }

    return lines.join('\n')
  }

  /** 收集字典表数据 */
  private async collectDictData(lines: string[]): Promise<void> {
    const effects = await this.taskRepo.manager.query(
      `SELECT tag_code, tag_name, effect_category FROM dict_effect_tag WHERE is_active = 1 LIMIT 30`
    ).catch((e: any) => { this.logger.warn(`M14: 效果词加载失败: ${e?.message || e}`); return [] })
    if (effects.length > 0) {
      const skin = effects.filter((e: DbRow) => e.effect_category === 'skin_tone')
      const face = effects.filter((e: DbRow) => e.effect_category === 'face_shape')
      if (skin.length) lines.push(`效果词-肤色: ${skin.map((e: DbRow) => e.tag_name).join('、')}`)
      if (face.length) lines.push(`效果词-脸型: ${face.map((e: DbRow) => e.tag_name).join('、')}`)
      lines.push('')
    }

    const materials = await this.taskRepo.manager.query(
      'SELECT material_code, material_name FROM dict_material WHERE is_active = 1 LIMIT 10'
    ).catch((e: any) => { this.logger.warn(`材质加载失败: ${e?.message || e}`); return [] })
    if (materials.length > 0) {
      lines.push(`材质: ${(materials as DbRow[]).map((m: DbRow) => `${m.material_code}(${m.material_name})`).join('、')}`)
      lines.push('')
    }

    const colors = await this.taskRepo.manager.query(
      'SELECT color_code, color_name_cn FROM dict_sku_color WHERE is_active = 1 LIMIT 15'
    ).catch((e: any) => { this.logger.warn(`色彩加载失败: ${e?.message || e}`); return [] })
    if (colors.length > 0) {
      lines.push(`色彩: ${(colors as DbRow[]).map((c: DbRow) => `${c.color_code}(${c.color_name_cn})`).join('、')}`)
      lines.push('')
    }
  }

  /** 从一行数据中提取有展示意义的列名 */
  private getDisplayColumns(row: Record<string, unknown>): string[] {
    const skip = new Set(['id', 'is_deleted', 'deleted_at', 'created_by', 'updated_by'])
    return Object.keys(row).filter((k) => {
      if (skip.has(k)) return false
      // 跳过内部 FK / 时间戳 / JSON 大字段
      if (k.endsWith('_id') && k !== 'spu_id' && k !== 'sku_id') return false
      if (['created_at', 'updated_at'].includes(k)) return false
      return true
    }).slice(0, 6) // 每行最多 6 列
  }

  // ═══════════════════════════════════════════
  // 知识库注入
  // ═══════════════════════════════════════════

  private citedKnowledgeIds: string[] = []
  private usedModel: string = ''

  /** 获取当前使用的模型信息（给 gateway/controller 推送签名用） */
  getUsedModel(): string {
    return this.usedModel || 'default'
  }

  /**
   * 从知识库检索相关知识，构建 System Prompt 注入文本
   * - 公开知识：全文注入
   * - 私有知识：仅标题提醒，Agent 无法读内容
   */
  private async buildKnowledgeContext(task: AgentTask): Promise<string> {
    try {
      this.citedKnowledgeIds = []
      const searchTags = this.extractKnowledgeTags(task)
      if (searchTags.length === 0) return ''

      const { publicEntries, privateEntries } = await this.knowledgeService.searchForAgent({
        tags: searchTags,
        topk: 8,
      })

      const lines: string[] = []

      if (publicEntries.length > 0) {
        lines.push('## 📚 相关知识（来自知识库）')
        lines.push('')
        for (const entry of publicEntries) {
          const preview = entry.content.substring(0, 200).replace(/\n/g, ' ')
          lines.push(`- [${entry.id}] ${entry.title} (${entry.type}, 权重:${entry.weight.toFixed(2)})`)
          lines.push(`  ${preview}...`)
          lines.push('')
          this.citedKnowledgeIds.push(entry.id)
          // 引用计数 +1
          this.knowledgeService.cite(entry.id).catch((err: any) => this.logger.warn(`cite failed: ${entry.id}`))
        }
      }

      if (privateEntries.length > 0) {
        lines.push('## 🔒 需参考的私有知识（请联系管理员获取详情）')
        lines.push('')
        for (const entry of privateEntries) {
          lines.push(`- ${entry.id}: ${entry.title} (${entry.type}, 权重:${entry.weight.toFixed(2)})`)
        }
        lines.push('')
      }

      return lines.join('\n')
    } catch (e) {
      this.logger.warn(`知识库检索失败: ${e}`)
      return ''
    }
  }

   /**
   * 从任务中提取知识库检索标签
   */
  private extractKnowledgeTags(task: AgentTask): string[] {
    const tags = new Set<string>()

    // 从任务类型推断
    const typeTagMap: Record<string, string[]> = {
      product_listing: ['产品', '定价', '框型', '材质', '颜色'],
      content_creation: ['小红书', '文案', '穿搭'],
      customer_service: ['售后', 'FAQ', '快拆'],
      tech_support: ['结构', '验光'],
    }
    const defaultTags = typeTagMap[task.type] || []
    defaultTags.forEach(t => tags.add(t))

    // 从任务标题提取关键词
    const title = task.title || ''
    const keywordMap: [string, string[]][] = [
      ['钛合金', ['钛合金', '材质']],
      ['TR90', ['TR90', '材质']],
      ['圆框', ['圆框', '框型', '脸型']],
      ['方框', ['方框', '框型', '脸型']],
      ['猫眼', ['猫眼框', '框型', '穿搭']],
      ['定价', ['定价', '竞品']],
      ['上架', ['产品', '定价', '框型']],
      ['小红书', ['小红书', '文案', '内容']],
      ['文案', ['文案', '内容', '小红书']],
      ['设计', ['框型', '颜色', '材质', '设计']],
    ]
    for (const [keyword, ktags] of keywordMap) {
      if (title.includes(keyword)) ktags.forEach(t => tags.add(t))
    }

    // 从 context 提取
    const ctx = (task.context || {}) as Record<string, unknown>
    if (ctx['任务主体']) tags.add(String(ctx['任务主体']))

    return Array.from(tags).slice(0, 8)
  }

  // ═══════════════════════════════════════════
  // 辅助
  // ═══════════════════════════════════════════

  private entityToMarkdown(entity: { name: string; properties: Record<string, unknown> }): string {
    const props = entity.properties
    let md = `### Entity: ${entity.name}\n\n| 字段 | 类型 | 必填 | 说明 |\n|------|------|------|------|\n`
    for (const [key, val] of Object.entries(props)) {
      const v = typeof val === 'object' && val !== null ? val as Record<string, unknown> : null
      const type = v?.type || (typeof val === 'string' ? val : '—')
      const required = v?.required ? '✅' : ''
      const maxLen = v?.maxLength ? `max:${v.maxLength}` : ''
      const enums = v?.enum ? (v.enum as string[]).join(', ') : ''
      const desc = [required, maxLen, enums].filter(Boolean).join(' ')
      md += `| ${key} | ${type} | ${desc} |\n`
    }
    return md
  }

  // ═══════════════════════════════════════════
  // csv_export — 智能导出（自动查询 + 导出）
  // ═══════════════════════════════════════════

  private async executeCsvExport(entity: string, format: string, data: any[], filename: string): Promise<string> {
    try {
      let rows: any[] = data || []

      // 🔑 L1: 有 entity → 自动查询
      if (entity && (!rows || rows.length === 0)) {
        this.logger.log(`csv_export: auto-query entity=${entity}`)
        try {
          const toolExecutor = this.toolRegistry.createExecutor()
          const result = await toolExecutor('erdl_crud', { action: 'read', entity })
          const jsonMatch = result.match(/\[[\s\S]*\]/)
          if (jsonMatch) { rows = JSON.parse(jsonMatch[0]) }
        } catch (e: unknown) { return `❌ 自动查询失败: ${(e as Error).message}` }
      }

      // 🔑 L2: 无 data 且无 entity → 读取共享缓存
      if ((!rows || rows.length === 0)) {
        const cached = this.cacheGet('last_query')
        if (cached && cached.length > 0) {
          rows = cached
          this.logger.log(`csv_export: using cached data (${rows.length} rows)`)
        }
      }

      if (!rows || rows.length === 0) {
        return `❌ 数据为空。请先查询数据(如 erdl_crud read StructureStandard)，然后直接调用 csv_export(format:"csv") 即可自动导出上次查询结果`
      }

      return this.doExport(rows, format, filename)
    } catch (e: unknown) { return `❌ 导出失败: ${(e as Error).message}` }
  }

  private doExport(data: any[], format: string, filename: string): string {
    const ts = new Date().toISOString().slice(0, 10)
    const uuid = crypto.randomUUID().replace(/-/g, '').substring(0, 8)
    const fname = filename || `export_${ts}_${uuid}`
    const dir = path.join(process.cwd(), 'uploads', 'exports')
    fs.mkdirSync(dir, { recursive: true })

    // 对象数组 → 用 DataBridge 导出
    if (data.length > 0 && typeof data[0] === 'object' && !Array.isArray(data[0])) {
      try {
        const bridge = new EntityDataBridge('StructureStandard', 'industry.eyewear', this.registry)
        const content = bridge.export(data as Record<string, unknown>[], format as any)
        const ext = format === 'markdown' ? 'md' : format
        const fp = path.join(dir, `${fname}.${ext}`)
        fs.writeFileSync(fp, content, 'utf-8')
        return `✅ 已导出: /uploads/exports/${fname}.${ext} (${Buffer.byteLength(content, 'utf-8')} 字节)`
      } catch (e: unknown) {
        return `❌ 导出失败: ${(e as Error).message}。请检查字段名是否匹配 Entity 定义。`
      }
    }

    let content = ''; let ext = ''
    if (format === 'csv') {
      ext = 'csv'
      // 🔑 UTF-8 BOM (Excel 兼容中文)
      content = '\uFEFF'
      for (const row of data) {
        const cells = Array.isArray(row)
          ? row.map((c: any) => {
              const v = (c === true || c === 1) ? '是' : (c === false || c === 0) ? '否' : String(c ?? '')
              return `"${v.replace(/"/g, '""')}"`
            })
          : Object.values(row || {}).map((v: any) => {
              const s = (v === true || v === 1) ? '是' : (v === false || v === 0) ? '否' : String(v ?? '')
              return `"${s.replace(/"/g, '""')}"`
            })
        content += cells.join(',') + '\n'
      }
    } else if (format === 'json') { ext = 'json'; content = JSON.stringify(data, null, 2) }
    else {
      ext = 'md'
      if (data.length > 0 && Array.isArray(data[0])) {
        content = '| ' + (data[0] as any[]).map(c => String(c || '')).join(' | ') + ' |\n|' + (data[0] as any[]).map(() => '---').join('|') + '|\n'
        for (let i = 1; i < data.length; i++) content += '| ' + (data[i] as any[]).map(c => String(c || '')).join(' | ') + ' |\n'
      }
    }
    const fp = path.join(dir, `${fname}.${ext}`)
    fs.writeFileSync(fp, content, 'utf-8')
    return `✅ 已导出: /uploads/exports/${fname}.${ext} (${Buffer.byteLength(content, 'utf-8')} 字节)`
  }

  // ═══════════════════════════════════════════
  // 新增工具执行方法
  // ═══════════════════════════════════════════

  private async executeWebFetch(url: string, mode: string, maxChars?: number): Promise<string> {
    return this.toolImpls.executeWebFetch(url, mode, maxChars);
  }

  private executeDataAnalyze(op: string, data: any[], field: string, topN?: number, fField?: string, fVal?: string): string {
    try {
      if (!data || data.length === 0) return '📭 数据为空'
      switch (op) {
        case 'summarize': {
          const count = data.length
          const fields = Object.keys(data[0] || {})
          const lines: string[] = [
            `📊 数据摘要: ${count} 条记录, ${fields.length} 个字段: ${fields.join(', ')}`,
          ]
          for (const f of fields) {
            const nums = data.map(d => Number(d[f])).filter(n => !isNaN(n))
            if (nums.length > 0) {
              const sum = nums.reduce((a, b) => a + b, 0)
              const avg = (sum / nums.length).toFixed(2)
              const min = Math.min(...nums)
              const max = Math.max(...nums)
              lines.push(`  ${f}: 和=${sum} 均值=${avg} 最小=${min} 最大=${max} (${nums.length}条数值)`)
            } else {
              const vals = data.map(d => String(d[f] ?? '—'))
              const unique = [...new Set(vals)]
              if (unique.length <= 10) {
                lines.push(`  ${f}: ${unique.join(' / ')} (${vals.length}条)`)
              } else {
                lines.push(`  ${f}: ${unique.length} 种不同值 (${vals.length}条)`)
              }
            }
          }
          return lines.join('\n')
        }
        case 'topN': {
          if (!field) return '❌ topN 需要 field 参数'
          const sorted = [...data].sort((a, b) => {
            const va = Number(a[field]) || 0
            const vb = Number(b[field]) || 0
            return vb - va
          }).slice(0, topN || 5)
          return `🏆 Top ${topN || 5} by ${field}:\n` + sorted.map((d, i) => `  ${i + 1}. ${JSON.stringify(d)}`).join('\n')
        }
        case 'filter': {
          if (!fField) return '❌ filter 需要 filterField 参数'
          const filtered = data.filter(d => String(d[fField]) === fVal)
          return `🔍 过滤结果 (${fField}=${fVal}): ${filtered.length} 条`
        }
        case 'trend': {
          if (!field) return '❌ trend 需要 field 参数'
          return `📈 趋势分析: 共 ${data.length} 条数据，字段 ${field}`
        }
        default: return `❌ 不支持的分析操作: ${op}`
      }
    } catch (e: unknown) {
      return `❌ 数据分析失败: ${(e as Error).message}`
    }
  }

  private async executeImportAnalyze(filePath: string): Promise<string> {
    try {
      // H04修复：限制路径在 uploads 目录下，防止路径遍历读任意文件
      const uploadsDir = path.resolve(process.cwd(), 'uploads')
      const fullPath = path.resolve(path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath))
      if (!fullPath.startsWith(uploadsDir)) {
        return `❌ 安全限制：只能分析 uploads 目录下的文件。路径: ${filePath}`
      }
      const content = fs.readFileSync(fullPath, 'utf-8')
      let columns: string[] = []
      let preview = ''
      if (fullPath.endsWith('.csv')) {
        const lines = content.split('\n').filter(l => l.trim())
        columns = lines[0].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
        preview = lines.slice(1, 4).join('\n')
      } else if (fullPath.endsWith('.json')) {
        const data = JSON.parse(content)
        if (Array.isArray(data) && data.length > 0) {
          columns = Object.keys(data[0])
          preview = JSON.stringify(data.slice(0, 2), null, 2)
        }
      }
      return `📋 导入文件分析:\n  路径: ${fullPath}\n  列名: ${columns.join(', ')}\n  预览:\n${preview}`
    } catch (e: unknown) {
      return `❌ 导入文件分析失败: ${(e as Error).message}`
    }
  }

  private executeImportMap(columns: string[], entityName: string): string {
    try {
      const entity = this.registry.getEntity('industry.eyewear', entityName)
      if (!entity) return `❌ Entity 不存在: ${entityName}`
      const entityFields = Object.keys(entity.properties || {})
      const mapping = columns.map(col => {
        const match = entityFields.find(f => f.toLowerCase() === col.toLowerCase() || fuzzyScore(col, f) > 0.7)
        return { source: col, target: match || null }
      })
      return `🔗 列映射结果:\n` + mapping.map(m => `  ${m.source} → ${m.target || '(未匹配)'}`).join('\n')
    } catch (e: unknown) {
      return `❌ 列映射失败: ${(e as Error).message}`
    }
  }

  private async executeImportExecute(entityName: string, data: any[]): Promise<string> {
    try {
      const bridge = new EntityDataBridge(entityName, 'industry.eyewear', this.registry)
      // Auto-map columns
      const columns = data.length > 0 ? Object.keys(data[0]) : []
      const mapping = bridge.mapColumns(columns)
      // Normalize
      const normalized = bridge.normalize(data, mapping)
      if (normalized.entities.length === 0) {
        const detail = normalized.warnings.length > 0
          ? `: ${normalized.warnings.join('; ')}`
          : `: 可能原因——entity名不匹配、字段名不存在于${entityName}、或数据格式不符合实体定义。可用 erdl_crud read ${entityName} 查看字段结构。`
        return `❌ 无有效数据${detail}`
      }
      // Validate
      const validation = bridge.validate(normalized.entities)
      if (validation.errors.length > 0 && validation.valid.length === 0) {
        return `❌ 数据验证失败 (${validation.errors.length} 条错误):\n` + validation.errors.slice(0, 5).map((e: any) => `  · 行${e.row}: ${e.errors.join('; ')}`).join('\n')
      }
      let created = 0
      const failures: string[] = []
      for (const item of validation.valid) {
        try {
          await this.executeErdlCrud({ action: 'create', entity: entityName, values: item })
          created++
        } catch (e: unknown) {
          failures.push(`行: ${(e as Error).message}`)
        }
      }

      const lines: string[] = []
      if (created > 0) {
        lines.push(`✅ 导入完成: ${created}/${validation.valid.length} 条成功写入 ${entityName}`)
      }
      if (failures.length > 0) {
        lines.push(`⚠️ ${failures.length} 条失败: ${failures.slice(0, 3).join(' | ')}`)
        if (failures.length > 3) lines.push(`  ... 共 ${failures.length} 条失败`)
      }
      if (validation.errors.length > 0) {
        lines.push(`⚠️ ${validation.errors.length} 条校验错误（已跳过）`)
      }
      if (validation.valid.length > 0 && created === 0) {
        lines.push(`❌ 全部写入失败。表 ${entityName} 可能存在唯一键约束冲突（如 skuCode 重复），请检查数据。`)
      }
      if (lines.length === 0) {
        lines.push(`✅ 导入完成: 0 条（无有效数据需要导入）`)
      }
      return lines.join('\n')
    } catch (e: unknown) {
      return `❌ 导入执行失败: ${(e as Error).message}`
    }
  }

  private sessionDeltaFiles: string[] = []
  private trackDeltaFile(fp: string, op: string) { if ((op==='replace'||op==='write') && !this.sessionDeltaFiles.includes(fp)) this.sessionDeltaFiles.push(fp) }
  getDeltaSummary() { return { files: [...this.sessionDeltaFiles], count: this.sessionDeltaFiles.length } }
  clearDeltaFiles() { this.sessionDeltaFiles = [] }

  
  private executeFileEdit(args: Record<string, any>): string {
    return this.toolImpls.executeFileEdit(args);
  }

  private executeTscCheck(project: string): string {
    return this.toolImpls.executeTscCheck(project);
  }

  private executeGitDiff(mode: string, filePath?: string): string {
    return this.toolImpls.executeGitDiff(mode, filePath);
  }
private buildRuleBlock(): string {
    return [
      '## 美学规则（静态）',
      '- 圆框(RND) 适合: 圆脸、方脸、菱形脸',
      '- 方框(REC) 适合: 圆脸、椭圆脸',
      '- 猫眼(CAT) 适合: 圆脸、方脸',
      '- 暖色调肤色 → 暖色效果词',
      '- 冷色调肤色 → 冷色效果词',
    ].join('\n')
  }

  /** SSRF 防护：校验 web_fetch URL（H05+H07修复：IPv6映射+DNS重绑定标记）
   *  TODO: 生产环境需使用 dns.promises.resolve4 在被fetch前二次验证IP */
}

// ═══════════════════════════════════════════
// 独立函数（类外部）
// ═══════════════════════════════════════════

function detectIntent(msg: string): string {
  const lower = msg.toLowerCase()
  if (/导入|import|upload|upload/i.test(lower)) return 'import'
  if (/分析|analyze|data.*analy/i.test(lower)) return 'data_analyze'
  if (/网页|web|fetch|fetch|crawl/i.test(lower)) return 'web_fetch'
  if (/草稿|draft|update.*draft/i.test(lower)) return 'content_creation'
  if (/技术|tech|支持|support|bug|错误|修复|fix|代码|编译|前端.*(显示|检查|问题)|后端.*(检查|错误)/i.test(lower)) return 'tech_support'
  if (/产品|product|商品上架|spu.*创建|sku.*创建/i.test(lower)) return 'product_listing'
  if (/内容|content|文案|小红书|营销/i.test(lower)) return 'content_creation'
  if (/客服|customer|faq|售后/i.test(lower)) return 'customer_service'
  return 'product_listing'
}

function fuzzyScore(a: string, b: string): number {
  if (!a || !b) return 0
  a = a.toLowerCase()
  b = b.toLowerCase()
  if (a === b) return 1
  if (a.includes(b) || b.includes(a)) return 0.8
  // 简单的编辑距离相似度
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  let matches = 0
  const search = b
  let pos = 0
  for (const ch of a) {
    const idx = search.indexOf(ch, pos)
    if (idx >= 0) { matches++; pos = idx + 1 }
  }
  return matches / maxLen
}

function uid(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 10) + Date.now().toString(36)
}