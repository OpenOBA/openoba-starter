
/**
 * 秒镜科技 · ERDL V1.5 — Action Guard
 *
 * @file ERDL Action Guard — LLM 输出协议转换层
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-12
 * @license BSL-1.1
 *
 * 核心理念：
 *   LLM 输出不可预测（有时 FC，有时 XML 文本，有时纯文本）。
 *   Action Guard 是唯一的协议翻译层：无论 LLM 返回什么格式，
 *   都统一解析为 Action，校验后路由到具体 Service 执行。
 */

import { Injectable, Logger, Optional, Inject } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ERDLRegistry } from './erdl-registry'
import { EntityProxyService } from './entity-proxy.service'
import type { ERDLActionDef, ERDLActionParamDef, ERDLAST } from '../parser/erdl-parser'

// ═══════════════════════════════════════════
// 类型
// ═══════════════════════════════════════════

/** 解析后的 Action */
export interface ParsedAction {
  name: string
  args: Record<string, unknown>
  source: 'fc' | 'xml' | 'text'
  rawToolCallId?: string
  description?: string
}

/** 校验结果 */
export interface ValidationResult {
  ok: boolean
  error?: string
  warnings?: string[]
  normalizedArgs?: Record<string, unknown>
}

/** LLM API 返回的 choice 结构 — 覆盖 tool_calls + content 两种路径 */
export interface LLMChoice {
  message?: {
    content?: string
    tool_calls?: Array<{
      id?: string
      function: {
        name?: string
        arguments?: string
      }
    }>
  }
}

/** Service 执行器签名 */
export type ActionExecutor = (name: string, args: Record<string, unknown>) => Promise<string>

// ═══════════════════════════════════════════
// ERDL Action Guard
// ═══════════════════════════════════════════

@Injectable()
export class ERDLActionGuard {
  private readonly logger = new Logger(ERDLActionGuard.name)
  private enabled = process.env.ERDL_ACTION_GUARD !== 'false'

  constructor(
    private readonly registry: ERDLRegistry,
    private readonly proxy: EntityProxyService,
    @Optional() @Inject(DataSource) private readonly dataSource?: DataSource,
  ) {}

  /** 是否启用 */
  isEnabled(): boolean { return this.enabled }

  /**
   * ① 意图解析：从 LLM 原始输出中统一提取 Action
   *
   * 支持三种来源：
   * - 原生 Function Calling tool_calls
   * - 文本中的 <invoke> XML 标签
   * - （未来）纯文本语义解析
   */
  extractActions(rawChoices: LLMChoice[] | undefined): ParsedAction[] {
    if (!rawChoices || rawChoices.length === 0) return []

    const choice = rawChoices[0]
    const actions: ParsedAction[] = []

    // ── 路径1: 原生 tool_calls ──
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      for (const tc of choice.message.tool_calls) {
        let args: Record<string, unknown> = {}
        try { args = JSON.parse(tc.function.arguments || '{}') } catch { /* keep empty, JSON 解析失败时使用空对象 */ }
        actions.push({
          name: tc.function.name || '',
          args,
          source: 'fc',
          rawToolCallId: tc.id,
          description: this.getActionDescription(tc.function.name || '', args),
        })
      }
    }

    // ── 路径2: 文本中的 <invoke> XML 标签 ──
    const content = choice?.message?.content || ''
    if (content.includes('<invoke') && content.includes('</invoke>')) {
      const xmlActions = this.parseInvokeXML(content)
      // 避免与路径1重复
      for (const xa of xmlActions) {
        const dup = actions.find(a => a.name === xa.name)
        if (!dup) {
          actions.push({
            ...xa,
            source: 'xml',
            description: this.getActionDescription(xa.name, xa.args),
          })
        }
      }
    }

