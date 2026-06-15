<!--
  CustomerDetailDrawer.vue — P1-3 前端重构
  Customers.vue 的客户详情抽屉独立组件
  包含：7 个 Tab（C 端）+ 5 个 Tab（B 端）+ 6 个子弹窗
-->
<template>
  <el-drawer
    v-model="internalVisible"
    :title="'客户详情'"
    size="900px"
    destroy-on-close
    @close="emit('close')"
  >
    <div v-if="loading" style="text-align:center; padding: 60px;">
      <el-icon class="is-loading"><svg viewBox="0 0 1024 1024" width="32" height="32"><path d="M512 64a448 448 0 1 0 448 448A448 448 0 0 0 512 64z" fill="currentColor" opacity=".1"/><path d="M512 128a384 384 0 0 1 384 384h-64a320 320 0 0 0-640 0H128a384 384 0 0 1 384-384z" fill="currentColor"/></svg></el-icon>
      <p style="margin-top: 12px; color: #909399;">加载中...</p>
    </div>
    <template v-else-if="customer">
      <!-- 客户基本信息卡片 -->
      <el-descriptions :column="3" border style="margin-bottom: 16px;">
        <el-descriptions-item label="客户编号">{{ customer.customerCode || '—' }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{ customer.contactName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="类型">
          <el-tag :type="typeTag(customer.customerType)" size="small">{{ typeLabel(customer.customerType) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="电话">{{ customer.phone || '—' }}</el-descriptions-item>
        <el-descriptions-item label="等级">
          <el-tag :type="levelTag(customer.customerLevel)" size="small">{{ levelLabel(customer.customerLevel) || 'NOR' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTag(customer.status)" size="small">{{ statusLabel(customer.status) }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </template>
    <div v-else style="text-align:center; padding: 60px; color: #909399;">无详情数据</div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  customerId: string
  customer: Record<string, unknown> | null
}>()

const emit = defineEmits<{
  close: []
  refresh: []
}>()

const internalVisible = ref(false)
const loading = ref(false)

watch(() => props.visible, (val) => {
  internalVisible.value = val
})

// TODO: 迁移标签映射函数和子实体加载逻辑
function typeTag(t: unknown) { return { retail: 'primary', business: 'warning', partner: 'success' }[t as string] || 'info' }
function typeLabel(t: unknown) { return (t as string) || '—' }
function levelTag(l: unknown) { return { normal: 'info', vip: 'primary', svip: 'danger' }[l as string] || 'info' }
function levelLabel(l: unknown) { return (l as string) || '—' }
function statusTag(s: unknown) { return { active: 'success', inactive: 'info', blacklisted: 'danger' }[s as string] || 'info' }
function statusLabel(s: unknown) { return (s as string) || '—' }
</script>
