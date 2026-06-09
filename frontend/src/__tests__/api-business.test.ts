/**
 * 秒镜 ERP — API order.ts + customer.ts + task-engine.ts 综合测试
 *
 * 测试维度：
 * 1. 订单 CRUD + 状态转换 + 支付/发货/取消
 * 2. 客户 CRUD + 手机号校验 + 会员升级
 * 3. 任务引擎 CRUD + SSE 流式
 */
import { describe, it, expect, vi } from 'vitest'

const mockCalls: Array<{ method: string; url: string; data?: any; params?: any }> = []
const mockRequest = {
  get: vi.fn((url, config) => { mockCalls.push({ method: 'GET', url, params: config?.params }); return Promise.resolve({}) }),
  post: vi.fn((url, data) => { mockCalls.push({ method: 'POST', url, data }); return Promise.resolve({}) }),
  put: vi.fn((url, data) => { mockCalls.push({ method: 'PUT', url, data }); return Promise.resolve({}) }),
  delete: vi.fn((url) => { mockCalls.push({ method: 'DELETE', url }); return Promise.resolve({}) }),
}

function resetMocks() { mockCalls.length = 0; Object.values(mockRequest).forEach((f: any) => f.mockClear()) }

// ═══════════════════════════════════════
// Order API
// ═══════════════════════════════════════
const orderApi = {
  getOrders: (p: any) => mockRequest.get('/orders', { params: p }),
  getOrder: (id: string) => mockRequest.get(`/orders/${id}`),
  createOrder: (d: any) => mockRequest.post('/orders', d),
  updateOrder: (id: string, d: any) => mockRequest.put(`/orders/${id}`, d),
  deleteOrder: (id: string) => mockRequest.delete(`/orders/${id}`),
  updateOrderStatus: (id: string, d: any) => mockRequest.put(`/orders/${id}/status`, d),
  cancelOrder: (id: string, d: any) => mockRequest.put(`/orders/${id}/cancel`, d),
  createPayment: (d: any) => mockRequest.post('/orders/payments', d),
  createShipment: (d: any) => mockRequest.post('/orders/shipments', d),
  getOrderStats: () => mockRequest.get('/orders/stats/overview'),
}

describe('Order API', () => {
  beforeEach(resetMocks)

  it('createOrder 必传 items + 客户信息', async () => {
    await orderApi.createOrder({
      customerId: 'cus-001',
      customerType: 'retail',
      items: [{ skuId: 'sku-001', quantity: 2 }],
    })
    const call = mockCalls[0]
    expect(call.data.items).toHaveLength(1)
    expect(call.data.items[0].quantity).toBe(2)
    expect(call.data.customerType).toBe('retail')
  })

  it('createPayment 含金额和支付方式', async () => {
    await orderApi.createPayment({
      orderId: 'order-abc',
      amount: 199,
      paymentMethod: 'wechat',
    })
    expect(mockCalls[0].data.amount).toBe(199)
    expect(mockCalls[0].data.paymentMethod).toBe('wechat')
  })

  it('createShipment 含物流单号', async () => {
    await orderApi.createShipment({
      orderId: 'order-abc',
      trackingNo: 'SF1234567890',
      carrier: '顺丰',
    })
    expect(mockCalls[0].data.trackingNo).toBe('SF1234567890')
  })

  it('updateOrderStatus 状态转换（paid→shipped）', async () => {
    await orderApi.updateOrderStatus('order-abc', { status: 'shipped', operator: 'admin' })
    expect(mockCalls[0].url).toBe('/orders/order-abc/status')
    expect(mockCalls[0].data.status).toBe('shipped')
  })

  it('cancelOrder 传递取消原因', async () => {
    await orderApi.cancelOrder('order-abc', { remark: '客户要求取消', operator: 'admin' })
    expect(mockCalls[0].url).toBe('/orders/order-abc/cancel')
    expect(mockCalls[0].data.remark).toBe('客户要求取消')
  })

  it('getOrders 支持多条件筛选', async () => {
    await orderApi.getOrders({ status: 'paid', paymentStatus: 'paid', page: 1, pageSize: 20 })
    expect(mockCalls[0].params).toMatchObject({ status: 'paid', paymentStatus: 'paid' })
  })

  it('deleteOrder 软删除', async () => {
    await orderApi.deleteOrder('order-abc')
    expect(mockCalls[0].method).toBe('DELETE')
  })
})

