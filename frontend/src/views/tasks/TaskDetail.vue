<template>
  <div v-loading="loading" class="task-detail">
    <div class="detail-header">
      <el-button link type="primary" @click="$router.push('/tasks')">
        <el-icon><ArrowLeft /></el-icon> 返回
      </el-button>
      <div v-if="task" class="header-info">
        <h3>{{ task.title }}</h3>
        <div class="header-meta">
          <el-tag :type="statusTagType(task.status)" size="small">{{ statusLabel(task.status) }}</el-tag>
          <span>{{ task.taskNo }}</span>
          <span v-if="task.agentId">{{ task.agentId }}</span>
        </div>
      </div>
      <el-button type="primary" size="small" @click="$router.push('/chat/' + task?.id)">进入对话</el-button>
    </div>

    <div v-if="task" class="detail-body">
      <!-- 提案时间线 -->
      <div ref="chatAreaRef" class="timeline-area">
        <div v-if="proposals.length === 0" class="empty-hint">暂无提案记录</div>

        <div v-for="(item, i) in timeline" :key="i">
          <div v-if="item.type === 'round-sep'" class="round-sep">
            <span>第 {{ item.round }} 轮</span>
          </div>

          <div
            v-else-if="item.type === 'proposal'"
            class="proposal-block"
            :class="{
              submitted: item.status === 'submitted',
              accepted: item.status === 'accepted',
              rejected: item.status === 'rejected',
            }"
          >
            <div class="proposal-head">
              <el-tag size="small">V{{ item.version }}</el-tag>
              <el-tag
                size="small"
                :type="item.status === 'submitted' ? 'warning' : item.status === 'accepted' ? 'success' : 'danger'"
              >
                {{ item.status === 'submitted' ? '待同意' : item.status === 'accepted' ? '已同意' : '已驳回' }}
              </el-tag>
              <span class="proposal-time">{{ item.time }}</span>
            </div>
            <pre class="proposal-text">{{ item.content }}</pre>
            <div v-if="item.feedback" class="feedback-inline">
              驳回原因：{{ item.feedback.reason }}
              <span v-if="item.feedback.suggestions">— {{ item.feedback.suggestions }}</span>
            </div>
          </div>

          <div v-else-if="item.type === 'human'" class="chat-bubble human">
            <div class="bubble-meta">
              <span>需求</span><span>{{ item.time }}</span>
            </div>
            <div class="bubble-text">{{ item.text }}</div>
          </div>
        </div>
      </div>

      <!-- 右侧信息 -->
      <div class="right-area">
        <el-card shadow="hover" class="side-card" size="small">
          <template #header><span class="card-title">任务信息</span></template>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-k">编号</span><span class="info-v">{{ task.taskNo }}</span>
            </div>
            <div class="info-item">
              <span class="info-k">类型</span><span class="info-v">{{ typeLabel(task.type) }}</span>
            </div>
            <div class="info-item">
              <span class="info-k">创建人</span><span class="info-v">{{ task.createdBy }}</span>
            </div>
            <div class="info-item">
              <span class="info-k">Agent</span><span class="info-v">{{ task.agentId || '未分配' }}</span>
            </div>
            <div class="info-item">
              <span class="info-k">汇报</span><span class="info-v">{{ task.reportTo }}</span>
            </div>
            <div class="info-item">
              <span class="info-k">阶段</span><span class="info-v">{{ task.currentPhase }}/{{ task.totalPhases }}</span>
            </div>
          </div>
        </el-card>
        <el-card shadow="hover" class="side-card" size="small">
          <template #header
            ><span class="card-title">认知日志 ({{ logs.length }})</span></template
          >
          <div v-if="logs.length > 0" class="log-compact">
            <div v-for="log in logs" :key="log.id" class="log-line">
              <span
                class="log-dot"
                :style="{
                  background: log.level === 'error' ? '#f56c6c' : log.level === 'warn' ? '#e6a23c' : '#409eff',
                }"
              ></span>
              <span class="log-actor">{{ log.actor }}</span>
              <span class="log-title" :title="log.title">{{ log.title }}</span>
              <span class="log-time">{{ formatTimeMs(log.createdAt) }}</span>
            </div>
          </div>
          <div v-else class="empty-hint">暂无</div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { getTask, getTaskLogs } from '@/api/task-engine'
import type { AgentTask, CognitiveLog, TaskStatus } from '@/api/task-engine'

const route = useRoute()

const loading = ref(false)
const task = ref<AgentTask | null>(null)
const logs = ref<CognitiveLog[]>([])

