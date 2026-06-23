// useOrders.ts — data fetching + state management for Orders.vue
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getOrderList,
  getOrderDetail,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  createShipment,
  getOrderStats,
} from '@/api/order'
import { getCustomerList, getCustomerLensSummary } from '@/api/customer'
import { getStructureList } from '@/api/structure'
import { useDict } from '@/composables/useDict'

export interface OrderDetailData {
  orderId?: string
  orderNo?: string
  status?: string
  customerName?: string
  customerPhone?: string
  orderType?: string
  paymentMethod?: string
  totalAmount?: number
  discountAmount?: number
  shippingFee?: number
  actualAmount?: number
  createdAt?: string
  remark?: string
  address?: {
    receiverName: string
    receiverPhone: string
    province: string
    city: string
    district?: string
    addressDetail: string
  }
  structureStandardCode?: string
  items?: Array<Record<string, unknown>>
  payments?: Array<{ paymentNo: string; paymentMethod: string; amount: number; status: string; paidAt?: string }>
  shipments?: Array<{ carrier: string; trackingNo: string; status: string; shippedAt?: string }>
  logs?: Array<{
    logId: string
    createdAt: string
    action: string
    oldStatus?: string
    newStatus?: string
    remark?: string
  }>
}

interface OrderStats {
  total: number
  pending: number
  paid: number
  shipping: number
  completed: number
  cancelled: number
  todaySales: string
}

const ORDER_STATUS = {
  pending: 'pending',
  confirmed: 'confirmed',
  paid: 'paid',
  shipped: 'shipped',
  delivered: 'delivered',
  completed: 'completed',
  cancelled: 'cancelled',
} as const
const ORDER_TYPES = { retail: 'retail', wholesale: 'wholesale', set: 'set' } as const
const FULFILLMENT_TYPE = { frame_only: 'frame_only', lens_and_frame: 'lens_and_frame', lens_only: 'lens_only' } as const
const LENS_STATUS = {
  not_needed: 'not_needed',
  pending: 'pending',
  processing: 'processing',
  completed: 'completed',
  self_supplied: 'self_supplied',
} as const

