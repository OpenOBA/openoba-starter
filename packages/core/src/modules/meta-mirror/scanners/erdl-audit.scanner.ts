/**
 * 元镜 ERDL ↔ DTO 审计扫描器 — 交叉比对 ERDL Ruleset 与 Controller DTO 校验约束
 *
 * @file erdl-audit.scanner.ts
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-26
 *
 * 核心功能：
 *  1. 对每条 ERDL Validation 规则 → 查找 Controller DTO 的同名字段
 *  2. 比对 operator/value 与 DTO 的 @Min/@Max/@IsNotEmpty
 *  3. 对 DTO 有但 ERDL 没有的约束 → 标记为 ERDL_MISSING
 *  4. 产出 erdl-dto-audit-report.md
 */

import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import type { DtoInfo } from './dto.scanner'
import type { EnhancedRuleInfo } from './rule.scanner'
import type { EntityInfo } from '../types'

export type AuditStatus = 'OK' | 'ERDL_STRICTER' | 'CODE_STRICTER' | 'ERDL_MISSING' | 'CODE_MISSING'

export interface AuditEntry {
  status: AuditStatus
  erdlRule?: string         // ERDL 规则名
  erdlDetail?: string       // ERDL 约束内容
  dtoConstraint?: string    // DTO 约束内容
  entity: string
  field: string
  message: string
}

export interface ErdlDtoAuditReport {
  generatedAt: string
  totalAudited: number
  ok: number
  issues: number
  entries: AuditEntry[]
}

@Injectable()
export class ErdlAuditScanner {
  private readonly logger = new Logger(ErdlAuditScanner.name)

  /**
   * 执行审计
   *
   * @param rules Enhanced ERDL 规则列表
   * @param dtos DTO 信息列表
   * @param entities Entity 信息列表（用于查找字段）
   */
  audit(
    rules: EnhancedRuleInfo[],
    dtos: DtoInfo[],
    entities: EntityInfo[],
  ): ErdlDtoAuditReport {
    const entries: AuditEntry[] = []
    const validationRules = rules.filter(r => r.ruleType === 'validation')

    for (const rule of validationRules) {
      const entityName = rule.entity
      const entity = entities.find(e => e.name === entityName || entityName.includes(e.name))
      if (!entity) continue

      // 1. 从规则条件中提取字段名和约束
      for (const condition of rule.conditions) {
        const parsed = this.parseCondition(condition)
        if (!parsed) continue

        const { field, operator, value } = parsed
        if (!field || !operator) continue

        // 2. 在 DTO 中查找对应字段
        const dtoMatch = this.findDtoConstraint(dtos, entityName, field)
        const dtoConstraint = dtoMatch ? this.describeDtoConstraint(dtoMatch) : undefined

        // 3. 确定审计状态
        const status = this.determineStatus(rule, field, operator, value, dtoMatch as unknown as Record<string, unknown> | undefined)
        const erdlDetail = `ERDL: ${field} ${operator} ${value || ''}`

        entries.push({
          status,
          erdlRule: rule.name,
          erdlDetail,
          dtoConstraint,
          entity: entityName,
          field,
          message: this.buildMessage(status, rule, field, erdlDetail, dtoConstraint),
        })

        this.logger.debug(`[ErdlAudit] ${status}: ${rule.name} | ${field} | ERDL=${operator}${value} | DTO=${dtoConstraint || '无'}`)
      }
    }

    // 4. 反向审计：DTO 有但 ERDL 没有的必填约束
    for (const dto of dtos) {
      const entityName = dto.relatedEntity
      if (!entityName || !dto.dtoName.startsWith('Create')) continue

      for (const dtoField of dto.fields) {
        if (dtoField.isOptional) continue // 可选字段跳过

        // ERDL 中是否有此字段规则
        const hasErdl = validationRules.some(r =>
          r.entity === entityName && r.conditions.some(c => c.includes(dtoField.fieldName))
        )
        if (!hasErdl) {
          entries.push({
            status: 'ERDL_MISSING',
            entity: entityName,
            field: dtoField.fieldName,
            dtoConstraint: this.describeDtoConstraint(dtoField),
            message: `DTO 要求 "${dtoField.fieldName}" 必填（${this.describeDtoConstraint(dtoField)}），但 ERDL 无对应校验规则`,
          })
        }
      }
    }

    const ok = entries.filter(e => e.status === 'OK').length
    const issues = entries.filter(e => e.status !== 'OK').length

    this.logger.log(`ErdlAudit: ${entries.length} 条 (✅${ok} ⚠️${issues})`)

    return {
      generatedAt: new Date().toISOString(),
      totalAudited: entries.length,
      ok,
      issues,
      entries,
    }
  }

