import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getCustomerList, createCustomer, updateCustomer, deleteCustomer,
} from '@/api/customer'
import type { FormInstance } from 'element-plus'

/**
 * 客户表单 composable — 列表 / 新增 / 编辑 / 批量操作
 */
export function useCustomerForm(forceReloadDict: () => Promise<void>) {
  const loading = ref(false)
  const saving = ref(false)
  const tableData = ref<Record<string, unknown>[]>([])
  const total = ref(0)
  const dialogVisible = ref(false)
  const isEdit = ref(false)
  const editId = ref('')
  const formRef = ref<FormInstance>()
  const selectedRows = ref<Record<string, unknown>[]>([])

  const query = reactive({ page: 1, pageSize: 20, keyword: '', customerType: '', customerLevel: '', status: '' })

  const form = reactive({
    customerType: 'retail', customerLevel: 'normal', companyName: '', contactName: '',
    phone: '', email: '', wechatId: '', nickname: '', address: '', city: '', province: '',
    status: 'active', notes: '', referralSource: '', preferredStyle: '', subscriptionStatus: '',
  })

  const rules = {
    customerType: [{ required: true, message: '请选择客户类型', trigger: 'change' }],
    contactName: [{ required: true, message: '请输入联系人姓名', trigger: 'blur' }],
    phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  }

  function handleSelectionChange(rows: Record<string, unknown>[]) { selectedRows.value = rows }

  async function loadData() {
    loading.value = true
    try {
      const res = await getCustomerList(query)
      tableData.value = (res.items as unknown as Record<string, unknown>[]) || []; total.value = res.total as number
    } finally { loading.value = false }
  }

  function resetQuery() {
    Object.assign(query, { page: 1, pageSize: 20, keyword: '', customerType: '', customerLevel: '', status: '' })
    loadData()
  }

  async function openDialog(row?: Record<string, unknown>) {
    await forceReloadDict()
    isEdit.value = !!row
    editId.value = (row?.customerId as string) || ''
    if (row) { Object.assign(form, row as unknown as Record<string, unknown>) }
    else {
      Object.assign(form, {
        customerType: 'retail', customerLevel: 'normal', companyName: '', contactName: '',
        phone: '', email: '', wechatId: '', nickname: '', address: '', city: '', province: '',
        status: 'active', notes: '', referralSource: '', preferredStyle: '', subscriptionStatus: '',
      } as Record<string, unknown>)
    }
    dialogVisible.value = true
  }

  async function handleSave() {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return
    saving.value = true
    try {
      const payload: Record<string, unknown> = { ...form, wechat: form.wechatId }
      if (isEdit.value) { await updateCustomer(editId.value, payload); ElMessage.success('更新成功') }
      else { await createCustomer(payload); ElMessage.success('创建成功') }
      dialogVisible.value = false; loadData()
    } catch (e: unknown) { console.error('保存失败:', e) }
    finally { saving.value = false }
  }

  async function batchEdit() {
    if (selectedRows.value.length === 0) { ElMessage.warning('请先勾选客户'); return }
    if (selectedRows.value.length > 1) { ElMessage.warning('暂仅支持单条编辑，请只勾选一个客户'); return }
    openDialog(selectedRows.value[0])
  }

  async function batchDelete() {
    if (selectedRows.value.length === 0) { ElMessage.warning('请先勾选客户'); return }
    for (const row of selectedRows.value) { await deleteCustomer(row.customerId as string) }
    ElMessage.success(`已删除 ${selectedRows.value.length} 条`)
    selectedRows.value = []; loadData()
  }

  return {
    loading, saving, tableData, total, dialogVisible, isEdit, formRef, selectedRows,
    query, form, rules,
    handleSelectionChange, loadData, resetQuery, openDialog, handleSave, batchEdit, batchDelete,
  }
}
