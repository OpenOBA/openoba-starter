/**
 * useCustomers.ts — 客户列表管理
 *
 * 客户列表 CRUD、筛选、Dialog 管理
 */
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance } from 'element-plus';
import {
  getCustomerList, createCustomer, updateCustomer, deleteCustomer,
} from '@/api/customer';
import type { Customer } from '@/types';

export function useCustomers() {
  const loading = ref(false);
  const saving = ref(false);
  const tableData = ref<Customer[]>([]);
  const total = ref(0);
  const dialogVisible = ref(false);
  const isEdit = ref(false);
  const editId = ref('');
  const formRef = ref<FormInstance>();
  const detail = ref<Customer | null>(null);

  const query = reactive({
    page: 1, pageSize: 20, keyword: '', customerType: '', customerLevel: '', status: '',
  });

  const form = reactive({
    customerType: 'retail', customerLevel: 'normal', companyName: '', contactName: '',
    phone: '', email: '', wechatId: '', nickname: '', address: '', city: '', province: '',
    status: 'active', notes: '', referralSource: '', preferredStyle: '', subscriptionStatus: '',
  });

  const rules = {
    customerType: [{ required: true, message: '请选择客户类型', trigger: 'change' }],
    contactName: [{ required: true, message: '请输入联系人姓名', trigger: 'blur' }],
    phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  };

  // 可选的字典刷新函数（由父组件传入）
  let dictReload: (() => Promise<void[]>) | null = null;

  function setDictReload(fn: () => Promise<void[]>) {
    dictReload = fn;
  }

  const resetQuery = () => {
    query.keyword = '';
    query.customerType = '';
    query.customerLevel = '';
    query.status = '';
    query.page = 1;
    loadData();
  };

  async function loadData() {
    loading.value = true;
    try {
      const res = await getCustomerList(query);
      if (res && Array.isArray(res.items)) {
        tableData.value = res.items;
        total.value = res.total ?? res.items.length;
      } else if (Array.isArray(res)) {
        tableData.value = res;
        total.value = res.length;
      } else {
        tableData.value = [];
        total.value = 0;
      }
    } catch (e: unknown) {
      ElMessage.error(e.message || '加载失败');
    } finally {
      loading.value = false;
    }
  }

  async function openDialog(row?: Record<string, unknown>) {
    // 强制刷新字典缓存
    if (dictReload) {
      await dictReload();
    }
    isEdit.value = !!row;
    if (row) {
      editId.value = row.customerId || '';
      form.customerType = row.customerType || 'retail';
      form.customerLevel = row.customerLevel || 'normal';
      form.companyName = row.companyName || '';
      form.contactName = row.contactName || '';
      form.phone = row.phone || '';
      form.email = row.email || '';
      form.wechatId = row.wechatId || '';
      form.nickname = row.nickname || '';
      form.address = row.address || '';
      form.city = row.city || '';
      form.province = row.province || '';
      form.status = row.status || 'active';
      form.notes = row.notes || '';
      form.referralSource = row.referralSource || '';
      form.preferredStyle = row.preferredStyle || '';
      form.subscriptionStatus = row.subscriptionStatus || '';
    } else {
      editId.value = '';
      form.customerType = 'retail';
      form.customerLevel = 'normal';
      form.companyName = '';
      form.contactName = '';
      form.phone = '';
      form.email = '';
      form.wechatId = '';
      form.nickname = '';
      form.address = '';
      form.city = '';
      form.province = '';
      form.status = 'active';
      form.notes = '';
      form.referralSource = '';
      form.preferredStyle = '';
      form.subscriptionStatus = '';
    }
    dialogVisible.value = true;
  }

  async function handleSave() {
    saving.value = true;
    try {
      const payload = { ...form };
      if (isEdit.value) {
        await updateCustomer(editId.value, payload);
        ElMessage.success('客户已更新');
      } else {
        await createCustomer(payload);
        ElMessage.success('客户已创建');
      }
      dialogVisible.value = false;
      loadData();
    } catch (e: unknown) {
      ElMessage.error(e.message || '保存失败');
    } finally {
      saving.value = false;
    }
  }

  async function handleDelete(row: Record<string, unknown>) {
    try {
      await deleteCustomer(row.customerId);
      ElMessage.success('客户已删除');
      loadData();
    } catch (e: unknown) {
      ElMessage.error(e.message || '删除失败');
    }
  }

  return {
    loading,
    saving,
    tableData,
    total,
    dialogVisible,
    isEdit,
    editId,
    formRef,
    detail,
    query,
    form,
    rules,
    resetQuery,
    setDictReload,
    loadData,
    openDialog,
    handleSave,
    handleDelete,
  };
}
