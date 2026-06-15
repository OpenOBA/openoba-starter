<!--
  AgentChatSidebar.vue — P1-3b 前端重构
  AgentChat.vue 的左栏独立组件：任务信息卡片 + 历史任务列表
  Props: taskInfo + taskId + historyTasks + historyLoading
  Emits: switchTask
-->
<template>
  <div class="chat-left" v-if="taskInfo">
    <div class="left-card">
      <div class="left-title">任务信息</div>
      <div class="left-row" v-if="taskInfo.taskNo"><span class="left-k">编号</span><span class="left-v">{{ taskInfo.taskNo }}</span></div>
      <div class="left-row"><span class="left-k">类型</span><span class="left-v">{{ typeLabel(taskInfo.type as string) }}</span></div>
      <div class="left-row"><span class="left-k">状态</span><span class="left-v">{{ statusLabel(taskInfo.status as string) }}</span></div>
      <div class="left-row" v-if="taskInfo.createdBy"><span class="left-k">创建人</span><span class="left-v">{{ taskInfo.createdBy }}</span></div>
      <div class="left-row" v-if="taskInfo.agentId"><span class="left-k">Agent</span><span class="left-v">{{ taskInfo.agentId }}</span></div>
    </div>
    <div class="left-divider"></div>

    <!-- 历史任务列表 -->
    <div class="history-tasks">
      <div class="left-title">历史任务</div>
      <div v-if="historyLoading" class="history-loading">加载中...</div>
      <div v-else-if="historyTasks.length === 0" class="history-empty">暂无历史任务</div>
      <div
        v-else
        v-for="t in historyTasks"
        :key="t.id"
        class="history-item"
        :class="{ current: t.id === taskId }"
        @click="emit('switchTask', t.id)"
      >
        <div class="history-title">{{ (t.title || '').substring(0, 30) }}{{ (t.title || '').length > 30 ? '...' : '' }}</div>
        <div class="history-meta">
          <el-tag :type="historyStatusType(t.status)" size="small">{{ historyStatusLabel(t.status) }}</el-tag>
          <span class="history-time">{{ formatHistoryTime(t.createdAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// TaskStatus referenced in statusLabel function
void (null as unknown as import('@/api/task-engine').TaskStatus)

defineProps<{
  taskInfo: Record<string, unknown> | null
  taskId: string
  historyTasks: any[]
  historyLoading: boolean
}>()

const emit = defineEmits<{
  switchTask: [taskId: string]
}>()

const statusLabel = (s: string) => ({
  drafted: '草稿', proposed: '待同意', revised: '修订中', executing: '执行中',
  delivered: '已交付', completed: '已完成', cancelled: '已取消', aborted: '已中止',
}[s] || s)

const typeLabel = (t: string) => ({
  product_listing: '商品上架', content_creation: '内容创作', customer_service: '客服', tech_support: '技术',
}[t] || t)

function historyStatusType(s: string): string {
  const m: Record<string, string> = { drafted: 'info', executing: 'primary', completed: 'success', proposed: 'warning', delivered: 'success', published: 'success', cancelled: 'danger', aborted: 'danger' }
  return m[s] || 'info'
}
function historyStatusLabel(s: string): string {
  const m: Record<string, string> = { drafted: '草稿', executing: '执行中', completed: '已完成', proposed: '待审批', delivered: '已交付', published: '已发布', cancelled: '已取消', aborted: '已中止' }
  return m[s] || s
}
function formatHistoryTime(t: string): string {
  if (!t) return ''
  const d = new Date(t)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}
</script>

<style scoped>
.chat-left { width: 180px; border-right: 1px solid rgba(3,105,161,0.08); overflow-y: auto; flex-shrink: 0; background: rgba(255,255,255,0.7); backdrop-filter: blur(8px); position: fixed; top: 0; left: 0; height: 100vh; z-index: 220; box-shadow: 1px 0 12px rgba(15,23,42,0.04); display: flex; flex-direction: column; }
.left-card { padding: 12px; padding-top: 60px; }
.left-title { font-size: 12px; font-weight: 600; margin-bottom: 8px; color: #303133; }
.left-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; border-bottom: 1px solid #f0f2f5; }
.left-divider { border-top: 1px solid #ebeef5; margin: 6px 0; }

.history-tasks { padding: 0 12px 12px; overflow-y: auto; flex: 1; }
.history-item { padding: 8px; border-radius: 8px; cursor: pointer; margin-bottom: 4px; transition: all 0.15s; border: 1px solid transparent; }
.history-item:hover { background: rgba(3,105,161,0.04); border-color: rgba(3,105,161,0.1); }
.history-item.current { background: rgba(3,105,161,0.08); border-color: rgba(3,105,161,0.15); }
.history-title { font-size: 12px; font-weight: 500; color: #303133; line-height: 1.4; margin-bottom: 4px; }
.history-meta { display: flex; align-items: center; gap: 8px; }
.history-time { font-size: 10px; color: #c0c4cc; }
.history-loading, .history-empty { text-align: center; font-size: 11px; color: #c0c4cc; padding: 12px 0; }
.left-k { color: #909399; }
.left-v { font-weight: 500; text-align: right; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
