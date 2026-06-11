import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getCustomerList, getCustomerDetail, getContacts, getAddresses,
  getTierPricings, getPrescriptions, getCustomerLenses, getCustomerLensSummary,
  getMemberLevelLogs, getPointsTransactions, getCustomerOrders,
} from '@/api/customer'

/**
 * 瀹㈡埛璇︽儏 composable 鈥?璇︽儏鎶藉眽 + 鎵€鏈?Tab 閫昏緫
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

  // 浼氬憳鍗囩骇杩涘害
  const upgradeProgress = computed(() => {
    if (!detail.value) return 0
    const thresholds: Record<string, number> = { normal: 500, vip: 2000, svip: 5000, gold: 5000 }
    const currentLevel = detail.value.customerLevel || 'normal'
    const totalAmount = Number(detail.value.totalAmount || 0)
    const nextThreshold = thresholds[currentLevel] ?? 5000
    return Math.min(100, Math.round((totalAmount / nextThreshold) * 100))
  })

  const nextLevelInfo = computed(() => {
    if (!detail.value) return '鈥?
    const levels: Record<string, { next: string; threshold: number }> = {
      normal: { next: 'VIP', threshold: 500 },
      vip: { next: 'SVIP', threshold: 2000 },
      svip: { next: 'Gold', threshold: 5000 },
      gold: { next: '鏈€楂?, threshold: 5000 },
    }
    const info = levels[detail.value.customerLevel || 'normal']
    if (!info) return '鈥?
    if (info.next === '鏈€楂?) return '宸叉槸鏈€楂樼瓑绾?
    const remaining = Math.max(0, info.threshold - Number(detail.value.totalAmount || 0))
    return `楼${remaining.toFixed(0)} 杈?${info.next}`
  })

  async function openDetail(row: Record<string, unknown>) {
    detail.value = await getCustomerDetail(row.customerId)
    contacts.value = await getContacts(row.customerId)
    addresses.value = await getAddresses(row.customerId)
    try { tierPricings.value = await getTierPricings(row.customerId) } catch { tierPricings.value = [] }
    try { prescriptions.value = await getPrescriptions(row.customerId) } catch { prescriptions.value = [] }
    try { customerLenses.value = await getCustomerLenses(row.customerId) } catch { customerLenses.value = [] }
    try { lensSummary.value = await getCustomerLensSummary(row.customerId) } catch { lensSummary.value = null }
    try { memberLevelLogs.value = await getMemberLevelLogs(row.customerId) } catch { memberLevelLogs.value = [] }
    try { pointsTransactions.value = await getPointsTransactions(row.customerId) } catch { pointsTransactions.value = [] }
    loadCustomerOrders(1)
  }

  async function loadCustomerOrders(page: number) {
    ordersLoading.value = true
    try {
      const res: any = await getCustomerOrders(detail.value.customerId, { page, pageSize: 10 })
      customerOrders.value = res?.items || res?.data?.items || []
      orderTotal.value = res?.total || res?.data?.total || 0
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
