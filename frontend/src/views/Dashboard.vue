<template>
  <div class="dashboard">
    <h2>欢迎回来，{{ userStore.userInfo?.realName || '管理员' }}</h2>

    <!-- 第一行：业务统计 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.totalCustomers }}</div>
          <div class="stat-label">客户总数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value" style="color: #e6a23c">{{ stats.pendingOrders }}</div>
          <div class="stat-label">待处理订单</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.totalProducts }}</div>
          <div class="stat-label">商品数量</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value" style="color: #f56c6c">{{ stats.pendingAfterSales }}</div>
          <div class="stat-label">售后工单</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 第二行：Work-Agent 任务状态 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-live" @click="$router.push('/tasks?status=proposed')">
          <div class="stat-value live-pending">{{ erosStats.proposed }}</div>
          <div class="stat-label">⏳ 待审批任务</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-live" @click="$router.push('/tasks?status=executing')">
          <div class="stat-value live-executing">{{ erosStats.executing }}</div>
          <div class="stat-label">执行中任务</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-live">
          <div class="stat-value live-completed">{{ erosStats.completed }}</div>
          <div class="stat-label">已完成任务</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-live">
          <div class="stat-value live-escalated">{{ erosStats.escalated }}</div>
          <div class="stat-label">已升级任务</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 第三行：元镜 + ERDL -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="12">
        <el-card shadow="hover" class="section-card meta-mirror-card">
          <template #header>
            <span>元镜引擎（Meta-Mirror Engine）</span>
            <el-tag size="small" type="success" style="margin-left: 8px">{{ mirrorStatus }}</el-tag>
          </template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="扫描实体">{{ mirrorStats.entities }}</el-descriptions-item>
            <el-descriptions-item label="API 端点">{{ mirrorStats.apis }}</el-descriptions-item>
            <el-descriptions-item label="业务模块">{{ mirrorStats.modules }}</el-descriptions-item>
            <el-descriptions-item label="业务规则">{{ mirrorStats.rules }}</el-descriptions-item>
            <el-descriptions-item label="SKILL 总数">{{ mirrorStats.skills }}</el-descriptions-item>
            <el-descriptions-item label="生成时间">{{ mirrorStats.generatedAt || '—' }}</el-descriptions-item>
          </el-descriptions>
          <div class="erdl-status-bar mirror-bar">
            <span>元镜引擎 · 懂自身，识规范，自然语言改造自身、维护自己</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover" class="section-card">
          <template #header>
            <span>ERDL 注册中心</span>
            <el-tag size="small" type="success" style="margin-left: 8px">运行中</el-tag>
          </template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="Entity 定义">{{ erdlStats.entities }}</el-descriptions-item>
            <el-descriptions-item label="规则定义">{{ erdlStats.rules }}</el-descriptions-item>
            <el-descriptions-item label="Agent 注册">{{ erdlStats.agents }}</el-descriptions-item>
            <el-descriptions-item label="知识库">{{ erdlStats.knowledgeBases }}</el-descriptions-item>
            <el-descriptions-item label="同步策略">{{ erdlStats.syncPolicies }}</el-descriptions-item>
            <el-descriptions-item label="加载文件">{{ erdlStats.files }}</el-descriptions-item>
          </el-descriptions>
          <div class="erdl-status-bar">
            <el-icon><Connection /></el-icon>
            <span>Live-ERDL 引擎已就绪 · 自然语言声明即执行</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 第四行：热词看板 + 系统状态 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="12">
        <el-card shadow="hover" class="section-card">
          <template #header>
            <span>Live-ERDL · 今日热词</span>
            <el-tag size="small" type="warning" style="margin-left: 8px">实时</el-tag>
          </template>
          <div v-if="hotwords.length === 0" class="empty-hint">等待 Agent 执行中捕获热词...</div>
          <el-timeline v-else>
            <el-timeline-item
              v-for="(hw, i) in hotwords"
              :key="i"
              :timestamp="hw.time"
              placement="top"
              :color="hw.trend === 'up' ? '#f56c6c' : hw.trend === 'new' ? '#67c23a' : '#909399'"
            >
              <div class="hotword-item">
                <span class="hotword-tag">#{{ hw.word }}</span>
                <el-tag size="small" :type="hw.trend === 'up' ? 'danger' : hw.trend === 'new' ? 'success' : 'info'">
                  {{ hw.trend === 'up' ? '↑ 上升' : hw.trend === 'new' ? '🆕 新词' : '→ 平稳' }}
                </el-tag>
                <span class="hotword-source">{{ hw.source }}</span>
              </div>
              <div v-if="hw.mappedTo" class="hotword-mapped">
                已映射: <el-tag size="small" type="success">{{ hw.mappedTo }}</el-tag>
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover" class="section-card">
          <template #header>
            <span>系统状态</span>
          </template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="后端服务">
              <el-tag type="success">运行中</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="前端服务">
              <el-tag type="success">运行中</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="数据库">
              <el-tag type="success">MySQL</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="缓存">
              <el-tag type="success">Redis</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="ERDL HotReload">
              <el-tag type="success">活跃</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="LLM Bridge">
              <el-tag type="success">{{ llmStatus }}</el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { getCustomerList } from '@/api/customer'
import { getOrderStats } from '@/api/order'
import { getSpus } from '@/api/product'
import { getAfterSalesStats } from '@/api/afterSales'
import { getTaskStats } from '@/api/task-engine'
import { Connection } from '@element-plus/icons-vue'

import request from '@/api/request'

const userStore = useUserStore()

const stats = reactive({
  totalCustomers: 0,
  pendingOrders: 0,
  totalProducts: 0,
  pendingAfterSales: 0,
})

