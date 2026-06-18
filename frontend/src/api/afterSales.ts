import request from './request';
import type { PaginatedData } from './api-types';

// ── 通用 CRUD 类型 ──
type QueryParams = Record<string, string | number | boolean | undefined>
type CreateUpdateData = Record<string, unknown>

// ===== 售后 =====
export function getAfterSalesList(params?: QueryParams): Promise<PaginatedData<Record<string,unknown>>> {
  return request.get('/after-sales', { params });
}

export function getAfterSalesDetail(id: string): Promise<Record<string,unknown>> {
  return request.get(`/after-sales/${id}`);
}

export function createAfterSales(data: CreateUpdateData) {
  return request.post('/after-sales', data);
}

export function updateAfterSales(id: string, data: CreateUpdateData) {
  return request.put(`/after-sales/${id}`, data);
}

export function reviewAfterSales(id: string, data: CreateUpdateData) {
  return request.post(`/after-sales/${id}/review`, data);
}

export function processAfterSales(id: string, data: CreateUpdateData) {
  return request.post(`/after-sales/${id}/process`, data);
}

export function getAfterSalesLogs(id: string): Promise<Record<string,unknown>[]> {
  return request.get(`/after-sales/${id}/logs`);
}

export function getAfterSalesStats(): Promise<Record<string,unknown>> {
  return request.get('/after-sales/stats');
}
