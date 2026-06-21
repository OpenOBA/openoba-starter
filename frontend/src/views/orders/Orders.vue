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
      <OrderFilters
        :query="query"
        :order-status-items="orderStatusItems"
        :payment-status-items="paymentStatusItems"
        :customer-type-items="customerTypeItems"
        @search="loadData"
        @reset="resetQuery"
      />

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
            <el-tag :type="statusTag(currentOrder.status)" effect="dark">{{ statusLabel(currentOrder.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="客户">{{ currentOrder.customerName }}</el-descriptions-item>
          <el-descriptions-item label="电话">{{ currentOrder.customerPhone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="订单类型">{{ orderTypeLabel(currentOrder.orderType) }}</el-descriptions-item>
          <el-descriptions-item label="支付方式">{{ currentOrder.paymentMethod || '-' }}</el-descriptions-item>
          <el-descriptions-item label="订单总额">¥{{ Number(currentOrder.totalAmount).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="优惠金额">-¥{{ Number(currentOrder.discountAmount).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="运费">+¥{{ Number(currentOrder.shippingFee).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="实付金额"><b>¥{{ Number(currentOrder.actualAmount).toFixed(2) }}</b></el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">{{ formatDate(currentOrder.createdAt) }}</el-descriptions-item>
          <el-descriptions-item v-if="currentOrder.remark" label="备注" :span="2">{{ currentOrder.remark }}</el-descriptions-item>
        </el-descriptions>
        <el-divider content-position="left">收货地址</el-divider>
        <div v-if="currentOrder.address">
          <p><b>{{ currentOrder.address.receiverName }}</b> {{ currentOrder.address.receiverPhone }}</p>
          <p>{{ currentOrder.address.province }} {{ currentOrder.address.city }} {{ currentOrder.address.district || '' }} {{ currentOrder.address.addressDetail }}</p>
        </div>
        <el-empty v-else description="无收货地址" :image-size="40" />
        <el-divider content-position="left">结构锚点</el-divider>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="结构标准编码">{{ currentOrder.structureStandardCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="订单项结构编码">{{ currentOrder.items?.[0]?.structureStandardCode || '-' }}</el-descriptions-item>
        </el-descriptions>
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
        <el-divider content-position="left">发货记录</el-divider>
        <el-table :data="currentOrder.shipments || []" size="small" border>
          <el-table-column prop="carrier" label="物流" width="80" />
          <el-table-column prop="trackingNo" label="运单号" />
          <el-table-column prop="status" label="状态" width="80" />
          <el-table-column prop="shippedAt" label="发货时间" width="170">
            <template #default="{ row }">{{ row.shippedAt ? formatDate(row.shippedAt) : '-' }}</template>
          </el-table-column>
        </el-table>
        <el-divider content-position="left">操作日志</el-divider>
        <el-timeline>
          <el-timeline-item v-for="log in currentOrder.logs || []" :key="log.logId" :timestamp="formatDate(log.createdAt)" placement="top">
            <el-card shadow="never" :body-style="{ padding: '8px 12px' }">
              <b>{{ log.action }}</b>
              <span v-if="log.oldStatus"> {{ statusLabel(log.oldStatus) }} → {{ statusLabel(log.newStatus) }}</span>
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
            <el-option v-for="l in lensOptions" :key="l.structureId" :label="`${l.externalCode} - ${(l.surfaceTypes||[]).join(',')} ${(l.refractiveIndexes||[]).join(',')}`" :value="l.structureId" />
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
import { onMounted } from 'vue'
import { useOrders } from './composables/useOrders'
import OrderFilters from './components/order/OrderFilters.vue'

const orders = useOrders()

const {
  orderStatusItems, paymentStatusItems, customerTypeItems,
  loading, tableData, total, query, selectedOrders,
  statCards, canConfirmSelected, canShipSelected, canCancelSelected,
  onSelectionChange, batchConfirm, batchShip, batchCancel,
  detailVisible, currentOrder, viewDetail,
  createVisible, submitting, customerOptions, createForm,
  lensOptions, historyLensNotice,
  openCreateDialog, addOrderItem, onFulfillmentTypeChange, onCustomerSelect,
  calcActual, submitCreate,
  shipVisible, shipForm, submitShip,
  loadData, resetQuery,
  statusTag, statusLabel, orderTypeLabel, payLabel,
  fulfillmentTag, fulfillmentLabel, lensStatusTag, lensStatusLabel, formatDate,
  init,
} = orders

onMounted(() => { init() })
</script>

<style scoped>
.order-page { padding: 0; }
.detail-content { line-height: 1.8; }
.detail-content p { margin: 4px 0; }
.el-dialog .el-input, .el-dialog .el-select, .el-dialog .el-date-editor { width: 100% !important; }
.el-dialog .el-input-number { width: 100% !important; }
</style>