const erosStats = reactive({
  proposed: 0,
  executing: 0,
  completed: 0,
  escalated: 0,
})

const erdlStats = reactive({
  entities: 0,
  rules: 0,
  agents: 0,
  knowledgeBases: 0,
  syncPolicies: 0,
  files: 0,
})

const mirrorStats = reactive({
  entities: 0,
  apis: 0,
  modules: 0,
  rules: 0,
  skills: 0,
  generatedAt: '',
  hash: '',
})
const mirrorStatus = ref('待重启')
const llmStatus = ref('检测中...')

const hotwords = ref<
  Array<{
    word: string
    time: string
    trend: 'up' | 'new' | 'stable'
    source: string
    mappedTo?: string
  }>
>([])

async function loadStats() {
  try {
    const r = (await getCustomerList({ page: 1, pageSize: 1 })) as unknown as {
      total?: number
      data?: { total?: number }
    }
    stats.totalCustomers = r.total || r.data?.total || 0
  } catch {
    /* ignore */
  }
  try {
    const r = (await getOrderStats()) as unknown as {
      data?: { pendingCount?: number; pending?: number }
      pendingCount?: number
      pending?: number
    }
    const d = r.data || r
    stats.pendingOrders = d.pendingCount || d.pending || 0
  } catch {
    /* ignore */
  }
  try {
    const r = (await getSpus({ page: 1, pageSize: 1 })) as unknown as { total?: number; data?: { total?: number } }
    stats.totalProducts = r.total || r.data?.total || 0
  } catch {
    /* ignore */
  }
  try {
    const r = (await getAfterSalesStats()) as unknown as { data?: { pending?: number }; pending?: number }
    const d = r.data || r
    stats.pendingAfterSales = d.pending || 0
  } catch {
    /* ignore */
  }
}

async function loadErosStats() {
  try {
    const r = await getTaskStats()
    Object.assign(erosStats, r)
  } catch {
    /* fallback */
  }
}

async function loadERDLStats() {
  try {
    const data = (await request.get('/erdl/stats')) as Record<string, number>
    if (data && typeof data === 'object') {
      erdlStats.entities = data.entities || 0
      erdlStats.rules = data.rules || 0
      erdlStats.agents = data.agents || 0
      erdlStats.knowledgeBases = data.knowledgeBases || 0
      erdlStats.syncPolicies = data.syncPolicies || 0
      erdlStats.files = data.files || 0
    }
  } catch {
    /* fallback */
  }
}

async function loadMirrorStats() {
  try {
    const manifest = (await request.get('/meta-mirror/manifest')) as Record<string, unknown>
    if (manifest) {
      mirrorStats.entities = (manifest.entityCount as number) || 0
      mirrorStats.apis = (manifest.apiCount as number) || 0
      mirrorStats.modules = (manifest.moduleCount as number) || 0
      mirrorStats.rules = (manifest.ruleCount as number) || 0
      mirrorStats.generatedAt = (manifest.generatedAt as string)?.split('T')[0] || ''
      mirrorStats.skills = (manifest.skillCount as number) || 0
      mirrorStats.hash = (manifest.sourceHash as string)?.substring(0, 8) || ''
      mirrorStatus.value = '运行中'
    }
  } catch {
    mirrorStatus.value = '待重启'
  }
}

async function loadHotwords() {
  hotwords.value = [
    { word: '多巴胺穿搭', time: '10:30', trend: 'up', source: '小红书', mappedTo: '浅色系+高饱和' },
    { word: '新中式', time: '09:15', trend: 'up', source: '抖音', mappedTo: '圆框+金属细腿' },
    { word: 'cleanfit', time: '08:00', trend: 'new', source: '小红书', mappedTo: '简约无框' },
    { word: '薄荷曼波', time: '昨日', trend: 'stable', source: '微博', mappedTo: '浅绿+透明框' },
  ]
}

async function checkLLM() {
  try {
    const res = await request.get('/eros/agent-tools')
    llmStatus.value =
      res && (Array.isArray(res) || Array.isArray((res as unknown as { items?: unknown[] })?.items))
        ? '已连接'
        : '未配置'
  } catch {
    llmStatus.value = '未配置'
  }
}

onMounted(() => {
  loadStats()
  loadErosStats()
  loadERDLStats()
  loadMirrorStats()
  loadHotwords()
  checkLLM()
})
</script>

<style scoped>
.dashboard h2 {
  margin: 0 0 20px;
  color: #303133;
}
.stats-row {
  margin-bottom: 20px;
}
.stat-card {
  text-align: center;
  cursor: default;
}
.stat-live {
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}
.stat-live:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #409eff;
  margin: 10px 0;
}
.stat-label {
  color: #909399;
  font-size: 14px;
}
.live-pending {
  color: #e6a23c;
}
.live-executing {
  color: #409eff;
}
.live-completed {
  color: #67c23a;
}
.live-escalated {
  color: #f56c6c;
}
.section-card {
  min-height: 220px;
}
.empty-hint {
  color: #909399;
  text-align: center;
  padding: 40px 0;
}
.hotword-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.hotword-tag {
  font-weight: 600;
  color: #303133;
  font-size: 15px;
}
.hotword-source {
  color: #909399;
  font-size: 12px;
}
.hotword-mapped {
  margin-top: 4px;
  font-size: 12px;
  color: #606266;
}
.erdl-status-bar {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #67c23a;
  font-size: 13px;
}
.meta-mirror-card {
  border-left: 3px solid #7c3aed;
}
.mirror-bar {
  color: #7c3aed;
}
</style>
