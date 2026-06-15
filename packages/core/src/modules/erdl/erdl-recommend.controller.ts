/**
 * 秒镜科技 · ERDL — Enterprise Resource Definition Language
 *
 * @file ERDL Recommend Controller — LLM 智能推荐 API
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
 * LLM 智能推荐 API，基于 ERDL 定义的结构化实体和知识库，
 * 让 LLM 提供商品推荐、业务问答等能力。
 */

import { Controller, Post, Body, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { ERDLLLMBridge } from './llm/erdl-llm-bridge'

/** 推荐请求参数 */
interface RecommendRequest {
  faceShape?: string
  skinTone?: string
  scenario?: string
  stylePreference?: string
}

/** LLM 查询请求参数 */
interface QueryRequest {
  query: string
  entityTypes?: string[]
}

/**
 * ERDL 智能推荐 API 控制器
 *
 * 路径前缀：/api/erdl/recommend
 */
@Controller('erdl/recommend')
@UseGuards(JwtAuthGuard)
export class ERDLRecommendController {
  constructor(private readonly llmBridge: ERDLLLMBridge) {}

  /**
   * 智能推荐镜框
   * @api POST /api/erdl/recommend/glasses
   * @param body.faceShape 脸型（round/square/long/oval/heart）
   * @param body.skinTone 肤色（fair/natural/wheat/dark）
   * @param body.scenario 使用场景（commute/date/sports/business）
   * @param body.stylePreference 风格偏好
   * @returns 推荐结果和推理说明
   */
  @Post('glasses')
  recommendGlasses(@Body() params: RecommendRequest) {
    return this.llmBridge.recommendGlasses(params)
  }

  /**
   * 通用 LLM 查询
   * @api POST /api/erdl/recommend/query
   * @param body.query 用户问题
   * @param body.entityTypes 可选：需要注入的 Entity 类型列表
   * @returns LLM 回答
   */
  @Post('query')
  queryLLM(@Body() body: QueryRequest) {
    return this.llmBridge.queryLLM(body.query, body.entityTypes)
  }
}
