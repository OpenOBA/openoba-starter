<template>
  <div class="page-container">
    <el-card>
      <!-- 顶部统计 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <el-statistic title="售后总数" :value="stats.total" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="待审核" :value="stats.pending" value-style="color: #e6a23c" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="已批准" :value="stats.approved" value-style="color: #409eff" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="已完成" :value="stats.completed" value-style="color: #67c23a" />
        </el-col>
      </el-row>
    </el-card>

    <el-card class="mt-16">
      <!-- 搜索栏 -->
      <el-form :model="query" inline class="search-bar">
        <el-form-item label="售后编号">
          <el-input v-model="query.afterSalesNo" placeholder="输入编号" clearable @clear="loadData" />
        </el-form-item>
        <el-form-item label="售后类型">
          <el-select v-model="query.afterSalesType" placeholder="全部" clearable @clear="loadData" @change="loadData">
            <el-option label="退货" value="return" />
            <el-option label="换货" value="exchange" />
            <el-option label="仅退款" value="refund_only" />
            <el-option label="维修" value="repair" />
          </el-select>
        </el-form-item>
        <!-- ✅ F3-5: 状态筛选器改为字典动态渲染 -->
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable @clear="loadData" @change="loadData">
            <el-option v-for="d in afterSaleStatusDict.items" :key="d.code" :label="d.name" :value="d.code" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button type="success" @click="showCreateDialog">新建售后</el-button>
        </el-form-item>
      </el-form>

      <!-- 售后表格 -->
      <el-table :data="tableData" v-loading="loading" stripe border>
        <el-table-column prop="afterSalesNo" label="售后编号" width="170" />
        <el-table-column prop="orderNo" label="订单编号" width="170" />
        <el-table-column prop="customerName" label="客户" width="120" />
        <el-table-column prop="afterSalesType" label="类型" width="90">
          <template #default="{ row }">
            <el-tag :type="asTypeTag(row.afterSalesType)" size="small">{{ asTypeLabel(row.afterSalesType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reasonType" label="原因" width="100">
          <template #default="{ row }">{{ reasonLabel(row.reasonType) }}</template>
        </el-table-column>
        <el-table-column prop="refundAmount" label="退款金额" width="100" align="right">
          <template #default="{ row }">¥{{ row.refundAmount }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="申请时间" width="170" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === AFTER_SALES_STATUS.pending" size="small" type="success" @click="showReviewDialog(row, 'approve')">批准</el-button>
            <el-button v-if="row.status === AFTER_SALES_STATUS.pending" size="small" type="danger" @click="showReviewDialog(row, 'reject')">拒绝</el-button>
            <el-button v-if="row.status === 'approved' || row.status === 'returning'" size="small" @click="doProcess(row, 'receive')">确认收货</el-button>
            <el-button v-if="row.status === 'received' || row.status === 'approved'" size="small" type="primary" @click="showRefundDialog(row)">退款</el-button>
            <el-button size="small" @click="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        class="mt-16"
        @size-change="loadData"
        @current-change="loadData"
      />
    </el-card>

    <!-- 审核对话框 -->
    <el-dialog v-model="reviewVisible" :title="reviewAction === 'approve' ? '批准售后' : '拒绝售后'" width="500px">
      <el-form :model="reviewForm" label-width="100px">
        <el-form-item label="售后编号">
          <el-input :value="reviewItem?.afterSalesNo" disabled />
        </el-form-item>
        <el-form-item v-if="reviewAction === 'approve'" label="实际退款金额">
          <el-input-number v-model="reviewForm.actualRefundAmount" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="审核备注">
          <el-input v-model="reviewForm.reviewNote" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button :type="reviewAction === 'approve' ? 'success' : 'danger'" @click="doReview">
          {{ reviewAction === 'approve' ? '批准' : '拒绝' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 退款对话框 -->
    <el-dialog v-model="refundVisible" title="退款处理" width="500px">
      <el-form :model="refundForm" label-width="100px">
        <el-form-item label="售后编号">
          <el-input :value="refundItem?.afterSalesNo" disabled />
        </el-form-item>
        <el-form-item label="退款金额">
          <el-input-number v-model="refundForm.actualRefundAmount" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="退款方式">
          <el-select v-model="refundForm.refundMethod">
            <el-option label="原路退回" value="original" />
            <el-option label="余额退款" value="balance" />
            <el-option label="银行转账" value="bank_transfer" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="refundForm.note" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="refundVisible = false">取消</el-button>
        <el-button type="primary" @click="doRefund">确认退款</el-button>
      </template>
    </el-dialog>

    <!-- 新建售后对话框 -->
    <el-dialog v-model="createVisible" title="新建售后申请" width="600px">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="订单" required>
          <el-select v-model="createForm.orderId" filterable placeholder="搜索并选择订单" style="width: 100%">
            <el-option v-for="order in orderList" :key="order.id" :label="`${order.orderNo} - ¥${order.totalAmount}`" :value="order.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="售后类型" required>
          <el-select v-model="createForm.afterSalesType">
            <el-option label="退货" value="return" />
            <el-option label="换货" value="exchange" />
            <el-option label="仅退款" value="refund_only" />
            <el-option label="维修" value="repair" />
          </el-select>
        </el-form-item>
        <el-form-item label="原因分类" required>
          <el-select v-model="createForm.reasonType">
            <el-option label="质量问题" value="quality" />
            <el-option label="发错货" value="wrong_item" />
            <el-option label="与描述不符" value="not_as_described" />
            <el-option label="七天无理由" value="changed_mind" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="详细说明">
          <el-input v-model="createForm.reasonDetail" type="textarea" />
        </el-form-item>
        <el-form-item label="退款金额" required>
          <el-input-number v-model="createForm.refundAmount" :min="0" :precision="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="doCreate">提交申请</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailVisible" title="售后详情" width="800px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="售后编号">{{ detailData.afterSalesNo }}</el-descriptions-item>
        <el-descriptions-item label="订单编号">{{ detailData.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="客户">{{ detailData.customerName }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ asTypeLabel(detailData.afterSalesType) }}</el-descriptions-item>
        <el-descriptions-item label="原因">{{ reasonLabel(detailData.reasonType) }}</el-descriptions-item>
        <el-descriptions-item label="退款金额">¥{{ detailData.refundAmount }}</el-descriptions-item>
        <el-descriptions-item label="实际退款金额">¥{{ detailData.actualRefundAmount || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTag(detailData.status)" size="small">{{ statusLabel(detailData.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ detailData.createdAt }}</el-descriptions-item>
        <el-descriptions-item label="审核时间">{{ detailData.reviewedAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="审核备注" :span="2">{{ detailData.reviewNote || '-' }}</el-descriptions-item>
        <el-descriptions-item label="详细说明" :span="2">{{ detailData.reasonDetail || '-' }}</el-descriptions-item>
      </el-descriptions>

      <el-divider>操作日志</el-divider>
      <el-timeline>
        <el-timeline-item
          v-for="log in detailLogs"
          :key="log.id"
          :timestamp="log.createdAt"
          placement="top"
        >
          <el-tag size="small">{{ log.action }}</el-tag>
          <span class="ml-8">{{ log.note || '' }}</span>
          <span v-if="log.fromStatus" class="ml-8 text-muted">{{ log.fromStatus }} → {{ log.toStatus }}</span>
        </el-timeline-item>
      </el-timeline>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getAfterSalesList, getAfterSalesStats, reviewAfterSales, processAfterSales, createAfterSales, getAfterSalesDetail, getAfterSalesLogs } from '@/api/afterSales'
import { getOrderList } from '@/api/order'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDict } from '@/composables/useDict'

const afterSaleStatusDict = useDict('dict_after_sale_status')
const AFTER_SALES_STATUS = { pending: 'pending', approved: 'approved', rejected: 'rejected', returning: 'returning', received: 'received', refunded: 'refunded', completed: 'completed', closed: 'closed' } as const

const orderList = ref<any[]>([])

const loading = ref(false)
const tableData = ref([])
const total = ref(0)

const query = reactive({
  afterSalesNo: '',
  afterSalesType: '',
  status: '',
  page: 1,
  pageSize: 20,
})

const stats = reactive({ total: 0, pending: 0, approved: 0, completed: 0 })

// 审核
const reviewVisible = ref(false)
const reviewAction = ref('approve')
const reviewItem = ref<any>(null)
const reviewForm = reactive({ actualRefundAmount: 0, reviewNote: '' })
function showReviewDialog(row: any, action: string) {
  reviewAction.value = action; reviewItem.value = row
  reviewForm.reviewNote = ''; reviewForm.actualRefundAmount = parseFloat(row.refundAmount) || 0
  reviewVisible.value = true
}
async function doReview() {
  try {
    await reviewAfterSales(reviewItem.value.id, { action: reviewAction.value, ...reviewForm })
    ElMessage.success(reviewAction.value === 'approve' ? '已批准' : '已拒绝')
    reviewVisible.value = false; loadData(); loadStats()
  } catch (e: unknown) { ElMessage.error(e.message || '审核失败') }
}

// 收货
async function doProcess(row: any, action: string) {
  try {
    await processAfterSales(row.id, { action })
    ElMessage.success('操作成功'); loadData()
  } catch (e: unknown) { ElMessage.error(e.message || '操作失败') }
}

// 退款
const refundVisible = ref(false)
const refundItem = ref<any>(null)
const refundForm = reactive({ actualRefundAmount: 0, refundMethod: 'original', note: '' })
function showRefundDialog(row: Record<string, unknown>) {
  refundItem.value = row
  refundForm.actualRefundAmount = parseFloat(row.actualRefundAmount || row.refundAmount) || 0
  refundForm.refundMethod = 'original'; refundForm.note = ''; refundVisible.value = true
}
async function doRefund() {
  try {
    await processAfterSales(refundItem.value.id, { action: 'refund', ...refundForm })
    ElMessage.success('退款成功'); refundVisible.value = false; loadData(); loadStats()
  } catch (e: unknown) { ElMessage.error(e.message || '退款失败') }
}

// 新建售后
const createVisible = ref(false)
const createForm = reactive({ orderId: '', afterSalesType: 'return', reasonType: 'quality', reasonDetail: '', refundAmount: 0 })
function showCreateDialog() { createForm.orderId = ''; createForm.reasonDetail = ''; createForm.refundAmount = 0; createVisible.value = true }
async function doCreate() {
  try { await createAfterSales(createForm); ElMessage.success('售后申请已提交'); createVisible.value = false; loadData(); loadStats() } catch (e: unknown) { ElMessage.error(e.message || '提交失败') }
}

// 详情
const detailVisible = ref(false)
const detailData = ref<any>({})
interface AfterSalesLog {
  id: string
  action: string
  note: string
  fromStatus?: string
  toStatus?: string
  createdAt: string
  [key: string]: any
}
const detailLogs = ref<AfterSalesLog[]>([])
async function viewDetail(row: Record<string, unknown>) {
  try {
    const res = await getAfterSalesDetail(row.id)
    detailData.value = res.data || res
    const logRes = await getAfterSalesLogs(row.id)
    detailLogs.value = logRes.data || logRes || []
    detailVisible.value = true
  } catch (e: unknown) { ElMessage.error(e.message || '加载详情失败') }
}

function statusTag(status: string) {
  const map: Record<string, string> = { pending: 'warning', approved: '', rejected: 'info', returning: '', received: 'success', refunded: 'success', completed: 'success', closed: 'info' }
  return map[status] || 'info'
}
// ✅ F2-8: 售后状态中文 fallback 映射 — 优先字典，fallback 本地中文
function statusLabel(status: string) {
  return afterSaleStatusDict.labels.value[status] || { pending: '待审核', approved: '已批准', rejected: '已拒绝', returning: '退货中', received: '已收货', refunded: '已退款', completed: '已完成', closed: '已关闭' }[status] || status
}
function asTypeTag(type: string) {
  const map: Record<string, string> = { return: 'danger', exchange: 'warning', refund_only: 'info', repair: '' }
  return map[type] || 'info'
}
function asTypeLabel(type: string) {
  const map: Record<string, string> = { return: '退货', exchange: '换货', refund_only: '仅退款', repair: '维修' }
  return map[type] || type
}
function reasonLabel(type: string) {
  const map: Record<string, string> = { quality: '质量问题', wrong_item: '发错货', not_as_described: '与描述不符', changed_mind: '七天无理由', other: '其他' }
  return map[type] || type
}

async function loadData() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: Number(query.page) || 1,
      pageSize: Number(query.pageSize) || 20,
    }
    if (query.afterSalesNo) params.afterSalesNo = query.afterSalesNo
    if (query.afterSalesType) params.afterSalesType = query.afterSalesType
    if (query.status) params.status = query.status
    const res = await getAfterSalesList(params)
    tableData.value = res.items || res.data?.items || []
    total.value = res.total || res.data?.total || 0
  } catch (e: unknown) { ElMessage.error(e.message || '加载售后失败') } finally { loading.value = false }
}

async function loadStats() {
  try {
    const res = await getAfterSalesStats()
    const d = res.data || res
    Object.assign(stats, { total: d.total || 0, pending: d.pending || 0, approved: d.approved || 0, completed: d.completed || 0 })
  } catch (e: unknown) { console.error('加载售后统计失败', e) }
}

async function loadOrderList() {
  try {
    const res = await getOrderList({ page: 1, pageSize: 200 })
    orderList.value = res.items || res.data?.items || []
  } catch (e: unknown) { console.error('加载订单列表失败', e) }
}

onMounted(() => { loadData(); loadStats(); loadOrderList() })
</script>

<style scoped>
.page-container { padding: 0; }
.stats-row { margin-bottom: 16px; }
.mt-16 { margin-top: 16px; }
.search-bar { margin-bottom: 16px; }
.ml-8 { margin-left: 8px; }
.text-muted { color: #909399; font-size: 12px; }
</style>
