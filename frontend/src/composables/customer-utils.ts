/**
 * customer-utils.ts — 客户管理标签函数
 *
 * 纯函数，无 Vue reactivity 依赖。
 * 用于 Customers.vue 模板中的标签、标签颜色等。
 */

// ===== Fallback 映射（字典加载失败时使用）=====
export const CUSTOMER_TYPE_FALLBACK: Record<string, string> = {
  retail: '零售',
  business: '批发',
  partner: '合作伙伴',
  '': '—',
};

export const CUSTOMER_LEVEL_FALLBACK: Record<string, string> = {
  normal: '普通',
  vip: 'VIP',
  svip: 'SVIP',
  '': '—',
};

// ===== 标签 tag 类型 =====
export function typeTag(t: string) {
  return { retail: 'primary', business: 'warning', partner: 'success' }[t] || 'info';
}

export function levelTag(l: string) {
  return { normal: 'info', vip: 'primary', svip: 'danger' }[l] || 'info';
}

export function statusTag(s: string) {
  return { active: 'success', inactive: 'info', blacklisted: 'danger' }[s] || 'info';
}

export function orderStatusTag(s: string) {
  return ({ pending: 'warning', paid: 'primary', shipped: 'primary', completed: 'success', cancelled: 'info' } as any)[s] || 'info';
}

export function accountStatusTag(s: string) {
  return ({ active: 'success', inactive: 'info', suspended: 'danger', deactivated: 'info', none: 'info' } as any)[s] || 'info';
}

export function triggerTypeTag(t: string) {
  return { upgrade: 'success', downgrade: 'danger', manual: 'warning' }[t] || 'info';
}

export function pointsTypeTag(t: string) {
  return { order_earn: 'success', order_burn: 'danger', manual: 'warning', expire: 'info' }[t] || 'info';
}

// ===== 文本标签 =====
export function sourceTypeLabel(t: string) {
  return { manual_upload: '手动录入', ocr: 'OCR识别', api_optometry: 'API验光' }[t] || t || '—';
}

export function isExpired(date: string) {
  if (!date) return false;
  return new Date(date) < new Date();
}

export function addrTypeLabel(t: string) {
  return { shipping: '收货', billing: '结算', office: '办公' }[t] || t || '—';
}

export function formatDateTime(dateStr: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-');
}

export function memberLabel(since: string | null, validUntil: string | null) {
  if (!since) return '非会员';
  if (validUntil && new Date(validUntil) < new Date()) return '已过期';
  return '会员';
}

export function triggerTypeLabel(t: string) {
  return { upgrade: '升级', downgrade: '降级', manual: '手动' }[t] || t || '—';
}

export function pointsTypeLabel(t: string) {
  return { order_earn: '消费获得', order_burn: '消费抵扣', manual: '手动调整', expire: '过期' }[t] || t || '—';
}
