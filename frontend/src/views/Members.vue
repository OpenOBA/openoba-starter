<template>
  <div class="members-page">
    <!-- 仪表盘概览卡片 -->
    <div class="dashboard-cards">
      <div class="dash-card">
        <div class="dash-value">{{ summary.total }}</div>
        <div class="dash-label">零售会员总数</div>
      </div>
      <div class="dash-card accent-green">
        <div class="dash-value">{{ summary.active30d }}</div>
        <div class="dash-label">近30天活跃</div>
      </div>
      <div class="dash-card accent-orange">
        <div class="dash-value">{{ summary.active90d - summary.active30d }}</div>
        <div class="dash-label">30-90天沉默</div>
      </div>
      <div class="dash-card accent-red">
        <div class="dash-value">{{ summary.total - summary.active90d }}</div>
        <div class="dash-label">流失风险(90天+)</div>
      </div>
      <div class="dash-card">
        <div class="dash-value">¥{{ formatMoney(summary.totalRevenue) }}</div>
        <div class="dash-label">累计营收</div>
      </div>
      <div class="dash-card">
        <div class="dash-value">¥{{ formatMoney(summary.avgSpent) }}</div>
        <div class="dash-label">人均消费</div>
      </div>
      <div class="dash-card">
        <div class="dash-value">{{ summary.avgOrders.toFixed(1) }}</div>
        <div class="dash-label">人均订单</div>
      </div>
    </div>

    <!-- 等级分布 -->
    <div class="section-title">等级分布</div>
    <div class="level-bars">
      <div v-for="lv in levelDistribution" :key="lv.level" class="level-bar-item">
        <div class="level-bar-header">
          <el-tag :type="getLevelTagType(lv.level)" size="small">{{ getLevelName(lv.level) }}</el-tag>
          <span class="level-bar-count">{{ lv.count }} 人</span>
          <span v-if="lv.totalSpent > 0" class="level-bar-spent">¥{{ formatMoney(lv.totalSpent) }}</span>
        </div>
        <el-progress :percentage="lv.count / Math.max(summary.total, 1) * 100" :stroke-width="10" :color="getLevelColor(lv.level)" />
      </div>
    </div>

    <div class="section-title" style="margin-top: 24px">会员分析列表</div>

    <!-- 筛选工具栏 -->
    <div class="toolbar">
      <el-select v-model="filter.level" placeholder="等级" clearable style="width: 120px" @change="loadList">
        <el-option v-for="lv in levelDistribution" :key="lv.level" :label="getLevelName(lv.level)" :value="lv.level" />
      </el-select>
      <el-input v-model="filter.keyword" placeholder="搜索姓名/手机/编号" clearable style="width: 220px" @keyup.enter="loadList" @clear="loadList" />
      <el-select v-model="filter.sortBy" style="width: 140px" @change="loadList">
        <el-option label="消费金额↓" value="totalAmount" />
        <el-option label="最近活跃↓" value="lastActiveAt" />
        <el-option label="订单数↓" value="totalOrders" />
        <el-option label="注册时间↓" value="createdAt" />
      </el-select>
      <el-button type="primary" @click="loadList">查询</el-button>
      <el-button type="warning" size="small" :loading="downgradeScanning" @click="handleDowngradeScan">🔍 降级扫描</el-button>
    </div>

    <!-- 会员分析表格 -->
    <el-table v-loading="loading" :data="list" stripe highlight-current-row @row-dblclick="openCustomerDetail">
      <el-table-column label="活跃状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.activityStatus === 'active' ? 'success' : row.activityStatus === 'dormant' ? 'warning' : 'danger'" size="small">
            {{ ({ active: '活跃', dormant: '沉默', inactive: '流失' } as Record<string,string>)[row.activityStatus] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="contactName" label="姓名" width="100" />
      <el-table-column prop="phone" label="手机" width="130" />
      <el-table-column label="等级" width="100">
        <template #default="{ row }">
          <el-tag :type="getLevelTagType(row.customerLevel || 'normal')" size="small">
            {{ getLevelName(row.customerLevel || 'normal') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="累计消费" width="130" sortable>
        <template #default="{ row }">¥{{ formatMoney(row.totalAmount) }}</template>
      </el-table-column>
      <el-table-column prop="totalOrders" label="订单数" width="80" />
      <el-table-column label="客单价" width="100">
        <template #default="{ row }">¥{{ row.totalOrders > 0 ? formatMoney(row.totalAmount / row.totalOrders) : '-' }}</template>
      </el-table-column>
      <el-table-column label="最近活跃" width="140" sortable>
        <template #default="{ row }">
          <span v-if="row.lastActiveAt" :class="{ 'text-danger': row.daysSinceLastActive > 90 }">
            {{ formatDate(row.lastActiveAt) }}
          </span>
          <span v-else class="text-muted">从未</span>
        </template>
      </el-table-column>
      <el-table-column label="流失风险" width="90">
        <template #default="{ row }">
          <el-tag :type="row.churnRisk === 'high' ? 'danger' : row.churnRisk === 'medium' ? 'warning' : 'success'" size="small">
            {{ ({ high: '高', medium: '中', low: '低' } as Record<string,string>)[row.churnRisk] || '-' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="preferredStyle" label="偏好风格" width="110" show-overflow-tooltip />
      <el-table-column prop="referralSource" label="来源" width="90" />
      <el-table-column label="积分" width="80">
        <template #default="{ row }">{{ row.pointsBalance || 0 }}</template>
      </el-table-column>
      <el-table-column label="入会时间" width="130">
        <template #default="{ row }">{{ row.memberSince ? new Date(row.memberSince).toLocaleDateString('zh-CN') : '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="openCustomerDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > 0"
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="[20, 50, 100]"
      layout="total, sizes, prev, pager, next"
      style="margin-top: 16px; justify-content: flex-end"
      @current-change="loadList"
      @size-change="loadList"
    />

    <!-- 降级扫描结果 -->
    <div v-if="downgradeResult" style="margin-top: 16px">
      <el-alert :title="'扫描完成：' + (downgradeResult.count as number) + ' 个客户需要降级'" :type="(downgradeResult.count as number) > 0 ? 'warning' : 'success'" :closable="false">
        <div v-if="(downgradeResult.details as unknown as Record<string, unknown>[]) && ((downgradeResult.details as unknown as Record<string, unknown>[]).length > 0)" style="margin-top: 8px">
          <el-table :data="downgradeResult.details as unknown as Record<string, unknown>[]" size="small" border>
            <el-table-column prop="contactName" label="客户" width="120" />
            <el-table-column label="变更" width="160">
              <template #default="{ r }">{{ r.oldLevel }} → {{ r.newLevel }}</template>
            </el-table-column>
            <el-table-column label="最后活跃" width="160">
              <template #default="{ r }">{{ r.lastActiveAt ? new Date(r.lastActiveAt).toLocaleDateString('zh-CN') : '-' }}</template>
            </el-table-column>
          </el-table>
        </div>
      </el-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getMemberDashboard, getMemberAnalytics, scanMemberDowngradesNew } from '@/api/customer'

const router = useRouter()
const loading = ref(false)
const downgradeScanning = ref(false)
const downgradeResult = ref<Record<string, unknown> | null>(null)

// 概览
const summary = reactive({
  total: 0, hasSpent: 0, memberCount: 0,
  active30d: 0, active90d: 0,
  avgSpent: 0, totalRevenue: 0, avgOrders: 0,
})
interface LevelDist { level: string; count: number; totalSpent: number; color?: string; percentage?: number; [key:string]: unknown }
const levelDistribution = ref<LevelDist[]>([])

// 列表
const list = ref<Record<string, unknown>[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filter = reactive({ level: '', keyword: '', sortBy: 'totalAmount' })

const loadDashboard = async () => {
  try {
    const res = await getMemberDashboard() as unknown as Record<string, unknown>
    const data = (res.data || res) as Record<string, unknown>
    if (data.summary) Object.assign(summary, data.summary as Record<string, unknown>)
    levelDistribution.value = (data.levelDistribution as unknown as LevelDist[]) || []
  } catch { /* ignore */ }
}

const loadList = async () => {
  loading.value = true
  try {
    const res = await getMemberAnalytics({
      page: page.value, pageSize: pageSize.value,
      level: filter.level, keyword: filter.keyword, sortBy: filter.sortBy,
    }) as unknown as { data?: Record<string, unknown>; items?: Record<string, unknown>[]; total?: number };
    const data: Record<string, unknown> = res.data || res
    list.value = (data.items as Record<string, unknown>[]) || []
    total.value = (data.total as number) || 0
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

const handleDowngradeScan = async () => {
  downgradeScanning.value = true
  try {
    const res = await scanMemberDowngradesNew() as unknown as Record<string, unknown>
    downgradeResult.value = (res.data || res || { count: 0, details: [] }) as Record<string, unknown>
    const count = downgradeResult.value?.count as number
    if (count > 0) {
      ElMessage.warning(`发现 ${count} 个客户需要降级`)
    } else {
      ElMessage.success('没有需要降级的客户')
    }
  } catch { /* ignore */ } finally {
    downgradeScanning.value = false
  }
}

const openCustomerDetail = (row: Record<string, unknown>) => {
  router.push({ path: '/customers', query: { id: row.customerId as string } })
}

const formatMoney = (v: unknown) => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-'

const getLevelName = (code: string) => ({ normal: '普通', vip: 'VIP', svip: 'SVIP', gold: '黄金' }[code] || code)
const getLevelTagType = (code: string): string => ({ normal: 'info', vip: 'primary', svip: 'success', gold: 'warning' }[code] || 'info')
const getLevelColor = (code: string) => ({ normal: '#909399', vip: '#409eff', svip: '#67c23a', gold: '#e6a23c' }[code] || '#909399')

onMounted(() => {
  loadDashboard()
  loadList()
})
</script>

<style scoped>
.members-page { padding: 20px; }
.section-title { font-size: 14px; font-weight: 600; color: #303133; margin: 20px 0 12px; padding-left: 8px; border-left: 3px solid #409eff; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }

/* 仪表盘卡片 */
.dashboard-cards { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
.dash-card {
  background: #f5f7fa; border-radius: 8px; padding: 16px 20px; min-width: 130px; flex: 1;
  text-align: center; border-top: 3px solid #409eff;
}
.dash-card.accent-green { border-top-color: #67c23a; }
.dash-card.accent-orange { border-top-color: #e6a23c; }
.dash-card.accent-red { border-top-color: #f56c6c; }
.dash-value { font-size: 24px; font-weight: 700; color: #303133; }
.dash-label { font-size: 12px; color: #909399; margin-top: 4px; }

/* 等级分布条 */
.level-bars { display: flex; flex-direction: column; gap: 12px; background: #fafafa; border-radius: 8px; padding: 16px; }
.level-bar-item { display: flex; flex-direction: column; gap: 4px; }
.level-bar-header { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.level-bar-count { color: #606266; font-weight: 500; }
.level-bar-spent { color: #909399; font-size: 12px; margin-left: auto; }

.text-danger { color: #f56c6c; font-weight: 500; }
.text-muted { color: #c0c4cc; }
</style>
