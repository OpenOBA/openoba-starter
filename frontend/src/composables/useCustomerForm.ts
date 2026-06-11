import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getCustomerList, createCustomer, updateCustomer, deleteCustomer,
} from '@/api/customer'
import type { FormInstance } from 'element-plus'

/**
 * 瀹㈡埛琛ㄥ崟 composable 鈥?鍒楄〃 / 鏂板 / 缂栬緫 / 鎵归噺鎿嶄綔
 */
export function useCustomerForm(forceReloadDict: () => Promise<void>) {
  const loading = ref(false)
  const saving = ref(false)
  const tableData = ref<any[]>([])
  const total = ref(0)
  const dialogVisible = ref(false)
  const isEdit = ref(false)
  const editId = ref('')
  const formRef = ref<FormInstance>()
  const selectedRows = ref<any[]>([])

  const query = reactive({ page: 1, pageSize: 20, keyword: '', customerType: '', customerLevel: '', status: '' })

  const form = reactive({
    customerType: 'retail', customerLevel: 'normal', companyName: '', contactName: '',
    phone: '', email: '', wechatId: '', nickname: '', address: '', city: '', province: '',
    status: 'active', notes: '', referralSource: '', preferredStyle: '', subscriptionStatus: '',
  })

  const rules = {
    customerType: [{ required: true, message: '璇烽€夋嫨瀹㈡埛绫诲瀷', trigger: 'change' }],
    contactName: [{ required: true, message: '璇疯緭鍏ヨ仈绯讳汉濮撳悕', trigger: 'blur' }],
    phone: [{ required: true, message: '璇疯緭鍏ヨ仈绯荤數璇?, trigger: 'blur' }],
  }

  function handleSelectionChange(rows: any[]) { selectedRows.value = rows }

  async function loadData() {
    loading.value = true
    try {
      const res = await getCustomerList(query)
      tableData.value = res.items; total.value = res.total
    } finally { loading.value = false }
  }

  function resetQuery() {
    Object.assign(query, { page: 1, pageSize: 20, keyword: '', customerType: '', customerLevel: '', status: '' })
    loadData()
  }

  async function openDialog(row?: any) {
    await forceReloadDict()
    isEdit.value = !!row
    editId.value = row?.customerId || ''
    if (row) { Object.assign(form, row) }
    else {
      Object.assign(form, {
        customerType: 'retail', customerLevel: 'normal', companyName: '', contactName: '',
        phone: '', email: '', wechatId: '', nickname: '', address: '', city: '', province: '',
        status: 'active', notes: '', referralSource: '', preferredStyle: '', subscriptionStatus: '',
      })
    }
    dialogVisible.value = true
  }

  async function handleSave() {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return
    saving.value = true
    try {
      const payload: any = { ...form, wechat: form.wechatId }
      if (isEdit.value) { await updateCustomer(editId.value, payload); ElMessage.success('鏇存柊鎴愬姛') }
      else { await createCustomer(payload); ElMessage.success('鍒涘缓鎴愬姛') }
      dialogVisible.value = false; loadData()
    } catch (e: unknown) { console.error('淇濆瓨澶辫触:', e) }
    finally { saving.value = false }
  }

  async function batchEdit() {
    if (selectedRows.value.length === 0) { ElMessage.warning('璇峰厛鍕鹃€夊鎴?); return }
    if (selectedRows.value.length > 1) { ElMessage.warning('鏆備粎鏀寔鍗曟潯缂栬緫锛岃鍙嬀閫変竴涓鎴?); return }
    openDialog(selectedRows.value[0])
  }

  async function batchDelete() {
    if (selectedRows.value.length === 0) { ElMessage.warning('璇峰厛鍕鹃€夊鎴?); return }
    for (const row of selectedRows.value) { await deleteCustomer(row.customerId) }
    ElMessage.success(`宸插垹闄?${selectedRows.value.length} 鏉)
    selectedRows.value = []; loadData()
  }

  return {
    loading, saving, tableData, total, dialogVisible, isEdit, formRef, selectedRows,
    query, form, rules,
    handleSelectionChange, loadData, resetQuery, openDialog, handleSave, batchEdit, batchDelete,
  }
}
