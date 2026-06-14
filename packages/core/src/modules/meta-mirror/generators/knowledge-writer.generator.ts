/**
 * 元镜 Knowledge Writer — 将扫描结果写入 Markdown 文件
 */

import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import type { EntityInfo, APIInfo, ModuleInfo, RuleInfo, ConventionInfo } from '../types'

@Injectable()
export class KnowledgeWriter {
  private readonly logger = new Logger(KnowledgeWriter.name)
  private outputDir: string

  constructor() {
    // 输出到 backend/knowledge/ （file_edit 工具可读取）
    this.outputDir = path.join(process.cwd(), 'knowledge')
  }

  async writeAll(
    entities: EntityInfo[],
    apis: APIInfo[],
    modules: ModuleInfo[],
    rules: RuleInfo[],
    conventions: ConventionInfo,
  ): Promise<void> {
    fs.mkdirSync(path.join(this.outputDir, 'entities'), { recursive: true })

    await this.writeArchitecture(modules, conventions)
    await this.writeEntityIndex(entities)
    await this.writeEntityDetails(entities)
    await this.writeAPIs(apis)
    await this.writeRules(rules)
    await this.writeConventions(conventions)
    await this.writeInteractions()

    this.logger.log('KnowledgeWriter: 7 个文件已生成')
  }

  private async writeArchitecture(modules: ModuleInfo[], conventions: ConventionInfo) {
    let md = '# ERA 系统架构\n\n'
    md += `> 元镜自动生成 · ${new Date().toISOString().split('T')[0]}\n\n`

    md += '## 技术栈\n\n'
    for (const [k, v] of Object.entries(conventions.techStack)) {
      md += `- **${k}**: ${v}\n`
    }

    md += '\n## 模块清单\n\n'
    md += '| 模块 | 路径 | 依赖 |\n'
    md += '|------|------|------|\n'
    for (const m of modules) {
      md += `| ${m.name} | ${m.path} | ${m.imports.join(', ') || '—'} |\n`
    }

    md += '\n## 目录结构\n\n'
    for (const d of conventions.directoryStructure) {
      md += `- \`${d}\`\n`
    }

    this.write('architecture.md', md)
  }

  private async writeEntityIndex(entities: EntityInfo[]) {
    // 按模块分组
    const byModule = new Map<string, EntityInfo[]>()
    for (const e of entities) {
      const arr = byModule.get(e.module) || []
      arr.push(e)
      byModule.set(e.module, arr)
    }

    let md = '# ERA 实体索引\n\n'
    md += `> 共 ${entities.length} 个实体，${byModule.size} 个模块\n\n`

    md += '| 模块 | 实体 | 表名 | 字段 | 关系 |\n'
    md += '|------|------|------|------|------|\n'
    for (const e of entities.sort((a, b) => a.module.localeCompare(b.module))) {
      md += `| ${e.module} | ${e.name} | \`${e.tableName}\` | ${e.fields.length} | ${e.relations.length} |\n`
    }

    this.write('entities/_index.md', md)
  }

