<template>
  <div class="customer-page">
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>客户管理</span>
          <el-button type="primary" @click="openDialog()">新增客户</el-button>
        </div>
      </template>

      <!-- 筛选 -->
      <el-form :inline="true" :model="query" class="filter-form">
        <el-form-item label="关键词">
          <el-input
            v-model="query.keyword"
            placeholder="客户编号/姓名/企业/电话"
            clearable
            style="width: 200px"
            @keyup.enter="loadData"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-select
            v-model="query.customerType"
            placeholder="全部"
            clearable
            style="width: 120px"
            :options="dictTypeOptions"
            @change="loadData"
          />
        </el-form-item>
        <!-- ✅ F3: 等级筛选器改为字典动态渲染 -->
        <el-form-item label="等级">
          <el-select
            v-model="query.customerLevel"
            placeholder="全部"
            clearable
            style="width: 100px"
            :options="dictLevelOptions"
            @change="loadData"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="query.status"
            placeholder="全部"
            clearable
            style="width: 100px"
            :options="dictStatusOptions"
            @change="loadData"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 工具栏 -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px">
        <div>
          <el-button type="primary" size="small" :disabled="selectedRows.length === 0" @click="batchEdit"
            >编辑</el-button
          >
          <el-popconfirm title="确认批量软删除所选客户？" :disabled="selectedRows.length === 0" @confirm="batchDelete">
            <template #reference>
              <el-button type="danger" size="small" :disabled="selectedRows.length === 0">批量删除</el-button>
            </template>
          </el-popconfirm>
          <span v-if="selectedRows.length > 0" style="margin-left: 8px; color: #909399; font-size: 13px">
            已选 {{ selectedRows.length }} 条
          </span>
        </div>
      </div>

      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        border
        style="margin-top: 8px"
        :row-style="{ cursor: 'pointer' }"
        @row-dblclick="openDetail"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="45" fixed />
        <el-table-column prop="customerCode" label="客户编号" width="140" fixed />
        <el-table-column prop="contactName" label="联系人" width="90" />
        <el-table-column prop="nickname" label="昵称" width="90" show-overflow-tooltip />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="typeTag(row.customerType)" size="small">{{ typeLabel(row.customerType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="等级" width="80">
          <template #default="{ row }">
            <el-tag :type="levelTag(row.customerLevel)" size="small" effect="dark">{{
              levelLabel(row.customerLevel) || 'NOR'
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="companyName" label="企业名称" width="150" show-overflow-tooltip />
        <el-table-column prop="wechatId" label="微信号" width="100" />
        <el-table-column prop="phone" label="电话" width="120" />
        <el-table-column prop="preferredStyle" label="偏好风格" width="100" show-overflow-tooltip />
        <el-table-column prop="totalOrders" label="订单" width="60" align="right" />
        <el-table-column prop="totalAmount" label="累计消费" width="100" align="right">
          <template #default="{ row }">¥{{ Number(row.totalAmount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="70">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @current-change="loadData"
        @size-change="loadData"
      />
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑客户' : '新增客户'" width="720px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-row v-if="isEdit" :gutter="16">
          <el-col :span="12">
            <el-form-item label="客户编号">
              <el-input v-model="form.customerCode" disabled />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="客户类型" prop="customerType">
              <el-select
                v-model="form.customerType"
                placeholder="选择类型"
                style="width: 100%"
                :options="dictTypeOptions"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户等级">
              <el-select v-model="form.customerLevel" style="width: 100%" :options="dictLevelOptions" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="联系人" prop="contactName">
              <el-input v-model="form.contactName" placeholder="联系人姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="昵称">
              <el-input v-model="form.nickname" placeholder="昵称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="电话" prop="phone">
              <el-input v-model="form.phone" placeholder="联系电话" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="微信号">
              <el-input v-model="form.wechatId" placeholder="微信号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="企业名称">
          <el-input v-model="form.companyName" placeholder="企业名称（B端/partner 可选）" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="邮箱">
              <el-input v-model="form.email" placeholder="电子邮箱" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="来源渠道">
              <el-select
                v-model="form.referralSource"
                placeholder="选择来源"
                clearable
                style="width: 100%"
                :options="dictReferralOptions"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="省份">
              <el-input v-model="form.province" placeholder="省份" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="城市">
              <el-input v-model="form.city" placeholder="城市" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态">
              <el-select v-model="form.status" style="width: 100%" :options="dictStatusOptions" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="地址">
          <el-input v-model="form.address" type="textarea" :rows="2" placeholder="详细地址" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="偏好风格">
              <el-input v-model="form.preferredStyle" placeholder="如：复古/商务/时尚" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="订阅状态">
              <el-select
                v-model="form.subscriptionStatus"
                clearable
                style="width: 100%"
                :options="dictSubscriptionOptions"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="form.notes" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- ========== 详情抽屉 — Tab 布局 ========== -->
    <!-- ========== 客户详情抽屉 — 独立组件 (P1-3 重构) ========== -->
    <CustomerDetailDrawer
      :visible="detailVisible"
      :customer-id="selectedCustomerId"
      @close="detailVisible = false"
      @refresh="loadData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { useDict } from '@/composables/useDict'
import { useCustomerUtils } from '@/composables/useCustomerUtils'
import { getCustomerList, createCustomer, updateCustomer, deleteCustomer } from '@/api/customer'
import CustomerDetailDrawer from '@/components/CustomerDetailDrawer.vue'

// 字典：客户类型 / 客户等级 / 客户状态 / 来源渠道 / 订阅状态 / 联系人角色
const dictType = useDict('dict_customer_type')
const dictLevel = useDict('dict_customer_level')
const dictStatus = useDict('dict_customer_status')
const dictReferral = useDict('dict_referral_source')
const dictSubscription = useDict('dict_subscription_status')

const { typeTag, typeLabel, levelTag, levelLabel, statusTag, statusLabel } = useCustomerUtils()

// 构建 options 格式数组
const dictTypeOptions = computed(() => dictType.items.value.map((d) => ({ label: d.name, value: d.code })))
const dictLevelOptions = computed(() => dictLevel.items.value.map((d) => ({ label: d.name, value: d.code })))
const dictStatusOptions = computed(() => dictStatus.items.value.map((d) => ({ label: d.name, value: d.code })))
const dictReferralOptions = computed(() => dictReferral.items.value.map((d) => ({ label: d.name, value: d.code })))
const dictSubscriptionOptions = computed(() =>
  dictSubscription.items.value.map((d) => ({ label: d.name, value: d.code })),
)

// 监控字典加载状态
watch(
  () => dictType.error.value,
  (error) => {
    if (error) {
      console.error('[Customers] dict_customer_type 加载错误:', error)
      ElMessage.warning('客户类型字典加载失败')
    }
  },
  { immediate: true },
)

watch(
  () => dictLevel.error.value,
  (error) => {
    if (error) {
      console.error('[Customers] dict_customer_level 加载错误:', error)
      ElMessage.warning('客户等级字典加载失败')
    }
  },
  { immediate: true },
)

const loading = ref(false)
const saving = ref(false)
const tableData = ref<Record<string, unknown>[]>([])
const total = ref(0)
const dialogVisible = ref(false)
const detailVisible = ref(false)
const selectedCustomerId = ref('')

const formRef = ref<FormInstance>()
const isEdit = ref(false)
const editId = ref('')
const selectedRows = ref<Record<string, unknown>[]>([])
const handleSelectionChange = (rows: Record<string, unknown>[]) => {
  selectedRows.value = rows
}

const query = reactive({ page: 1, pageSize: 20, keyword: '', customerType: '', customerLevel: '', status: '' })

interface CustomerForm {
  customerType: string
  customerLevel: string
  companyName: string
  contactName: string
  phone: string
  email: string
  wechatId: string
  wechat: string
  nickname: string
  address: string
  city: string
  province: string
  status: string
  notes: string
  referralSource: string
  preferredStyle: string
  subscriptionStatus: string
  customerCode: string
  avatarUrl: string
  wholesaleTier: string
  memberDiscountRate: string
  pointsBalance: string
  partnerServices: string
}
const form = reactive<CustomerForm>({
  customerType: 'retail',
  customerLevel: 'normal',
  companyName: '',
  contactName: '',
  phone: '',
  email: '',
  wechatId: '',
  nickname: '',
  address: '',
  city: '',
  province: '',
  status: 'active',
  notes: '',
  referralSource: '',
  preferredStyle: '',
  subscriptionStatus: '',
  customerCode: '',
  avatarUrl: '',
  wholesaleTier: '',
  wechat: '',
  memberDiscountRate: '',
  pointsBalance: '',
  partnerServices: '',
})

const rules = {
  customerType: [{ required: true, message: '请选择客户类型', trigger: 'change' }],
  contactName: [{ required: true, message: '请输入联系人姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
}

async function loadData() {
  loading.value = true
  try {
    const res = await getCustomerList(query)
    tableData.value = (res.items as unknown as Record<string, unknown>[]) || []
    total.value = res.total as number
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  Object.assign(query, { page: 1, pageSize: 20, keyword: '', customerType: '', customerLevel: '', status: '' })
  loadData()
}

async function openDialog(row?: Record<string, unknown>) {
  // 强制刷新字典缓存，确保弹窗中下拉选项为最新数据
  await Promise.all([dictType.forceReload(), dictLevel.forceReload()])

  isEdit.value = !!row
  editId.value = (row?.customerId as string) || ''
  if (row) {
    Object.assign(form, row)
  } else {
    Object.assign(form, {
      customerType: 'retail',
      customerLevel: 'normal',
      companyName: '',
      contactName: '',
      phone: '',
      email: '',
      wechatId: '',
      nickname: '',
      address: '',
      city: '',
      province: '',
      status: 'active',
      notes: '',
      referralSource: '',
      preferredStyle: '',
      subscriptionStatus: '',
    })
  }
  dialogVisible.value = true
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    // 严格构造 DTO payload，避免 forbidNonWhitelisted 拒绝
    const payload = {
      customerType: form.customerType,
      customerLevel: form.customerLevel,
      companyName: form.companyName,
      contactName: form.contactName,
      phone: form.phone,
      email: form.email || undefined,
      wechat: form.wechat,
      wechatId: form.wechatId,
      nickname: form.nickname,
      avatarUrl: form.avatarUrl,
      address: form.address,
      city: form.city,
      province: form.province,
      notes: form.notes,
      status: form.status,
      wholesaleTier: form.wholesaleTier,
      memberDiscountRate: form.memberDiscountRate,
      pointsBalance: form.pointsBalance,
      partnerServices: form.partnerServices,
      referralSource: form.referralSource,
      preferredStyle: form.preferredStyle,
      subscriptionStatus: form.subscriptionStatus,
    }
    if (isEdit.value) {
      await updateCustomer(editId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await createCustomer(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (e: unknown) {
    console.error('保存失败:', e)
  } finally {
    saving.value = false
  }
}

async function batchEdit() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先勾选客户')
    return
  }
  if (selectedRows.value.length > 1) {
    ElMessage.warning('暂仅支持单条编辑，请只勾选一个客户')
    return
  }
  openDialog(selectedRows.value[0])
}

async function batchDelete() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先勾选客户')
    return
  }
  for (const row of selectedRows.value) {
    await deleteCustomer(row.customerId as string)
  }
  ElMessage.success(`已删除 ${selectedRows.value.length} 条`)
  selectedRows.value = []
  loadData()
}

function openDetail(row: Record<string, unknown>) {
  selectedCustomerId.value = row.customerId as string
  detailVisible.value = true
}

onMounted(loadData)
</script>

<style scoped>
.customer-page {
  padding: 0;
}
.filter-form {
  margin-bottom: 0;
}

/* 输入框宽度修复 */
.el-dialog .el-input,
.el-dialog .el-select,
.el-dialog .el-date-editor {
  width: 100% !important;
}
.el-dialog .el-input-number {
  width: 100% !important;
}

/* 会员卡片样式 */
.member-stat {
  text-align: center;
  padding: 8px 0;
}
.member-stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}
.member-stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
