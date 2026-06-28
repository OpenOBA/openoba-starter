/**
 * OpenOBA · Agent Tool Implementations
 *
 * @file Agent 工具实现集 — 所有 execute*() 方法的独立容器
 * @author 唐浩然（OpenOBA AI 联合创始人）
 * @since 2026-06-21
 * @license BSL-1.1
 *
 * 从 agent-executor.service.ts（组C）拆分而来
 * 分三批搬迁。第一批：executeErpQuery + executeErdlCrud + executeKnowledgeQuery
 */

import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ERDLRegistry } from '../../erdl/core/erdl-registry'
import { EntityProxyService } from '../../erdl/core/entity-proxy.service'
import { KnowledgeService } from './knowledge.service'
import { InventoryService } from '../../inventory/inventory.service'
import { AgentTask } from './agent-task.entity'
import { AgentSecurityGuard } from './agent-security-guard'
import { DraftPoolService } from '../../draft-pool/draft-pool.service'
import { DraftService } from '../../draft-pool/draft.service'
import { AestheticsService } from '../../aesthetics/aesthetics.service'
import { TIMEOUT } from '../../../common/constants/timeouts'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { EntityDataBridge, IEntityDataRegistry } from '../../erdl/core/entity-data-bridge'

type DbRow = Record<string, string>

@Injectable()
export class AgentToolImplementations {
  private readonly logger = new Logger(AgentToolImplementations.name)

  // 安全红线常量表（从 Executor 搬迁）
  private readonly FORBIDDEN_TABLES = new Set<string>(
    ['sys_model_key', 'sys_user_credentials', 'sys_config_secret'],
  )
  private readonly READONLY_FIELDS = new Set<string>(
    ['id', 'createdAt', 'updatedAt', 'deletedAt', 'isDeleted', 'version'],
  )


  // 工具间共享查询缓存 (executeCsvExport)
  private queryCache = new Map<string, { data: Record<string, unknown>[]; timestamp: number }>()
  private readonly CACHE_MAX_SIZE = 50
  private readonly CACHE_TTL_MS = 5 * 60 * 1000  // 5 分钟

  private cacheSet(key: string, data: Record<string, unknown>[]): void {
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

  private cacheGet(key: string): Record<string, unknown>[] | null {
    const entry = this.queryCache.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > this.CACHE_TTL_MS) {
      this.queryCache.delete(key)
      return null
    }
    return entry.data
  }

  constructor(
    @InjectRepository(AgentTask)
    private readonly taskRepo: Repository<AgentTask>,
    private readonly registry: ERDLRegistry,
    private readonly proxy: EntityProxyService,
    private readonly knowledgeService: KnowledgeService,
    private readonly inventoryService: InventoryService,
    private readonly draftService: DraftService,
    private readonly draftPoolService: DraftPoolService,
    private readonly aestheticsService: AestheticsService,
    private readonly securityGuard: AgentSecurityGuard,
  ) {}

  // ═══════════════════════════════════════════
  // executeErpQuery — 查询 ERP 数据
  // ═══════════════════════════════════════════

