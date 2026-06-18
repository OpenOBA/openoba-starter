import { ref, computed } from 'vue'
import {
  getCustomerDetail, getContacts, getAddresses,
  getTierPricings, getPrescriptions, getCustomerLenses, getCustomerLensSummary,
  getMemberLevelLogs, getPointsTransactions, getCustomerOrders,
} from '@/api/customer'

/**
 * 客户详情 composable — 详情抽屉 + 所有 Tab 逻辑
 */
export function useCustomerDetail() {
  const detail = ref<any>(null)
  const contacts = ref<any[]>([])
  const addresses = ref<any[]>([])
  const tierPricings = ref<any[]>([])
  const prescriptions = ref<any[]>([])
  const customerLenses = ref<any[]>([])
  const lensSummary = ref<any>(null)
  const customerOrders = ref<any[]>([])
  const orderTotal = ref(0)
  const orderPage = ref(1)
  const ordersLoading = ref(false)
  const memberLevelLogs = ref<any[]>([])
  const pointsTransactions = ref<any[]>([])
  const activeTab = ref('basic')

  // 会员升级进度
  const upgradeProgress = computed(() => {
    if (!detail.value) return 0
    const thresholds: Record<string, number> = { normal: 500, vip: 2000, svip: 5000, gold: 5000 }
    const currentLevel = detail.value.customerLevel || 'normal'
    const totalAmount = Number(detail.value.totalAmount || 0)
    const nextThreshold = thresholds[currentLevel] ?? 5000
    return Math.min(100, Math.round((totalAmount / nextThreshold) * 100))
  })

  const nextLevelInfo = computed(() => {
    if (!detail.value) return '—'
    const levels: Record<string, { next: string; threshold: number }> = {
      normal: { next: 'VIP', threshold: 500 },
      vip: { next: 'SVIP', threshold: 2000 },
      svip: { next: 'Gold', threshold: 5000 },
      gold: { next: '最高', threshold: 5000 },
    }
    const info = levels[detail.value.customerLevel || 'normal']
    if (!info) return '—'
    if (info.next === '最高') return '已是最高等级'
    const remaining = Math.max(0, info.threshold - Number(detail.value.totalAmount || 0))
    return `¥${remaining.toFixed(0)} 达 ${info.next}`
  })

  async function openDetail(row: Record<string, unknown>) {
    const cid = String(row.customerId ?? '')
    detail.value = await getCustomerDetail(cid)
    contacts.value = await getContacts(cid)
    addresses.value = await getAddresses(cid)
    try { tierPricings.value = await getTierPricings(cid) } catch { tierPricings.value = [] }
    try { prescriptions.value = await getPrescriptions(cid) } catch { prescriptions.value = [] }
    try { customerLenses.value = await getCustomerLenses(cid) } catch { customerLenses.value = [] }
    try { lensSummary.value = await getCustomerLensSummary(cid) } catch { lensSummary.value = null }
    try { memberLevelLogs.value = await getMemberLevelLogs(cid) } catch { memberLevelLogs.value = [] }
    try { pointsTransactions.value = await getPointsTransactions(cid) } catch { pointsTransactions.value = [] }
    loadCustomerOrders(1)
  }

  async function loadCustomerOrders(page: number) {
    ordersLoading.value = true
    try {
      const res = await getCustomerOrders(detail.value.customerId, page, 10)
      customerOrders.value = (res as Record<string, unknown>).items as Record<string, unknown>[] || []
      orderTotal.value = Number((res as Record<string, unknown>).total ?? 0)
      orderPage.value = page
    } catch { customerOrders.value = [] }
    finally { ordersLoading.value = false }
  }

  return {
    detail, contacts, addresses, tierPricings, prescriptions, customerLenses, lensSummary,
    customerOrders, orderTotal, orderPage, ordersLoading,
    memberLevelLogs, pointsTransactions, activeTab,
    upgradeProgress, nextLevelInfo,
    openDetail, loadCustomerOrders,
  }
}
