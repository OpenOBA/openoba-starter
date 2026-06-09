import request from './request';

// ── 通用 CRUD 类型 ──
type QueryParams = Record<string, string | number | boolean | undefined>
type CreateUpdateData = Record<string, unknown>

// ===== 订单 =====
export function getOrderList(params?: QueryParams) {
  return request.get('/orders', { params });
}

export function getOrderDetail(id: string) {
  return request.get(`/orders/${id}`);
}

export function createOrder(data: CreateUpdateData) {
  return request.post('/orders', data);
}

export function updateOrder(id: string, data: CreateUpdateData) {
  return request.put(`/orders/${id}`, data);
}

export function updateOrderStatus(id: string, data: CreateUpdateData) {
  return request.put(`/orders/${id}/status`, data);
}

export function cancelOrder(id: string, data: CreateUpdateData) {
  return request.put(`/orders/${id}/cancel`, data);
}

export function deleteOrder(id: string) {
  return request.delete(`/orders/${id}`);
}

export function getOrderStats() {
  return request.get('/orders/stats/overview');
}

// ===== 支付 =====
export function getOrderPayments(orderId: string) {
  return request.get(`/orders/${orderId}/payments`);
}

export function createPayment(data: CreateUpdateData) {
  return request.post('/orders/payments', data);
}

// ===== 发货 =====
export function getOrderShipments(orderId: string) {
  return request.get(`/orders/${orderId}/shipments`);
}

export function createShipment(data: CreateUpdateData) {
  return request.post('/orders/shipments', data);
}

// ===== 日志 =====
export function getOrderLogs(orderId: string) {
  return request.get(`/orders/${orderId}/logs`);
}