  async executeErpQuery(dataType: string): Promise<string> {
    const lines: string[] = []

    const queries: Record<string, () => Promise<void>> = {
      spu: async () => {
        try {
          const rows = await this.taskRepo.manager.query('SELECT spu_code, spu_name, structure_standard_code, series_code, gender, status FROM product_spu WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT 10')
          lines.push('## 现有 SPU')
          if (rows.length === 0) lines.push('（无数据）')
          else rows.forEach((r: DbRow) => lines.push(`- ${r.spu_code}: ${r.spu_name} | 结构标准:${r.structure_standard_code||'—'} | 系列:${r.series_code||'—'} | 性别:${r.gender||'—'} | ${r.status}`))
          lines.push('')
        } catch (e) { lines.push('## 现有 SPU\n（查询失败）\n') }
      },
      sku: async () => {
        try {
          const rows = await this.taskRepo.manager.query('SELECT sku_code, sku_name, color_code, skin_tone_effect, face_shape_effect, status FROM product_sku WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT 20')
          lines.push('## 现有 SKU')
          if (rows.length === 0) lines.push('（无数据）')
          else rows.forEach((r: DbRow) => lines.push(`- ${r.sku_code}: ${r.sku_name||'—'} | 色号:${r.color_code||'—'} | 肤色效果:${r.skin_tone_effect||'—'} | 脸型效果:${r.face_shape_effect||'—'} | ${r.status}`))
          lines.push('')
        } catch (e) { lines.push('## 现有 SKU\n（查询失败: '+String(e).substring(0,80)+'）\n') }
      },
      shapes: async () => {
        try {
          const rows = await this.taskRepo.manager.query('SELECT shape_code, shape_name FROM structure_shape WHERE is_active=1 ORDER BY sort_order')
          lines.push('## 可用框型'); rows.forEach((r: DbRow) => lines.push(`- ${r.shape_code}: ${r.shape_name}`)); lines.push('')
        } catch (e) { lines.push('## 可用框型\n（查询失败）\n') }
      },
      colors: async () => {
        try {
          const rows = await this.taskRepo.manager.query('SELECT color_code, color_name, color_name_en FROM dict_sku_color WHERE is_active=1 LIMIT 20')
          lines.push('## 可用色彩'); rows.forEach((r: DbRow) => lines.push(`- ${r.color_code}: ${r.color_name} (${r.color_name_en||''})`)); lines.push('')
        } catch (e) { lines.push('## 可用色彩\n（查询失败）\n') }
      },
      materials: async () => {
        try { lines.push('## 可用材质\n（字典表未配置）\n') } catch (e) { lines.push('## 可用材质\n（查询失败）\n') }
      },
      effects: async () => {
        try {
          const rows = await this.taskRepo.manager.query('SELECT effect_code, effect_type, effect_name FROM dict_effect_tag WHERE is_active=1 LIMIT 30')
          lines.push('## 效果词库')
          const skin = rows.filter((r: DbRow) => r.effect_type==='skin_tone')
          const face = rows.filter((r: DbRow) => r.effect_type==='face_shape')
          if (skin.length) lines.push(`肤色: ${skin.map((r: DbRow)=>r.effect_name).join('、')}`)
          if (face.length) lines.push(`脸型: ${face.map((r: DbRow)=>r.effect_name).join('、')}`)
          lines.push('')
        } catch (e) { lines.push('## 效果词库\n（查询失败）\n') }
      },
      series: async () => {
        try {
          const rows = await this.taskRepo.manager.query('SELECT series_code, series_name FROM structure_series WHERE is_active=1 ORDER BY sort_order')
          lines.push('## 可用系列'); rows.forEach((r: DbRow) => lines.push(`- ${r.series_code}: ${r.series_name}`)); lines.push('')
        } catch (e) { lines.push('## 可用系列\n（查询失败）\n') }
      },
      rules: async () => {
        const allRules = this.registry.getRulesByTrigger('Product.price.calculate')
        const pricing = allRules.filter(r => r.tier==='policy')
        lines.push('## 生效定价规则')
        if (pricing.length===0) lines.push('（无特殊规则，按默认定价）')
        else pricing.forEach(r => lines.push(`- ${r.name}: priority=${r.priority} tier=${r.tier}`))
        lines.push('')
      },
      all: async () => {
        for (const key of ['spu','sku','shapes','colors','materials','effects','series','rules']) {
          await queries[key]?.()
        }
      },
    }

    const fn = queries[dataType]
    if (fn) { await fn() } else { lines.push('未知数据类型: ' + dataType) }

    return lines.join('\n')
  }

  // ═══════════════════════════════════════════
  // executeKnowledgeQuery — 查询知识库
  // ═══════════════════════════════════════════

  async executeKnowledgeQuery(keyword: string): Promise<string> {
    const tags = keyword.split(/[,，]/).map(t => t.trim()).filter(Boolean)
    const { publicEntries, privateEntries } = await this.knowledgeService.searchForAgent({
      tags: tags.length > 0 ? tags : [keyword],
      topk: 5,
    })
    const lines: string[] = []
    if (publicEntries.length > 0) {
      lines.push(`## 知识库: "${keyword}" (${publicEntries.length} 条)`)
      for (const e of publicEntries) {
        lines.push(`- [${e.id}] ${e.title}`)
        lines.push(`  ${(e as { content?: string }).content?.substring(0, 150) || ''}...`)
      }
    }
    if (privateEntries.length > 0) {
      lines.push(`## 私有知识 (${privateEntries.length} 条)`)
      for (const e of privateEntries) {
        lines.push(`- [${e.id}] ${e.title}`)
        lines.push(`  ${(e as { content?: string }).content?.substring(0, 150) || ''}...`)
      }
    }
    if (publicEntries.length + privateEntries.length === 0) {
      lines.push(`未找到与"${keyword}"相关的知识条目`)
    }
    return lines.join('\n')
  }

