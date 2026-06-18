import request from './request';
import type { PaginatedData, DictItem } from './api-types';

// ── 通用 CRUD 类型 ──
type QueryParams = Record<string, string | number | boolean | undefined>
type CreateUpdateData = Record<string, unknown>

// ===== 库存 =====
export function getInventoryList(params?: QueryParams): Promise<PaginatedData<Record<string,unknown>>> {
  return request.get('/inventory', { params });
}

export function getInventoryBySku(skuId: string) {
  return request.get(`/inventory/sku/${skuId}`);
}

export function getInventoryStats(): Promise<Record<string,unknown>> {
  return request.get('/inventory/stats');
}

export function createInventory(data: CreateUpdateData) {
  return request.post('/inventory', data);
}

export function updateInventory(id: string, data: CreateUpdateData) {
  return request.put(`/inventory/${id}`, data);
}

export function stockIn(data: CreateUpdateData) {
  return request.post('/inventory/in', data);
}

export function stockOut(data: CreateUpdateData) {
  return request.post('/inventory/out', data);
}

export function lockStock(data: CreateUpdateData) {
  return request.post('/inventory/lock', data);
}

export function unlockStock(data: CreateUpdateData) {
  return request.post('/inventory/unlock', data);
}

export function adjustStock(data: CreateUpdateData) {
  return request.post('/inventory/adjust', data);
}

// ===== 交易流水 =====
export function getTransactions(params?: QueryParams): Promise<PaginatedData<Record<string,unknown>>> {
  return request.get('/inventory/transactions', { params });
}

export function cleanTransactions() {
  return request.delete('/inventory/transactions/clean');
}
