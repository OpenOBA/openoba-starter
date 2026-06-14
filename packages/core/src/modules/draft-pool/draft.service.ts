/**
 * DraftService Engine Stub — 通用草稿服务引擎桩
 *
 * 提供引擎层草稿 CRUD，行业模块覆盖实现。
 *
 * @file draft.service.ts
 * @module draft-pool (engine stub)
 * @since 2026-06-01
 */

import { Injectable, Logger } from '@nestjs/common'

export interface UniversalDraftCreateInput {
  draftType: 'spu' | 'sku' | 'set'
  title: string
  bodyJson?: Record<string, any>
  draftId?: string
}

export interface UniversalDraftResult {
  id: string
  draftType: string
  title: string
  status: string
  createdAt: Date
}

@Injectable()
export class DraftService {
  private readonly logger = new Logger(DraftService.name)

  async create(input: UniversalDraftCreateInput): Promise<UniversalDraftResult> {
    this.logger.warn('[ENGINE STUB] DraftService.create - 行业模块未注册')
    return {
      id: `universal-${Date.now()}`,
      draftType: input.draftType,
      title: input.title,
      status: 'draft',
      createdAt: new Date(),
    }
  }

  async update(id: string, update: Record<string, any>): Promise<UniversalDraftResult> {
    this.logger.warn('[ENGINE STUB] DraftService.update - 行业模块未注册')
    return {
      id,
      draftType: 'spu',
      title: '',
      status: 'draft',
      createdAt: new Date(),
    }
  }
}