    return actions
  }

  /**
   * ② 操作校验：检查 Action 参数完整性
   */
  validate(action: ParsedAction): ValidationResult {
    const def = this.getActionDef(action.name)
    if (!def || !def.params) {
      // 没有定义 → 宽松模式，允许通过（如 query_knowledge）
      return { ok: true }
    }

    const warnings: string[] = []
    const normalizedArgs: Record<string, unknown> = { ...action.args }

    // 别名映射：LLM 可能用了行业黑话 → 转换为标准字段名
    const aliasMap = this.registry.getAliasMap('industry.eyewear', 'ProductSpu')
    if (aliasMap) {
      for (const [key, val] of Object.entries(normalizedArgs)) {
        if (aliasMap[key]) {
          const mappedKey = aliasMap[key]
          if (mappedKey !== key) {
            normalizedArgs[mappedKey] = val
            delete normalizedArgs[key]
          }
        }
      }
    }

    // 必填检查
    for (const [paramName, paramDef] of Object.entries(def.params)) {
      if (paramDef.required && normalizedArgs[paramName] === undefined) {
        return {
          ok: false,
          error: `缺少必填参数: ${paramName} (${paramDef.field || paramDef.type || ''})`,
        }
      }
    }

    // 枚举检查
    for (const [paramName, paramDef] of Object.entries(def.params)) {
      const enumValues = paramDef.enum || paramDef.values
      if (enumValues && normalizedArgs[paramName] !== undefined) {
        const val = String(normalizedArgs[paramName])
        if (!enumValues.includes(val)) {
          warnings.push(`${paramName}="${val}" 不在允许值 [${enumValues.join(', ')}] 中`)
        }
      }
    }

    return {
      ok: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      normalizedArgs,
    }
  }

  /**
   * 清理 LLM 输出中的 <invoke> XML 标签（前端不应看到这些）
   */
  cleanOutput(content: string): string {
    if (!content) return content
    return content.replace(/<invoke[\s\S]*?<\/invoke>/g, '').trim()
  }

  /**
   * ③ 获取 Action 定义
   */
  getActionDef(name: string): ERDLActionDef | undefined {
    return this.registry.getActionDef(name)
  }

  /**
   * 从 ERDL 定义生成 Action 描述（用于 thought 事件）
   */
  private getActionDescription(name: string, args: Record<string, unknown>): string {
    const def = this.getActionDef(name)
    if (def?.description) return def.description
    // 自动生成
    const argPreview = JSON.stringify(args).substring(0, 60).replace(/[{}\"]/g, '')
    return `${name}: ${argPreview}`
  }

  /**
   * 解析文本中的 <invoke> XML 标签
   *
   * 格式:
   *   <invoke name="draft_create">
   *     <parameter name="spuName" string="true">秒镜 S5344</parameter>
   *   </invoke>
   */
  private parseInvokeXML(content: string): Array<{ name: string; args: Record<string, unknown> }> {
    const results: Array<{ name: string; args: Record<string, unknown> }> = []
    const invokeRegex = /<invoke\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/invoke>/g
    let match: RegExpExecArray | null
    while ((match = invokeRegex.exec(content)) !== null) {
      const toolName = match[1]
      const inner = match[2]
      const args: Record<string, unknown> = {}
      // 兼容两种格式：带 string="true"/string="false" 属性和不带属性的简化格式
      const paramRegex = /<parameter\s+name="([^"]+)"(?:[^>]*string="true"[^>]*)?>([^<]*)<\/parameter>/g
      const paramRegexJSON = /<parameter\s+name="([^"]+)"[^>]*string="false"[^>]*>([^<]*)<\/parameter>/g
      this.extractParams(inner, paramRegex, args, false)
      this.extractParams(inner, paramRegexJSON, args, true)
      results.push({ name: toolName, args })
    }
    return results
  }

  private extractParams(
    inner: string, regex: RegExp, args: Record<string, unknown>, parseJSON: boolean,
  ): void {
    let m: RegExpExecArray | null
    while ((m = regex.exec(inner)) !== null) {
      const key = m[1]
      const raw = m[2].trim()
      if (parseJSON) {
        try { args[key] = JSON.parse(raw) } catch { args[key] = raw /* JSON 解析失败时保留原始字符串 */ }
      } else {
        args[key] = raw
      }
    }
  }
}
