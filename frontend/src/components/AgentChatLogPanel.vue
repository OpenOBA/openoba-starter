<!--
  AgentChatLogPanel.vue — P1-3b 前端重构
  AgentChat.vue 的右栏独立组件：认知日志
  Props: logs
-->
<template>
  <div class="chat-right">
    <div class="right-title">日志</div>
    <div class="log-list" v-if="logs.length > 0">
      <div v-for="log in logs.slice(0, 20)" :key="log.id" class="log-line">
        <span class="log-dot" :style="{ background: log.level === 'error' ? '#f56c6c' : log.level === 'warn' ? '#e6a23c' : '#409eff' }"></span>
        <span class="log-actor">{{ log.actor }}</span>
        <span class="log-title">{{ log.title }}</span>
        <span class="log-time">{{ formatLogTime(log.createdAt) }}</span>
      </div>
    </div>
    <div v-else class="log-empty">暂无记录</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  logs: any[]
}>()

function formatLogTime(ts: string | number): string {
  const d = new Date(Number(ts))
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.chat-right { width: 240px; overflow-y: auto; flex-shrink: 0; background: rgba(250,251,252,0.6); border-left: 1px solid rgba(3,105,161,0.06); }
.right-title { font-size: 12px; font-weight: 600; padding: 10px 12px 6px; color: #303133; position: sticky; top: 0; background: rgba(250,251,252,0.6); backdrop-filter: blur(4px); z-index: 2; }
.log-list { padding: 0 8px; }
.log-line { display: flex; align-items: center; gap: 5px; padding: 3px 4px; font-size: 10px; border-bottom: 1px solid #f0f0f0; }
.log-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
.log-actor { font-weight: 500; min-width: 36px; color: #606266; }
.log-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #303133; }
.log-time { color: #c0c4cc; font-size: 9px; flex-shrink: 0; }
.log-empty { text-align: center; color: #c0c4cc; font-size: 11px; padding: 20px; }
</style>
