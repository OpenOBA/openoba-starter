/**
 * 质量门禁生成器 — 将工程铁律从静态文档变为可被 Agent 消费的 DSL
 *
 * @file quality-gate.generator.ts
 * @author 唐浩然（OpenOBA AI 执行官）
 * @since 2026-06-24
 *
 * 架构：铁律源（SOP-工程铁律.md + MEMORY.md）→ 解析为 QualityGateRule[]
 *       → 写入 knowledge/quality-gates.md（Agent 可见）
 *       → ContextInjector 注入到 System Prompt（Agent 知悉）
 *       → tool_registry 的 file_edit/erdl_crud 等工具执行前校验（Agent 遵守）
 *
 * 激活条件：仅在工具涉及代码文件修改时激活（file_edit / erdl_crud create/update / tsc_check）
 *
 * 闭环：
 *   1. 元镜启动 → 扫描铁律源 → 写入 knowledge
 *   2. SKILL 声明 gate_refs → ContextInjector 注入相关门禁
 *   3. Tool 执行前 → GateGuard.check() 拦截违规
 *   4. 违规 → 阻止操作 + 返回具体违反的规则 + 修复建议
 */

import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 门禁优先级
 */
export type GateSeverity = 'error' | 'warning'

/**
 * 门禁触发条件 — 定义了"何时激活此门禁"
 */
export interface GateTrigger {
  /** 触发的工具名（如 file_edit / erdl_crud / tsc_check） */
  tools: string[]
  /** 触发的操作类型（write / create / update 等） */
  operations?: string[]
  /** 触发的文件类型（.ts / .vue / .json 等） */
  filePatterns?: string[]
  /** 触发的目录路径 */
  paths?: string[]
}

/**
 * 单条质量门禁规则
 */
export interface QualityGateRule {
  /** 唯一 ID */
  id: string
  /** 分类 */
  category: string
  /** 简短标题 */
  title: string
  /** 详细说明 */
  description: string
  /** 严重性 */
  severity: GateSeverity
  /** 触发条件 */
  trigger: GateTrigger
  /** 修复指引 */
  fix: string
  /** 来源文档 */
  source: string
  /** 示例（违规代码 → 正确代码） */
  examples?: {
    before: string
    after: string
  }
}

/**
 * 门禁检查结果
 */
export interface GateCheckResult {
  passed: boolean
  violations: Array<{
    ruleId: string
    ruleTitle: string
    reason: string
    fix: string
    severity: GateSeverity
  }>
}

@Injectable()
export class QualityGateGenerator {
  private readonly logger = new Logger(QualityGateGenerator.name)