export function useOrders() {
  // Dicts
  const orderStatusDict = useDict('dict_order_status')
  const paymentStatusDict = useDict('dict_payment_status')
  const customerTypeDict = useDict('dict_customer_type')

  const orderStatusItems = computed(() => orderStatusDict.items.value)
  const paymentStatusItems = computed(() => paymentStatusDict.items.value)
  const customerTypeItems = computed(() => customerTypeDict.items.value)

  // State
  const loading = ref(false)
  const tableData = ref<Record<string, unknown>[]>([])
  const total = ref(0)
  const selectedOrders = ref<Record<string, unknown>[]>([])
  const query = reactive({ keyword: '', status: '', paymentStatus: '', orderType: '', page: 1, pageSize: 20 })

  // Stats
  const stats = ref<OrderStats>({
    total: 0,
    pending: 0,
    paid: 0,
    shipping: 0,
    completed: 0,
    cancelled: 0,
    todaySales: '0',
  })

  function ensureStats(s: OrderStats | null | undefined): OrderStats {
    return {
      total: s?.total ?? 0,
      pending: s?.pending ?? 0,
      paid: s?.paid ?? 0,
      shipping: s?.shipping ?? 0,
      completed: s?.completed ?? 0,
      cancelled: s?.cancelled ?? 0,
      todaySales: s?.todaySales ?? '0',
    }
  }

  const statCards = computed(() => {
    const s = ensureStats(stats.value)
    return [
      { label: '总订单', value: s.total },
      { label: '待处理', value: s.pending },
      { label: '已支付', value: s.paid },
      { label: '发货中', value: s.shipping },
      { label: '已完成', value: s.completed },
      { label: '今日销售', value: `¥${(parseFloat(s.todaySales) || 0).toFixed(0)}` },
    ]
  })

  const canConfirmSelected = computed(
    () => selectedOrders.value.length > 0 && selectedOrders.value.every((r) => r.status === ORDER_STATUS.pending),
  )
  const canShipStatuses: string[] = [ORDER_STATUS.paid, ORDER_STATUS.confirmed]
  const canCancelExcludes: string[] = [ORDER_STATUS.completed, ORDER_STATUS.cancelled]
  const canShipSelected = computed(
    () =>
      selectedOrders.value.length > 0 &&
      selectedOrders.value.every((r) => canShipStatuses.includes(r.status as string)),
  )
  const canCancelSelected = computed(
    () =>
      selectedOrders.value.length > 0 &&
      selectedOrders.value.every((r) => !canCancelExcludes.includes(r.status as string)),
  )

  function onSelectionChange(rows: Record<string, unknown>[]) {
    selectedOrders.value = rows
  }

  async function batchConfirm() {
    for (const row of selectedOrders.value) {
      await confirmOrder(row)
    }
    selectedOrders.value = []
    loadData()
  }
  async function batchShip() {
    if (selectedOrders.value.length > 1) {
      return ElMessage.warning('发货请逐个操作，一次只发一个订单')
    }
    openShipDialog(selectedOrders.value[0])
    selectedOrders.value = []
  }
  async function batchCancel() {
    for (const row of selectedOrders.value) {
      await cancelOrder(String(row.orderId ?? ''), { remark: '批量取消' })
    }
    ElMessage.success('所选订单已取消')
    selectedOrders.value = []
    loadData()
  }

  // Detail
  const detailVisible = ref(false)
  const currentOrder = ref<OrderDetailData | null>(null)

  async function viewDetail(row: Record<string, unknown>) {
    const res = await getOrderDetail(String(row.orderId ?? ''))
    currentOrder.value = res as unknown as OrderDetailData
    detailVisible.value = true
  }

  // Create
  const createVisible = ref(false)
  const submitting = ref(false)
  interface OrderItem {
    productType: string
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    structureStandardCode: string
    orderFulfillmentType: string
    lensStatus: string
  }
  interface CreateOrderForm {
    customerId: string
    customerName: string
    customerPhone: string
    orderType: string
    structureStandardCode: string
    items: OrderItem[]
    shippingFee: number
    discountAmount: number
    remark: string
  }
  const customerOptions = ref<Record<string, unknown>[]>([])
  const createForm = reactive<CreateOrderForm>({
    customerId: '',
    customerName: '',
    customerPhone: '',
    orderType: 'retail',
    structureStandardCode: '',
    items: [],
    shippingFee: 0,
    discountAmount: 0,
    remark: '',
  })
  const lensOptions = ref<Record<string, unknown>[]>([])
  const historyLensNotice = ref('')

  function openCreateDialog() {
    createForm.customerId = ''
    createForm.customerName = ''
    createForm.customerPhone = ''
    createForm.orderType = ORDER_TYPES.retail
    createForm.structureStandardCode = ''
    createForm.shippingFee = 0
    createForm.discountAmount = 0
    createForm.remark = ''
    createForm.items = [
      {
        productType: 'sku',
        productId: '',
        productName: '',
        quantity: 1,
        unitPrice: 0,
        structureStandardCode: '',
        orderFulfillmentType: FULFILLMENT_TYPE.frame_only,
        lensStatus: LENS_STATUS.not_needed,
      },
    ]
    historyLensNotice.value = ''
    createVisible.value = true
  }

  function addOrderItem() {
    createForm.items.push({
      productType: 'sku',
      productId: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      structureStandardCode: createForm.structureStandardCode || '',
      orderFulfillmentType: FULFILLMENT_TYPE.frame_only,
      lensStatus: LENS_STATUS.not_needed,
    })
  }

  function onFulfillmentTypeChange(row: Record<string, unknown>) {
    if (row.orderFulfillmentType === FULFILLMENT_TYPE.frame_only) {
      row.lensStatus = LENS_STATUS.not_needed
    } else if (row.orderFulfillmentType === FULFILLMENT_TYPE.lens_and_frame) {
      row.lensStatus = LENS_STATUS.pending
    } else {
      row.lensStatus = LENS_STATUS.not_needed
    }
  }

  async function onCustomerSelect(id: string) {
    const c = customerOptions.value.find((x) => x.customerId === id)
    if (c) {
      createForm.customerName = c.contactName as string
      createForm.customerPhone = c.phone as string
    }
    historyLensNotice.value = ''
    createForm.structureStandardCode = ''
    try {
      const res = await getCustomerLensSummary(id)
      if (res?.lenses?.length > 0) {
        interface LensRecord {
          status: string
          lensStandardCode: string
          prescription?: Record<string, string>
          externalCode?: string
        }
        const lenses = (res.lenses as unknown as LensRecord[]) ?? []
        const activeLens = lenses.find((l) => l.status === 'active') || lenses[0]
        const code: string = activeLens.lensStandardCode
        const rx = activeLens.prescription
        const rxInfo = rx ? `球镜: OD${rx.odSphere}/OS${rx.osSphere}` : ''
        historyLensNotice.value = `🔬 该客户历史镜片：${code}${rxInfo ? ' | ' + rxInfo : ''}`
        const matched = lensOptions.value.find((l) => l.externalCode === code)
        if (matched) createForm.structureStandardCode = matched.structureId as string
      }
    } catch {
      /* ignore */
    }
  }

  function calcActual() {
    const itemsTotal = createForm.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    return `¥${(itemsTotal - createForm.discountAmount + createForm.shippingFee).toFixed(2)}`
  }

  async function submitCreate() {
    if (!createForm.customerId) return ElMessage.warning('请选择客户')
    if (!createForm.structureStandardCode) return ElMessage.warning('请选择结构标准（结构锚点原则：每笔订单必须携带）')
    if (!createForm.items.length) return ElMessage.warning('请添加商品')
    for (const item of createForm.items) {
      if (!item.structureStandardCode) item.structureStandardCode = createForm.structureStandardCode
    }
    submitting.value = true
    try {
      await createOrder({ ...createForm })
      ElMessage.success('订单创建成功')
      createVisible.value = false
      loadData()
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e)
      ElMessage.error(err || '创建失败')
    } finally {
      submitting.value = false
    }
  }

  // Status ops
  async function confirmOrder(row: Record<string, unknown>) {
    await updateOrderStatus(String(row.orderId ?? ''), { status: ORDER_STATUS.confirmed, remark: '确认订单' })
    ElMessage.success('订单已确认')
    loadData()
  }

  // Ship
  const shipVisible = ref(false)
  const shipOrder = ref<Record<string, unknown> | null>(null)
  const shipForm = reactive({ carrier: 'sf', trackingNo: '' })

  function openShipDialog(row: Record<string, unknown>) {
    shipOrder.value = row
    Object.assign(shipForm, { carrier: 'sf', trackingNo: '' })
    shipVisible.value = true
  }

  async function submitShip() {
    if (!shipForm.trackingNo) return ElMessage.warning('请输入运单号')
    submitting.value = true
    try {
      await createShipment({ orderId: shipOrder.value?.orderId as string, ...shipForm })
      ElMessage.success('发货成功')
      shipVisible.value = false
      loadData()
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e)
      ElMessage.error(err || '发货失败')
    } finally {
      submitting.value = false
    }
  }

  // Data loading
  async function loadData() {
    loading.value = true
    try {
      const res = await getOrderList(query)
      tableData.value = (res?.items as unknown as Record<string, unknown>[]) || []
      total.value = Number(res?.total) || 0
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e)
      ElMessage.error(err || '加载订单失败')
      tableData.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  async function loadStats() {
    try {
      const res = await getOrderStats()
      stats.value = ensureStats(res as OrderStats | null)
    } catch (e: unknown) {
      const _err = e instanceof Error ? e.message : String(e)
      console.error('loadStats error:', _err)
    }
  }

  async function loadCustomers() {
    try {
      const res = await getCustomerList({ page: 1, pageSize: 200 })
      customerOptions.value = (res?.items as unknown as Record<string, unknown>[]) || []
    } catch {
      /* ignore */
    }
  }

  async function loadLensOptions() {
    try {
      const res = await getStructureList({ page: 1, pageSize: 200, status: 'active' })
      lensOptions.value = (res?.items as unknown as Record<string, unknown>[]) || []
    } catch {
      /* ignore */
    }
  }

  function resetQuery() {
    Object.assign(query, { keyword: '', status: '', paymentStatus: '', orderType: '', page: 1 })
    loadData()
  }

  // Tool functions
  function statusTag(s: string) {
    if (orderStatusDict.labels.value[s]) {
      const m: Record<string, string> = {
        pending: 'info',
        confirmed: 'primary',
        paid: 'success',
        shipped: 'warning',
        completed: '',
        cancelled: 'danger',
      }
      return m[s] || ''
    }
    const m: Record<string, string> = {
      pending: 'info',
      confirmed: 'primary',
      paid: 'success',
      shipped: 'warning',
      completed: '',
      cancelled: 'danger',
    }
    return m[s] || ''
  }

  function statusLabel(s: string) {
    return (
      orderStatusDict.labels.value[s] ||
      {
        pending: '待处理',
        confirmed: '已确认',
        paid: '已支付',
        shipped: '已发货',
        completed: '已完成',
        cancelled: '已取消',
      }[s] ||
      s
    )
  }

  function orderTypeLabel(t: string) {
    return customerTypeDict.labels.value[t] || { retail: '零售', wholesale: '批发', partner: '合作' }[t] || t
  }

  function payLabel(s: string) {
    return paymentStatusDict.labels.value[s] || { unpaid: '未支付', paid: '已支付', partial: '部分支付' }[s] || s
  }

  function fulfillmentTag(t: string) {
    const m: Record<string, string> = { frame_only: '', lens_and_frame: 'warning', lens_only: 'info' }
    return m[t] || ''
  }

  function fulfillmentLabel(t: string) {
    const m: Record<string, string> = { frame_only: '裸框', lens_and_frame: '眼镜', lens_only: '单镜片' }
    return m[t] || t
  }

  function lensStatusTag(s: string) {
    const m: Record<string, string> = {
      not_needed: 'info',
      pending: 'warning',
      processing: '',
      completed: 'success',
      self_supplied: 'info',
    }
    return m[s] || ''
  }

  function lensStatusLabel(s: string) {
    const m: Record<string, string> = {
      not_needed: '不需要',
      pending: '待处方',
      processing: '加工中',
      completed: '已完成',
      self_supplied: '客户自配',
    }
    return m[s] || s
  }

  function formatDate(d: string) {
    if (!d) return '-'
    return new Date(d).toLocaleString('zh-CN', { hour12: false })
  }

  // Init
  const init = () => {
    loadData()
    loadStats()
    loadCustomers()
    loadLensOptions()
  }

  return {
    // Dicts
    orderStatusItems,
    paymentStatusItems,
    customerTypeItems,
    // State
    loading,
    tableData,
    total,
    query,
    selectedOrders,
    statCards,
    canConfirmSelected,
    canShipSelected,
    canCancelSelected,
    onSelectionChange,
    batchConfirm,
    batchShip,
    batchCancel,
    // Detail
    detailVisible,
    currentOrder,
    viewDetail,
    // Create
    createVisible,
    submitting,
    customerOptions,
    createForm,
    lensOptions,
    historyLensNotice,
    openCreateDialog,
    addOrderItem,
    onFulfillmentTypeChange,
    onCustomerSelect,
    calcActual,
    submitCreate,
    // Status/Ship
    confirmOrder,
    shipVisible,
    shipOrder,
    shipForm,
    openShipDialog,
    submitShip,
    // Data
    loadData,
    loadStats,
    loadCustomers,
    loadLensOptions,
    resetQuery,
    // Labels
    statusTag,
    statusLabel,
    orderTypeLabel,
    payLabel,
    fulfillmentTag,
    fulfillmentLabel,
    lensStatusTag,
    lensStatusLabel,
    formatDate,
    // Init
    init,
  }
}