// 时间线
interface TimelineItem {
  type: 'human' | 'proposal' | 'system' | 'round-sep'
  sender?: string
  text?: string
  time: string
  round?: number
  version?: number
  content?: string
  status?: string
  feedback?: Record<string, unknown>
}
const timeline = computed<TimelineItem[]>(() => {
  if (!task.value) return []
  const items: TimelineItem[] = []
  const ctx = task.value.context || {}
  if (ctx['任务主体']) {
    items.push({ type: 'human', text: String(ctx['任务主体']), time: formatTime(task.value.createdAt) })
  }
  const proposals = task.value.proposals || []
  for (let i = 0; i < proposals.length; i++) {
    const p = proposals[i] as unknown as Record<string, unknown>
    items.push({
      type: 'proposal' as const,
      version: p.version as number,
      content: p.content as string,
      status: (p.status as string) || 'submitted',
      feedback: p.feedback as unknown as Record<string, unknown>,
      time: formatTime(p.timestamp as string),
    })
  }
  return items
})
const proposals = computed(() => task.value?.proposals || [])

const statusLabel = (s: TaskStatus) =>
  (({
    drafted: '草稿',
    proposed: '待同意',
    revised: '修订中',
    executing: '执行中',
    delivered: '已交付',
    published: '已发布',
    completed: '已完成',
    cancelled: '已取消',
    aborted: '已中止',
    escalated: '已升级',
  })[s] || s) as string
const statusTagType = (s: TaskStatus) => {
  const m: Record<string, string> = {
    drafted: 'info',
    proposed: 'warning',
    executing: 'primary',
    delivered: 'success',
    completed: 'success',
    cancelled: 'danger',
    aborted: 'danger',
  }
  return m[s] || 'info'
}
const typeLabel = (t: string) =>
  ({ product_listing: '商品上架', content_creation: '内容创作', customer_service: '客服', tech_support: '技术' })[t] ||
  t
const formatTime = (t: string) =>
  t ? new Date(t).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '-'
const formatTimeMs = (t: string) =>
  t ? new Date(Number(t)).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '-'

async function loadTask() {
  loading.value = true
  try {
    const [t, l] = await Promise.all([getTask(route.params.id as string), getTaskLogs(route.params.id as string)])
    task.value = t
    logs.value = l
  } catch {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadTask)
</script>

<style scoped>
.task-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
  max-width: 100%;
  margin: 0 auto;
}
.detail-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #e4e7ed;
  gap: 12px;
  flex-shrink: 0;
  background: #fff;
}
.header-info {
  flex: 1;
}
.header-info h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
.header-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #909399;
  margin-top: 3px;
}
.detail-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.timeline-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #fafbfc;
}
.round-sep {
  text-align: center;
  margin: 16px 0;
  color: #c0c4cc;
  font-size: 11px;
}
.round-sep span {
  background: #fff;
  padding: 2px 14px;
  border-radius: 10px;
  border: 1px solid #ebeef5;
}
.chat-bubble {
  margin-bottom: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  max-width: 85%;
  font-size: 13px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.chat-bubble.human {
  background: #e8f4fd;
  margin-left: auto;
  border-bottom-right-radius: 4px;
}
.bubble-meta {
  font-size: 11px;
  color: #909399;
  margin-bottom: 4px;
  display: flex;
  gap: 8px;
}
.bubble-text {
  line-height: 1.6;
}
.proposal-block {
  margin-bottom: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.proposal-block.submitted {
  border-color: #e6a23c;
}
.proposal-block.accepted {
  border-color: #67c23a;
  background: #f6ffed;
}
.proposal-block.rejected {
  border-color: #f56c6c;
  opacity: 0.7;
}
.proposal-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #fafbfc;
  border-bottom: 1px solid #e4e7ed;
}
.proposal-time {
  font-size: 11px;
  color: #909399;
  margin-left: auto;
}
.proposal-text {
  margin: 0;
  padding: 14px;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  max-height: 400px;
  overflow-y: auto;
  font-family: inherit;
}
.feedback-inline {
  margin: 8px 14px;
  padding: 8px 12px;
  background: #fef0f0;
  border-left: 3px solid #f56c6c;
  font-size: 12px;
  border-radius: 0 6px 6px 0;
}
.right-area {
  width: 260px;
  overflow-y: auto;
  padding: 14px;
  border-left: 1px solid #e4e7ed;
  flex-shrink: 0;
  background: #fff;
}
.side-card {
  margin-bottom: 14px;
}
.side-card :deep(.el-card__header) {
  padding: 10px 14px;
  border-bottom: 1px solid #ebeef5;
}
.side-card :deep(.el-card__body) {
  padding: 10px 14px;
}
.card-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}
.info-grid {
  display: grid;
  gap: 8px;
  font-size: 12px;
}
.info-item {
  display: flex;
  justify-content: space-between;
}
.info-k {
  color: #909399;
}
.info-v {
  font-weight: 500;
  color: #303133;
}
.log-compact {
  font-size: 11px;
}
.log-line {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  border-bottom: 1px solid #f5f5f5;
}
.log-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.log-actor {
  font-weight: 500;
  min-width: 36px;
  color: #606266;
}
.log-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303133;
}
.log-time {
  color: #c0c4cc;
  font-size: 10px;
}
.empty-hint {
  text-align: center;
  color: #c0c4cc;
  padding: 40px;
  font-size: 13px;
}
</style>
