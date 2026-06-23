<template>
  <div class="page-container">
    <el-card>
      <!-- 顶部统计 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <el-statistic title="SKU 总数" :value="stats.total" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="库存充足" :value="stats.ok" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="库存预警" :value="stats.warning" value-style="color: #e6a23c" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="缺货" :value="stats.outOfStock" value-style="color: #f56c6c" />
        </el-col>
      </el-row>
    </el-card>

    <el-card class="mt-16">
      <!-- 搜索栏 -->
      <el-form :model="query" inline class="search-bar">
        <el-form-item label="SKU 编码">
          <el-input v-model="query.skuCode" placeholder="输入 SKU 编码" clearable @clear="loadData" />
        </el-form-item>
        <el-form-item label="预警">
          <el-select v-model="query.warningOnly" placeholder="全部" clearable @clear="loadData" @change="loadData">
            <el-option label="仅预警" value="true" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="showInDialog">入库</el-button>
          <el-button @click="showOutDialog">出库</el-button>
          <el-button @click="showAdjustDialog">盘点调整</el-button>
        </el-form-item>
      </el-form>

      <!-- 库存表格 -->
      <el-table v-loading="loading" :data="tableData" stripe border>
        <el-table-column prop="skuCode" label="SKU 编码" min-width="140" />
        <el-table-column prop="warehouseCode" label="仓库" width="100" />
        <el-table-column prop="currentQuantity" label="当前库存" width="100" align="right" />
        <el-table-column prop="availableQuantity" label="可用库存" width="100" align="right">
          <template #default="{ row }">
            <span
              :style="{
                color: row.availableQuantity <= row.warningQuantity ? '#e6a23c' : '#67c23a',
                fontWeight: 'bold',
              }"
            >
              {{ row.availableQuantity }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="lockedQuantity" label="锁定库存" width="100" align="right">
          <template #default="{ row }">
            <span v-if="row.lockedQuantity > 0" style="color: #409eff">{{ row.lockedQuantity }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="warningQuantity" label="预警阈值" width="100" align="right" />
        <el-table-column prop="lastStockCheckAt" label="最后盘点" width="160" />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.availableQuantity <= 0" type="danger" size="small">缺货</el-tag>
            <el-tag v-else-if="row.availableQuantity <= row.warningQuantity" type="warning" size="small">预警</el-tag>
            <el-tag v-else type="success" size="small">充足</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewTransactions(row)">流水</el-button>
            <el-button size="small" type="primary" @click="showEditDialog(row)">调整</el-button>
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

    <!-- 入库对话框 -->
    <el-dialog v-model="inVisible" title="入库" width="500px">
      <el-form :model="inForm" label-width="100px">
        <el-form-item label="SKU" required>
          <el-select v-model="inForm.skuId" filterable placeholder="搜索并选择 SKU" style="width: 100%">
            <el-option v-for="sku in skuList" :key="sku.id" :label="sku.skuCode" :value="sku.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="入库数量" required>
          <el-input-number v-model="inForm.quantity" :min="1" />
        </el-form-item>
        <el-form-item label="入库类型">
          <el-select v-model="inForm.transactionType">
            <el-option label="采购入库" value="purchase_in" />
            <el-option label="退货入库" value="return_in" />
            <el-option label="其他入库" value="adjust" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="inForm.remark" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="inVisible = false">取消</el-button>
        <el-button type="primary" @click="doStockIn">确认入库</el-button>
      </template>
    </el-dialog>

    <!-- 出库对话框 -->
    <el-dialog v-model="outVisible" title="出库" width="500px">
      <el-form :model="outForm" label-width="100px">
        <el-form-item label="SKU" required>
          <el-select v-model="outForm.skuId" filterable placeholder="搜索并选择 SKU" style="width: 100%">
            <el-option v-for="sku in skuList" :key="sku.id" :label="sku.skuCode" :value="sku.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="出库数量" required>
          <el-input-number v-model="outForm.quantity" :min="1" />
        </el-form-item>
        <el-form-item label="出库类型">
          <el-select v-model="outForm.transactionType">
            <el-option label="销售出库" value="sale_out" />
            <el-option label="退货出库" value="return_out" />
            <el-option label="其他出库" value="adjust" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="outForm.remark" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="outVisible = false">取消</el-button>
        <el-button type="danger" @click="doStockOut">确认出库</el-button>
      </template>
    </el-dialog>

    <!-- 盘点调整对话框 -->
    <el-dialog v-model="adjustVisible" title="盘点调整" width="500px">
      <el-form :model="adjustForm" label-width="100px">
        <el-form-item label="SKU" required>
          <el-select v-model="adjustForm.skuId" filterable placeholder="搜索并选择 SKU" style="width: 100%">
            <el-option v-for="sku in skuList" :key="sku.id" :label="sku.skuCode" :value="sku.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="调整后数量" required>
          <el-input-number v-model="adjustForm.newQuantity" :min="0" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="adjustForm.remark" type="textarea" placeholder="盘点原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustVisible = false">取消</el-button>
        <el-button type="warning" @click="doAdjust">确认调整</el-button>
      </template>
    </el-dialog>

    <!-- 编辑（调整库存）对话框 -->
    <el-dialog v-model="editVisible" title="调整库存" width="500px">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="SKU">
          <el-input v-model="editForm.skuCode" disabled />
        </el-form-item>
        <el-form-item label="当前数量">
          <el-input-number v-model="editForm.currentQuantity" disabled />
        </el-form-item>
        <el-form-item label="调整后数量" required>
          <el-input-number v-model="editForm.newQuantity" :min="0" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="doEditAdjust">确认调整</el-button>
      </template>
    </el-dialog>

    <!-- 交易流水对话框 -->
    <el-dialog v-model="txVisible" title="库存交易流水" width="800px">
      <el-table :data="txData" stripe border size="small">
        <el-table-column prop="transactionType" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="txTypeTag(row.transactionType)" size="small">{{ txTypeLabel(row.transactionType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="80" align="right">
          <template #default="{ row }">
            <span :style="{ color: row.quantity > 0 ? '#67c23a' : '#f56c6c', fontWeight: 'bold' }">
              {{ row.quantity > 0 ? '+' : '' }}{{ row.quantity }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="quantityBefore" label="调整前" width="80" align="right" />
        <el-table-column prop="quantityAfter" label="调整后" width="80" align="right" />
        <el-table-column prop="referenceType" label="关联类型" width="100" />
        <el-table-column prop="referenceId" label="关联 ID" width="200" show-overflow-tooltip />
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="时间" width="170" />
      </el-table>
      <el-pagination
        v-model:current-page="txPage"
        :page-size="10"
        :total="txTotal"
        layout="prev, pager, next"
        class="mt-16"
        @current-change="loadTransactions"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getInventoryList, getInventoryStats, stockIn, stockOut, adjustStock, getTransactions } from '@/api/inventory'
import { getSkus } from '@/api/product'
import { ElMessage } from 'element-plus'

const skuList = ref<Record<string, unknown>[]>([])

const loading = ref(false)
const tableData = ref<Record<string, unknown>[]>([])
const total = ref(0)

const query = reactive({
  skuCode: '',
  warningOnly: '',
  page: 1,
  pageSize: 20,
})

const stats = reactive({ total: 0, ok: 0, warning: 0, outOfStock: 0 })

// 入库
const inVisible = ref(false)
const inForm = reactive({
  skuId: '',
  quantity: 1,
  transactionType: 'purchase_in',
  referenceType: '',
  referenceId: '',
  remark: '',
})
function showInDialog() {
  inForm.skuId = ''
  inForm.quantity = 1
  inForm.remark = ''
  inVisible.value = true
}
async function doStockIn() {
  try {
    await stockIn(inForm)
    ElMessage.success('入库成功')
    inVisible.value = false
    loadData()
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    ElMessage.error(err || '入库失败')
  }
}

// 出库
const outVisible = ref(false)
const outForm = reactive({
  skuId: '',
  quantity: 1,
  transactionType: 'sale_out',
  referenceType: '',
  referenceId: '',
  remark: '',
})
function showOutDialog() {
  outForm.skuId = ''
  outForm.quantity = 1
  outForm.remark = ''
  outVisible.value = true
}
async function doStockOut() {
  try {
    await stockOut(outForm)
    ElMessage.success('出库成功')
    outVisible.value = false
    loadData()
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    ElMessage.error(err || '出库失败')
  }
}

// 盘点调整
const adjustVisible = ref(false)
const adjustForm = reactive({ skuId: '', newQuantity: 0, remark: '' })
function showAdjustDialog() {
  adjustForm.skuId = ''
  adjustForm.newQuantity = 0
  adjustForm.remark = ''
  adjustVisible.value = true
}
async function doAdjust() {
  try {
    await adjustStock(adjustForm)
    ElMessage.success('调整成功')
    adjustVisible.value = false
    loadData()
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    ElMessage.error(err || '调整失败')
  }
}

// 编辑调整
const editVisible = ref(false)
const editForm = reactive({ id: '', skuCode: '', currentQuantity: 0, newQuantity: 0, remark: '' })
function showEditDialog(row: Record<string, unknown>) {
  editForm.id = String(row.id ?? '')
  editForm.skuCode = String(row.skuCode ?? '')
  editForm.currentQuantity = Number(row.currentQuantity ?? 0)
  editForm.newQuantity = Number(row.currentQuantity ?? 0)
  editForm.remark = ''
  editVisible.value = true
}
async function doEditAdjust() {
  try {
    await adjustStock({ skuId: editForm.id, newQuantity: editForm.newQuantity, remark: editForm.remark })
    ElMessage.success('调整成功')
    editVisible.value = false
    loadData()
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    ElMessage.error(err || '调整失败')
  }
}

// 交易流水
const txVisible = ref(false)
const txData = ref<Record<string, unknown>[]>([])
const txPage = ref(1)
const txTotal = ref(0)
const txSkuId = ref('')
function viewTransactions(row: Record<string, unknown>) {
  txSkuId.value = String(row.skuId ?? '')
  txPage.value = 1
  txVisible.value = true
  loadTransactions()
}
async function loadTransactions() {
  try {
    const res = await getTransactions({ skuId: txSkuId.value, page: Number(txPage.value) || 1, pageSize: 10 })
    txData.value = res.items || []
    txTotal.value = res.total || 0
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    ElMessage.error(err || '加载流水失败')
  }
}

function txTypeLabel(type: string) {
  const map: Record<string, string> = {
    purchase_in: '采购入库',
    sale_out: '销售出库',
    return_in: '退货入库',
    return_out: '退货出库',
    adjust: '盘点调整',
    transfer: '调拨',
    initial: '期初导入',
    lock: '锁定',
    unlock: '解锁',
  }
  return map[type] || type
}
function txTypeTag(type: string) {
  if (['purchase_in', 'return_in', 'initial'].includes(type)) return 'success'
  if (['sale_out', 'return_out'].includes(type)) return 'danger'
  if (['lock'].includes(type)) return 'warning'
  return 'info'
}

async function loadData() {
  loading.value = true
  try {
    const params: Record<string, string | number | undefined> = {
      page: Number(query.page) || 1,
      pageSize: Number(query.pageSize) || 20,
    }
    if (query.skuCode) params.skuCode = query.skuCode
    if (query.warningOnly) params.warningOnly = query.warningOnly
    const res = await getInventoryList(params)
    tableData.value = res.items || []
    total.value = res.total || 0
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    ElMessage.error(err || '加载库存失败')
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    const d = await getInventoryStats()
    stats.total = Number(d?.total ?? 0)
    stats.warning = Number(d?.warningCount ?? d?.warning ?? 0)
    stats.outOfStock = Number(d?.outOfStockCount ?? d?.outOfStock ?? 0)
    stats.ok = Math.max(0, stats.total - stats.warning - stats.outOfStock)
  } catch (e: unknown) {
    console.error('加载库存统计失败', e)
  }
}

async function loadSkuList() {
  try {
    const res = await getSkus({ page: 1, pageSize: 500 })
    skuList.value = res.items || []
  } catch (e: unknown) {
    console.error('加载 SKU 列表失败', e)
  }
}

onMounted(() => {
  loadData()
  loadStats()
  loadSkuList()
})
</script>

<style scoped>
.page-container {
  padding: 0;
}
.stats-row {
  margin-bottom: 16px;
}
.mt-16 {
  margin-top: 16px;
}
.search-bar {
  margin-bottom: 16px;
}
</style>
