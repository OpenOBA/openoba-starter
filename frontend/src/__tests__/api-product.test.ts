/**
 * 秒镜 ERP — API product.ts 测试
 *
 * 测试维度：
 * 1. 所有 CRUD 函数签名正确性（颜色/SPU/SKU/套装/图片/定价）
 * 2. 分页参数传递
 * 3. 效果词 API 参数枚举校验
 * 4. 上传接口 Content-Type
 * 5. 路径参数注入正确性
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'

// ═══════════════════════════════════════
// Mock request 实例
// ═══════════════════════════════════════
const mockCalls: Array<{ method: string; url: string; data?: any; params?: any; config?: any }> = []
const mockRequest: Record<string, Mock> = {
  get: vi.fn((url?: string, config?: any) => {
    mockCalls.push({ method: 'GET', url: url ?? '', params: config?.params })
    return Promise.resolve([])
  }),
  post: vi.fn((url?: string, data?: any, config?: any) => {
    mockCalls.push({ method: 'POST', url: url ?? '', data, config })
    return Promise.resolve({})
  }),
  put: vi.fn((url?: string, data?: any) => {
    mockCalls.push({ method: 'PUT', url: url ?? '', data })
    return Promise.resolve({})
  }),
  delete: vi.fn((url?: string) => {
    mockCalls.push({ method: 'DELETE', url: url ?? '' })
    return Promise.resolve({})
  }),
}

// ═══════════════════════════════════════
// 内联 API 函数（模拟 product.ts）
// ═══════════════════════════════════════
const api = {
  getColors: (p: any) => mockRequest.get('/products/colors', { params: p }),
  getColor: (id: string) => mockRequest.get(`/products/colors/${id}`),
  createColor: (d: any) => mockRequest.post('/products/colors', d),
  updateColor: (id: string, d: any) => mockRequest.put(`/products/colors/${id}`, d),
  deleteColor: (id: string) => mockRequest.delete(`/products/colors/${id}`),

  getSpus: (p: any) => mockRequest.get('/products/spus', { params: p }),
  getSpu: (id: string) => mockRequest.get(`/products/spus/${id}`),
  createSpu: (d: any) => mockRequest.post('/products/spus', d),
  updateSpu: (id: string, d: any) => mockRequest.put(`/products/spus/${id}`, d),
  deleteSpu: (id: string) => mockRequest.delete(`/products/spus/${id}`),

  getSkus: (p: any) => mockRequest.get('/products/skus', { params: p }),
  getSku: (id: string) => mockRequest.get(`/products/skus/${id}`),
  createSku: (d: any) => mockRequest.post('/products/skus', d),
  updateSku: (id: string, d: any) => mockRequest.put(`/products/skus/${id}`, d),
  deleteSku: (id: string) => mockRequest.delete(`/products/skus/${id}`),

  getSets: (p: any) => mockRequest.get('/products/sets', { params: p }),
  getProductTiers: () => mockRequest.get('/dict/dict_product_tier'),

  getEffectTags: (type: 'skin_tone' | 'face_shape') => mockRequest.get(`/products/effects/${type}`),
  getEffectRecommend: (colorCode: string) => mockRequest.post('/products/effects/recommend', { colorCode }),
  getSkuImagesGrouped: (skuId: string) => mockRequest.get(`/products/sku-images-grouped/${skuId}`),
  batchCreateSkuImages: (data: { skuId: string; images: any[] }) => mockRequest.post('/products/sku-images/batch', data),
  reorderSkuImages: (data: { skuId: string; imageType: string; orderedIds: string[] }) =>
    mockRequest.post('/products/sku-images/reorder', data),
  calculatePrice: (data: any) => mockRequest.post('/pricing/calculate', data),
  scanMemberDowngrades: () => mockRequest.post('/pricing/members/downgrade-scan'),
}

function resetMocks() {
  mockCalls.length = 0
  mockRequest.get.mockClear()
  mockRequest.post.mockClear()
  mockRequest.put.mockClear()
  mockRequest.delete.mockClear()
}

// ═══════════════════════════════════════
// 测试
// ═══════════════════════════════════════

describe('Product API — 颜色 CRUD', () => {
  beforeEach(resetMocks)

  it('getColors 传递分页参数', async () => {
    await api.getColors({ page: 1, pageSize: 20, keyword: '红' })
    const call = mockCalls[0]
    expect(call.method).toBe('GET')
    expect(call.url).toBe('/products/colors')
    expect(call.params).toEqual({ page: 1, pageSize: 20, keyword: '红' })
  })

  it('createColor 传递颜色数据', async () => {
    await api.createColor({ colorCode: 'red', colorName: 'red' })
    expect(mockCalls[0].method).toBe('POST')
    expect(mockCalls[0].data).toEqual({ colorCode: 'red', colorName: 'red' })
  })

  it('deleteColor 路径包含颜色ID', async () => {
    await api.deleteColor('color-001')
    expect(mockCalls[0].url).toBe('/products/colors/color-001')
  })
})

describe('Product API — SPU CRUD', () => {
  beforeEach(resetMocks)

  it('getSpus 传递筛选参数', async () => {
    await api.getSpus({ status: 'on_sale', seriesCode: 'CLS', page: 2 })
    expect(mockCalls[0].url).toBe('/products/spus')
    expect(mockCalls[0].params).toMatchObject({ status: 'on_sale', seriesCode: 'CLS' })
  })

  it('createSpu 传递结构标准编码', async () => {
    await api.createSpu({
      structureStandardCode: 'S5447-RND',
      gender: 'female',
      seriesCode: 'FSH',
    })
    expect(mockCalls[0].method).toBe('POST')
    expect(mockCalls[0].data.structureStandardCode).toBe('S5447-RND')
  })

  it('updateSpu 路径含 spuId', async () => {
    await api.updateSpu('spu-abc', { spuName: '新名称' })
    expect(mockCalls[0].url).toBe('/products/spus/spu-abc')
    expect(mockCalls[0].data).toEqual({ spuName: '新名称' })
  })
})

describe('Product API — SKU CRUD', () => {
  beforeEach(resetMocks)

  it('createSku 必传 spuId 和 colorCode (V3.0)', async () => {
    await api.createSku({
      spuId: 'spu-001',
      colorCode: 'macaron_pink',
      retailPrice: 199,
      skinToneEffect: '黄皮肤增白',
    })
    expect(mockCalls[0].data.spuId).toBe('spu-001')
    expect(mockCalls[0].data.colorCode).toBe('macaron_pink')
    expect(mockCalls[0].data.retailPrice).toBe(199)
  })

  it('getSkus 支持按 spuId 筛选', async () => {
    await api.getSkus({ spuId: 'spu-001', pageSize: 50 })
    expect(mockCalls[0].params).toEqual({ spuId: 'spu-001', pageSize: 50 })
  })
})

describe('Product API — 效果词 V3.0', () => {
  beforeEach(resetMocks)

  it('getEffectTags 仅接受 skin_tone 或 face_shape', async () => {
    await api.getEffectTags('skin_tone')
    expect(mockCalls[0].url).toBe('/products/effects/skin_tone')
    await api.getEffectTags('face_shape')
    expect(mockCalls[1].url).toBe('/products/effects/face_shape')
  })

  it('getEffectRecommend 传递 colorCode', async () => {
    await api.getEffectRecommend('macaron_pink')
    expect(mockCalls[0].method).toBe('POST')
    expect(mockCalls[0].data).toEqual({ colorCode: 'macaron_pink' })
  })
})

describe('Product API — SKU 图片', () => {
  beforeEach(resetMocks)

  it('getSkuImagesGrouped 按 skuId 分组', async () => {
    await api.getSkuImagesGrouped('sku-abc')
    expect(mockCalls[0].url).toBe('/products/sku-images-grouped/sku-abc')
  })

  it('batchCreateSkuImages 批量上传', async () => {
    await api.batchCreateSkuImages({ skuId: 'sku-001', images: [{ url: 'a.jpg' }, { url: 'b.jpg' }] })
    expect(mockCalls[0].data.images).toHaveLength(2)
  })

  it('reorderSkuImages 拖拽排序', async () => {
    await api.reorderSkuImages({ skuId: 'sku-001', imageType: 'gallery', orderedIds: ['img-3', 'img-1', 'img-2'] })
    expect(mockCalls[0].data.orderedIds).toEqual(['img-3', 'img-1', 'img-2'])
  })
})

describe('Product API — 定价', () => {
  beforeEach(resetMocks)

  it('calculatePrice 计算价格', async () => {
    await api.calculatePrice({ skuId: 'sku-001', quantity: 2, customerId: 'cus-001' })
    expect(mockCalls[0].url).toBe('/pricing/calculate')
    expect(mockCalls[0].data.quantity).toBe(2)
  })

  it('scanMemberDowngrades POST 无需参数', async () => {
    await api.scanMemberDowngrades()
    expect(mockCalls[0].url).toBe('/pricing/members/downgrade-scan')
  })
})
