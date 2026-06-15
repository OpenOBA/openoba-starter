import { computed, watch } from 'vue'
import { useDict } from '@/composables/useDict'
import { ElMessage } from 'element-plus'

// 字典初始化
const dictType = useDict('dict_customer_type')
const dictLevel = useDict('dict_customer_level')
const dictStatus = useDict('dict_customer_status')
const dictReferral = useDict('dict_referral_source')
const dictSubscription = useDict('dict_subscription_status')
const dictContactRole = useDict('dict_contact_role')

export function useCustomerUtils() {
  // 构建 options 格式数组
  const dictTypeOptions = computed(() => dictType.items.value.map(d => ({ label: d.name, value: d.code })))
  const dictLevelOptions = computed(() => dictLevel.items.value.map(d => ({ label: d.name, value: d.code })))
  const dictStatusOptions = computed(() => dictStatus.items.value.map(d => ({ label: d.name, value: d.code })))
  const dictReferralOptions = computed(() => dictReferral.items.value.map(d => ({ label: d.name, value: d.code })))
  const dictSubscriptionOptions = computed(() => dictSubscription.items.value.map(d => ({ label: d.name, value: d.code })))
  const dictContactRoleOptions = computed(() => dictContactRole.items.value.map(d => ({ label: d.name, value: d.code })))

  // fallback 映射
  const CUSTOMER_TYPE_FALLBACK: Record<string, string> = { retail: '零售', business: '批发', partner: '合作伙伴', '': '—' }
  const CUSTOMER_LEVEL_FALLBACK: Record<string, string> = { normal: '普通', vip: 'VIP', svip: 'SVIP', '': '—' }

  // 字典加载错误监控
  watch(() => dictType.error.value, (error) => {
    if (error) { console.error('[Customers] dict_customer_type 加载错误:', error); ElMessage.warning('客户类型字典加载失败') }
  }, { immediate: true })
  watch(() => dictLevel.error.value, (error) => {
    if (error) { console.error('[Customers] dict_customer_level 加载错误:', error); ElMessage.warning('客户等级字典加载失败') }
  }, { immediate: true })

  // 工具函数
  function typeTag(t: string) { return ({ retail: 'primary', business: 'warning', partner: 'success' } as any)[t] || 'info' }
  function typeLabel(t: string) { return dictType.labels.value[t] || CUSTOMER_TYPE_FALLBACK[t] || t }
  function levelTag(l: string) { return ({ normal: 'info', vip: 'primary', svip: 'danger' } as any)[l] || 'info' }
  function levelLabel(l: string) { return dictLevel.labels.value[l] || CUSTOMER_LEVEL_FALLBACK[l] || l }
  function statusTag(s: string) {
    const item = dictStatus.items.value.find(d => d.code === s) as any
    return item?.color || ({ active: 'success', inactive: 'info', blacklisted: 'danger' } as any)[s] || 'info'
  }
  function statusLabel(s: string) { return dictStatus.labels.value[s] || ({ active: '启用', inactive: '停用', blacklisted: '黑名单' } as any)[s] || s }
  function referralLabel(r: string) { return dictReferral.labels.value[r] || ({ xiaohongshu: '小红书', douyin: '抖音', referral: '朋友推荐', website: '官网', offline: '线下门店', other: '其他' } as any)[r] || r || '—' }
  function subscriptionLabel(s: string) { return dictSubscription.labels.value[s] || ({ none: '未订阅', active: '已订阅', expired: '已过期' } as any)[s] || s || '—' }
  function sourceTypeLabel(t: string) { return ({ manual_upload: '手动录入', ocr: 'OCR识别', api_optometry: 'API验光' } as any)[t] || t || '—' }
  function isExpired(date: string) { if (!date) return false; return new Date(date) < new Date() }
  function addrTypeLabel(t: string) { return ({ shipping: '收货', billing: '结算', office: '办公' } as any)[t] || t || '—' }
  function orderStatusTag(s: string) { return ({ pending: 'warning', paid: 'primary', shipped: 'primary', completed: 'success', cancelled: 'info' } as any)[s] || 'info' }
  function orderStatusLabel(s: string) { return ({ pending: '待处理', paid: '已支付', shipped: '已发货', completed: '已完成', cancelled: '已取消' } as any)[s] || s || '—' }
  function accountLabel(s: string) { return ({ active: '已激活', inactive: '未激活', suspended: '已冻结', deactivated: '已注销', none: '未注册' } as any)[s] || s || '—' }
  function statusType(s: string) { return ({ active: 'success', inactive: 'info', suspended: 'danger', deactivated: 'info', none: 'info' } as any)[s] || 'info' }
  function memberLabel(since: string | null, validUntil: string | null) {
    if (!since) return '非会员'; if (validUntil && new Date(validUntil) < new Date()) return '已过期'; return '会员'
  }
  function formatDateTime(dateStr: string) {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-')
  }
  function triggerTypeTag(t: string) { return ({ upgrade: 'success', downgrade: 'danger', manual: 'warning' } as any)[t] || 'info' }
  function triggerTypeLabel(t: string) { return ({ upgrade: '升级', downgrade: '降级', manual: '手动' } as any)[t] || t || '—' }
  function pointsTypeTag(t: string) { return ({ order_earn: 'success', order_burn: 'danger', manual: 'warning', expire: 'info' } as any)[t] || 'info' }
  function pointsTypeLabel(t: string) { return ({ order_earn: '消费获得', order_burn: '消费抵扣', manual: '手动调整', expire: '过期' } as any)[t] || t || '—' }

  // 字典强制刷新
  async function forceReload() { await Promise.all([dictType.forceReload(), dictLevel.forceReload()]) }

  return {
    dictType, dictLevel,
    dictTypeOptions, dictLevelOptions, dictStatusOptions, dictReferralOptions, dictSubscriptionOptions, dictContactRoleOptions,
    typeTag, typeLabel, levelTag, levelLabel, statusTag, statusLabel,
    referralLabel, subscriptionLabel, sourceTypeLabel, isExpired, addrTypeLabel,
    orderStatusTag, orderStatusLabel, accountLabel, statusType, memberLabel, formatDateTime,
    triggerTypeTag, triggerTypeLabel, pointsTypeTag, pointsTypeLabel,
    forceReload,
  }
}