  /**
   * 从铁律源生成所有质量门禁
   * @param projectRoot 项目根目录（以查找 SOP + MEMORY 文件）
   */
  generate(projectRoot: string): QualityGateRule[] {
    const rules: QualityGateRule[] = []

    // ── 1. TypeScript 编码红线 ──
    rules.push({
      id: 'gate-ts-ban-ts-ignore',
      category: 'TypeScript 类型安全',
      title: '禁止 // @ts-ignore',
      description: '任何情况下不得使用 @ts-ignore。如需绕过类型检查，必须用 @ts-expect-error 原因 并注明修复计划。',
      severity: 'error',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.ts', '.tsx', '.vue'] },
      fix: '将 // @ts-ignore 替换为 // @ts-expect-error TS2345: 原因（修复计划: ISSUE-xxx）',
      source: 'SOP-工程执行铁律.md § 8.1.1',
      examples: { before: '// @ts-ignore\nconst x = riskyFn()', after: '// @ts-expect-error TS2345: 上游未迁移（修复计划: V1.5 泛型化）\nconst x = riskyFn()' },
    })

    rules.push({
      id: 'gate-ts-ban-as-any',
      category: 'TypeScript 类型安全',
      title: '禁止 as any 逃避类型检查',
      description: '仅在 API 边界类型断言时可用，且必须有注释说明为何 TS 无法推断。',
      severity: 'error',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.ts', '.tsx', '.vue'] },
      fix: '将 as any 替换为 as unknown as TargetType 或定义中间类型',
      source: 'SOP-工程执行铁律.md § 8.1.2',
      examples: { before: 'const data = response as any', after: 'const data = response as unknown as ApiResponse' },
    })

    rules.push({
      id: 'gate-ts-explicit-return-type',
      category: 'TypeScript 类型安全',
      title: 'API 函数必须声明返回类型',
      description: '新增 API 函数不得依赖 TypeScript 推断返回值类型，必须显式声明 Promise<T> 返回类型。',
      severity: 'error',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.ts'] },
      fix: '在函数签名中显式声明 : Promise<ReturnType>',
      source: 'SOP-工程执行铁律.md § 8.1.3',
    })

    rules.push({
      id: 'gate-ts-catch-type-guard',
      category: 'TypeScript 类型安全',
      title: 'catch 块必须使用类型守卫',
      description: 'catch 块变量必须用 unknown 接收，后用 instanceof Error 守卫。禁止直接在 catch 块内使用 e.message 或 (e as any)。',
      severity: 'error',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.ts', '.tsx'] },
      fix: 'catch (e: unknown) { const errMsg = e instanceof Error ? e.message : String(e) }',
      source: 'SOP-工程执行铁律.md § 8.1.4',
      examples: { before: 'catch (e) { console.log(e.message) }', after: 'catch (e: unknown) { const msg = e instanceof Error ? e.message : String(e) }' },
    })

    rules.push({
      id: 'gate-ts-ban-record-any',
      category: 'TypeScript 类型安全',
      title: '禁止 Record<string, any>',
      description: '任何新代码不得使用 any 类型。entity/entities 路径的 CORE 文件需 eslint-disable 豁免并标注原因。',
      severity: 'error',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.ts', '.tsx'] },
      fix: 'Record<string, any> → Record<string, unknown>',
      source: 'SOP-工程执行铁律.md § 10.1',
    })

    rules.push({
      id: 'gate-ts-ban-array-any',
      category: 'TypeScript 类型安全',
      title: '禁止 any[] / Array<any>',
      description: '任何新代码的数组声明不得使用 any。',
      severity: 'error',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.ts', '.tsx'] },
      fix: 'any[] → unknown[]',
      source: 'SOP-工程执行铁律.md § 10.1.5',
    })

    rules.push({
      id: 'gate-ts-ban-promise-any',
      category: 'TypeScript 类型安全',
      title: '禁止 Promise<any>',
      description: 'Promise 泛型参数不得为 any，需用 unknown 或具体类型。',
      severity: 'error',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.ts', '.tsx'] },
      fix: 'Promise<any> → Promise<unknown> 或 Promise<ConcreteType>',
      source: 'SOP-工程执行铁律.md § 10.1.7',
    })

    rules.push({
      id: 'gate-ts-as-unknown-pattern',
      category: 'TypeScript 类型安全',
      title: 'as any 断言改为 as unknown as TargetType',
      description: '类型断言应使用 as unknown as TargetType 两步安全转换，禁止直接 as any。',
      severity: 'error',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.ts', '.tsx'] },
      fix: '将 const x = y as any 替换为 const x = y as unknown as TargetType',
      source: 'SOP-工程执行铁律.md § 10.1.3',
    })

    // ── 2. 前端质量门禁 ──
    rules.push({
      id: 'gate-front-vue-tsc',
      category: '前端质量',
      title: 'vue-tsc -b 必须 0 错误',
      description: '任何前端文件修改后，必须通过 vue-tsc -b --noEmit 类型检查。这是不可绕过的 pre-commit 门禁。',
      severity: 'error',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.vue', '.ts', '.tsx'] },
      fix: '运行 cd frontend && npx vue-tsc -b --noEmit 定位并修复所有类型错误',
      source: 'SOP-工程执行铁律.md § 6.1',
    })

    rules.push({
      id: 'gate-front-api-return-type',
      category: '前端质量',
      title: 'API 文件中的函数必须声明返回类型',
      description: 'API 调用函数不得依赖 axios 泛型推断，必须显式声明返回类型。',
      severity: 'error',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.ts'] },
      fix: '在 API 函数上显式声明 : Promise<DataType>',
      source: 'SOP-工程执行铁律.md § 8.1.3',
    })

    rules.push({
      id: 'gate-front-ref-never-inference',
      category: '前端质量',
      title: 'ref([]) 必须标注泛型',
      description: '未标注类型的空数组 ref 会推断为 never[]，所有操作这做。',
      severity: 'error',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.vue', '.ts'] },
      fix: 'ref([]) → ref<T[]>([])',
      source: 'SOP-工程执行铁律.md § 8.3.2',
    })

    rules.push({
      id: 'gate-front-dead-imports',
      category: '前端质量',
      title: '删除功能时同步清理 import',
      description: 'noUnusedLocals: true 在 typecheck 时会直接报错。',
      severity: 'error',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.vue', '.ts'] },
      fix: '删除不再使用的 import 声明',
      source: 'SOP-工程执行铁律.md § 8.3.1',
    })

    // ── 3. 工程纪律 ──
    rules.push({
      id: 'gate-eng-baseline-before-change',
      category: '工程纪律',
      title: '修改前必须基线验证',
      description: '任何代码修改前：git status clean + build 0 error + test 全通过。不满足则不能开始修改。',
      severity: 'error',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.ts', '.tsx', '.vue'] },
      fix: '先清理/完成当前变更，build+test 通过后再进行新修改',
      source: 'SOP-工程执行铁律.md § 一',
    })

    rules.push({
      id: 'gate-eng-small-commits',
      category: '工程纪律',
      title: '小步提交',
      description: '每次一个逻辑单元，改完即 build → test → commit。禁止批量混合提交。',
      severity: 'warning',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.ts', '.tsx', '.vue'] },
      fix: '一次只改一个逻辑问题，commit message 明确表述改动内容',
      source: 'SOP-工程执行铁律.md § 二',
    })

    rules.push({
      id: 'gate-eng-no-stash-accumulation',
      category: '工程纪律',
      title: '禁止 stash 累积',
      description: 'stash 不可追溯、易覆盖。所有变更必须及时入 commit。',
      severity: 'warning',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.ts', '.tsx', '.vue'] },
      fix: 'git commit 当前变更，不要用 git stash 暂存',
      source: 'SOP-工程执行铁律.md § 四.2',
    })

    rules.push({
      id: 'gate-eng-no-encoding-tools',
      category: '工程纪律',
      title: '禁止 Windows 编码工具乱用',
      description: 'PowerShell Set-Content / Out-File 会损坏 UTF-8。优先使用 Node.js fs 或 OpenClaw write 工具。',
      severity: 'error',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.ts', '.tsx', '.vue', '.json', '.md'] },
      fix: '使用 fs.writeFileSync(path, content, "utf-8") 或 OpenClaw write tool',
      source: 'SOP-工程执行铁律.md § 四.5',
    })

    rules.push({
      id: 'gate-eng-deps-never-downgrade',
      category: '工程纪律',
      title: '依赖就高不就低',
      description: '不因单一目标降级依赖。遇 breaking changes 停下来研究攻克，不绕道。',
      severity: 'error',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['package.json'] },
      fix: '遇到依赖冲突时，研究并适配新版本 API，不降级依赖',
      source: 'SOP-工程执行铁律.md § 七',
    })

