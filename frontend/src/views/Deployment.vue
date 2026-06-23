<template>
  <div class="deployment-page">
    <h2>开发管理</h2>

    <!-- 部署模式切换 -->
    <el-card shadow="hover" style="margin-bottom: 20px" :class="modeCardClass">
      <template #header>
        <span>{{ modeIcon }} 当前模式：{{ deployMode.label }}</span>
        <el-tag size="small" :type="modeTagType" style="margin-left: 8px">{{ deployMode.mode }}</el-tag>
        <span style="margin-left: 16px; font-size: 13px; color: #909399">{{ deployMode.desc }}</span>
      </template>
      <div style="display: flex; align-items: center; gap: 12px">
        <span style="font-size: 13px; color: #606266">切换模式：</span>
        <el-button
          size="small"
          :type="deployMode.mode === 'operator' ? 'primary' : 'default'"
          :loading="switchingMode === 'operator'"
          @click="switchMode('operator')"
        >
          运营模式</el-button
        >
        <el-button
          size="small"
          :type="deployMode.mode === 'developer' ? 'warning' : 'default'"
          :loading="switchingMode === 'developer'"
          @click="switchMode('developer')"
        >
          开发模式</el-button
        >
        <el-button
          size="small"
          :type="deployMode.mode === 'maintainer' ? 'danger' : 'default'"
          :loading="switchingMode === 'maintainer'"
          @click="switchMode('maintainer')"
        >
          维护模式</el-button
        >
        <el-divider direction="vertical" />
        <div v-for="r in deployMode.restrictions" :key="r" style="font-size: 12px; color: #909399">· {{ r }}</div>
      </div>
    </el-card>

    <!-- 状态概览 -->
    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ status?.production?.version || '—' }}</div>
          <div class="stat-label">生产版本</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ status?.staging?.version || '—' }}</div>
          <div class="stat-label">测试版本</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ pendingCount }}</div>
          <div class="stat-label">待发布变更</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card" :class="syncCardClass">
          <div class="stat-value">{{ status?.synced ? ' 已同步' : ' 不同步' }}</div>
          <div class="stat-label">环境状态</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 环境详情 -->
    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span> Production（生产环境 :3000）</span></template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="分支">{{ status?.production?.branch || '—' }}</el-descriptions-item>
            <el-descriptions-item label="Commit">{{ status?.production?.commit || '—' }}</el-descriptions-item>
            <el-descriptions-item label="运行状态">
              <el-tag :type="status?.production?.running ? 'success' : 'danger'" size="small">
                {{ status?.production?.running ? '运行中' : '已停止' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="部署模式">operator</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span> Staging（测试环境 :3001）</span></template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="分支">{{ status?.staging?.branch || '—' }}</el-descriptions-item>
            <el-descriptions-item label="Commit">{{ status?.staging?.commit || '—' }}</el-descriptions-item>
            <el-descriptions-item label="激活状态">
              <el-tag v-if="isDeveloperMode" :type="status?.staging?.running ? 'success' : 'warning'" size="small">
                {{ status?.staging?.running ? '运行中 :3001' : '激活中...' }}
              </el-tag>
              <span v-else style="color: #909399"> 未激活</span>
            </el-descriptions-item>
            <el-descriptions-item label="部署模式">{{ isDeveloperMode ? 'developer' : '—' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>

    <!-- 操作按钮 -->
    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header><span> 操作</span></template>
          <el-space>
            <el-button type="primary" :loading="syncing" :disabled="status?.synced" @click="handleSync">
              同步 Staging → Production
            </el-button>
            <el-button @click="loadStatus"> 刷新状态</el-button>
            <el-button type="warning" :disabled="status?.staging?.running" @click="handleStartStaging">
              启动 Staging
            </el-button>
            <el-popconfirm title="确认重启生产环境？服务将中断几秒。" @confirm="handleRestartProduction">
              <template #reference>
                <el-button type="danger"> 重启 Production</el-button>
              </template>
            </el-popconfirm>
          </el-space>
        </el-card>
      </el-col>
    </el-row>

    <!-- 变更列表 -->
    <el-card shadow="hover">
      <template #header>
        <span> 变更记录</span>
        <el-button size="small" type="primary" style="float: right" @click="loadStatus">刷新</el-button>
      </template>
      <el-table v-loading="loading" :data="deltas" stripe border size="small">
        <el-table-column prop="id" label="变更编号" width="180" />
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.type === 'feat' ? 'success' : row.type === 'fix' ? 'warning' : 'info'">
              {{ row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="summary" label="摘要" min-width="200" />
        <el-table-column prop="branch" label="分支" width="150" />
        <el-table-column label="状态" width="130">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">{{ row.createdAt?.split('T')[0] }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending_staging'"
              size="small"
              type="primary"
              @click="deployStaging(row.id)"
            >
              部署到 Staging
            </el-button>
            <el-button v-if="row.status === 'on_staging'" size="small" type="warning" @click="verifyStaging(row.id)">
              验收
            </el-button>
            <el-button v-if="row.status === 'verified'" size="small" type="success" @click="promoteProduction(row.id)">
              发布到生产
            </el-button>
            <el-button v-if="row.status === 'promoted'" size="small" disabled> 已上线 </el-button>
            <el-button v-if="row.status === 'rolled_back'" size="small" disabled> 已回滚 </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="deltas.length === 0" style="text-align: center; color: #999; padding: 40px">
        暂无变更记录 · 通过 ERA-Chat 发起代码修改后，变更将自动出现在这里
      </div>
    </el-card>

    <!-- 回滚面板 -->
    <el-card v-if="rollbackHistory.length > 0" shadow="hover" style="margin-top: 20px">
      <template #header><span> 回滚历史</span></template>
      <el-table :data="rollbackHistory" stripe border size="small">
        <el-table-column prop="id" label="变更编号" width="180" />
        <el-table-column prop="summary" label="摘要" />
        <el-table-column prop="status" label="状态" width="100" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/api/request'

const loading = ref(false)
const syncing = ref(false)
interface EnvStatus {
  version?: string
  branch?: string
  commit?: string
  running?: boolean
}
interface DeploymentStatus {
  synced?: boolean
  running?: boolean
  branch?: string
  commit?: string
  production?: EnvStatus
  staging?: EnvStatus
  pendingDeltas?: DeltaItem[]
  [key: string]: unknown
}
interface DeltaItem {
  status: string
  [key: string]: unknown
}
const status = ref<DeploymentStatus | null>(null)
const deltas = ref<DeltaItem[]>([])

const pendingCount = computed(
  () => deltas.value.filter((d) => d.status !== 'promoted' && d.status !== 'rolled_back').length,
)
const rollbackHistory = computed(() => deltas.value.filter((d) => d.status === 'rolled_back'))
const syncCardClass = computed(() => (status.value?.synced ? '' : 'stat-card-warn'))

// ═══ 部署模式 ═══
const deployMode = reactive({
  mode: 'operator',
  label: '运营模式',
  desc: '',
  restrictions: [] as string[],
})
const switchingMode = ref('')
const modeIcon = computed(() => (deployMode.mode === 'operator' ? '' : deployMode.mode === 'developer' ? '' : ''))
const modeTagType = computed(() =>
  deployMode.mode === 'operator' ? 'primary' : deployMode.mode === 'developer' ? 'warning' : 'danger',
)
const modeCardClass = computed(() => (deployMode.mode === 'maintainer' ? 'mode-card-danger' : ''))
const isDeveloperMode = computed(() => deployMode.mode !== 'operator')

async function loadDeployMode() {
  try {
    const r = (await request.get('/deployment/mode')) as Record<string, unknown>
    const d = (r?.data || r) as Record<string, unknown>
    if (d) {
      deployMode.mode = (d.mode as string) || 'operator'
      deployMode.label = (d.label as string) || '运营模式'
      deployMode.desc = (d.desc as string) || ''
      deployMode.restrictions = (d.restrictions as string[]) || []
    }
  } catch {
    /* ignore */
  }
}

async function switchMode(mode: string) {
  if (mode === deployMode.mode) return
  if (mode === 'maintainer') {
    try {
      await ElMessageBox.confirm(
        '切换到维护模式后，Agent 将获得完全开放权限，可以修改引擎核心代码。秒镜科技对维护模式下的操作不承担技术支持义务。确认继续？',
        '维护模式确认',
        { confirmButtonText: '确认切换', cancelButtonText: '取消', type: 'warning' },
      )
    } catch {
      return
    }
  }
  if (mode === 'developer' && deployMode.mode === 'operator') {
    try {
      await ElMessageBox.confirm(
        '你即将进入开发模式，Agent 可以修改项目源代码（引擎核心除外）。此模式下对系统文件的修改由用户自行承担。确认继续？',
        '开发模式确认',
        { confirmButtonText: '确认切换', cancelButtonText: '取消', type: 'warning' },
      )
    } catch {
      return
    }
  }
  switchingMode.value = mode
  try {
    await request.put('/deployment/mode', { mode })
    ElMessage.success(`已切换到${mode === 'operator' ? '运营' : mode === 'developer' ? '开发' : '维护'}模式`)
    // 切换 developer/maintainer 时自动启动 staging
    if (mode !== 'operator' && !status.value?.staging?.running) {
      try {
        await request.post('/deployment/sync', {})
        ElMessage.success('Staging 环境已自动启动')
      } catch {
        /* ignore */
      }
    }
    // 切回 operator 时如果 staging 在跑，提醒可以停止
    if (mode === 'operator' && status.value?.staging?.running) {
      ElMessage.info('Staging 环境仍在运行，可在操作面板中停止')
    }
    await loadDeployMode()
    await loadStatus()
  } catch (e: unknown) {
    ElMessage.error((e as Error).message || '切换失败')
  } finally {
    switchingMode.value = ''
  }
}

// ═══ 状态管理 ═══

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending_staging: '待部署',
    on_staging: '测试中',
    verified: '已验收',
    promoted: '已上线',
    rolled_back: '已回滚',
  }
  return map[s] || s
}

function statusTagType(s: string) {
  const map: Record<string, string> = {
    pending_staging: 'info',
    on_staging: 'warning',
    verified: 'success',
    promoted: '',
    rolled_back: 'danger',
  }
  return map[s] || 'info'
}

async function loadStatus() {
  loading.value = true
  try {
    const r = (await request.get('/deployment/status')) as Record<string, unknown>
    status.value = (r?.data || r) as DeploymentStatus
    deltas.value = (status.value?.pendingDeltas || []) as DeltaItem[]
  } catch {
    /* ignore */
  } finally {
    loading.value = false
  }
}

async function handleSync() {
  syncing.value = true
  try {
    await request.post('/deployment/sync', {})
    ElMessage.success('Staging 已与 Production 同步')
    await loadStatus()
  } catch (e: unknown) {
    ElMessage.error((e as Error).message || '同步失败')
  } finally {
    syncing.value = false
  }
}

async function deployStaging(id: string) {
  try {
    await request.post(`/deployment/deltas/${id}/deploy-staging`, {})
    ElMessage.success('已部署到 Staging')
    await loadStatus()
  } catch (e: unknown) {
    ElMessage.error((e as Error).message || '部署失败')
  }
}

async function verifyStaging(id: string) {
  try {
    await request.post(`/deployment/deltas/${id}/verify`, {})
    ElMessage.success('Staging 验收通过')
    await loadStatus()
  } catch (e: unknown) {
    ElMessage.error((e as Error).message || '验收失败')
  }
}

async function promoteProduction(id: string) {
  try {
    await ElMessageBox.confirm('确认将此变更发布到生产环境？', '发布确认', {
      confirmButtonText: '确认发布',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await request.post(`/deployment/deltas/${id}/promote`, {})
    ElMessage.success('已发布到生产环境')
    await loadStatus()
  } catch {
    /* 取消 */
  }
}

async function handleStartStaging() {
  try {
    await request.post('/deployment/sync', {})
    ElMessage.success('Staging 已启动')
    await loadStatus()
  } catch (e: unknown) {
    ElMessage.error((e as Error).message || '启动失败')
  }
}

async function handleRestartProduction() {
  try {
    await request.post('/deployment/sync', {})
    ElMessage.success('Production 已重启')
    await loadStatus()
  } catch (e: unknown) {
    ElMessage.error((e as Error).message || '重启失败')
  }
}

import { ElMessageBox } from 'element-plus'

onMounted(() => {
  loadStatus()
  loadDeployMode()
})
</script>

<style scoped>
.deployment-page {
  padding: 16px;
}
.deployment-page h2 {
  margin: 0 0 20px;
  color: #303133;
}
.stat-card {
  text-align: center;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 4px;
}
.stat-label {
  font-size: 13px;
  color: #909399;
}
.stat-card-warn {
  border: 1px solid #e6a23c;
}
.mode-card-danger {
  border-left: 3px solid #f56c6c;
  background: #fef0f0;
}
</style>
