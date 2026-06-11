import { computed, watch } from 'vue'
import { useDict } from '@/composables/useDict'
import { ElMessage } from 'element-plus'

// 瀛楀吀鍒濆鍖?const dictType = useDict('dict_customer_type')
const dictLevel = useDict('dict_customer_level')
const dictStatus = useDict('dict_customer_status')
const dictReferral = useDict('dict_referral_source')
const dictSubscription = useDict('dict_subscription_status')
const dictContactRole = useDict('dict_contact_role')

export function useCustomerUtils() {
  // 鏋勫缓 options 鏍煎紡鏁扮粍
  const dictTypeOptions = computed(() => dictType.items.value.map(d => ({ label: d.name, value: d.code })))
  const dictLevelOptions = computed(() => dictLevel.items.value.map(d => ({ label: d.name, value: d.code })))
  const dictStatusOptions = computed(() => dictStatus.items.value.map(d => ({ label: d.name, value: d.code })))
  const dictReferralOptions = computed(() => dictReferral.items.value.map(d => ({ label: d.name, value: d.code })))
  const dictSubscriptionOptions = computed(() => dictSubscription.items.value.map(d => ({ label: d.name, value: d.code })))
  const dictContactRoleOptions = computed(() => dictContactRole.items.value.map(d => ({ label: d.name, value: d.code })))

  // fallback 鏄犲皠
  const CUSTOMER_TYPE_FALLBACK: Record<string, string> = { retail: '闆跺敭', business: '鎵瑰彂', partner: '鍚堜綔浼欎即', '': '鈥? }
  const CUSTOMER_LEVEL_FALLBACK: Record<string, string> = { normal: '鏅€?, vip: 'VIP', svip: 'SVIP', '': '鈥? }

  // 瀛楀吀鍔犺浇閿欒鐩戞帶
  watch(() => dictType.error.value, (error) => {
    if (error) { console.error('[Customers] dict_customer_type 鍔犺浇閿欒:', error); ElMessage.warning('瀹㈡埛绫诲瀷瀛楀吀鍔犺浇澶辫触') }
  }, { immediate: true })
  watch(() => dictLevel.error.value, (error) => {
    if (error) { console.error('[Customers] dict_customer_level 鍔犺浇閿欒:', error); ElMessage.warning('瀹㈡埛绛夌骇瀛楀吀鍔犺浇澶辫触') }
  }, { immediate: true })

  // 宸ュ叿鍑芥暟
  function typeTag(t: string) { return ({ retail: 'primary', business: 'warning', partner: 'success' } as any)[t] || 'info' }
  function typeLabel(t: string) { return dictType.labels.value[t] || CUSTOMER_TYPE_FALLBACK[t] || t }
  function levelTag(l: string) { return ({ normal: 'info', vip: 'primary', svip: 'danger' } as any)[l] || 'info' }
  function levelLabel(l: string) { return dictLevel.labels.value[l] || CUSTOMER_LEVEL_FALLBACK[l] || l }
  function statusTag(s: string) {
    const item = dictStatus.items.value.find(d => d.code === s) as any
    return item?.color || ({ active: 'success', inactive: 'info', blacklisted: 'danger' } as any)[s] || 'info'
  }
  function statusLabel(s: string) { return dictStatus.labels.value[s] || ({ active: '鍚敤', inactive: '鍋滅敤', blacklisted: '榛戝悕鍗? } as any)[s] || s }
  function referralLabel(r: string) { return dictReferral.labels.value[r] || ({ xiaohongshu: '灏忕孩涔?, douyin: '鎶栭煶', referral: '鏈嬪弸鎺ㄨ崘', website: '瀹樼綉', offline: '绾夸笅闂ㄥ簵', other: '鍏朵粬' } as any)[r] || r || '鈥? }
  function subscriptionLabel(s: string) { return dictSubscription.labels.value[s] || ({ none: '鏈闃?, active: '宸茶闃?, expired: '宸茶繃鏈? } as any)[s] || s || '鈥? }
  function sourceTypeLabel(t: string) { return ({ manual_upload: '鎵嬪姩褰曞叆', ocr: 'OCR璇嗗埆', api_optometry: 'API楠屽厜' } as any)[t] || t || '鈥? }
  function isExpired(date: string) { if (!date) return false; return new Date(date) < new Date() }
  function addrTypeLabel(t: string) { return ({ shipping: '鏀惰揣', billing: '缁撶畻', office: '鍔炲叕' } as any)[t] || t || '鈥? }
  function orderStatusTag(s: string) { return ({ pending: 'warning', paid: 'primary', shipped: 'primary', completed: 'success', cancelled: 'info' } as any)[s] || 'info' }
  function orderStatusLabel(s: string) { return ({ pending: '寰呭鐞?, paid: '宸叉敮浠?, shipped: '宸插彂璐?, completed: '宸插畬鎴?, cancelled: '宸插彇娑? } as any)[s] || s || '鈥? }
  function accountLabel(s: string) { return ({ active: '宸叉縺娲?, inactive: '鏈縺娲?, suspended: '宸插喕缁?, deactivated: '宸叉敞閿€', none: '鏈敞鍐? } as any)[s] || s || '鈥? }
  function statusType(s: string) { return ({ active: 'success', inactive: 'info', suspended: 'danger', deactivated: 'info', none: 'info' } as any)[s] || 'info' }
  function memberLabel(since: string | null, validUntil: string | null) {
    if (!since) return '闈炰細鍛?; if (validUntil && new Date(validUntil) < new Date()) return '宸茶繃鏈?; return '浼氬憳'
  }
  function formatDateTime(dateStr: string) {
    if (!dateStr) return '鈥?
    const d = new Date(dateStr)
    return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-')
  }
  function triggerTypeTag(t: string) { return ({ upgrade: 'success', downgrade: 'danger', manual: 'warning' } as any)[t] || 'info' }
  function triggerTypeLabel(t: string) { return ({ upgrade: '鍗囩骇', downgrade: '闄嶇骇', manual: '鎵嬪姩' } as any)[t] || t || '鈥? }
  function pointsTypeTag(t: string) { return ({ order_earn: 'success', order_burn: 'danger', manual: 'warning', expire: 'info' } as any)[t] || 'info' }
  function pointsTypeLabel(t: string) { return ({ order_earn: '娑堣垂鑾峰緱', order_burn: '娑堣垂鎶垫墸', manual: '鎵嬪姩璋冩暣', expire: '杩囨湡' } as any)[t] || t || '鈥? }

  // 瀛楀吀寮哄埗鍒锋柊
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
