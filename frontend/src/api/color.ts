import request from './request';
import type { PaginatedData, DictItem } from './api-types';

// ── 通用 CRUD 类型 ──
type QueryParams = Record<string, string | number | boolean | undefined>
type CreateUpdateData = Record<string, unknown>

// ===== 材质-色彩映射 =====
export function getColorMappings(params?: QueryParams): Promise<PaginatedData<Record<string,unknown>>> { return request.get('/colors/mappings', { params }); }
export function getColorMapping(id: string) { return request.get(`/colors/mappings/${id}`); }
export function createColorMapping(data: CreateUpdateData) { return request.post('/colors/mappings', data); }
export function updateColorMapping(id: string, data: CreateUpdateData) { return request.put(`/colors/mappings/${id}`, data); }
export function deleteColorMapping(id: string) { return request.delete(`/colors/mappings/${id}`); }
export function getFeasibleColors(materialCode: string) { return request.get(`/colors/materials/${materialCode}/feasible-colors`); }

// ===== 季节色盘 =====
export function getColorPalettes(params?: QueryParams): Promise<PaginatedData<Record<string,unknown>>> { return request.get('/colors/palettes', { params }); }
export function getColorPalette(id: string) { return request.get(`/colors/palettes/${id}`); }
export function createColorPalette(data: CreateUpdateData) { return request.post('/colors/palettes', data); }
export function updateColorPalette(id: string, data: CreateUpdateData) { return request.put(`/colors/palettes/${id}`, data); }
export function deleteColorPalette(id: string) { return request.delete(`/colors/palettes/${id}`); }

// ===== 色盘颜色项 =====
export function addPaletteItem(data: CreateUpdateData) { return request.post('/colors/palette-items', data); }
export function deletePaletteItem(id: string) { return request.delete(`/colors/palette-items/${id}`); }

// ===== 色彩设计项目 =====
export function getColorProjects(params?: QueryParams): Promise<PaginatedData<Record<string,unknown>>> { return request.get('/colors/projects', { params }); }
export function getColorProject(id: string) { return request.get(`/colors/projects/${id}`); }
export function createColorProject(data: CreateUpdateData) { return request.post('/colors/projects', data); }
export function updateColorProject(id: string, data: CreateUpdateData) { return request.put(`/colors/projects/${id}`, data); }
export function deleteColorProject(id: string) { return request.delete(`/colors/projects/${id}`); }
export function getProjectColors(projectId: string): Promise<Record<string, unknown>[]> { return request.get(`/colors/projects/${projectId}/colors`); }
export function addProjectColor(data: CreateUpdateData) { return request.post('/colors/project-colors', data); }
export function deleteProjectColor(id: string) { return request.delete(`/colors/project-colors/${id}`); }

// ===== 字典辅助 =====
export function getDictLensMaterials(): Promise<DictItem[]> { return request.get('/dict/structure_material'); }
export function getDictSkuColors(): Promise<DictItem[]> { return request.get('/dict/dict_sku_color'); }