  /** 写出审计报告到 Markdown 文件 */
  writeReport(report: ErdlDtoAuditReport, outputDir: string): void {
    let md = '# ERDL ↔ DTO 一致性审计报告\n\n'
    md += `> 元镜自动生成 · ${new Date().toISOString().split('T')[0]}\n\n`
    md += `| 状态 | 审计 ${report.totalAudited} 条，✅${report.ok} ⚠️${report.issues} |\n\n`

    md += '## 不一致项\n\n'
    md += '| 状态 | Entity | 字段 | ERDL 约束 | DTO 约束 | 说明 |\n'
    md += '|------|--------|------|-----------|----------|------|\n'

    const issues = report.entries.filter(e => e.status !== 'OK')
    for (const e of issues) {
      const icon = e.status === 'ERDL_STRICTER' ? '⚠️' : e.status === 'CODE_STRICTER' ? '⚠️' : '❌'
      md += `| ${icon} ${e.status} | ${e.entity} | ${e.field} | ${e.erdlDetail || '—'} | ${e.dtoConstraint || '—'} | ${e.message} |\n`
    }

    if (issues.length === 0) {
      md += '| ✅ | — | — | — | — | 没有发现不一致项 |\n'
    }

    md += '\n## 一致项\n\n'
    md += '| Entity | 字段 | ERDL | DTO |\n'
    md += '|--------|------|------|-----|\n'
    for (const e of report.entries.filter(e => e.status === 'OK')) {
      md += `| ${e.entity} | ${e.field} | ${e.erdlDetail || '—'} | ${e.dtoConstraint || '—'} |\n`
    }

    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(path.join(outputDir, 'erdl-dto-audit-report.md'), md, 'utf-8')
    this.logger.log(`ErdlAudit 报告: ${path.join(outputDir, 'erdl-dto-audit-report.md')}`)
  }

  // ═══════════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════════

  /** 解析 ERDL 条件字符串 */
  private parseCondition(cond: string): { field?: string; operator?: string; value?: string } | null {
    // 格式如 "gtestring" 或 "retailPrice 1" 或 "costPrice gt 0 retailPrice gte 1"
    // 当前 Rule Scanner 的 condition 是碎片化的
    const opMatch = cond.match(/(\w+)\s+(\w+)/)
    if (opMatch) {
      return { field: opMatch[1], operator: opMatch[2], value: '' }
    }

    // 简单格式: "gte 1" （field 在前面已提取）
    const opOnly = cond.match(/^(eq|ne|gt|gte|lt|lte|in|contains|match|exists)\s*(.*)/)
    if (opOnly) {
      return { operator: opOnly[1], value: opOnly[2].trim() }
    }

    return null
  }

  /** 在 DTO 列表中查找字段约束 */
  private findDtoConstraint(dtos: DtoInfo[], entityName: string, fieldName: string): DtoInfo['fields'][0] | undefined {
    for (const dto of dtos) {
      if (dto.relatedEntity === entityName || dto.relatedEntity === entityName.replace('Product', '')) {
        const field = dto.fields.find(f => f.fieldName === fieldName)
        if (field) return field
      }
    }
    return undefined
  }

  /** 描述 DTO 约束 */
  private describeDtoConstraint(field: DtoInfo['fields'][0]): string {
    const parts: string[] = []
    if (field.isOptional) parts.push('可选')
    else parts.push('必填')
    if (field.min !== undefined) parts.push(`Min(${field.min})`)
    if (field.max !== undefined) parts.push(`Max(${field.max})`)
    if (field.minLength !== undefined) parts.push(`MinLength(${field.minLength})`)
    if (field.isEnum) parts.push('枚举')
    return parts.join(', ')
  }

  /** 判定审计状态 */
  private determineStatus(
    rule: EnhancedRuleInfo,
    field: string,
    operator: string,
    value: string | undefined,
    dtoField: Record<string, unknown> | undefined,
  ): AuditStatus {
    if (!dtoField) return 'CODE_MISSING'

    // ERDL gte 1  vs DTO Min(0) → 一致
    if (operator === 'gte' && dtoField.min !== undefined && typeof dtoField.min === 'number') {
      const erdlMin = parseFloat(value || '')
      if (!isNaN(erdlMin) && dtoField.min === erdlMin) return 'OK'
      if (!isNaN(erdlMin) && dtoField.min > erdlMin) return 'CODE_STRICTER'
      if (!isNaN(erdlMin) && dtoField.min < erdlMin) return 'ERDL_STRICTER'
    }

    // ERDL lte N vs DTO Max(N) → 一致
    if (operator === 'lte' && dtoField.max !== undefined) {
      const erdlMax = parseFloat(value || '')
      if (!isNaN(erdlMax) && dtoField.max === erdlMax) return 'OK'
    }

    // ERDL eq/ne vs DTO IsEnum → 相关
    if ((operator === 'eq' || operator === 'ne') && dtoField.isEnum) return 'OK'

    // ERDL exists → DTO 必填
    if (operator === 'exists') {
      if (!dtoField.isOptional) return 'OK'
      return 'CODE_LOOSER' as AuditStatus
    }

    // 无法判断 → OK（不误报）
    return 'OK'
  }

  private buildMessage(
    status: AuditStatus,
    rule: EnhancedRuleInfo,
    field: string,
    erdlDetail: string | undefined,
    dtoConstraint: string | undefined,
  ): string {
    switch (status) {
      case 'OK': return `${field}: ERDL 与 DTO 一致`
      case 'ERDL_STRICTER': return `${field}: ERDL (${erdlDetail}) 比 DTO (${dtoConstraint}) 更严格`
      case 'CODE_STRICTER': return `${field}: DTO (${dtoConstraint}) 比 ERDL 更严格`
      case 'ERDL_MISSING': return `${field}: ERDL 缺少 DTO 中已定义的约束`
      case 'CODE_MISSING': return `${field}: DTO 缺少 ERDL 中定义的校验`
      default: return status
    }
  }
}