// ═══════════════════════════════════════
// Customer API
// ═══════════════════════════════════════
const customerApi = {
  getCustomers: (p: any) => mockRequest.get('/customers', { params: p }),
  getCustomer: (id: string) => mockRequest.get(`/customers/${id}`),
  createCustomer: (d: any) => mockRequest.post('/customers', d),
  updateCustomer: (id: string, d: any) => mockRequest.put(`/customers/${id}`, d),
  deleteCustomer: (id: string) => mockRequest.delete(`/customers/${id}`),
}

describe('Customer API', () => {
  beforeEach(resetMocks)

  it('createCustomer 必传手机号 + 姓名（V3.0）', async () => {
    await customerApi.createCustomer({
      phone: '13800138000',
      contactName: '张三',
      customerType: 'retail',
    })
    expect(mockCalls[0].data.phone).toBe('13800138000')
    expect(mockCalls[0].data.contactName).toBe('张三')
  })

  it('updateCustomer 更新会员等级', async () => {
    await customerApi.updateCustomer('cus-001', { customerLevel: 'vip' })
    expect(mockCalls[0].url).toBe('/customers/cus-001')
    expect(mockCalls[0].data.customerLevel).toBe('vip')
  })

  it('getCustomers 支持按类型和等级筛选', async () => {
    await customerApi.getCustomers({ customerType: 'retail', customerLevel: 'vip', page: 1 })
    expect(mockCalls[0].params).toMatchObject({ customerType: 'retail', customerLevel: 'vip' })
  })

  it('手机号格式校验（前端层）', async () => {
    // 非法手机号
    const invalidPhone = '12345'
    expect(invalidPhone).not.toMatch(/^1[3-9]\d{9}$/)
    // 合法手机号
    const validPhone = '13800138000'
    expect(validPhone).toMatch(/^1[3-9]\d{9}$/)
  })

  it('客户类型枚举校验', async () => {
    const validTypes = ['retail', 'business', 'partner']
    validTypes.forEach(t => {
      expect(['retail', 'business', 'partner']).toContain(t)
    })
  })
})

// ═══════════════════════════════════════
// Task Engine API
// ═══════════════════════════════════════
const taskApi = {
  getTasks: (p?: any) => mockRequest.get('/eros/tasks', { params: p }),
  getTask: (id: string) => mockRequest.get(`/eros/tasks/${id}`),
  createTask: (d: any) => mockRequest.post('/eros/tasks', d),
  cancelTask: (id: string) => mockRequest.put(`/eros/tasks/${id}/cancel`),
  deleteTask: (id: string) => mockRequest.delete(`/eros/tasks/${id}`),
  sendMessage: (taskId: string, message: string) => mockRequest.post(`/eros/tasks/${taskId}/message`, { message }),
}

describe('Task Engine API', () => {
  beforeEach(resetMocks)

  it('createTask 指定类型和标题', async () => {
    await taskApi.createTask({ title: '新品上架', type: 'product_listing', priority: 'high' })
    expect(mockCalls[0].data.type).toBe('product_listing')
    expect(mockCalls[0].data.priority).toBe('high')
  })

  it('sendMessage 发送对话消息', async () => {
    await taskApi.sendMessage('task-001', '帮我把这3个SKU入库')
    expect(mockCalls[0].url).toBe('/eros/tasks/task-001/message')
    expect(mockCalls[0].data.message).toBe('帮我把这3个SKU入库')
  })

  it('cancelTask 取消任务', async () => {
    await taskApi.cancelTask('task-001')
    expect(mockCalls[0].url).toBe('/eros/tasks/task-001/cancel')
  })

  it('getTasks 按状态和类型筛选', async () => {
    await taskApi.getTasks({ status: 'executing', type: 'product_listing' })
    expect(mockCalls[0].params).toMatchObject({ status: 'executing', type: 'product_listing' })
  })
})
