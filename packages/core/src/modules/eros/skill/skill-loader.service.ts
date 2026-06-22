/**
 * SKILL Loader — 目录扫描 → 自动注册 Agent 工具
 *
 * 扫描 skills/{core,industry,external}/ 目录，
 * 解析 skill.yaml → 注册到 AgentToolRegistry。
 *
 * @author 唐浩然（AI 联合创始人）
 * @since 2026-05-18
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, IsNull } from 'typeorm'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { SkillRegistry } from './skill-registry.entity'
import { SkillKeyVault } from './skill-key-vault.entity'
import { AgentToolRegistry } from '../task/agent-tool-registry'
import type { ERDLLMTool } from '../../erdl/llm/erdl-llm-provider.interface'

function uid(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

interface SkillYamlTool {
  name: string
  description: string
  parameters: Record<string, unknown>
  required?: string[]
}

interface SkillYaml {
  name: string
  version?: string
  display_name?: string
  description?: string
  category?: string
  author?: string
  pricing?: { model?: string; amount?: number; period?: string }
  kb_refs?: string[]
  mirror_refs?: { entities?: string[]; apis?: string[]; rules?: string[]; conventions?: string[] }
  permissions?: Record<string, unknown>
  dependencies?: Record<string, unknown>
  tool?: SkillYamlTool
  keys?: Array<{ name: string; label: string; required?: boolean; masked?: boolean }>
}

@Injectable()
export class SkillLoader implements OnModuleInit {
  private readonly logger = new Logger(SkillLoader.name)
  private readonly skillsDir: string

  constructor(
    @InjectRepository(SkillRegistry) private registryRepo: Repository<SkillRegistry>,
    @InjectRepository(SkillKeyVault) private vaultRepo: Repository<SkillKeyVault>,
    private readonly toolRegistry: AgentToolRegistry,
  ) {
    // skills/ 目录从 cwd 往上两层（backend → starter根），统一放在 openoba-starter/skills/
    // 同时支持从 Core dist 单独运行时的情况
    const candidate1 = path.resolve(process.cwd(), '../../skills')
    const candidate2 = path.resolve(process.cwd(), '../../../../skills')
    this.skillsDir = fs.existsSync(candidate1) ? candidate1 : candidate2
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(`🔍 SkillLoader 启动，扫描目录: ${this.skillsDir}`)
    await this.scanAndRegister()
  }

  /** 扫描所有 SKILL 目录并注册 */
  async scanAndRegister(): Promise<number> {
    let count = 0
    const categories = ['core', 'industry', 'external']

    for (const cat of categories) {
      const catDir = path.join(this.skillsDir, cat)
      if (!fs.existsSync(catDir)) continue

      const entries = fs.readdirSync(catDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const skillDir = path.join(catDir, entry.name)
        const yamlPath = path.join(skillDir, 'skill.yaml')
        if (!fs.existsSync(yamlPath)) continue

        try {
          await this.registerSkill(skillDir, yamlPath, cat)
          count++
        } catch (e: unknown) {
          this.logger.error(`注册 SKILL 失败: ${entry.name} - ${(e as Error).message}`)
        }
      }
    }

    this.logger.log(`✅ SkillLoader 完成: ${count} 个 SKILL 已注册`)
    return count
  }

  /** 注册单个 SKILL */
  private async registerSkill(skillDir: string, yamlPath: string, category: string): Promise<void> {
    const yaml = this.parseYaml(fs.readFileSync(yamlPath, 'utf-8'))
    const { name, tool } = yaml
    if (!name) throw new Error('skill.yaml 缺少 name')
    if (!tool) throw new Error('skill.yaml 缺少 tool 定义')

    const skillName = `${category}/${name}`

    // 1. 写入 skill_registry 表（如果不存在）
    let reg = await this.registryRepo.findOneBy({ skillName })
    if (!reg) {
      reg = new SkillRegistry()
      reg.id = uid()
      reg.skillName = skillName
      reg.displayName = yaml.display_name || name
      reg.version = yaml.version || '1.0.0'
      reg.category = category
      reg.author = yaml.author || '秒镜科技'
      reg.description = yaml.description || ''
      reg.entrypoint = path.relative(this.skillsDir, skillDir)
      reg.pricingModel = yaml.pricing?.model || 'free'
      reg.pricingAmount = yaml.pricing?.amount || 0
      reg.pricingPeriod = yaml.pricing?.period || ''
      reg.kbRefs = yaml.kb_refs || []
      reg.mirrorRefs = yaml.mirror_refs || undefined
      reg.permissions = yaml.permissions || {}
      reg.dependencies = yaml.dependencies || {}
      reg.status = 'active'
      await this.registryRepo.save(reg)
    }

    // 2. 注册 API Key 需求
    if (yaml.keys) {
      for (const key of yaml.keys) {
        const existing = await this.vaultRepo.findOneBy({
          skillName,
          keyName: key.name,
        })
        if (!existing) {
          const vault = new SkillKeyVault()
          vault.id = uid()
          vault.skillName = skillName
          vault.keyName = key.name
          vault.keyLabel = key.label || key.name
          vault.isRequired = !!key.required
          vault.isMasked = !!key.masked
          await this.vaultRepo.save(vault)
        }
      }
    }

    // 3. 注册为 Agent 工具
    const toolDef: ERDLLMTool = {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        strict: true,
        parameters: {
          type: 'object',
          properties: tool.parameters || {},
          required: tool.required || [],
          additionalProperties: false,
        },
      },
    }

    this.toolRegistry.register({
      definition: toolDef,
      execute: async (tName, args) => {
        // 记录调用次数
        try {
          await this.registryRepo.increment({ skillName }, 'runCount', 1)
          await this.registryRepo.update({ skillName }, { lastRunAt: new Date() })
        } catch { /* 非关键 */ }

        // 🚀 委托到 AgentToolRegistry 中已注册的真实执行器
        const executor = this.toolRegistry.createExecutor()
        return executor(tName, args)
      },
      agentTypes: yaml.category === 'core' ? undefined : [category],
    })

    this.logger.log(`  📦 ${skillName} v${yaml.version || '1.0.0'} — ${tool.name}`)
  }

  /** YAML 解析器 — 支持嵌套结构和列表 */
  private parseYaml(content: string): SkillYaml {
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1)
    const lines = content.split('\n')
    const parsed = this.parseYamlBlock(lines, 0, 0)
    return parsed.value as unknown as SkillYaml
  }

  private parseYamlBlock(
    lines: string[], startIdx: number, baseIndent: number,
  ): { value: Record<string, unknown>; endIdx: number } {
    const result: Record<string, unknown> = {}
    let i = startIdx
    let currentKey = ''
    let inList = false
    let listItems: unknown[] = []
    let listKey = ''

    while (i < lines.length) {
      const line = lines[i]
      const trimmed = line.trimEnd()

      // 空行或注释 → 跳过
      if (trimmed === '' || trimmed.trimStart().startsWith('#')) { i++; continue }

      const indent = line.length - line.trimStart().length

      // 缩进减小 → 返回上一级
      if (indent < baseIndent) break

      if (indent === baseIndent) {
        // 同级 key
        if (inList) { result[listKey] = listItems; inList = false; listItems = [] }

        const keyMatch = trimmed.match(/^([\w_-]+):\s*(.*)/)
        if (keyMatch) {
          currentKey = keyMatch[1]
          const after = keyMatch[2].trim()
          if (after === '') {
            // 嵌套对象或列表 → 看下一行
            i++
            if (i < lines.length) {
              const nextIndent = (lines[i].length - lines[i].trimStart().length) || 4
              const nextTrimmed = lines[i].trimStart()
              if (nextTrimmed.startsWith('- ')) {
                // 内联列表 (同缩进级别逗号分隔) — 先检查是否是 [a, b, c] 格式
                const inlineMatch = trimmed.match(/^([\w_-]+):\s*\[(.*)\]/)
                if (inlineMatch) {
                  result[inlineMatch[1]] = inlineMatch[2].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''))
                } else {
                  // 嵌套列表
                  result[currentKey] = this.parseSimpleList(lines, i - 1, nextIndent)
                  i++ // skip past list
                }
              } else if (nextIndent > indent) {
                // 嵌套对象
                const sub = this.parseYamlBlock(lines, i, nextIndent)
                result[currentKey] = sub.value
                i = sub.endIdx
                continue
              }
            }
            result[currentKey] = ''
          } else if (after.startsWith('[') && after.endsWith(']')) {
            result[currentKey] = after.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''))
          } else {
            result[currentKey] = after.replace(/^["']|["']$/g, '')
          }
        }
      } else if (indent > baseIndent) {
        // 子列表项
        if (trimmed.startsWith('- ')) {
          const item = trimmed.slice(2).trim()
          // 尝试解析为 key: value
          const kvMatch = item.match(/^([\w_-]+):\s*(.*)/)
          if (kvMatch) {
            const val = kvMatch[2].trim()
            listItems.push(val ? val.replace(/^["']|["']$/g, '') : '')
          } else {
            listItems.push(item.replace(/^["']|["']$/g, ''))
          }
          if (!inList) { inList = true; listKey = currentKey }
        }
      }

      i++
    }

    if (inList) result[listKey] = listItems
    return { value: result, endIdx: i }
  }

  private parseSimpleList(lines: string[], startIdx: number, indent: number): string[] {
    const items: string[] = []
    for (let i = startIdx + 1; i < lines.length; i++) {
      const trimmed = lines[i].trimStart()
      const lineIndent = lines[i].length - lines[i].trimStart().length
      if (trimmed === '' || trimmed.startsWith('#')) continue
      if (lineIndent < indent) break
      if (trimmed.startsWith('- ')) {
        items.push(trimmed.slice(2).trim().replace(/^["']|["']$/g, ''))
      }
    }
    return items
  }

  /** 查询已安装 SKILL 列表 */
  async listSkills(category?: string): Promise<SkillRegistry[]> {
    const where: Partial<Pick<SkillRegistry, 'category'>> = {}
    if (category) where.category = category
    return this.registryRepo.find({ where, order: { category: 'ASC', skillName: 'ASC' } })
  }

  /** 获取 SKILL 需要的 Key 列表 */
  async getSkillKeys(skillName: string): Promise<SkillKeyVault[]> {
    return this.vaultRepo.find({ where: { skillName }, order: { keyName: 'ASC' } })
  }

  /** 更新 SKILL Key 值 — 4R08修复：AES-256-GCM 加密存储 */
  async setSkillKey(skillName: string, keyName: string, value: string): Promise<void> {
    const encrypted = this.encryptValue(value)
    await this.vaultRepo.update(
      { skillName, keyName },
      { encryptedValue: encrypted },
    )
  }

  /** 4R08：读取时解密 */
  async getSkillKeysDecrypted(skillName: string): Promise<Array<{ keyName: string; keyLabel: string; value: string }>> {
    const vaults = await this.vaultRepo.find({ where: { skillName }, order: { keyName: 'ASC' } })
    return vaults.map(v => ({
      keyName: v.keyName,
      keyLabel: v.keyLabel,
      value: this.decryptValue(v.encryptedValue),
    }))
  }

  /** AES-256-GCM 加密 */
  private encryptValue(plaintext: string): string {
    const rawKey = process.env.SKILL_VAULT_KEY
    if (!rawKey) throw new Error('SKILL_VAULT_KEY 环境变量未设置，无法解密敏感值。请设置至少32字符的随机密钥。')
    const key = Buffer.from(rawKey, 'utf8').subarray(0, 32)
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
  }

  /** AES-256-GCM 解密 */
  private decryptValue(ciphertext?: string): string {
    if (!ciphertext) return ''
    try {
      const [ivHex, tagHex, encHex] = ciphertext.split(':')
      if (!ivHex || !tagHex || !encHex) {
        // M12: 非加密格式数据 — 已标记需迁移，拒绝返回避免泄露
        this.logger.error(`Skill Vault 安全告警: 检测到未加密明文数据，已拒绝返回。请迁移所有 Key。`)
        throw new Error('安全错误：检测到未加密明文 Key，请先通过管理界面重新输入。')
      }
      const rawKey = process.env.SKILL_VAULT_KEY
      if (!rawKey) throw new Error('SKILL_VAULT_KEY 环境变量未设置，无法解密敏感值')
      const key = Buffer.from(rawKey, 'utf8').subarray(0, 32)
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
      return decipher.update(Buffer.from(encHex, 'hex'), undefined, 'utf8') + decipher.final('utf8')
    } catch {
      // 解密失败 → 拒绝返回，记录安全事件
      this.logger.error(`Skill Vault 安全告警: AES-256-GCM 解密失败，已拒绝返回。请检查 SKILL_VAULT_KEY 是否正确。`)
      throw new Error('安全错误：密钥解密失败，请检查 SKILL_VAULT_KEY 配置。')
    }
  }
}
