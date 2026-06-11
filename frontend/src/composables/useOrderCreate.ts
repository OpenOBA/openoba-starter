import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { createOrder } from '@/api/order'
import { getCustomerLensSummary } from '@/api/customer'

const FULFILLMENT_TYPE = { frame_only: 'frame_only', lens_and_frame: 'lens_and_frame', lens_only: 'lens_only' } as const
const LENS_STATUS = { not_needed: 'not_needed', pending: 'pending', processing: 'processing', completed: 'completed', self_supplied: 'self_supplied' } as const

export function useOrderCreate() {
  const createVisible = ref(false)
  const submitting = ref(false)
  const customerOptions = ref<any[]>([])
  const lensOptions = ref<any[]>([])
  const historyLensNotice = ref('')
  const createForm = reactive({
    customerId: '',
    customerName: '',
    customerPhone: '',
    orderType: 'retail',
    structureStandardCode: '',
    items: [] as any[],
    shippingFee: 0,
    discountAmount: 0,
    remark: '',
  })

  function openCreateDialog() {
    Object.assign(createForm, {
      customerId: '', customerName: '', customerPhone: '',
      orderType: 'retail', structureStandardCode: '',
      items: [{ productType: 'sku', productId: '', productName: '', quantity: 1, unitPrice: 0, structureStandardCode: '', orderFulfillmentType: FULFILLMENT_TYPE.frame_only, lensStatus: LENS_STATUS.not_needed }],
      shippingFee: 0, discountAmount: 0, remark: '',
    })
    historyLensNotice.value = ''
    createVisible.value = true
  }

  function addOrderItem() {
    createForm.items.push({
      productType: 'sku', productId: '', productName: '', quantity: 1, unitPrice: 0,
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
      createForm.customerName = c.contactName
      createForm.customerPhone = c.phone
    }
    historyLensNotice.value = ''
    createForm.structureStandardCode = ''
    try {
      const res = await getCustomerLensSummary(id)
      if (res?.lenses?.length > 0) {
        const activeLens = res.lenses.find((l: any) => l.status === 'active') || res.lenses[0]
        const code = activeLens.lensStandardCode
        const rxInfo = activeLens.prescription ? `鐞冮暅: OD${activeLens.prescription.odSphere}/OS${activeLens.prescription.osSphere}` : ''
        historyLensNotice.value = `馃敩 璇ュ鎴峰巻鍙查暅鐗囷細${code}${rxInfo ? ' | ' + rxInfo : ''}`
        const matched = lensOptions.value.find((l) => l.externalCode === code)
        if (matched) createForm.structureStandardCode = matched.structureId
      }
    } catch { /* ignore */ }
  }

  function calcActual(): string {
    const itemsTotal = createForm.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    return `楼${(itemsTotal - createForm.discountAmount + createForm.shippingFee).toFixed(2)}`
  }

  async function submitCreate(onSuccess: () => void) {
    if (!createForm.customerId) return ElMessage.warning('璇烽€夋嫨瀹㈡埛')
    if (!createForm.structureStandardCode) return ElMessage.warning('璇烽€夋嫨缁撴瀯鏍囧噯锛堢粨鏋勯敋鐐瑰師鍒欙細姣忕瑪璁㈠崟蹇呴』鎼哄甫锛?)
    if (!createForm.items.length) return ElMessage.warning('璇锋坊鍔犲晢鍝?)
    for (const item of createForm.items) {
      if (!item.structureStandardCode) item.structureStandardCode = createForm.structureStandardCode
    }
    submitting.value = true
    try {
      await createOrder({ ...createForm })
      ElMessage.success('璁㈠崟鍒涘缓鎴愬姛')
      createVisible.value = false
      onSuccess()
    } catch (e: unknown) {
      ElMessage.error((e as any).message || '鍒涘缓澶辫触')
    } finally {
      submitting.value = false
    }
  }

  return {
    createVisible, submitting, customerOptions, lensOptions, historyLensNotice, createForm,
    openCreateDialog, addOrderItem, onFulfillmentTypeChange, onCustomerSelect, calcActual, submitCreate,
  }
}
