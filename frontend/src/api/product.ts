import request from './request'
import type { PaginatedData, DictItem } from './api-types'

// ── 通用 CRUD 类型 ──
type QueryParams = Record<string, string | number | boolean | undefined>
type CreateUpdateData = Record<string, unknown>

// ===== 颜色字典 =====
export function getColors(params?: QueryParams): Promise<PaginatedData<Record<string, unknown>>> {
  return request.get('/products/colors', { params })
}
export function getColor(id: string) {
  return request.get(`/products/colors/${id}`)
}
export function createColor(data: CreateUpdateData) {
  return request.post('/products/colors', data)
}
export function updateColor(id: string, data: CreateUpdateData) {
  return request.put(`/products/colors/${id}`, data)
}
export function deleteColor(id: string) {
  return request.delete(`/products/colors/${id}`)
}

// ===== SPU =====
export function getSpus(params?: QueryParams): Promise<PaginatedData<Record<string, unknown>>> {
  return request.get('/products/spus', { params })
}
export function getSpu(id: string) {
  return request.get(`/products/spus/${id}`)
}
export function createSpu(data: CreateUpdateData) {
  return request.post('/products/spus', data)
}
export function updateSpu(id: string, data: CreateUpdateData) {
  return request.put(`/products/spus/${id}`, data)
}
export function deleteSpu(id: string) {
  return request.delete(`/products/spus/${id}`)
}

// ===== SKU =====
export function getSkus(params?: QueryParams): Promise<PaginatedData<Record<string, unknown>>> {
  return request.get('/products/skus', { params })
}
export function getSku(id: string) {
  return request.get(`/products/skus/${id}`)
}
export function createSku(data: CreateUpdateData) {
  return request.post('/products/skus', data)
}
export function updateSku(id: string, data: CreateUpdateData) {
  return request.put(`/products/skus/${id}`, data)
}
export function deleteSku(id: string) {
  return request.delete(`/products/skus/${id}`)
}

// ===== 产品级别字典 =====
export function getProductTiers() {
  return request.get('/dict/dict_product_tier')
}

// ===== Phase 9A: 价格管理 =====
export function getTierPricings(): Promise<Record<string, unknown>[]> {
  return request.get('/pricing/tiers')
}
export function createTierPricing(data: CreateUpdateData) {
  return request.post('/pricing/tiers', data)
}
export function updateTierPricing(id: string, data: CreateUpdateData) {
  return request.put(`/pricing/tiers/${id}`, data)
}
export function deleteTierPricing(id: string) {
  return request.delete(`/pricing/tiers/${id}`)
}

export function getWholesaleTiers(): Promise<Record<string, unknown>[]> {
  return request.get('/pricing/wholesale')
}
export function createWholesaleTier(data: CreateUpdateData) {
  return request.post('/pricing/wholesale', data)
}
export function updateWholesaleTier(id: string, data: CreateUpdateData) {
  return request.put(`/pricing/wholesale/${id}`, data)
}
export function deleteWholesaleTier(id: string) {
  return request.delete(`/pricing/wholesale/${id}`)
}

export function getPriceHistory(params?: QueryParams) {
  return request.get('/pricing/history', { params })
}

// ===== 促销管理 =====
export function getPromotions(params?: QueryParams): Promise<Record<string, unknown>[]> {
  return request.get('/pricing/promotions', { params })
}
export function createPromotion(data: CreateUpdateData) {
  return request.post('/pricing/promotions', data)
}
export function updatePromotion(id: string, data: CreateUpdateData) {
  return request.put(`/pricing/promotions/${id}`, data)
}
export function deletePromotion(id: string) {
  return request.delete(`/pricing/promotions/${id}`)
}
export function updatePromotionStatus(id: string, status: string) {
  return request.put(`/pricing/promotions/${id}/status`, { status })
}
export function calculatePrice(data: CreateUpdateData) {
  return request.post('/pricing/calculate', data)
}
export function scanMemberDowngrades() {
  return request.post('/pricing/members/downgrade-scan')
}

