/**
 * 秒镜科技 · ERDL — Enterprise Resource Definition Language
 *
 * @file ERDL Playground Controller — 在线编辑器 + 自然语言生成 API
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-01
 * @license BSL-1.1
 */

import { Controller, Post, Body, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { ERDLParser } from './parser/erdl-parser'
import { ERDLRegistry } from './core/erdl-registry'
import { ERDLLLMBridge } from './llm/erdl-llm-bridge'

/**
 * ERDL Playground API 控制器
 *
 * 路径前缀：/api/erdl/playground
 */
@Controller('erdl/playground')
@UseGuards(JwtAuthGuard)
export class ERDLPlaygroundController {
  constructor(
    private readonly registry: ERDLRegistry,
    private readonly llmBridge: ERDLLLMBridge,
  ) {}

  /**
   * 校验 ERDL YAML 语法
   */
  @Post('validate')
  validateYaml(@Body() body: { yaml: string }) {
    return ERDLParser.validate(body.yaml)
  }

  /**
   * 加载 ERDL YAML 到运行时 — P0修复：仅超级管理员可操作
   */
  @Post('load')
  @Roles('super_admin')
  loadYaml(@Body() body: { yaml: string }) {
    const ast = ERDLParser.parseString(body.yaml)
    this.registry.register(ast, 'playground')
    return {
      success: true,
      entities: Object.keys(ast.entities || {}),
      rulesets: Object.keys(ast.rulesets || {}),
      agents: Object.keys(ast.agents || {}),
      knowledgeBases: Object.keys(ast.knowledgeBases || {}),
      stats: this.registry.getStats(),
    }
  }

  /**
   * 🤖 自然语言 → ERDL YAML 生成
   *
   * 用户用自然语言描述业务需求，LLM 自动生成合法的 ERDL YAML。
   * 这是降低 ERDL 使用门槛的核心功能。
   *
   * @param body.prompt - 自然语言需求描述
   * @param body.namespace - 可选命名空间
   */
  @Post('generate')
  async generateYaml(@Body() body: { prompt: string; namespace?: string }) {
    const namespace = body.namespace || 'industry.eyewear'

    const generationPrompt = [
      '你是一个 ERDL（Enterprise Resource Definition Language）生成器。',
      '请根据用户的自然语言需求描述，生成合法的 ERDL YAML。',
      '',
      '## ERDL 语法规则',
      `1. 命名空间：${namespace}`,
      '2. Entity 属性类型：String | Integer | Number | Boolean | Date | UUID | Enum | Money(CNY) | Text | Email | Phone',
      '3. 规则类型（tier）：policy（策略）| validation（校验）| computed（计算）',
      '4. 规则触发器（trigger）格式："模块.实体.动作"，如 "Product.price.calculate"',
      '5. 条件运算符：eq | ne | gt | lt | gte | lte | in | contains',
      '6. 动作公式使用 JavaScript 表达式，变量来自上下文（如 retailPrice, costPrice 等）',
      '7. 只输出合法的 YAML，不要包含代码块标记（```）或解释性文字',
      '8. 必须包含 namespace 和 module.version',
      '',
      '## 已有 ERDL 结构参考（可新增或扩展）',
      this.buildContextForGeneration(),
      '',
      '## 用户需求',
      body.prompt,
      '',
      '## 输出要求',
      '只输出 YAML 内容，不要任何解释。YAML 必须语法正确。',
    ].join('\n')

    const yaml = await this.llmBridge.queryLLM(generationPrompt)
    const cleaned = this.cleanGeneratedYaml(yaml)
    const validation = ERDLParser.validate(cleaned)

    return {
      yaml: cleaned,
      valid: validation.valid,
      errors: validation.errors || [],
    }
  }

  /** 为生成上下文提供已有的 ERDL 结构参考 */
  private buildContextForGeneration(): string {
    const entities = this.registry.getAllEntities()
    if (entities.length === 0) return '(暂无已有 Entity 定义)'

    return entities
      .map((e) => {
        const props = Object.entries(e.properties)
          .map(([key, val]) => {
            const detail =
              typeof val === 'object' && val !== null
                ? JSON.stringify(val)
                : String(val)
            return `    ${key}: ${detail}`
          })
          .join('\n')
        return `### ${e.namespace}.${e.name}\n${props || '    (空)'}`
      })
      .join('\n\n')
  }

  /** 清理 LLM 输出中的 markdown 代码块标记 */
  private cleanGeneratedYaml(raw: string): string {
    let yaml = raw.trim()
    yaml = yaml.replace(/^```(?:ya?ml)?\s*\n?/i, '')
    yaml = yaml.replace(/\n?```\s*$/, '')
    return yaml.trim()
  }
}