  // ═══════════════════════════════════════════
  // executeErdlCrud — ERDL 实体代理 CRUD
  // ═══════════════════════════════════════════

  async executeErdlCrud(args: {
    action: string
    entity: string
    values?: Record<string, unknown>
    where?: Record<string, unknown>
    data?: Record<string, unknown>
  }): Promise<string> {
    const { action: rawAction, entity } = args
    const action = rawAction === 'query' ? 'read' : rawAction
    const values = args.values || args.data
    const where = args.where
    const select = (args as Record<string, unknown>).select
    const ns = 'industry.eyewear'

    // 安全红线：禁止系统表
    const mapping = (this.proxy as unknown as { getMapping?: (ns: string, entity: string) => { table: string } }).getMapping?.(ns, entity)
    if (mapping && this.FORBIDDEN_TABLES.has(mapping.table)) {
      return `❌ 禁止操作: ${mapping.table} 是系统安全表`
    }

    // 安全红线：禁止写系统字段
    if (values) {
      for (const key of Object.keys(values)) {
        if (this.READONLY_FIELDS.has(key)) return `❌ 禁止写系统字段: ${key}`
      }
    }

    try {
      switch (action) {
        case 'create': {
          if (!values || Object.keys(values).length === 0) return '❌ create 需要 values'

          if (entity === 'InventoryDocument' && this.proxy.getDataSource()) {
            try {
              return await this.proxy.withTransaction(async () => {
                const r = await this.proxy.insert({ namespace: ns, entity, data: values })
                if (!r.success) throw new Error(r.error || '创建失败')

                const docNo = values['docNo'] as string
                if (docNo) {
                  const docs = await this.inventoryService.findDocuments({ status: 'pending' })
                  const doc = docs.items.find((d: { docNo?: string }) => d.docNo === docNo)
                  if (doc) {
                    await this.inventoryService.confirmDocument(doc.id, 'agent')
                    return `✅ 入库单 ${docNo} 已创建并执行！| ${entity} | 库存已更新（事务保护）`
                  }
                }
                return `✅ create ${entity} 成功（事务保护）| 影响 ${r.affectedRows || 1} 行`
              })
            } catch (e: unknown) {
              this.logger.error(`InventoryDocument 事务创建失败: ${(e as Error).message}`)
              return `❌ 操作失败（已回滚）: ${(e as Error).message}`
            }
          }

          const r = await this.proxy.insert({ namespace: ns, entity, data: values })
          if (!r.success) return `❌ 创建失败: ${r.error}`
          return `✅ create ${entity} 成功 | 影响 ${r.affectedRows || 1} 行`
        }

        case 'update': {
          if (!where) return '❌ update 需要 where 条件'
          if (!values || Object.keys(values).length === 0) return '❌ update 需要 values'
          const r = await this.proxy.update({ namespace: ns, entity, data: values, where })
          if (!r.success) return `❌ 更新失败: ${r.error}`
          return `✅ update ${entity} 成功 | 影响 ${r.affectedRows || 0} 行`
        }

        case 'delete': {
          if (!where) return '❌ delete 需要 where 条件'
          // 软删除
          const r = await this.proxy.update({ namespace: ns, entity, data: { isDeleted: true }, where })
          if (!r.success) return `❌ 删除失败: ${r.error}`
          return `✅ delete ${entity} 成功（软删除）| 影响 ${r.affectedRows || 0} 行`
        }

        case 'read': {
          const result = await this.proxy.query({
            namespace: ns,
            entity,
            where,
            limit: Number((args as Record<string, unknown>).limit) || 30,
            offset: Number((args as Record<string, unknown>).offset) || 0,
          })
          if (!result.success) return `❌ 查询失败: ${result.error}`
          const rows = (result as { rows?: Record<string, unknown>[] } | undefined)?.rows || []
          if (rows.length === 0) return `📭 ${entity}: 无匹配数据`
          const cols = (select as string[] | undefined) || (rows.length > 0 ? Object.keys(rows[0]).filter(k => k !== 'id') : ['*'])
          let table = `## ${entity} (${rows.length} 条)\n\n`
          table += '| ' + cols.join(' | ') + ' |\n'
          table += '|' + cols.map(() => '---').join('|') + '|\n'
          for (const row of rows) {
            table += '| ' + cols.map((c: string) => String(row[c] ?? '')).join(' | ') + ' |\n'
          }
          return table
        }

        default:
          return `❌ 不支持的操作: ${action}。支持: create/update/delete/read`
      }
    } catch (e: unknown) {
      this.logger.error(`ERDL CRUD 异常: ${(e as Error).message}`)
      return `❌ 操作异常: ${(e as Error).message}`
    }
  }

