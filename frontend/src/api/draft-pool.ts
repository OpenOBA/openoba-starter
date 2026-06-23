import request from './request';

// ── 通用 CRUD 类型 ──
type QueryParams = Record<string, string | number | boolean | undefined>
type CreateUpdateData = Record<string, unknown>

export interface DraftSpu {
  draftId: string;
  batchId?: string;
  gender: string;
  shapeCode: string;
  seriesCode: string;
  structureStandardCode: string;
  spuName: string;
  spuDescription?: string;
  displayNameTemplate?: string;
  source: string;
  status: string;
  aestheticScore?: number;
  aestheticLevel?: string;
  reviewNotes?: string;
  rejectedReason?: string;
  publishedSpuId?: string;
  publishedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DraftSku {
  draftSkuId: string;
  draftId: string;
  colorCode: string;
  colorName?: string;
  skinToneEffect?: string;
  faceShapeEffect?: string;
  displayName?: string;
  skuStatus: string;
  aestheticScore?: number;
  aestheticLevel?: string;
  reviewNotes?: string;
  rejectedReason?: string;
  sortOrder: number;
  publishedSkuId?: string;
}

export interface DraftBatch {
  id: string;
  batchName: string;
  generationType: string;
  totalCount: number;
  approvedCount: number;
  rejectedCount: number;
  publishedCount: number;
  status: string;
  createdAt: string;
}

export interface DraftPublishBatch {
  id: string;
  packageName: string;
  draftCount: number;
  skuCount: number;
  status: string;
  publishedBy: string;
  publishedAt?: string;
  errorInfo?: string;
  createdAt: string;
}

export interface AestheticCheckResult {
  level: string;
  errors: Array<{ message: string; code?: string; path?: string[] }>;
  warnings: Array<{ message: string; code?: string }>;
  tips: Array<{ message: string }>;
  recommendations: Array<{ message: string; action?: string }>;
  ruleSetVersion: string;
}

// ======= 美学校验 =======
export function checkAesthetics(data: { spu: CreateUpdateData; sku: CreateUpdateData }) {
  return request.post<Record<string, unknown>>('/aesthetics/check', data);
}

export function batchCheckAesthetics(data: { checks: Array<{ spu: CreateUpdateData; sku: CreateUpdateData }> }) {
  return request.post<Record<string, unknown>>('/aesthetics/batch-check', data);
}

export function getAestheticRules() {
  return request.get<Record<string, unknown>[]>('/aesthetics/rules');
}

export function getAestheticMatrices(type?: string) {
  return request.get<Record<string, unknown>[]>('/aesthetics/matrices', { params: { type } });
}

// ======= 草稿 SPU =======
export function createDraftSpu(data: CreateUpdateData) {
  return request.post<DraftSpu>('/draft-pool/drafts', data);
}

export function queryDrafts(params?: QueryParams): Promise<{ items: DraftSpu[]; total: number }> {
  return request.get('/draft-pool/drafts', { params });
}

export function getDraftDetail(id: string): Promise<{ draft: DraftSpu; skus: DraftSku[] }> {
  return request.get(`/draft-pool/drafts/${id}`);
}

export function updateDraft(id: string, data: CreateUpdateData) {
  return request.put<DraftSpu>(`/draft-pool/drafts/${id}`, data);
}

export function deleteDraft(id: string) {
  return request.delete(`/draft-pool/drafts/${id}`);
}

export function getWaitlistCount(): Promise<{ draft: number; reviewed: number }> {
  return request.get('/draft-pool/drafts/waitlist-count');
}

// ======= 评审 =======
export function reviewDraft(id: string, data: { action: string; reviewNotes?: string; rejectedReason?: string; skuIds?: string[] }) {
  return request.post<DraftSpu>(`/draft-pool/drafts/${id}/review`, data);
}

// ======= 发布 =======
export function publishDrafts(data: { draftIds: string[]; packageName?: string; publishedBy?: string }) {
  return request.post<DraftPublishBatch>('/draft-pool/publish', data);
}

export function getPackages(): Promise<DraftPublishBatch[]> {
  return request.get('/draft-pool/packages');
}

// ======= 批次 =======
export function createBatch(name: string, type?: string) {
  return request.post<DraftBatch>('/draft-pool/batches', { name, type });
}

export function completeBatch(id: string) {
  return request.post<DraftBatch>(`/draft-pool/batches/${id}/complete`);
}

export function getBatches(): Promise<DraftBatch[]> {
  return request.get('/draft-pool/batches');
}

// ======= 顾问报告 =======
export function createAdvisoryReport(data: { reportName: string; reportType: string; queryContext?: string }) {
  return request.post<Record<string, unknown>>('/draft-pool/reports', data);
}

export function getAdvisoryReports() {
  return request.get<Record<string, unknown>[]>('/draft-pool/reports');
}