// ===== Phase 8B: 技术参数字典 =====
export function getFrameMaterials(): Promise<DictItem[]> {
  return request.get('/dict/dict_frame_material')
}
export function getFrameTypes(): Promise<DictItem[]> {
  return request.get('/dict/dict_frame_type')
}
export function getNosePads(): Promise<DictItem[]> {
  return request.get('/dict/dict_nose_pad')
}
export function getHinges(): Promise<DictItem[]> {
  return request.get('/dict/dict_hinge')
}
export function getSurfaceTreatments(): Promise<DictItem[]> {
  return request.get('/dict/dict_surface_treatment')
}
export function getSeriesList(): Promise<DictItem[]> {
  return request.get('/dict/structure_series')
}

// ===== 套装 =====
export function getSets(params?: QueryParams): Promise<PaginatedData<Record<string, unknown>>> {
  return request.get('/products/sets', { params })
}
export function getSet(id: string) {
  return request.get(`/products/sets/${id}`)
}
export function createSet(data: CreateUpdateData) {
  return request.post('/products/sets', data)
}
export function updateSet(id: string, data: CreateUpdateData) {
  return request.put(`/products/sets/${id}`, data)
}
export function deleteSet(id: string) {
  return request.delete(`/products/sets/${id}`)
}

// ===== SKU 图片 =====
export function getSkuImages(params?: QueryParams) {
  return request.get('/products/sku-images', { params })
}
export function getSkuImage(id: string) {
  return request.get(`/products/sku-images/${id}`)
}
export function getSkuImagesGrouped(skuId: string) {
  return request.get(`/products/sku-images-grouped/${skuId}`)
}
export function createSkuImage(data: CreateUpdateData) {
  return request.post('/products/sku-images', data)
}
export function batchCreateSkuImages(data: { skuId: string; images: CreateUpdateData[] }) {
  return request.post('/products/sku-images/batch', data)
}
export function updateSkuImage(id: string, data: CreateUpdateData) {
  return request.put(`/products/sku-images/${id}`, data)
}
export function deleteSkuImage(id: string) {
  return request.delete(`/products/sku-images/${id}`)
}
export function reorderSkuImages(data: { skuId: string; imageType: string; orderedIds: string[] }) {
  return request.post('/products/sku-images/reorder', data)
}

// ===== 文件上传 =====
export function uploadImage(file: File): Promise<Record<string, unknown>> {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
}

// ===== 🔧 V2.0 效果词库（2026-04-24 新增） =====
export function getEffectTags(type: 'skin_tone' | 'face_shape'): Promise<DictItem[]> {
  return request.get(`/products/effects/${type}`)
}
export function getEffectRecommend(colorCode: string) {
  return request.post('/products/effects/recommend', { colorCode })
}

// ===== S-SKU 副品管理 =====
export function getSubSkus(params?: QueryParams) {
  return request.get('/sub-skus', { params })
}
export function getSubSku(id: string) {
  return request.get(`/sub-skus/${id}`)
}
export function createSubSku(data: CreateUpdateData) {
  return request.post('/sub-skus', data)
}
export function updateSubSku(id: string, data: CreateUpdateData) {
  return request.put(`/sub-skus/${id}`, data)
}
export function deleteSubSku(id: string) {
  return request.delete(`/sub-skus/${id}`)
}

// S-SKU 分类
export function getSubSkuCategories() {
  return request.get('/sub-skus/categories')
}
export function getSubSkuCategoryTree() {
  return request.get('/sub-skus/categories/tree')
}
export function createSubSkuCategory(data: CreateUpdateData) {
  return request.post('/sub-skus/categories', data)
}
export function updateSubSkuCategory(id: string, data: CreateUpdateData) {
  return request.put(`/sub-skus/categories/${id}`, data)
}
export function deleteSubSkuCategory(id: string) {
  return request.delete(`/sub-skus/categories/${id}`)
}

// S-SKU 字典
export function getSubSkuDicts() {
  return Promise.all([
    request.get('/dict/dict_refractive_index'),
    request.get('/dict/dict_lens_function'),
    request.get('/dict/dict_lens_coating'),
    request.get('/dict/dict_lens_material'),
    request.get('/dict/dict_unit'),
    request.get('/dict/dict_brand'),
  ])
}