  // ═══════════════════════════════════════════
  // executeWebFetch — 网页抓取（SSRF 防护）
  // ═══════════════════════════════════════════

  async executeWebFetch(url: string, mode: string, maxChars?: number): Promise<string> {
    try {
      this.securityGuard.validateFetchUrl(url);
    } catch (e: unknown) {
      return (e as Error).message || 'URL 校验失败';
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal, redirect: 'manual' });
      clearTimeout(timeout);
      if (!res.ok) return '❌ 网页抓取失败: HTTP ' + res.status;
      const text = await res.text();
      let content = text.replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (maxChars && content.length > maxChars) {
        content = content.substring(0, maxChars) + '... (截断)';
      }
      return '📄 网页内容 (' + url + '):\n' + content.substring(0, 3000);
    } catch (e: unknown) {
      return '❌ 网页抓取失败: ' + (e as Error).message;
    }
  }

  // ═══════════════════════════════════════════
  // executeFileEdit — 文件编辑（read/write/replace）
  // ═══════════════════════════════════════════

  executeFileEdit(args: Record<string, unknown>): string {
    try {
      const nodePath = require('path');
      const { operation, filePath, oldStr, newStr, content } = args;
      const projectRoot = nodePath.resolve(process.cwd(), '..');
      const resolved = nodePath.resolve(nodePath.isAbsolute(filePath) ? filePath : nodePath.join(projectRoot, filePath));
      if (!resolved.startsWith(projectRoot + nodePath.sep) && resolved !== projectRoot) {
        return '❌ 禁止越界访问：' + filePath + ' 不在项目目录内';
      }
      if (operation === 'read') {
        const nodeFs = require('fs');
        if (!nodeFs.existsSync(resolved)) {
          const parentDir = nodePath.dirname(resolved);
          let hint = '文件不存在: ' + filePath;
          if (nodeFs.existsSync(parentDir) && nodeFs.statSync(parentDir).isDirectory()) {
            const parentEntries = nodeFs.readdirSync(parentDir, { withFileTypes: true }).slice(0, 20);
            const dirList = parentEntries.map((e: fs.Dirent) => (e.isDirectory() ? '📁 ' : '📄 ') + e.name).join(', ');
            hint += '\n💡 父目录内容: ' + dirList;
          }
          return hint;
        }
        if (nodeFs.statSync(resolved).isDirectory()) {
          const entries = nodeFs.readdirSync(resolved, { withFileTypes: true }).slice(0, 30);
          return entries.map((e: fs.Dirent) => (e.isDirectory() ? '📁' : '📄') + ' ' + e.name).join('\n');
        }
        const data = nodeFs.readFileSync(resolved, 'utf-8');
        const fileLines = data.split('\n');
        const maxL = parseInt(String(args['limit'] || '5000'));
        const startL = parseInt(String(args['offset'] || '0'));
        const slice = startL > 0 ? fileLines.slice(startL, startL + maxL) : fileLines.slice(0, maxL);
        const isTruncated = fileLines.length > maxL;
        const truncatedNote = isTruncated ? '\n⚠️ 截断：仅展示前 ' + maxL + ' 行，共 ' + fileLines.length + ' 行。用 offset=' + maxL + ' 读取后续内容。' : '';
        return '📄 ' + filePath + ' (' + fileLines.length + ' 行):\n' + slice.join('\n') + truncatedNote;
      }
      if (operation === 'write') {
        require('fs').mkdirSync(nodePath.dirname(resolved), { recursive: true });
        require('fs').writeFileSync(resolved, content, 'utf-8');
        const tscResult = this.executeTscCheck('backend');
        return '✅ 已写入: ' + filePath + '\n📋 ' + tscResult;
      }
      if (operation === 'replace') {
        const original = require('fs').readFileSync(resolved, 'utf-8');
        const normOriginal = original.replace(/\r\n/g, '\n');
        const normOldStr = String(oldStr || '').replace(/\r\n/g, '\n');
        const normNewStr = String(newStr || '').replace(/\r\n/g, '\n');
        if (!normOriginal.includes(normOldStr)) {
          const firstLine = normOldStr.split('\n')[0]?.substring(0, 80) || '';
          const contextHint = firstLine ? ' (首行: "' + firstLine + '...")' : '';
          const filePreview = normOriginal.substring(0, 200);
          return 'oldStr 未找到' + contextHint + '。文件前200字符:\n' + filePreview;
        }
        const replaced = normOriginal.replace(normOldStr, normNewStr);
        require('fs').writeFileSync(resolved, replaced, 'utf-8');
        const tscResult = this.executeTscCheck('backend');
        return '✅ 已修改: ' + filePath + '\n📋 ' + tscResult;
      }
      return '未知操作: ' + operation;
    } catch (e: unknown) {
      return '文件操作失败: ' + (e as Error).message;
    }
  }

  // ═══════════════════════════════════════════
  // executeTscCheck — TypeScript 编译检查
  // ═══════════════════════════════════════════

  executeTscCheck(project: string): string {
    try {
      const cp = require('child_process');
      const nodePath = require('path');
      const dir = project === 'frontend' ? nodePath.resolve(process.cwd(), '..', 'frontend') : process.cwd();
      cp.execSync('npx tsc --noEmit', { cwd: dir, timeout: TIMEOUT.TSC_CHECK });
      return '✅ TS编译通过';
    } catch (e: unknown) {
      // V1.6.0: Buffer 安全 — execSync error 的 stderr/stdout 可能是 Buffer
      const err = e as { stderr?: unknown; stdout?: unknown; message?: string };
      const errText = typeof err.stderr === 'string' ? err.stderr
        : Buffer.isBuffer(err.stderr) ? err.stderr.toString('utf-8')
        : typeof err.stdout === 'string' ? err.stdout
        : Buffer.isBuffer(err.stdout) ? err.stdout.toString('utf-8')
        : err.message || '';
      return '❌ 编译失败: ' + String(errText).substring(0, 500);
    }
  }

  // ═══════════════════════════════════════════
  // executeGitDiff — Git diff/status
  // ═══════════════════════════════════════════

  executeGitDiff(mode: string, filePath?: string): string {
    try {
      const cp = require('child_process');
      const nodePath = require('path');
      const ALLOWED_MODES = new Set(['status', 'diff', 'stat']);
      if (!ALLOWED_MODES.has(mode)) return '无效的 git 模式: ' + mode;
      const gitArgs = mode === 'status' ? ['status', '--short'] : mode === 'diff' ? ['diff'] : ['diff', '--stat'];
      if (filePath) {
        if (!/^[a-zA-Z0-9_\-./\\ ]+$/.test(filePath)) return 'filePath 包含非法字符';
        gitArgs.push('--', filePath);
      }
      const projectRoot = nodePath.resolve(process.cwd(), '..');
      const out = cp.execFileSync('git', gitArgs, { cwd: projectRoot, timeout: TIMEOUT.GIT_CMD, encoding: 'utf-8' }).trim();
      return out || '无变更';
    } catch (e: unknown) {
      // V1.6.0: Buffer 安全
      const err = e as { stderr?: unknown; message?: string };
      const errText = typeof err.stderr === 'string' ? err.stderr
        : Buffer.isBuffer(err.stderr) ? err.stderr.toString('utf-8')
        : err.message || '';
      return 'Git 操作失败: ' + String(errText).substring(0, 300);
    }
  }

  // ═══════════════════════════════════════════
  // executeAutoCommit — V1.6.0: Agent 变更自动提交
  // ═══════════════════════════════════════════

  async executeAutoCommit(commitMessage: string): Promise<string> {
    const cp = require('child_process')
    const nodePath = require('path')
    const projectRoot = nodePath.resolve(process.cwd(), '..')

    if (!commitMessage || commitMessage.trim().length < 3) {
      return '❌ commit message 太短，至少 3 个字符'
    }

    const cleanMsg = commitMessage.replace(/[\n\r]/g, ' ').substring(0, 200)
    const lines: string[] = []

    try {
      // Step 1: git add -A
      cp.execSync('git add -A', { cwd: projectRoot, timeout: 10000 })

      // Step 2: git diff --cached --stat
      let stat = ''
      try {
        stat = cp.execFileSync('git', ['diff', '--cached', '--stat'], {
          cwd: projectRoot, timeout: 10000, encoding: 'utf-8',
        }).trim()
      } catch {
        return '❌ 无变更可提交'
      }

      if (!stat) return '❌ 无变更可提交'

      // Step 3: git commit
      cp.execSync(`git commit -m "${cleanMsg.replace(/"/g, '\\"')}"`, {
        cwd: projectRoot, timeout: 15000,
      })

      // Step 4: 获取 commit hash
      const hash = cp.execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
        cwd: projectRoot, timeout: 5000, encoding: 'utf-8',
      }).trim()

      lines.push(`✅ commit ${hash}: ${cleanMsg}`)
      lines.push('')
      lines.push('📊 变更:')
      lines.push(stat)

      // Step 5: build
      try {
        cp.execSync('npm run build:backend', {
          cwd: projectRoot, timeout: TIMEOUT.TSC_CHECK * 3,
        })
        lines.push('')
        lines.push('✅ Build: 0 errors')
      } catch (e: unknown) {
        const err = e as { stderr?: unknown; stdout?: unknown }
        const errText = typeof err.stderr === 'string' ? err.stderr
          : Buffer.isBuffer(err.stderr) ? err.stderr.toString('utf-8')
          : typeof err.stdout === 'string' ? err.stdout
          : Buffer.isBuffer(err.stdout) ? err.stdout.toString('utf-8')
          : ''
        lines.push('')
        lines.push('❌ Build 失败:')
        lines.push(String(errText).substring(0, 500))
      }

      // Step 6: test
      try {
        cp.execSync('npm test', {
          cwd: nodePath.join(projectRoot, 'packages', 'core'),
          timeout: TIMEOUT.TSC_CHECK * 2,
        })
        lines.push('✅ Test: 全部通过')
      } catch (e: unknown) {
        const err = e as { stderr?: unknown; stdout?: unknown }
        const errText = typeof err.stderr === 'string' ? err.stderr
          : Buffer.isBuffer(err.stderr) ? err.stderr.toString('utf-8')
          : typeof err.stdout === 'string' ? err.stdout
          : Buffer.isBuffer(err.stdout) ? err.stdout.toString('utf-8')
          : ''
        lines.push('')
        lines.push('⚠️ Test 有失败:')
        lines.push(String(errText).substring(0, 500))
      }

      return lines.join('\n')
    } catch (e: unknown) {
      const err = e as { stderr?: unknown; message?: string }
      const errText = typeof err.stderr === 'string' ? err.stderr
        : Buffer.isBuffer(err.stderr) ? err.stderr.toString('utf-8')
        : (err.message || '')
      return '❌ commit 失败: ' + String(errText).substring(0, 300)
    }
  }

  // ═══════════════════════════════════════════
  // executeDraftCreate — 创建草稿
  // ═══════════════════════════════════════════

  async executeDraftCreate(args: { spuName: string; gender: string; shapeCode: string; seriesCode: string; structureStandardCode: string; spuDescription?: string; skus?: Record<string, unknown>[] }): Promise<string> {
    try {
      // 效果词容错：查询字典并模糊匹配
      const effectRows = await this.taskRepo.manager.query(
        'SELECT effect_code, effect_type FROM dict_effect_tag WHERE is_active=1'
      ) as { effect_code: string; effect_type: string }[]
      const validSkinCodes = effectRows.filter(r => r.effect_type === 'skin_tone').map(r => r.effect_code)
      const validFaceCodes = effectRows.filter(r => r.effect_type === 'face_shape').map(r => r.effect_code)

      const skus = (args.skus || []).map((sku: Record<string, unknown>) => {
        const fixed: Record<string, unknown> = { ...sku }
        const matchedSkin = this.fuzzyMatchEffect(String(sku.skinToneEffect || ''), validSkinCodes)
        if (matchedSkin) fixed.skinToneEffect = matchedSkin
        const matchedFace = this.fuzzyMatchEffect(String(sku.faceShapeEffect || ''), validFaceCodes)
        if (matchedFace) fixed.faceShapeEffect = matchedFace
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
        } as Parameters<typeof this.draftService.create>[0])
      universalDraftId = (universalDraft as { id?: string })?.id || ''
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

  // ═══════════════════════════════════════════
  // executeDraftAddSku — 为草稿 SPU 追加 SKU
  // ═══════════════════════════════════════════

  async executeDraftAddSku(args: { spuId: string; skus: Record<string, unknown>[] }): Promise<string> {
    try {
      // 从草稿池查找已有 SPU
      const { items } = await this.draftPoolService.queryDrafts({ page: 1, pageSize: 100 })
      const existingSpu = items.find((d: { spuId?: string; draftId?: string }) => d.spuId === args.spuId || d.draftId === args.spuId)
      if (!existingSpu) {
        return `❌ 未找到 SPU: ${args.spuId}。请先确认 SPU 存在于草稿池或 ERP 中。可调用 query_erp_data 或 draft_list 查看。`
      }

      // 效果词容错（复用 draft_create 的逻辑）
      const effectRows = await this.taskRepo.manager.query(
        'SELECT effect_code, effect_type FROM dict_effect_tag WHERE is_active=1'
      ) as { effect_code: string; effect_type: string }[]
      const validSkinCodes = effectRows.filter(r => r.effect_type === 'skin_tone').map(r => r.effect_code)
      const validFaceCodes = effectRows.filter(r => r.effect_type === 'face_shape').map(r => r.effect_code)

      const skus = (args.skus || []).map((sku: Record<string, unknown>) => {
        const fixed: Record<string, unknown> = { ...sku }
        const matchedSkin = this.fuzzyMatchEffect(String(sku.skinToneEffect || ''), validSkinCodes)
        if (matchedSkin) fixed.skinToneEffect = matchedSkin
        const matchedFace = this.fuzzyMatchEffect(String(sku.faceShapeEffect || ''), validFaceCodes)
        if (matchedFace) fixed.faceShapeEffect = matchedFace
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

  // ═══════════════════════════════════════════
  // executeAestheticsCheck — 美学校验
  // ═══════════════════════════════════════════

  async executeAestheticsCheck(args: { shapeCode: string; colorCode: string; seriesCode?: string; gender?: string; skinToneEffect?: string; faceShapeEffect?: string }): Promise<string> {
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
        for (const e of result.errors) lines.push(`  · [${e}]`)
      }
      if (result.warnings.length > 0) {
        lines.push('', '⚠️ 警告：')
        for (const w of result.warnings) lines.push(`  · [${w}]`)
      }
      if ((result as { recommendations?: Array<{ type: string; reason: string; suggestion: string }> }).recommendations && (result as { recommendations?: Array<{ type: string; reason: string; suggestion: string }> }).recommendations!.length > 0) {
        lines.push('', '💡 改进建议：')
        for (const r of (result as { recommendations?: Array<{ type: string; reason: string; suggestion: string }> }).recommendations || []) {
          lines.push(`  · ${r.type}: ${r.reason} → 建议: ${r.suggestion}`)
        }
      }

      return lines.join('\n')
    } catch (e: unknown) {
      return `⚠️ 美学校验执行异常: ${(e as Error).message}`
    }
  
  }

  // ═══════════════════════════════════════════
  // executeDraftList — 查询草稿池
  // ═══════════════════════════════════════════

  async executeDraftList(args: { status?: string; gender?: string; source?: string; pageSize?: number }): Promise<string> {
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
  // executeCsvExport — 智能导出
  // ═══════════════════════════════════════════

  async executeCsvExport(entity: string, format: string, data: Record<string, unknown>[], filename: string): Promise<string> {
    try {
      let rows: Record<string, unknown>[] = data || []

      // 🔑 L1: 有 entity → 自动查询
      if (entity && (!rows || rows.length === 0)) {
        this.logger.log(`csv_export: auto-query entity=${entity}`)
        try {
          const result = await this.executeErdlCrud({ action: 'read', entity })
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

  // ═══════════════════════════════════════════
  // doExport — 实际导出
  // ═══════════════════════════════════════════

  doExport(data: Record<string, unknown>[], format: string, filename: string): string {
    const ts = new Date().toISOString().slice(0, 10)
    const uuid = crypto.randomUUID().replace(/-/g, '').substring(0, 8)
    const fname = filename || `export_${ts}_${uuid}`
    const dir = path.join(process.cwd(), 'uploads', 'exports')
    fs.mkdirSync(dir, { recursive: true })

    // 对象数组 → 用 DataBridge 导出
    if (data.length > 0 && typeof data[0] === 'object' && !Array.isArray(data[0])) {
      try {
        const bridge = new EntityDataBridge('StructureStandard', 'industry.eyewear', this.registry as unknown as IEntityDataRegistry)
        const content = bridge.export(data as Record<string, unknown>[], format as "csv" | "markdown" | "json")
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
          ? row.map((c: unknown) => {
              const v = (c === true || c === 1) ? '是' : (c === false || c === 0) ? '否' : String(c ?? '')
              return `"${v.replace(/"/g, '""')}"`
            })
          : Object.values(row || {}).map((v: unknown) => {
              const s = (v === true || v === 1) ? '是' : (v === false || v === 0) ? '否' : String(v ?? '')
              return `"${s.replace(/"/g, '""')}"`
            })
        content += cells.join(',') + '\n'
      }
    } else if (format === 'json') { ext = 'json'; content = JSON.stringify(data, null, 2) }
    else {
      ext = 'md'
      if (data.length > 0 && Array.isArray(data[0])) {
        content = '| ' + (data[0] as unknown as unknown[]).map(c => String(c || '')).join(' | ') + ' |\n|' + (data[0] as unknown[]).map(() => '---').join('|') + '|\n'
        for (let i = 1; i < data.length; i++) content += '| ' + (data[i] as unknown as Record<string, unknown> as unknown as unknown[]).map(c => String(c || '')).join(' | ') + ' |\n'
      }
    }
    const fp = path.join(dir, `${fname}.${ext}`)
    fs.writeFileSync(fp, content, 'utf-8')
    return `✅ 已导出: /uploads/exports/${fname}.${ext} (${Buffer.byteLength(content, 'utf-8')} 字节)`
  
  }

  // ═══════════════════════════════════════════
  // executeDataAnalyze — 数据分析
  // ═══════════════════════════════════════════

  executeDataAnalyze(op: string, data: Record<string, unknown>[], field: string, topN?: number, fField?: string, fVal?: string): string {
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

  // ═══════════════════════════════════════════
  // executeImportAnalyze — 导入文件分析
  // ═══════════════════════════════════════════

  async executeImportAnalyze(filePath: string): Promise<string> {
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

  // ═══════════════════════════════════════════
  // executeImportMap — 列映射
  // ═══════════════════════════════════════════

  executeImportMap(columns: string[], entityName: string): string {
    try {
      const entity = this.registry.getEntity('industry.eyewear', entityName)
      if (!entity) return `❌ Entity 不存在: ${entityName}`
      const entityFields = Object.keys(entity.properties || {})
      const mapping = columns.map(col => {
        const match = entityFields.find(f => f.toLowerCase() === col.toLowerCase() || this.fuzzyScore(col, f) > 0.7)
        return { source: col, target: match || null }
      })
      return `🔗 列映射结果:\n` + mapping.map(m => `  ${m.source} → ${m.target || '(未匹配)'}`).join('\n')
    } catch (e: unknown) {
      return `❌ 列映射失败: ${(e as Error).message}`
    }
  
  }

  // ═══════════════════════════════════════════
  // executeImportExecute — 导入执行
  // ═══════════════════════════════════════════

  async executeImportExecute(entityName: string, data: Record<string, unknown>[]): Promise<string> {
    try {
      const bridge = new EntityDataBridge(entityName, 'industry.eyewear', this.registry as unknown as IEntityDataRegistry)
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
        return `❌ 数据验证失败 (${validation.errors.length} 条错误):\n` + validation.errors.slice(0, 5).map((e: string) => `  · ${e}`).join('\n')
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


  // ═══════════════════════════════════════════
  // fuzzyScore — 模糊字符串匹配（从 Executor 复制）
  // ═══════════════════════════════════════════

  private fuzzyScore(a: string, b: string): number {
    if (!a || !b) return 0
    a = a.toLowerCase()
    b = b.toLowerCase()
    if (a === b) return 1
    if (a.includes(b) || b.includes(a)) return 0.8
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

  /**
   * 效果词容错：对 AI 产生的非标准效果词进行模糊匹配，映射到字典中的合法编码
   */
  private fuzzyMatchEffect(
    inputValue: string | undefined,
    validCodes: string[],
  ): string | undefined {
    if (!inputValue || validCodes.includes(inputValue)) return inputValue
    let best = ''
    let bestScore = 0
    for (const code of validCodes) {
      const s = this.fuzzyScore(inputValue, code)
      if (s > bestScore) { bestScore = s; best = code }
    }
    if (best && bestScore > 0.4) return best
    return undefined
  }

}
