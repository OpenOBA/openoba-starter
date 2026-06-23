import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { createOrder } from '@/api/order'
import { getCustomerLensSummary } from '@/api/customer'

const FULFILLMENT_TYPE = { frame_only: 'frame_only', lens_and_frame: 'lens_and_frame', lens_only: 'lens_only' } as const
const LENS_STATUS = {
  not_needed: 'not_needed',
  pending: 'pending',
  processing: 'processing',
  completed: 'completed',
  self_supplied: 'self_supplied',
} as const

export function useOrderCreate() {
  const createVisible = ref(false)
  const submitting = ref(false)
  const customerOptions = ref<Record<string, unknown>[]>([])
  const lensOptions = ref<Record<string, unknown>[]>([])
  const historyLensNotice = ref('')
  const createForm = reactive({
    customerId: '',
    customerName: '',
    customerPhone: '',
    orderType: 'retail',
    structureStandardCode: '',
    items: [] as Record<string, unknown>[],
    shippingFee: 0,
    discountAmount: 0,
    remark: '',
  })

  function openCreateDialog() {
    Object.assign(createForm, {
      customerId: '',
      customerName: '',
      customerPhone: '',
      orderType: 'retail',
      structureStandardCode: '',
      items: [
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
      ],
      shippingFee: 0,
      discountAmount: 0,
      remark: '',
    })
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
        const lenses = (res.lenses as unknown as Record<string, unknown>[]) ?? []
        const activeLens = lenses.find((l) => l.status === 'active') || lenses[0]
        const code = activeLens?.lensStandardCode as string
        const rx = activeLens?.prescription as Record<string, string> | undefined
        const rxInfo = rx ? `球镜: OD${rx.odSphere}/OS${rx.osSphere}` : ''
        historyLensNotice.value = `🔩 该客户历史镜片：${code}${rxInfo ? ' | ' + rxInfo : ''}`
        const matched = lensOptions.value.find((l) => l.externalCode === code)
        if (matched) createForm.structureStandardCode = matched.structureId as string
      }
    } catch {
      /* ignore */
    }
  }

  function calcActual(): string {
    const itemsTotal = createForm.items.reduce((s, i) => s + (i.quantity as number) * (i.unitPrice as number), 0)
    return `¥${(itemsTotal - createForm.discountAmount + createForm.shippingFee).toFixed(2)}`
  }

  async function submitCreate(onSuccess: () => void) {
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
      onSuccess()
    } catch (e: unknown) {
      ElMessage.error((e as Error).message || '创建失败')
    } finally {
      submitting.value = false
    }
  }

  return {
    createVisible,
    submitting,
    customerOptions,
    lensOptions,
    historyLensNotice,
    createForm,
    openCreateDialog,
    addOrderItem,
    onFulfillmentTypeChange,
    onCustomerSelect,
    calcActual,
    submitCreate,
  }
}
