/**
 * 通用草稿池 API
 */

import request from '@/api/request'

export interface DraftAttachment {
  name: string
  url: string
  type: 'image' | 'video' | 'file'
  tags?: string[]
  size?: number
}

export interface ContentBlock {
  index: number
  blockType: 'text' | 'image' | 'video' | 'table'
  text?: string
  markdown?: string
  imageUrl?: string
  imageWidth?: number
  imageHeight?: number
  imageAlt?: string
  previousUrl?: string
  videoUrl?: string
  videoCover?: string
  videoDuration?: number
  tableHeaders?: string[]
  tableRows?: string[][]
  caption?: string
  layout?: 'full' | 'left' | 'right' | 'center'
  localPath?: string
}

export interface DraftItem {
  id: string
  draftNo: string
  title?: string
  draftType?: string
  status: 'editing' | 'ready' | 'published' | 'archived'
  bodyText?: string
  bodyJson?: Record<string, unknown>
  blocks?: ContentBlock[]
  deliveryChannel?: 'system' | 'local_file'
  localBasePath?: string
  attachments?: DraftAttachment[]
  tags?: string[]
  sourceTaskId?: string
  sourceAgent?: string
  sourceModel?: string
  publishAction?: {
    action: string
    entity: string
    targets: Array<{ id?: string; type: string; name: string }>
    executed_by: string
    executed_at: string
  }
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

export interface DraftStats {
  total: number
  editing: number
  ready: number
  published: number
  byType: Record<string, number>
}

export interface PaginatedDrafts {
  items: DraftItem[]
  total: number
}

export function createDraft(data: {
  title?: string
  draftType?: string
  bodyText?: string
  bodyJson?: Record<string, unknown>
  blocks?: ContentBlock[]
  attachments?: DraftAttachment[]
  tags?: string[]
  deliveryChannel?: string
  localBasePath?: string
  sourceTaskId?: string
  sourceAgent?: string
  sourceModel?: string
  sourcePrompt?: string
}): Promise<DraftItem> {
  return request.post('/drafts', data)
}

export function queryDrafts(params?: {
  draftType?: string
  status?: string
  deliveryChannel?: string
  sourceTaskId?: string
  search?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedDrafts> {
  return request.get('/drafts', { params })
}

export function getDraftStats(): Promise<DraftStats> {
  return request.get('/drafts/stats')
}

export function getDraft(id: string): Promise<DraftItem> {
  return request.get(`/drafts/${id}`)
}

export function updateDraft(
  id: string,
  data: {
    title?: string
    draftType?: string
    bodyText?: string
    bodyJson?: Record<string, unknown>
    blocks?: ContentBlock[]
    attachments?: DraftAttachment[]
    tags?: string[]
    deliveryChannel?: string
    localBasePath?: string
  },
): Promise<DraftItem> {
  return request.put(`/drafts/${id}`, data)
}

export function updateDraftStatus(id: string, status: string): Promise<DraftItem> {
  return request.patch(`/drafts/${id}/status`, { status })
}

export function publishDraft(
  id: string,
  data: {
    action: string
    entity: string
    targets?: Array<{ id?: string; type: string; name: string }>
  },
): Promise<DraftItem> {
  return request.post(`/drafts/${id}/publish`, data)
}

export function deleteDraft(id: string): Promise<{ deleted: boolean }> {
  return request.delete(`/drafts/${id}`)
}