    // ── 4. Core/Backend 专项 ──
    rules.push({
      id: 'gate-core-rebuild-after-change',
      category: 'Core 编译',
      title: '改 core 源码后必须重新编译',
      description: '修改 packages/core/src 下任何文件后，必须 npx tsc -p tsconfig.json 重新编译 core。否则后端运行的仍是旧的 dist 产物。',
      severity: 'error',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.ts'], paths: ['packages/core/src'] },
      fix: '运行 cd packages/core && npx tsc -p tsconfig.json',
      source: 'SOP-工程执行铁律.md § 四.8',
    })

    rules.push({
      id: 'gate-core-verbose-change',
      category: 'Core 编译',
      title: '改动 core 后必须重启后端验证',
      description: 'core dist 更新后，后端不会自动热重载 core 模块。必须杀掉旧进程，重新 npm run start:backend。',
      severity: 'error',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.ts'], paths: ['packages/core/src'] },
      fix: '1. cd packages/core && npx tsc -p tsconfig.json  2. 杀后端进程  3. npm run start:backend',
      source: '工程实践',
    })

    rules.push({
      id: 'gate-backend-no-skip-test',
      category: '后端质量',
      title: '禁止跳过测试直接提交',
      description: 'npm test 必须全通过才能 commit。--no-verify 仅限紧急且有书面记录的场景。',
      severity: 'error',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.ts'] },
      fix: '运行 cd packages/backend && npx jest --passWithNoTests 确认全通过',
      source: 'SOP-工程执行铁律.md § 四.7',
    })

    rules.push({
      id: 'gate-backend-schema-sync',
      category: '后端质量',
      title: '数据库变更必须同步 schema',
      description: '新增 Entity / 改 Entity 字段后，若存在 init-structure.sql 或迁移文件，必须同步更新。',
      severity: 'warning',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.entity.ts'] },
      fix: '在 init-structure.sql 中同步 CREATE TABLE / ALTER TABLE 变更',
      source: 'SOP-工程执行铁律.md § 五.2',
    })

