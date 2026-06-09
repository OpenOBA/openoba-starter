// @openoba/types — 草稿池 + 交付物 + 报表接口
// 来源：draft-spu.entity.ts, deliverable-manifest.entity.ts, report-target.entity.ts
// V1.4-b M1 Step 4

import { AestheticLevel, DraftSource } from '../enums/draft.enum'

export interface IDraftSpu {
  id: string
  spuName: string
  spuCode?: string
  category: string
  source: DraftSource
  status: string
  aestheticLevel?: AestheticLevel
  spuAttributes?: Record<string, any>
  metadata?: Record<string, any>
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface IDeliverableManifest {
  id: string
  taskId: string
  deliverableType: string
  title: string
  description?: string
  fileUrl?: string
  fileSize?: number
  status: string
  metadata?: Record<string, any>
  createdAt: Date
}

export interface IReportTarget {
  id: string
  name: string
  targetType: string
  config: Record<string, any>
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
