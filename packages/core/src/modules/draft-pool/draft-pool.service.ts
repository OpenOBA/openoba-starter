/* eslint-disable @typescript-eslint/no-explicit-any -- CORE 泛型/第三方库约束 */
/**
 * DraftPool Engine Stub — 产品草稿池引擎桩
 *
 * 引擎层提供标准 CRUD 接口，具体的行业业务逻辑
 * 通过 ToolRegistry 动态注册。此处提供空实现，
 * 确保引擎可独立启动。行业模块在导入时覆盖。
 *
 * @file draft-pool.service.ts
 * @module draft-pool (engine stub)
 * @since 2026-06-01
 */

import { Injectable, Logger } from '@nestjs/common'
import * as crypto from 'crypto'

export interface DraftSpuCreateInput {
  spuName: string
  gender: string
  shapeCode: string
  seriesCode: string
  structureStandardCode?: string
  spuDescription?: string
  source?: string
  skus?: Record<string, unknown>[]
}

export interface DraftSpuResult {
  draftId: string
  spuName?: string
  gender?: string
  shapeCode?: string
  seriesCode?: string
  source?: string
  status?: string
  createdAt?: Date
}

export interface DraftQueryInput {
  status?: string
  gender?: string
  source?: string
  page?: number
  pageSize?: number
}

@Injectable()
export class DraftPoolService {
  private readonly logger = new Logger(DraftPoolService.name)

  /**
   * 创建 SPU 草稿
   * [ENGINE STUB] 引擎层返回 mock draftId，行业模块覆盖
   */
  async createDraftSpu(input: DraftSpuCreateInput): Promise<DraftSpuResult> {
    this.logger.warn('[ENGINE STUB] DraftPoolService.createDraftSpu - 行业模块未注册')
    return {
      draftId: `draft-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`,
      spuName: input.spuName,
      gender: input.gender,
      shapeCode: input.shapeCode,
      seriesCode: input.seriesCode,
      source: input.source || 'ai',
      status: 'draft',
      createdAt: new Date(),
    }
  }

  /**
   * 查询草稿列表
   * [ENGINE STUB] 引擎层返回空列表
   */
  async queryDrafts(input: DraftQueryInput): Promise<{ items: DraftSpuResult[]; total: number }> {
    this.logger.warn('[ENGINE STUB] DraftPoolService.queryDrafts - 行业模块未注册')
    return { items: [], total: 0 }
  }

  /**
   * 更新草稿
   * [ENGINE STUB]
   */
  async updateDraft(draftId: string, update: Record<string, any>): Promise<DraftSpuResult> {
    this.logger.warn('[ENGINE STUB] DraftPoolService.updateDraft - 行业模块未注册')
    return { draftId }
  }
}