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
import type { Repository } from 'typeorm'
import type { ERDLRegistry } from '../../erdl/core/erdl-registry'
import type { EntityProxyService } from '../../erdl/core/entity-proxy.service'
import type { KnowledgeService } from './knowledge.service'
import type { InventoryService } from '../../inventory/inventory.service'
import type { AgentTask } from './agent-task.entity'
import type { AgentSecurityGuard } from './agent-security-guard'
import { TIMEOUT } from '../../../common/constants/timeouts'

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

  constructor(
    private readonly taskRepo: Repository<AgentTask>,
    private readonly registry: ERDLRegistry,
    private readonly proxy: EntityProxyService,
    private readonly knowledgeService: KnowledgeService,
    private readonly inventoryService: InventoryService,
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
        lines.push(`  ${(e as any).content?.substring(0, 150) || ''}...`)
      }
    }
    if (privateEntries.length > 0) {
      lines.push(`## 私有知识 (${privateEntries.length} 条)`)
      for (const e of privateEntries) {
        lines.push(`- [${e.id}] ${e.title}`)
        lines.push(`  ${(e as any).content?.substring(0, 150) || ''}...`)
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
    const select = (args as any).select
    const ns = 'industry.eyewear'

    // 安全红线：禁止系统表
    const mapping = (this.proxy as any).getMapping?.(ns, entity)
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
                  const doc = docs.items.find((d: any) => d.docNo === docNo)
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
            limit: (args as any).limit || 30,
            offset: (args as any).offset || 0,
          } as any)
          if (!result.success) return `❌ 查询失败: ${result.error}`
          const rows = result.rows || []
          if (rows.length === 0) return `📭 ${entity}: 无匹配数据`
          const cols = select || (rows.length > 0 ? Object.keys(rows[0]).filter(k => k !== 'id') : ['*'])
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
    } catch (e: any) {
      return e.message || 'URL 校验失败';
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

  executeFileEdit(args: Record<string, any>): string {
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
            const dirList = parentEntries.map((e: any) => (e.isDirectory() ? '📁 ' : '📄 ') + e.name).join(', ');
            hint += '\n💡 父目录内容: ' + dirList;
          }
          return hint;
        }
        if (nodeFs.statSync(resolved).isDirectory()) {
          const entries = nodeFs.readdirSync(resolved, { withFileTypes: true }).slice(0, 30);
          return entries.map((e: any) => (e.isDirectory() ? '📁' : '📄') + ' ' + e.name).join('\n');
        }
        const data = nodeFs.readFileSync(resolved, 'utf-8');
        const fileLines = data.split('\n');
        const maxL = parseInt(args['limit'] || '5000');
        const startL = parseInt(args['offset'] || '0');
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
    } catch (e: any) { return '❌ 编译失败: ' + (e.stderr || e.message).substring(0, 300); }
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
      return 'Git 操作失败: ' + ((e as any).stderr || (e as Error).message || '');
    }
  }

}
