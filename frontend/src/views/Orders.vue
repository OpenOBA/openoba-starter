<template>
  <div class="order-page">
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>订单管理</span>
          <el-button type="primary" @click="openCreateDialog">新建订单</el-button>
        </div>
      </template>

      <!-- 统计卡片 -->
      <el-row :gutter="12" style="margin-bottom: 16px">
        <el-col :span="4" v-for="card in statCards" :key="card.label">
          <el-card shadow="hover" :body-style="{ padding: '12px', textAlign: 'center' }">
            <div style="font-size: 24px; font-weight: bold; color: var(--el-color-primary)">{{ card.value }}</div>
            <div style="font-size: 12px; color: #999; margin-top: 4px">{{ card.label }}</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 筛选 -->
      <el-form :inline="true" :model="query" class="filter-form">
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="订单号/客户名" clearable style="width: 160px" @keyup.enter="loadData" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px" @change="loadData">
            <el-option v-for="d in orderStatusItems" :key="d.code" :label="d.name" :value="d.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="支付状态">
          <el-select v-model="query.paymentStatus" placeholder="全部" clearable style="width: 110px" @change="loadData">
            <el-option v-for="d in paymentStatusItems" :key="d.code" :label="d.name" :value="d.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="订单类型">
          <el-select v-model="query.orderType" placeholder="全部" clearable style="width: 110px" @change="loadData">
            <el-option v-for="d in customerTypeItems" :key="d.code" :label="d.name" :value="d.code" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table :data="tableData" stripe border v-loading="loading" style="margin-top: 12px" row-key="orderId" @selection-change="onSelectionChange" @row-dblclick="viewDetail">
        <el-table-column type="selection" width="40" fixed />
        <el-table-column prop="orderNo" label="订单号" width="180" fixed />
        <el-table-column prop="customerName" label="客户" width="120" />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.orderType === 'wholesale' ? 'warning' : row.orderType === 'set' ? 'success' : ''" size="small">
              {{ orderTypeLabel(row.orderType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small" effect="dark">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="支付" width="80">
          <template #default="{ row }">
            <el-tag :type="row.paymentStatus === 'paid' ? 'success' : row.paymentStatus === 'partial' ? 'warning' : 'info'" size="small">
              {{ payLabel(row.paymentStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="110" align="right">
          <template #default="{ row }">¥{{ Number(row.actualAmount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="明细" width="80" align="center">
          <template #default="{ row }">{{ row.items?.length || 0 }} 项</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        
      </el-table>

      <!-- 操作按钮栏 -->
      <div v-if="selectedOrders.length > 0" style="margin-top: 12px; display: flex; gap: 8px; align-items: center">
        <span style="color: #909399; font-size: 13px">已选 {{ selectedOrders.length }} 项</span>
        <el-button v-if="canConfirmSelected" size="small" type="success" @click="batchConfirm">确认订单</el-button>
        <el-button v-if="canShipSelected" size="small" type="warning" @click="batchShip">发货</el-button>
        <el-popconfirm v-if="canCancelSelected" title="确认取消所选订单？" @confirm="batchCancel">
          <template #reference>
            <el-button size="small" type="danger">取消订单</el-button>
          </template>
        </el-popconfirm>
        <el-divider direction="vertical" />
        <span style="color: #909399; font-size: 12px">💡 双击行查看订单详情</span>
      </div>


      <!-- 分页 -->
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

    <!-- 订单详情抽屉 -->
    <el-drawer v-model="detailVisible" title="订单详情" size="600px">
      <div v-if="currentOrder" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单号">{{ currentOrder.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTag(currentOrder.status ?? '')" effect="dark">{{ statusLabel(currentOrder.status ?? '') }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="客户">{{ currentOrder.customerName }}</el-descriptions-item>
          <el-descriptions-item label="电话">{{ currentOrder.customerPhone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="订单类型">{{ orderTypeLabel(currentOrder.orderType ?? '') }}</el-descriptions-item>
          <el-descriptions-item label="支付方式">{{ currentOrder.paymentMethod || '-' }}</el-descriptions-item>
          <el-descriptions-item label="订单总额">¥{{ Number(currentOrder.totalAmount).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="优惠金额">-¥{{ Number(currentOrder.discountAmount).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="运费">+¥{{ Number(currentOrder.shippingFee).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="实付金额"><b>¥{{ Number(currentOrder.actualAmount).toFixed(2) }}</b></el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">{{ formatDate(currentOrder.createdAt ?? '') }}</el-descriptions-item>
          <el-descriptions-item v-if="currentOrder.remark" label="备注" :span="2">{{ currentOrder.remark }}</el-descriptions-item>
        </el-descriptions>

        <!-- 收货地址 -->
        <el-divider content-position="left">收货地址</el-divider>
        <div v-if="currentOrder.address">
          <p><b>{{ currentOrder.address.receiverName }}</b> {{ currentOrder.address.receiverPhone }}</p>
          <p>{{ currentOrder.address.province }} {{ currentOrder.address.city }} {{ currentOrder.address.district || '' }} {{ currentOrder.address.addressDetail }}</p>
        </div>
        <el-empty v-else description="无收货地址" :image-size="40" />

        <!-- 结构锚点 -->
        <el-divider content-position="left">结构锚点</el-divider>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="结构标准编码">{{ currentOrder.structureStandardCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="订单项结构编码">{{ currentOrder.items?.[0]?.structureStandardCode || '-' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 订单明细 -->
        <el-divider content-position="left">订单明细</el-divider>
        <el-table :data="currentOrder.items || []" size="small" border>
          <el-table-column prop="productName" label="商品" />
          <el-table-column label="履行类型" width="90">
            <template #default="{ row }">
              <el-tag :type="fulfillmentTag(row.orderFulfillmentType)" size="small">{{ fulfillmentLabel(row.orderFulfillmentType) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="镜片状态" width="80">
            <template #default="{ row }">
              <el-tag :type="lensStatusTag(row.lensStatus)" size="small">{{ lensStatusLabel(row.lensStatus) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="60" align="center" />
          <el-table-column label="单价" width="90" align="right">
            <template #default="{ row }">¥{{ Number(row.unitPrice).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="小计" width="100" align="right">
            <template #default="{ row }">¥{{ Number(row.subtotal).toFixed(2) }}</template>
          </el-table-column>
        </el-table>

        <!-- 支付记录 -->
        <el-divider content-position="left">支付记录</el-divider>
        <el-table :data="currentOrder.payments || []" size="small" border>
          <el-table-column prop="paymentNo" label="支付流水号" />
          <el-table-column prop="paymentMethod" label="方式" width="80" />
          <el-table-column label="金额" width="90" align="right">
            <template #default="{ row }">¥{{ Number(row.amount).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="80" />
          <el-table-column prop="paidAt" label="支付时间" width="170">
            <template #default="{ row }">{{ row.paidAt ? formatDate(row.paidAt) : '-' }}</template>
          </el-table-column>
        </el-table>

        <!-- 发货记录 -->
        <el-divider content-position="left">发货记录</el-divider>
        <el-table :data="currentOrder.shipments || []" size="small" border>
          <el-table-column prop="carrier" label="物流" width="80" />
          <el-table-column prop="trackingNo" label="运单号" />
          <el-table-column prop="status" label="状态" width="80" />
          <el-table-column prop="shippedAt" label="发货时间" width="170">
            <template #default="{ row }">{{ row.shippedAt ? formatDate(row.shippedAt) : '-' }}</template>
          </el-table-column>
        </el-table>

        <!-- 操作日志 -->
        <el-divider content-position="left">操作日志</el-divider>
        <el-timeline>
          <el-timeline-item v-for="log in currentOrder.logs || []" :key="log.logId" :timestamp="formatDate(log.createdAt)" placement="top">
            <el-card shadow="never" :body-style="{ padding: '8px 12px' }">
              <b>{{ log.action }}</b>
              <span v-if="log.oldStatus"> {{ statusLabel(log.oldStatus) }} → {{ statusLabel(log.newStatus ?? '') }}</span>
              <span v-if="log.remark" style="color: #999; margin-left: 8px">{{ log.remark }}</span>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-drawer>

    <!-- 新建订单对话框 -->
    <el-dialog v-model="createVisible" title="新建订单" width="700px" :close-on-click-modal="false">
      <el-form :model="createForm" label-width="90px">
        <el-form-item label="客户">
          <el-select v-model="createForm.customerId" placeholder="选择客户" filterable style="width: 100%" @change="onCustomerSelect">
            <el-option v-for="c in customerOptions" :key="c.customerId" :label="`${c.contactName} (${c.phone})`" :value="c.customerId" />
          </el-select>
          <el-alert v-if="historyLensNotice" :title="historyLensNotice" type="info" :closable="false" show-icon style="margin-top: 8px" />
        </el-form-item>
        <el-form-item label="结构标准">
          <el-select v-model="createForm.structureStandardCode" placeholder="选择结构标准" filterable style="width: 100%">
            <el-option v-for="l in lensOptions" :key="l.structureId" :label="`${l.externalCode} - ${((l.surfaceTypes as string[])||[]).join(',')} ${((l.refractiveIndexes as number[])||[]).join(',')}`" :value="l.structureId" />
          </el-select>
        </el-form-item>
        <el-form-item label="订单类型">
          <el-select v-model="createForm.orderType" style="width: 160px">
            <el-option v-for="d in customerTypeItems" :key="d.code" :label="d.name" :value="d.code" />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">商品明细</el-divider>
        <el-table :data="createForm.items" border size="small">
          <el-table-column label="商品" min-width="150">
            <template #default="{ row }">
              <el-input v-model="row.productName" placeholder="商品名称" />
            </template>
          </el-table-column>
          <el-table-column label="履行类型" width="130">
            <template #default="{ row }">
              <el-select v-model="row.orderFulfillmentType" size="small" @change="onFulfillmentTypeChange(row)">
                <el-option label="裸框" value="frame_only" />
                <el-option label="眼镜(框+片)" value="lens_and_frame" />
                <el-option label="单配镜片" value="lens_only" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="镜片状态" width="110">
            <template #default="{ row }">
              <el-select v-model="row.lensStatus" size="small">
                <el-option label="不需要" value="not_needed" />
                <el-option label="待处方" value="pending" />
                <el-option label="加工中" value="processing" />
                <el-option label="已完成" value="completed" />
                <el-option label="客户自配" value="self_supplied" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="数量" width="70">
            <template #default="{ row }">
              <el-input-number v-model="row.quantity" :min="1" size="small" style="width: 60px" />
            </template>
          </el-table-column>
          <el-table-column label="单价" width="100">
            <template #default="{ row }">
              <el-input-number v-model="row.unitPrice" :min="0" :precision="2" size="small" style="width: 90px" />
            </template>
          </el-table-column>
          <el-table-column label="小计" width="90" align="right">
            <template #default="{ row }">¥{{ (row.quantity * row.unitPrice).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column width="40" align="center">
            <template #default="{ $index }">
              <el-button size="small" type="danger" link @click="createForm.items.splice($index, 1)">✕</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-button type="dashed" style="width: 100%; margin-top: 8px" @click="addOrderItem">+ 添加商品</el-button>

        <el-divider content-position="left">金额</el-divider>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="运费">
              <el-input-number v-model="createForm.shippingFee" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="优惠">
              <el-input-number v-model="createForm.discountAmount" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="实付">
              <el-input :model-value="calcActual()" disabled style="font-weight: bold" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备注">
          <el-input v-model="createForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCreate" :loading="submitting">创建订单</el-button>
      </template>
    </el-dialog>

    <!-- 发货对话框 -->
    <el-dialog v-model="shipVisible" title="🚚 发货" width="400px">
      <el-form :model="shipForm" label-width="80px">
        <el-form-item label="物流公司">
          <el-select v-model="shipForm.carrier" style="width: 100%">
            <el-option label="顺丰" value="sf" />
            <el-option label="中通" value="zto" />
            <el-option label="圆通" value="yto" />
            <el-option label="韵达" value="yunda" />
            <el-option label="京东" value="jd" />
            <el-option label="EMS" value="ems" />
          </el-select>
        </el-form-item>
        <el-form-item label="运单号">
          <el-input v-model="shipForm.trackingNo" placeholder="请输入物流单号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipVisible = false">取消</el-button>
        <el-button type="primary" @click="submitShip" :loading="submitting">确认发货</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import {
  getOrderList, getOrderDetail, createOrder, updateOrderStatus, cancelOrder, createShipment, getOrderStats,
} from '@/api/order';
import { getCustomerList, getCustomerLensSummary } from '@/api/customer';
import { getStructureList } from '@/api/structure';
import { ElMessage } from 'element-plus';
import { useDict } from '@/composables/useDict';
// TASK-013 Batch 2: 前端订单常量（与后端 order.constants.ts 保持一致的值域）
const ORDER_STATUS = {
  pending: 'pending', confirmed: 'confirmed', paid: 'paid',
  shipped: 'shipped', delivered: 'delivered', completed: 'completed', cancelled: 'cancelled',
} as const;
const ORDER_TYPES = { retail: 'retail', wholesale: 'wholesale', set: 'set' } as const;
const FULFILLMENT_TYPE = { frame_only: 'frame_only', lens_and_frame: 'lens_and_frame', lens_only: 'lens_only' } as const;
const LENS_STATUS = { not_needed: 'not_needed', pending: 'pending', processing: 'processing', completed: 'completed', self_supplied: 'self_supplied' } as const;

// ===== 字典加载 =====
const orderStatusDict = useDict('dict_order_status');
const paymentStatusDict = useDict('dict_payment_status');
const customerTypeDict = useDict('dict_customer_type');

// Bridge: narrow Ref<DictItem[]> for template v-for type safety
const orderStatusItems = computed(() => orderStatusDict.items.value);
const paymentStatusItems = computed(() => paymentStatusDict.items.value);
const customerTypeItems = computed(() => customerTypeDict.items.value);

// ===== 状态 =====
const loading = ref(false);
const selectedOrders = ref<Record<string, unknown>[]>([]);

function onSelectionChange(rows: Record<string, unknown>[]) {
  selectedOrders.value = rows;
}

const canShipStatuses: string[] = [ORDER_STATUS.paid, ORDER_STATUS.confirmed]
const canCancelExcludes: string[] = [ORDER_STATUS.completed, ORDER_STATUS.cancelled]
const canConfirmSelected = computed(() =>
  selectedOrders.value.length > 0 && selectedOrders.value.every((r) => r.status === ORDER_STATUS.pending)
);
const canShipSelected = computed(() =>
  selectedOrders.value.length > 0 && selectedOrders.value.every((r) => canShipStatuses.includes(r.status as string))
);
const canCancelSelected = computed(() =>
  selectedOrders.value.length > 0 && selectedOrders.value.every((r) => !canCancelExcludes.includes(r.status as string))
);

async function batchConfirm() {
  for (const row of selectedOrders.value) {
    await confirmOrder(row);
  }
  selectedOrders.value = [];
  loadData();
}
async function batchShip() {
  if (selectedOrders.value.length > 1) {
    return ElMessage.warning('发货请逐个操作，一次只发一个订单');
  }
  openShipDialog(selectedOrders.value[0]);
  selectedOrders.value = [];
}
async function batchCancel() {
  for (const row of selectedOrders.value) {
    await cancelOrder(String(row.orderId ?? ''), { remark: '批量取消' });
  }
  ElMessage.success('所选订单已取消');
  selectedOrders.value = [];
  loadData();
}

const tableData = ref<Record<string, unknown>[]>([]);
const total = ref(0);
const query = reactive({ keyword: '', status: '', paymentStatus: '', orderType: '', page: 1, pageSize: 20 });

interface OrderStats { total: number; pending: number; paid: number; shipping: number; completed: number; cancelled: number; todaySales: string }
const stats = ref<OrderStats>({ total: 0, pending: 0, paid: 0, shipping: 0, completed: 0, cancelled: 0, todaySales: '0' });

function ensureStats(s: OrderStats | null | undefined): OrderStats {
  return {
    total: s?.total ?? 0,
    pending: s?.pending ?? 0,
    paid: s?.paid ?? 0,
    shipping: s?.shipping ?? 0,
    completed: s?.completed ?? 0,
    cancelled: s?.cancelled ?? 0,
    todaySales: s?.todaySales ?? '0',
  };
}

const statCards = computed(() => {
  const s = ensureStats(stats.value);
  return [
    { label: '总订单', value: s.total },
    { label: '待处理', value: s.pending },
    { label: '已支付', value: s.paid },
    { label: '发货中', value: s.shipping },
    { label: '已完成', value: s.completed },
    { label: '今日销售', value: `¥${(parseFloat(s.todaySales) || 0).toFixed(0)}` },
  ];
});

// ===== 详情 =====
const detailVisible = ref(false);
interface LogItem { logId: string; createdAt: string; action: string; oldStatus?: string; newStatus?: string; remark?: string }
interface CurrentOrderData { orderId?: string; orderNo?: string; status?: string; customerName?: string; customerPhone?: string; orderType?: string; paymentMethod?: string; totalAmount?: number; discountAmount?: number; shippingFee?: number; actualAmount?: number; createdAt?: string; remark?: string; address?: Record<string,string>; structureStandardCode?: string; items?: Record<string,unknown>[]; payments?: Record<string,unknown>[]; shipments?: Record<string,unknown>[]; logs?: LogItem[] }
const currentOrder = ref<CurrentOrderData | null>(null);

async function viewDetail(row: Record<string, unknown>) {
  const res = await getOrderDetail(String(row.orderId ?? ''));
  // axios 拦截器已解包 data
  currentOrder.value = res as unknown as CurrentOrderData;
  detailVisible.value = true;
}

// ===== 创建 =====
const createVisible = ref(false);
const submitting = ref(false);
interface OrderItem { productType: string; productId: string; productName: string; quantity: number; unitPrice: number; structureStandardCode: string; orderFulfillmentType: string; lensStatus: string }
const customerOptions = ref<Record<string, unknown>[]>([]);
const createForm = reactive({
  customerId: '',
  customerName: '',
  customerPhone: '',
  orderType: 'retail',
  structureStandardCode: '',
  items: [] as OrderItem[],
  shippingFee: 0,
  discountAmount: 0,
  remark: '',
});
const lensOptions = ref<Record<string, unknown>[]>([]);
const historyLensNotice = ref('');

function openCreateDialog() {
  Object.assign(createForm, { customerId: '', customerName: '', customerPhone: '', orderType: ORDER_TYPES.retail, structureStandardCode: '', items: [{ productType: 'sku', productId: '', productName: '', quantity: 1, unitPrice: 0, structureStandardCode: '', orderFulfillmentType: FULFILLMENT_TYPE.frame_only, lensStatus: LENS_STATUS.not_needed }], shippingFee: 0, discountAmount: 0, remark: '' });
  historyLensNotice.value = '';
  createVisible.value = true;
}

function addOrderItem() {
  createForm.items.push({ productType: 'sku', productId: '', productName: '', quantity: 1, unitPrice: 0, structureStandardCode: createForm.structureStandardCode || '', orderFulfillmentType: FULFILLMENT_TYPE.frame_only, lensStatus: LENS_STATUS.not_needed });
}

function onFulfillmentTypeChange(row: Record<string, unknown>) {
  if (row.orderFulfillmentType === FULFILLMENT_TYPE.frame_only) {
    row.lensStatus = LENS_STATUS.not_needed;
  } else if (row.orderFulfillmentType === FULFILLMENT_TYPE.lens_and_frame) {
    row.lensStatus = LENS_STATUS.pending;
  } else {
    row.lensStatus = LENS_STATUS.not_needed;
  }
}

async function onCustomerSelect(id: string) {
  const c = customerOptions.value.find(x => x.customerId === id);
  if (c) {
    createForm.customerName = c.contactName as string;
    createForm.customerPhone = c.phone as string;
  }
  // 复购：加载历史镜片
  historyLensNotice.value = '';
  createForm.structureStandardCode = '';
  try {
    const res = await getCustomerLensSummary(id);
    // axios 拦截器已解包 data
    if (res?.lenses?.length > 0) {
      const lenses = (res?.lenses as unknown as Record<string, unknown>[]) ?? [];
      const activeLens = lenses.find((l) => l.status === 'active') || lenses[0];
      const code = activeLens.lensStandardCode;
      const rx = activeLens.prescription as Record<string, string> | undefined;
      const rxInfo = rx ? `球镜: OD${rx.odSphere}/OS${rx.osSphere}` : '';
      historyLensNotice.value = `🔬 该客户历史镜片：${code}${rxInfo ? ' | ' + rxInfo : ''}`;
      const matched = lensOptions.value.find(l => l.externalCode === code);
      if (matched) createForm.structureStandardCode = matched.structureId as string;
    }
  } catch { /* ignore */ }
}

function calcActual() {
  const itemsTotal = createForm.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  return `¥${(itemsTotal - createForm.discountAmount + createForm.shippingFee).toFixed(2)}`;
}

async function submitCreate() {
  if (!createForm.customerId) return ElMessage.warning('请选择客户');
  if (!createForm.structureStandardCode) return ElMessage.warning('请选择结构标准（结构锚点原则：每笔订单必须携带）');
  if (!createForm.items.length) return ElMessage.warning('请添加商品');
  for (const item of createForm.items) {
    if (!item.structureStandardCode) item.structureStandardCode = createForm.structureStandardCode;
  }
  submitting.value = true;
  try {
    await createOrder({ ...createForm });
    ElMessage.success('订单创建成功');
    createVisible.value = false;
    loadData();
  } catch (e: unknown) { const err = e instanceof Error ? e.message : String(e);
    ElMessage.error(err || '创建失败');
  } finally {
    submitting.value = false;
  }
}

// ===== 状态操作 =====
async function confirmOrder(row: Record<string, unknown>) {
  await updateOrderStatus(String(row.orderId ?? ''), { status: ORDER_STATUS.confirmed, remark: '确认订单' });
  ElMessage.success('订单已确认');
  loadData();
}

// ===== 发货 =====
const shipVisible = ref(false);
const shipOrder = ref<Record<string, unknown> | null>(null);
const shipForm = reactive({ carrier: 'sf', trackingNo: '' });

function openShipDialog(row: Record<string, unknown>) {
  shipOrder.value = row;
  Object.assign(shipForm, { carrier: 'sf', trackingNo: '' });
  shipVisible.value = true;
}

async function submitShip() {
  if (!shipForm.trackingNo) return ElMessage.warning('请输入运单号');
  submitting.value = true;
  try {
    if (!shipOrder.value) return;
    await createShipment({ orderId: shipOrder.value.orderId as string, ...shipForm });
    ElMessage.success('发货成功');
    shipVisible.value = false;
    loadData();
  } catch (e: unknown) { const err = e instanceof Error ? e.message : String(e);
    ElMessage.error(err || '发货失败');
  } finally {
    submitting.value = false;
  }
}

// ===== 数据加载 =====
async function loadData() {
  loading.value = true;
  try {
    const res = await getOrderList(query);
    // axios 拦截器已解包 data，res 就是 { items, total, page, pageSize }
    tableData.value = res?.items || [];
    total.value = res?.total || 0;
  } catch (e: unknown) { const err = e instanceof Error ? e.message : String(e);
    ElMessage.error(err || '加载订单失败');
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

async function loadStats() {
  try {
    const res = await getOrderStats();
    // axios 拦截器已解包 data，res 就是 stats 对象
    stats.value = ensureStats(res as unknown as OrderStats | null);
  } catch (e: unknown) { const _err = e instanceof Error ? e.message : String(e);
    console.error('loadStats error:', _err);
  }
}

async function loadCustomers() {
  try {
    const res = await getCustomerList({ page: 1, pageSize: 200 });
    // axios 拦截器已解包 data
    customerOptions.value = (res?.items as unknown as Record<string, unknown>[]) || [];
  } catch { /* ignore */ }
}

async function loadLensOptions() {
  try {
    const res = await getStructureList({ page: 1, pageSize: 200, status: 'active' });
    // axios 拦截器已解包 data
    lensOptions.value = (res?.items as unknown as Record<string, unknown>[]) || [];
  } catch { /* ignore */ }
}

function resetQuery() {
  Object.assign(query, { keyword: '', status: '', paymentStatus: '', orderType: '', page: 1 });
  loadData();
}

// ===== 工具 =====
// TASK-013 Batch 2: 状态标签函数改为字典驱动，fallback 保持向后兼容
function statusTag(s: string) {
  if (orderStatusDict.labels.value[s]) {
    const m: Record<string, string> = { pending: 'info', confirmed: 'primary', paid: 'success', shipped: 'warning', completed: '', cancelled: 'danger' };
    return m[s] || '';
  }
  const m: Record<string, string> = { pending: 'info', confirmed: 'primary', paid: 'success', shipped: 'warning', completed: '', cancelled: 'danger' };
  return m[s] || '';
}
// ✅ F2-3: 订单状态中文 fallback 映射
function statusLabel(s: string) {
  return orderStatusDict.labels.value[s] || { pending: '待处理', confirmed: '已确认', paid: '已支付', shipped: '已发货', completed: '已完成', cancelled: '已取消' }[s] || s;
}
// ✅ F2-5: 订单类型中文 fallback 映射
function orderTypeLabel(t: string) {
  return customerTypeDict.labels.value[t] || { retail: '零售', wholesale: '批发', partner: '合作' }[t] || t;
}
// ✅ F2-4: 支付状态中文 fallback 映射
function payLabel(s: string) {
  return paymentStatusDict.labels.value[s] || { unpaid: '未支付', paid: '已支付', partial: '部分支付' }[s] || s;
}
function fulfillmentTag(t: string) {
  const m: Record<string, string> = { frame_only: '', lens_and_frame: 'warning', lens_only: 'info' };
  return m[t] || '';
}
function fulfillmentLabel(t: string) {
  const m: Record<string, string> = { frame_only: '裸框', lens_and_frame: '眼镜', lens_only: '单镜片' };
  return m[t] || t;
}
function lensStatusTag(s: string) {
  const m: Record<string, string> = { not_needed: 'info', pending: 'warning', processing: '', completed: 'success', self_supplied: 'info' };
  return m[s] || '';
}
function lensStatusLabel(s: string) {
  const m: Record<string, string> = { not_needed: '不需要', pending: '待处方', processing: '加工中', completed: '已完成', self_supplied: '客户自配' };
  return m[s] || s;
}
function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d).toLocaleString('zh-CN', { hour12: false });
}

onMounted(() => {
  loadData();
  loadStats();
  loadCustomers();
  loadLensOptions();
});
</script>

<style scoped>
.order-page { padding: 0; }
.detail-content { line-height: 1.8; }
.detail-content p { margin: 4px 0; }


/* 输入框宽度修复 */
.el-dialog .el-input,
.el-dialog .el-select,
.el-dialog .el-date-editor { width: 100% !important; }
.el-dialog .el-input-number { width: 100% !important; }
</style>
