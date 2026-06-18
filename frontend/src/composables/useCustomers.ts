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
        tableData.value = res.items as unknown as Customer[];
        total.value = res.total ?? res.items.length;
      } else if (Array.isArray(res)) {
        tableData.value = res;
        total.value = res.length;
      } else {
        tableData.value = [];
        total.value = 0;
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      ElMessage.error(err || '加载失败');
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
      const r = row as Record<string, string | undefined>;
      editId.value = r.customerId || '';
      form.customerType = r.customerType || 'retail';
      form.customerLevel = r.customerLevel || 'normal';
      form.companyName = r.companyName || '';
      form.contactName = r.contactName || '';
      form.phone = r.phone || '';
      form.email = r.email || '';
      form.wechatId = r.wechatId || '';
      form.nickname = r.nickname || '';
      form.address = r.address || '';
      form.city = r.city || '';
      form.province = r.province || '';
      form.status = r.status || 'active';
      form.notes = r.notes || '';
      form.referralSource = r.referralSource || '';
      form.preferredStyle = r.preferredStyle || '';
      form.subscriptionStatus = r.subscriptionStatus || '';
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
      const err = e instanceof Error ? e.message : String(e);
      ElMessage.error(err || '保存失败');
    } finally {
      saving.value = false;
    }
  }

  async function handleDelete(row: Record<string, unknown>) {
    try {
      await deleteCustomer(String(row.customerId ?? ''));
      ElMessage.success('客户已删除');
      loadData();
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      ElMessage.error(err || '删除失败');
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