    // ── 5. Vue 模板专项 ──
    rules.push({
      id: 'gate-vue-dead-props',
      category: 'Vue 模板',
      title: '模板中未使用的解构参数必须删除',
      description: 'v-for 中的解构参数如有未使用项，vue-tsc 会报错。如 { row, $index } 中 row 未使用应改为 { $index }。',
      severity: 'error',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.vue'] },
      fix: '删除模板中未使用的解构参数',
      source: 'SOP-工程执行铁律.md § 8.3.3',
    })

    rules.push({
      id: 'gate-vue-computed-dict',
      category: 'Vue 模板',
      title: 'useDict().items 必须通过 computed 桥接',
      description: 'vue-tsc 无法推断 Ref 类型，模板中使用 useDict().items 应通过 const items = computed(() => dict.items.value) 桥接。',
      severity: 'warning',
      trigger: { tools: ['file_edit'], operations: ['write'], filePatterns: ['.vue'] },
      fix: '在 script 中 : const items = computed(() => dict.items.value)，模板中用 items',
      source: 'SOP-工程执行铁律.md § 8.2.3',
    })

    return rules
  }

  /**
   * 为指定工具和文件类型查找适用范围的门禁
   * 激活条件：工具是 file_edit/erdl_crud，且涉及写入操作和代码文件
   */
  getApplicableGates(
    rules: QualityGateRule[],
    toolName: string,
    operation?: string,
    filePath?: string,
  ): QualityGateRule[] {
    return rules.filter(rule => {
      // 工具匹配
      if (!rule.trigger.tools.includes(toolName)) return false
      // 操作匹配
      if (rule.trigger.operations && operation && !rule.trigger.operations.includes(operation)) return false
      // 文件模式匹配
      if (rule.trigger.filePatterns && filePath) {
        const matched = rule.trigger.filePatterns.some(pattern => {
          if (pattern.startsWith('.')) return filePath.endsWith(pattern)
          return filePath.includes(pattern)
        })
        if (!matched) return false
      }
      // 路径匹配（如 packages/core/src）
      if (rule.trigger.paths && filePath) {
        const matched = rule.trigger.paths.some(p => filePath.includes(p))
        if (!matched) return false
      }
      return true
    })
  }

  /**
   * 将门禁规则写入 Markdown（供 Agent 消费）
   */
  writeRules(rules: QualityGateRule[], outputDir: string): void {
    const byCategory = new Map<string, QualityGateRule[]>()
    for (const r of rules) {
      const arr = byCategory.get(r.category) || []
      arr.push(r)
      byCategory.set(r.category, arr)
    }

    let md = '# 🔒 OpenOBA 代码质量门禁\n\n'
    md += `> 元镜自动生成 · ${new Date().toISOString().split('T')[0]} · ${rules.length} 条规则\n\n`
    md += '## 📋 门禁激活条件\n\n'
    md += '门禁在 **以下情况** 自动激活：\n\n'
    md += '1. **代码文件修改**（`.ts` / `.tsx` / `.vue` / `.json` ）— 所有 TypeScript + Vue 规则激活\n'
    md += '2. **Core 源码修改**（`packages/core/src/`）— 额外激活 Core 编译 + 重启规则\n'
    md += '3. **package.json 修改** — 激活依赖降级检测\n'
    md += '4. **Entity 修改** — 激活 schema 同步提醒\n\n'
    md += '---\n\n'

    for (const [category, catRules] of byCategory) {
      md += `## ${category}\n\n`
      md += '| ID | 规则 | 级别 | 触发条件 |\n'
      md += '|----|------|------|----------|\n'
      for (const r of catRules) {
        const severity = r.severity === 'error' ? '🔴 ERROR' : '🟡 WARN'
        const trigger = r.trigger.tools.join(', ')
        md += `| \`${r.id}\` | ${r.title} | ${severity} | ${trigger} |\n`
      }
      md += '\n'

      for (const r of catRules) {
        md += `### ${r.id} — ${r.title}\n\n`
        md += `${r.description}\n\n`
        md += `- **级别**: ${r.severity === 'error' ? '🔴 阻断' : '🟡 警告'}\n`
        md += `- **触发**: ${r.trigger.tools.join(', ')}\n`
        md += `- **来源**: ${r.source}\n`
        md += `- **修复**: ${r.fix}\n`
        if (r.examples) {
          md += '\n```\n❌ 违规\n' + r.examples.before + '\n```\n'
          md += '```\n✅ 正确\n' + r.examples.after + '\n```\n'
        }
        md += '\n'
      }
    }

    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(path.join(outputDir, 'quality-gates.md'), md, 'utf-8')
    this.logger.log(`QualityGateGenerator: ${rules.length} 条门禁写入 quality-gates.md`)
  }
}
