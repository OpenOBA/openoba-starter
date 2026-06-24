<template>
  <div class="mm-dashboard">
    <!-- Header -->
    <div class="mm-header">
      <h2>元镜引擎 · 代码质量看板</h2>
      <el-button size="small" :icon="Refresh" :loading="loading" @click="fetchAll">刷新</el-button>
    </div>

    <!-- Status Cards -->
    <div class="mm-cards">
      <div class="mm-card" :class="statusCardClass">
        <div class="mm-card-icon">◉</div>
        <div class="mm-card-body">
          <div class="mm-card-title">元镜状态</div>
          <div class="mm-card-value">{{ manifest?.status === 'active' ? '运行中' : '未初始化' }}</div>
          <div class="mm-card-detail" v-if="manifest">
            {{ manifest.entityCount }} 实体 · {{ manifest.apiCount }} API · {{ manifest.moduleCount }} 模块
          </div>
        </div>
      </div>

      <div class="mm-card" :class="versionCardClass">
        <div class="mm-card-icon">{{ versionConsistent ? '✓' : '✗' }}</div>
        <div class="mm-card-body">
          <div class="mm-card-title">版本一致性</div>
          <div class="mm-card-value">{{ versionConsistent ? '一致' : '不一致' }}</div>
          <div class="mm-card-detail" v-if="versionInfo">{{ vCurrent?.version || '—' }}</div>
        </div>
      </div>

      <div class="mm-card" :class="gateCardClass">
        <div class="mm-card-icon">∥</div>
        <div class="mm-card-body">
          <div class="mm-card-title">质量门禁</div>
          <div class="mm-card-value">{{ gateCount }} 条规则</div>
          <div class="mm-card-detail">error {{ errorGateCount }} · warning {{ warnGateCount }}</div>
        </div>
      </div>

      <div class="mm-card" :class="rollbackCardClass">
        <div class="mm-card-icon">↺</div>
        <div class="mm-card-body">
          <div class="mm-card-title">回滚安全网</div>
          <div class="mm-card-value">{{ checkpointCount }} 个检查点</div>
          <div class="mm-card-detail" v-if="nearestSafe">最近安全: {{ nearestSafe.id }}</div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <el-tabs v-model="activeTab" class="mm-tabs">
      <!-- ═══ 质量门禁 ═══ -->
      <el-tab-pane label="质量门禁" name="gates">
        <div class="mm-section">
          <h4>激活条件</h4>
          <p class="mm-hint">门禁仅在代码文件修改时自动激活（.ts / .tsx / .vue / .json），读文件/查询/聊天不触发。</p>
        </div>
        <el-table :data="gateRules" size="small" stripe style="width:100%">
          <el-table-column prop="id" label="ID" width="180" />
          <el-table-column prop="title" label="规则" min-width="200" />
          <el-table-column prop="category" label="类别" width="140" />
          <el-table-column label="级别" width="80">
            <template #default="{ row }">
              <el-tag :type="row.severity === 'error' ? 'danger' : 'warning'" size="small" effect="dark">
                {{ row.severity === 'error' ? 'ERROR' : 'WARN' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="触发" width="150">
            <template #default="{ row }">
              <el-tag size="small" type="info">{{ row.trigger?.tools?.join(', ') || '—' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="fix" label="修复指引" min-width="250" show-overflow-tooltip />
        </el-table>
      </el-tab-pane>

      <!-- ═══ 版本守护 ═══ -->
      <el-tab-pane label="版本守护" name="version">
        <div v-if="versionInfo" class="mm-section">
          <h4>版本信息</h4>
          <div class="mm-version-row">
            <span class="mm-label">当前版本</span>
            <el-tag type="primary" size="large">{{ vCurrent?.version }}</el-tag>
            <span v-if="vCurrent?.preRelease" class="mm-pre">预发布: {{ vCurrent?.preRelease }}</span>
          </div>
          <div class="mm-version-row" v-if="vConsistency?.versions">
            <span class="mm-label">子包版本</span>
            <div class="mm-pkg-versions">
              <span v-for="v in (vConsistency?.versions as Array<Record<string,unknown>>)" :key="(v.source as string)" class="mm-pkg-ver">
                <code>{{ v.source }}</code> → {{ v.version }}
              </span>
              <span v-if="(vConsistency?.conflicts as Array<unknown>)?.length" class="mm-conflict-alert">
                ! {{ (vConsistency?.conflicts as Array<unknown>).length }} 处冲突
              </span>
            </div>
          </div>
        </div>

        <div v-if="versionInfo?.commitAudit" class="mm-section">
          <h4>Commit 审计 (最近 {{ vAudit?.totalCommits }} 条)</h4>
          <div class="mm-audit-stats">
            <span class="mm-stat">规范率: <strong>{{ ((vAudit?.conventionalRatio as number) * 100).toFixed(0) }}%</strong></span>
            <span v-for="(count, type) in (vAudit?.byType as Record<string,number>)" :key="type" class="mm-stat">
              {{ type }}: {{ count }}
            </span>
          </div>
          <el-table :data="((vAudit?.entries || []) as Array<Record<string,unknown>>).slice(0, 15)" size="small" stripe style="width:100%">
            <el-table-column prop="hash" label="Hash" width="80" />
            <el-table-column label="信息" min-width="300">
              <template #default="{ row }">
                <span :style="{ color: row.passesConvention ? '#67c23a' : '#e6a23c' }">
                  {{ row.passesConvention ? 'OK' : 'NO' }}
                </span>
                {{ row.message?.length > 70 ? row.message.substring(0, 67) + '...' : row.message }}
              </template>
            </el-table-column>
            <el-table-column prop="date" label="日期" width="100">
              <template #default="{ row }">{{ row.date?.substring(0, 10) }}</template>
            </el-table-column>
          </el-table>
        </div>

        <div v-if="versionInfo?.changelogStatus" class="mm-section">
          <h4>CHANGELOG 状态</h4>
          <div class="mm-changelog">
            <div>
              <span class="mm-label">文件</span>
              <el-tag :type="vChangelog?.exists ? 'success' : 'danger'" size="small">
                {{ vChangelog?.exists ? '存在' : '缺失' }}
              </el-tag>
            </div>
            <div v-if="vChangelog?.unreleasedEntries !== undefined">
              <span class="mm-label">[Unreleased] 条目</span>
              <strong>{{ vChangelog?.unreleasedEntries }}</strong>
            </div>
            <div v-if="vChangelog?.needsUpdate">
              <el-tag type="warning" size="small">! CHANGELOG 需更新</el-tag>
            </div>
          </div>
        </div>

        <div v-if="vRecs?.length" class="mm-recommendations">
          <h4>建议</h4>
          <ul>
            <li v-for="(r, i) in vRecs" :key="i">{{ r }}</li>
          </ul>
        </div>
      </el-tab-pane>

      <!-- ═══ 回滚安全网 ═══ -->
      <el-tab-pane label="回滚安全网" name="rollback">
        <div class="mm-section">
          <h4>创建检查点</h4>
          <div class="mm-checkpoint-create">
            <el-input v-model="checkpointReason" placeholder="检查点说明（如 'Before 大版本发布'）" size="small" style="width:320px" />
            <el-button type="primary" size="small" :loading="creatingCP" @click="handleCreateCheckpoint">创建检查点</el-button>
          </div>
        </div>

        <div class="mm-section" v-if="checkpoints.length">
          <h4>检查点历史 ({{ checkpoints.length }})</h4>
          <el-table :data="checkpoints" size="small" stripe style="width:100%">
            <el-table-column prop="id" label="ID" width="220" />
            <el-table-column prop="reason" label="原因" min-width="150" show-overflow-tooltip />
            <el-table-column prop="version" label="版本" width="120" />
            <el-table-column prop="headCommit" label="Commit" width="100" />
            <el-table-column label="脏文件" width="80">
              <template #default="{ row }">
                <el-tag v-if="row.dirtyFiles" :type="row.dirtyFiles > 0 ? 'warning' : 'success'" size="small">
                  {{ row.dirtyFiles }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="timestamp" label="时间" width="170">
              <template #default="{ row }">{{ formatDate(row.timestamp) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="viewCheckpoint(row.id)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- Checkpoint Detail Dialog -->
    <el-dialog v-model="cpDetailVisible" title="检查点详情" width="640px">
      <div v-if="cpDetail">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="ID">{{ cpDetail?.id }}</el-descriptions-item>
          <el-descriptions-item label="时间">{{ formatDate(cpDetail?.timestamp as string) }}</el-descriptions-item>
          <el-descriptions-item label="原因">{{ cpDetail?.reason }}</el-descriptions-item>
          <el-descriptions-item label="分支">{{ cpGitStatus?.branch }}</el-descriptions-item>
          <el-descriptions-item label="HEAD">{{ (cpGitStatus?.headCommit as string)?.substring(0, 12) }}</el-descriptions-item>
          <el-descriptions-item label="版本 Root">{{ cpVersions?.root }}</el-descriptions-item>
          <el-descriptions-item label="版本 Core">{{ cpVersions?.core }}</el-descriptions-item>
          <el-descriptions-item label="版本 Frontend">{{ cpVersions?.frontend }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="cpKeyFiles?.length" style="margin-top:12px">
          <h5>关键文件 SHA256</h5>
          <el-table :data="cpKeyFiles" size="small">
            <el-table-column prop="path" label="文件" />
            <el-table-column prop="sha256" label="SHA256" width="140" />
          </el-table>
        </div>
        <div v-if="cpDirtyFiles?.length" style="margin-top:12px">
          <el-alert title="创建时存在未提交文件" type="warning" :closable="false" show-icon>
            <ul>
              <li v-for="(f, i) in cpDirtyFiles" :key="i">{{ f }}</li>
            </ul>
          </el-alert>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/api/request'

const loading = ref(false)
const activeTab = ref('gates')
const manifest = ref<Record<string, unknown> | null>(null)
const versionInfo = ref<Record<string, unknown> | null>(null)
const gateContent = ref('')
const checkpoints = ref<Array<Record<string, unknown>>>([])
const checkpointReason = ref('')
const creatingCP = ref(false)
const cpDetailVisible = ref(false)
const cpDetail = ref<Record<string, unknown> | null>(null)
const cpGitStatus = computed(() => (cpDetail.value?.gitStatus as Record<string, unknown> | undefined))
const cpVersions = computed(() => (cpDetail.value?.versions as Record<string, string> | undefined))
const cpKeyFiles = computed(() => (cpDetail.value?.keyFiles as Array<Record<string, string>> | undefined))
const cpDirtyFiles = computed(() => (cpGitStatus.value?.dirtyFiles as string[] | undefined))

// ── Computed ──
const gateRules = computed(() => {
  if (!gateContent.value) return []
  return parseGateRules(gateContent.value)
})

const gateCount = computed(() => gateRules.value.length)
const errorGateCount = computed(() => gateRules.value.filter((r: Record<string, unknown>) => r.severity === 'error').length)
const warnGateCount = computed(() => gateRules.value.filter((r: Record<string, unknown>) => r.severity === 'warning').length)

const versionConsistent = computed(() => {
  const vc = (versionInfo.value as Record<string, unknown> | null)?.versionConsistency as Record<string, unknown> | null
  return vc?.consistent ?? true
})
const checkpointCount = computed(() => checkpoints.value.length)
const nearestSafe = computed(() => {
  const arr = checkpoints.value as Array<Record<string, unknown>>
  return arr[arr.length - 1]
})

// 类型安全的取值辅助
const v = (key: string): unknown => (versionInfo.value as Record<string, unknown>)?.[key]
const vCurrent = computed(() => (v('currentVersion') as Record<string, unknown>))
const vConsistency = computed(() => (v('versionConsistency') as Record<string, unknown>))
const vAudit = computed(() => (v('commitAudit') as Record<string, unknown>))
const vChangelog = computed(() => (v('changelogStatus') as Record<string, unknown>))
const vRecs = computed(() => (v('recommendations') as string[]))

const statusCardClass = computed(() => manifest.value?.status === 'active' ? 'mm-card-ok' : 'mm-card-warn')
const versionCardClass = computed(() => versionConsistent.value ? 'mm-card-ok' : 'mm-card-warn')
const gateCardClass = computed(() => 'mm-card-ok')
const rollbackCardClass = computed(() => checkpointCount.value > 0 ? 'mm-card-ok' : 'mm-card-warn')

// ── Fetch ──
async function fetchAll() {
  loading.value = true
  try {
    const [m, v, g, cp] = await Promise.all([
      request.get('/meta-mirror/manifest').catch(() => null),
      request.get('/meta-mirror/version-guard.json').catch(() => null),
      request.get('/meta-mirror/quality-gates').catch(() => null),
      request.get('/meta-mirror/checkpoints').catch(() => null),
    ])
    manifest.value = m as Record<string, unknown> | null
    versionInfo.value = v as Record<string, unknown> | null
    gateContent.value = ((g as Record<string, unknown> | null)?.content as string) || ''
    checkpoints.value = Array.isArray(cp) ? (cp as Array<Record<string, unknown>>) : ((cp as Record<string, unknown> | null)?.checkpoints as Array<Record<string, unknown>>) || []
  } catch (e: unknown) {
    ElMessage.error(`加载失败: ${(e as Error).message}`)
  } finally {
    loading.value = false
  }
}

async function handleCreateCheckpoint() {
  const reason = checkpointReason.value.trim() || '手动创建'
  creatingCP.value = true
  try {
    await request.post('/meta-mirror/checkpoints', { reason })
    ElMessage.success('检查点已创建')
    checkpointReason.value = ''
    fetchAll()
  } catch (e: unknown) {
    ElMessage.error(`创建失败: ${(e as Error).message}`)
  } finally {
    creatingCP.value = false
  }
}

async function viewCheckpoint(id: string) {
  try {
    const detail = await request.get(`/meta-mirror/checkpoints/${id}`)
    cpDetail.value = detail as Record<string, unknown>
    cpDetailVisible.value = true
  } catch (e: unknown) {
    ElMessage.error(`加载失败: ${(e as Error).message}`)
  }
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return iso.replace('T', ' ').substring(0, 19)
}

// ── 从 Markdown 解析门禁规则 ──
function parseGateRules(md: string): Array<Record<string, unknown>> {
  const rules: Array<Record<string, unknown>> = []
  const sections = md.split(/### (gate-[\w-]+)/)
  for (let i = 1; i < sections.length; i += 2) {
    const id = sections[i]
    const body = sections[i + 1] || ''
    const titleMatch = body.match(/— (.+)/)
    const title = titleMatch?.[1]?.trim() || id
    const severity = body.includes('阻断') ? 'error' : 'warning'
    const categoryMatch = body.match(/- \*\*触发\*\*:\s*(.+)/)
    const triggers = categoryMatch?.[1]?.trim() || ''
    const fixMatch = body.match(/- \*\*修复\*\*:\s*(.+)/)
    const fix = fixMatch?.[1]?.trim() || ''
    const sourceMatch = body.match(/- \*\*来源\*\*:\s*(.+)/)
    const source = sourceMatch?.[1]?.trim() || ''

    rules.push({
      id,
      title,
      severity,
      category: source.includes('TypeScript') ? 'TS 类型安全' : source.includes('前端') ? '前端质量' : source.includes('工程') ? '工程纪律' : '其他',
      trigger: { tools: triggers.split(', ') },
      fix,
      source,
    })
  }
  return rules
}

onMounted(fetchAll)
</script>

<style scoped>
.mm-dashboard {
  padding: 20px 24px;
  height: 100%;
  overflow-y: auto;
  background: #f5f7fa;
}
.mm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.mm-header h2 { margin: 0; font-size: 18px; color: #1e293b; }
.mm-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.mm-card {
  background: #fff;
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  gap: 12px;
  align-items: center;
  border: 1px solid #e4e7ed;
}
.mm-card-ok { border-left: 4px solid #67c23a; }
.mm-card-warn { border-left: 4px solid #e6a23c; }
.mm-card-icon { font-size: 28px; flex-shrink: 0; }
.mm-card-title { font-size: 12px; color: #909399; }
.mm-card-value { font-size: 20px; font-weight: 700; color: #1e293b; }
.mm-card-detail { font-size: 11px; color: #c0c4cc; margin-top: 2px; }
.mm-tabs { background: #fff; border-radius: 10px; padding: 0 16px; }
.mm-section { margin-bottom: 16px; }
.mm-section h4 { margin: 12px 0 8px; color: #303133; font-size: 14px; }
.mm-hint { color: #909399; font-size: 12px; margin: 4px 0 12px; }
.mm-version-row { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; }
.mm-label { font-size: 13px; color: #606266; min-width: 80px; }
.mm-pre { font-size: 12px; color: #909399; }
.mm-pkg-versions { display: flex; gap: 16px; flex-wrap: wrap; }
.mm-pkg-ver { font-size: 12px; }
.mm-pkg-ver code { background: #f0f2f5; padding: 2px 6px; border-radius: 3px; }
.mm-conflict-alert { color: #e6a23c; font-weight: 600; }
.mm-audit-stats { display: flex; gap: 16px; margin-bottom: 8px; flex-wrap: wrap; }
.mm-stat { font-size: 12px; color: #606266; }
.mm-changelog { display: flex; gap: 24px; align-items: center; }
.mm-recommendations { margin-top: 12px; }
.mm-recommendations ul { margin: 4px 0; padding-left: 20px; }
.mm-recommendations li { font-size: 13px; color: #606266; margin: 4px 0; }
.mm-checkpoint-create { display: flex; gap: 8px; align-items: center; }
</style>
