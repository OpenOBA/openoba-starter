/**
 * 秒镜科技 · ERDL — Enterprise Resource Definition Language
 *
 * @file ERDL Controller — 管理端 API
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-01
 * @license BSL-1.1
 *
 * Copyright (c) 2026 深圳市秒镜科技有限公司
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * @description
 * ERDL 管理端 API，提供 Entity 查询、规则查询、表单 Schema 生成、
 * YAML 解析与加载等接口。
 */

import { Controller, Get, Post, Put, Delete, Patch, Param, Body, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { ERDLRegistry, EntityRegistration } from './core/erdl-registry'
import { ERDLParser, AliasMap } from './parser/erdl-parser'
import { ERDLRuleEngine, ValidationResult } from './core/erdl-rule-engine'
import { ERDLSchemaGenerator, FormSchema } from './schema/erdl-schema-generator'
import { EntityProxyService } from './core/entity-proxy.service'
import { RuleStoreService } from './core/rule-store.service'
import { CreateRuleDto, UpdateRuleDto, ProxyQueryDto, ProxyInsertDto, ProxyUpdateDto, ProxyDeleteDto } from './dto/erdl.dto'

/**
 * ERDL 管理端 API 控制器
 *
 * 路径前缀：/api/erdl
 */
@Controller('erdl')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ERDLController {
  constructor(
    private readonly registry: ERDLRegistry,
    private readonly ruleEngine: ERDLRuleEngine,
    private readonly schemaGen: ERDLSchemaGenerator,
    private readonly proxy: EntityProxyService,
    private readonly ruleStore: RuleStoreService,
  ) {}

  /**
   * 获取所有已加载的 ERDL Entity 定义
   * @api GET /api/erdl/entities
   * @returns Entity 注册列表
   */


  @Get('entities')
  getEntities(): EntityRegistration[] {
    return this.registry.getAllEntities()
  }

  /**
   * 获取所有已注册的规则定义
   * @api GET /api/erdl/rules
   * @returns 规则定义列表
   */
  @Get('rules')
  getRules() {
    return this.registry.getAllRules()
  }

  /**
   * 按触发器筛选规则
   * @api GET /api/erdl/rules/by-trigger
   * @param trigger 触发器标识
   * @returns 匹配的规则列表
   */
  @Get('rules/by-trigger')
  getRulesByTrigger(@Query('trigger') trigger: string) {
    return this.ruleEngine.getRulesForTrigger(trigger)
  }

  /**
   * 获取注册统计信息
   * @api GET /api/erdl/stats
   * @returns 各类定义的数量
   */
  @Get('stats')
  getStats() {
    const stats = this.registry.getStats()
    const files = (this.registry as any).getFiles ? (this.registry as any).getFiles() : []
    return { ...stats, files: files.length }
  }

  /**
   * 获取所有已注册的知识库定义
   * @api GET /api/erdl/knowledge-bases
   * @returns 知识库注册列表
   */
  @Get('knowledge-bases')
  getKnowledgeBases() {
    return this.registry.getAllKnowledgeBases()
  }

  /**
   * 删除指定 .erdl 源文件及其所有注册内容
   * @api DELETE /api/erdl/files/:filename
   * @param filename .erdl 文件名（如 demo-brand.erdl）
   */
  @Delete('files/:filename')
  @Roles('admin', 'super_admin')
  deleteFile(@Param('filename') filename: string) {
    return this.registry.unregisterFile(filename)
  }

  /**
   * 数据校验：对指定实体数据进行规则校验
   * @api POST /api/erdl/validate
   * @param body.entity 实体类型（如 "ProductSpu"）
   * @param body.data 待校验的数据对象
   * @returns 校验结果
   */
  @Post('validate')
  validate(@Body() body: { entity: string; data: Record<string, unknown> }): ValidationResult {
    return this.ruleEngine.validate(body.entity, body.data)
  }

  /**
   * 获取指定 Entity 的表单 Schema
   * @api GET /api/erdl/schema
   * @param namespace 命名空间
   * @param entity Entity 名称
   * @returns 表单 Schema
   */
  @Get('schema')
  getSchema(
    @Query('namespace') namespace: string,
    @Query('entity') entity: string,
  ): FormSchema | null {
    return this.schemaGen.generateFormSchema(namespace, entity)
  }

  /**
   * 获取所有 Entity 的表单 Schema
   * @api GET /api/erdl/schemas
   * @returns 表单 Schema 列表
   */
  @Get('schemas')
  getAllSchemas(): FormSchema[] {
    return this.schemaGen.generateAll()
  }

  /**
   * 解析并加载 YAML 格式的 ERDL 定义
   * @api POST /api/erdl/parse
   * @param body.yaml YAML 内容
   * @returns 解析结果
   */
  @Post('parse')
  @Roles('super_admin')
  parseYaml(@Body() body: { yaml: string }) {
    const ast = ERDLParser.parseString(body.yaml)
    this.registry.register(ast, 'api')
    return {
      success: true,
      entities: Object.keys(ast.entities || {}),
      rulesets: Object.keys(ast.rulesets || {}),
      agents: Object.keys(ast.agents || {}),
      knowledgeBases: Object.keys(ast.knowledgeBases || {}),
    }
  }

  // ============================================
  // 规则 CRUD 端点
  // ============================================

  /**
   * 创建规则
   * @api POST /api/erdl/rules
   */
  @Post('rules')
  @Roles('admin', 'super_admin')
  createRule(@Body() dto: CreateRuleDto) {
    return this.ruleStore.createRule(dto)
  }

  /**
   * 更新规则
   * @api PUT /api/erdl/rules/:id
   */
  @Put('rules/:id')
  @Roles('admin', 'super_admin')
  updateRule(@Param('id') id: string, @Body() dto: UpdateRuleDto) {
    return this.ruleStore.updateRule(id, dto)
  }

  /**
   * 删除规则（软删除）
   * @api DELETE /api/erdl/rules/:id
   */
  @Delete('rules/:id')
  @Roles('admin', 'super_admin')
  deleteRule(@Param('id') id: string) {
    return this.ruleStore.deleteRule(id)
  }

  /**
   * 切换规则启用/禁用状态
   * @api PATCH /api/erdl/rules/:id/toggle
   */
  @Patch('rules/:id/toggle')
  @Roles('admin', 'super_admin')
  toggleRule(@Param('id') id: string) {
    return this.ruleStore.toggleRule(id)
  }

  // ============================================
  // Live-ERDL V1.2: 别名映射（行业黑话 → 标准术语）
  // ============================================

  /**
   * 获取所有别名映射
   * @api GET /api/erdl/aliases
   * @returns 所有已注册的别名映射
   */
  @Get('aliases')
  getAliases(): Record<string, AliasMap> {
    const result: Record<string, AliasMap> = {}
    for (const [key, aliasMap] of this.registry.getAliases()) {
      result[key] = aliasMap
    }
    return result
  }

  /**
   * 获取指定 Entity 的反向别名映射（标准字段 → 所有别名）
   * @api GET /api/erdl/aliases/reverse?namespace=xxx&entity=xxx
   */
  @Get('aliases/reverse')
  getReverseAliases(
    @Query('namespace') namespace: string,
    @Query('entity') entity: string,
  ): Record<string, string[]> {
    return this.registry.getReverseAliases(namespace, entity)
  }

  /**
   * 解析别名 → 标准字段名
   * @api GET /api/erdl/aliases/resolve?namespace=xxx&entity=xxx&term=xxx
   */
  @Get('aliases/resolve')
  resolveAlias(
    @Query('namespace') namespace: string,
    @Query('entity') entity: string,
    @Query('term') term: string,
  ): { term: string; resolved: string; matched: boolean } {
    const resolved = this.registry.resolveAlias(namespace, entity, term)
    return {
      term,
      resolved,
      matched: resolved !== term,
    }
  }

  /**
   * 添加别名映射（运行时动态沉淀）
   * @api POST /api/erdl/aliases
   * @param body.namespace 命名空间
   * @param body.entity Entity 名称
   * @param body.alias 行业术语/黑话
   * @param body.fieldName 标准字段名
   */
  @Post('aliases')
  @Roles('admin', 'super_admin')
  addAlias(@Body() body: {
    namespace: string
    entity: string
    alias: string
    fieldName: string
  }) {
    this.registry.addAlias(body.namespace, body.entity, body.alias, body.fieldName)
    return {
      success: true,
      message: `已注册: ${body.entity}[${body.alias}] → ${body.fieldName}`,
    }
  }

  // ============================================
  // V1.3: 实体代理引擎 API（语义操作 → SQL）
  // ============================================

  /**
   * 获取 Entity prompt（供 Agent 使用）
   */
  @Get('proxy/prompt')
  getProxyPrompt(@Query('namespace') namespace: string) {
    return { prompt: this.proxy.buildEntityPrompt(namespace || 'industry.eyewear') }
  }

  /**
   * 语义查询
   */
  @Post('proxy/query')
  @Roles('admin', 'operator')
  proxyQuery(@Body() body: ProxyQueryDto) {
    return this.proxy.query({
      namespace: body.namespace || 'industry.eyewear',
      entity: body.entity,
      select: body.select,
      where: body.where,
      limit: body.limit,
      offset: body.offset,
    })
  }

  @Post('proxy/insert')
  @Roles('admin')
  proxyInsert(@Body() body: ProxyInsertDto) {
    return this.proxy.insert({
      namespace: body.namespace || 'industry.eyewear',
      entity: body.entity,
      data: body.data,
    })
  }

  @Post('proxy/update')
  @Roles('admin')
  proxyUpdate(@Body() body: ProxyUpdateDto) {
    return this.proxy.update({
      namespace: body.namespace || 'industry.eyewear',
      entity: body.entity,
      data: body.data,
      where: body.where,
    })
  }

  @Post('proxy/delete')
  @Roles('super_admin')
  proxyDelete(@Body() body: ProxyDeleteDto) {
    return this.proxy.softDelete({
      namespace: body.namespace || 'industry.eyewear',
      entity: body.entity,
      where: body.where,
    })
  }
}