  private async writeEntityDetails(entities: EntityInfo[]) {
    const byModule = new Map<string, EntityInfo[]>()
    for (const e of entities) { const arr = byModule.get(e.module) || []; arr.push(e); byModule.set(e.module, arr) }

    for (const [module, moduleEntities] of byModule) {
      let md = `# ${module} 模块 · 实体详情\n\n`
      md += `> ${moduleEntities.length} 个实体\n\n`

      for (const entity of moduleEntities) {
        md += `## ${entity.name}（\`${entity.tableName}\`）\n\n`
        md += `- 源码: \`${entity.filePath}\`\n`
        if (entity.description) md += `- 说明: ${entity.description}\n`
        if (entity.indexes.length) md += `- 索引: ${entity.indexes.join(', ')}\n`
        md += '\n'

        // 字段表
        md += '### 字段\n\n'
        md += '| 字段 | 列名 | 类型 | 必填 | 约束 | 语义 | 说明 |\n'
        md += '|------|------|------|------|------|------|------|\n'
        for (const f of entity.fields) {
          const constraints: string[] = []
          if (f.isPrimary) constraints.push('主键')
          if (f.isUnique) constraints.push('唯一')
          if (f.isIndexed) constraints.push('索引')
          if (f.enumValues) constraints.push(`枚举(${f.enumValues.join('/')})`)
          // V2.0: DTO 约束
          if (f.validations?.min !== undefined) constraints.push(`Min(${f.validations.min})`)
          if (f.validations?.max !== undefined) constraints.push(`Max(${f.validations.max})`)
          if (f.dbPrecision?.precision !== undefined) constraints.push(`精度(${f.dbPrecision.precision},${f.dbPrecision.scale})`)
          
          const semantic = f.semanticTag ? `${f.semanticTag}` : '—'

          md += `| ${f.name} | \`${f.columnName}\` | ${f.type} | ${f.isNullable ? '❌' : '✅'} | ${constraints.join(',') || '—'} | ${semantic} | ${f.comment} |\n`
        }
        md += '\n'

        // 关系
        if (entity.relations.length) {
          md += '### 关系\n\n'
          md += '| 名称 | 类型 | 目标实体 |\n'
          md += '|------|------|----------|\n'
          for (const r of entity.relations) {
            md += `| ${r.name} | ${r.type} | ${r.targetEntity} |\n`
          }
          md += '\n'
        }
      }

      this.write(`entities/${module}.md`, md)
    }
  }

  private async writeAPIs(apis: APIInfo[]) {
    const byModule = new Map<string, APIInfo[]>()
    for (const a of apis) { const arr = byModule.get(a.module) || []; arr.push(a); byModule.set(a.module, arr) }

    let md = '# ERA API 索引\n\n'
    md += `> 共 ${apis.reduce((s, a) => s + a.endpoints.length, 0)} 个端点，${apis.length} 个 Controller\n\n`

    for (const [module, moduleApis] of byModule) {
      md += `## ${module}\n\n`
      for (const api of moduleApis) {
        md += `### ${api.controllerName}（\`${api.basePath}\`）\n\n`
        md += '| 方法 | 路径 | 完整路径 | 说明 | 认证 |\n'
        md += '|------|------|----------|------|------|\n'
        for (const ep of api.endpoints) {
          const fullPath = `${ep.method} /${api.basePath}/${ep.path}`.replace('//', '/')
          md += `| ${ep.method} | \`${ep.path || '/'}\` | \`${fullPath}\` | ${ep.summary} | ${ep.auth.join(',') || '公开'} |\n`
        }
        md += '\n'
      }
    }

    this.write('apis.md', md)
  }

  private async writeRules(rules: RuleInfo[]) {
    let md = '# ERA 业务规则\n\n'
    md += `> 共 ${rules.length} 条规则\n\n`

    md += '| 规则 | 文件 | 实体 | 触发 | 条件 |\n'
    md += '|------|------|------|------|------|\n'
    for (const r of rules) {
      md += `| ${r.name} | ${r.file} | ${r.entity} | ${r.trigger} | ${r.conditions.join(', ')} |\n`
    }

    this.write('rules.md', md)
  }

  private async writeConventions(conventions: ConventionInfo) {
    let md = '# ERA 编码约定\n\n'

    md += '## 命名规范\n\n'
    for (const [k, v] of Object.entries(conventions.namingPatterns)) {
      md += `- **${k}**: ${v}\n`
    }

    md += '\n## ESLint 规则\n\n'
    for (const r of conventions.eslintRules) {
      md += `- \`${r}\`\n`
    }

    md += '\n## tsconfig\n\n```json\n'
    md += JSON.stringify(conventions.tsconfig, null, 2)
    md += '\n```\n'

    this.write('conventions.md', md)
  }

  private write(filename: string, content: string) {
    const filePath = path.join(this.outputDir, filename)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, content, 'utf-8')
  }

  /** 复制 ERA↔ERP 交互点手册到 knowledge 目录 */
  private async writeInteractions() {
    const src = path.join(process.cwd(), 'src', 'modules', 'meta-mirror', 'generators', 'era-erp-interactions.md')
    if (fs.existsSync(src)) {
      const content = fs.readFileSync(src, 'utf-8')
      this.write('era-erp-interactions.md', content)
    }
  }
}
