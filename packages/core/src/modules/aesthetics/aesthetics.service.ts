/**
 * Aesthetics Engine Stub — 美学校验引擎桩
 *
 * 引擎层提供标准接口，行业模块覆盖完整美学规则。
 *
 * @file aesthetics.service.ts
 * @module aesthetics (engine stub)
 * @since 2026-06-01
 */

import { Injectable, Logger } from '@nestjs/common'

export interface AestheticsCheckInput {
  spu: { shapeCode: string; seriesCode: string; gender: string }
  sku: { colorCode: string; skinToneEffect?: string; faceShapeEffect?: string }
}

export interface AestheticsCheckResult {
  level: 'pass' | 'warning' | 'block'
  errors: string[]
  warnings: string[]
  suggestions?: string[]
}

@Injectable()
export class AestheticsService {
  private readonly logger = new Logger(AestheticsService.name)

  async check(input: AestheticsCheckInput): Promise<AestheticsCheckResult> {
    this.logger.warn('[ENGINE STUB] AestheticsService.check - 行业模块未注册')
    return {
      level: 'pass',
      errors: [],
      warnings: [],
      suggestions: ['行业美学规则未加载，默认通过'],
    }
  }
}
