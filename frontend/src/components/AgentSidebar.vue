<template>
  <div class="agent-sidebar">
    <div class="sidebar-header">
      <span class="header-title">Agent Team</span>
      <el-button link size="small" class="create-btn" @click="$emit('create')">新增</el-button>
    </div>

    <div class="agent-list">
      <div
        v-for="agent in agents"
        :key="agent.id"
        class="agent-item"
        :class="{ active: selectedAgentId === agent.id }"
        @click="selectAgent(agent)"
      >
        <span class="agent-avatar" :class="{ inactive: agent.status !== 'active' }">
          <svg class="avatar-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <use :href="'/lucide-sprite.svg#' + (agent.icon || 'bot')" />
          </svg>
        </span>
        <div class="agent-info">
          <div class="agent-name">{{ agent.displayName }}</div>
          <div class="agent-desc">{{ agent.description }}</div>
        </div>
        <el-tag v-if="agent.status === 'active'" size="small" type="success" effect="plain">在线</el-tag>
        <el-tag v-else size="small" type="info" effect="plain">{{ agent.status }}</el-tag>
      </div>
    </div>

    <div class="sidebar-footer">
      <div class="footer-brand">
        <span class="footer-logo">OpenOBA</span>
        <span class="footer-ver">{{ versionText }}</span>
      </div>
      <div v-if="hasUpdate" class="footer-update">
        <el-tag size="small" type="warning" effect="plain">有更新 {{ latestVersion }}</el-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/api/request'

export interface AgentEntry {
  id: string
  agentCode: string
  agentName: string
  displayName: string
  icon: string
  description: string
  agentType: string
  securityClearance: string
  status: 'active' | 'inactive'
}

const props = defineProps<{
  agents: AgentEntry[]
}>()

const emit = defineEmits<{
  (e: 'select', agent: AgentEntry): void
  (e: 'create'): void
}>()

const selectedAgentId = ref('')

function selectAgent(agent: AgentEntry) {
  selectedAgentId.value = agent.id
  emit('select', agent)
}

// 版本信息
const versionText = ref('v1.4.0-alpha9')
const hasUpdate = ref(false)
const latestVersion = ref('')

async function loadVersion() {
  try {
    const res = (await request.get('/system/version/check', { params: { current: '1.4.0-alpha9' } })) as unknown as {
      currentVersion?: string
      hasUpdate?: boolean
      latestVersion?: string
    }
    versionText.value = res?.currentVersion || 'v1.4.0-alpha9'
    hasUpdate.value = res?.hasUpdate || false
    latestVersion.value = res?.latestVersion || ''
  } catch {
    versionText.value = 'v1.4.0-alpha9'
  }
}

onMounted(() => {
  loadVersion()
})
</script>

<style scoped>
.agent-sidebar {
  width: 200px;
  background: #fafbfc;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 200;
  overflow-y: auto;
  flex-shrink: 0;
}
.sidebar-header {
  padding: 14px 14px 12px;
  padding-top: 56px;
  font-size: 13px;
  font-weight: 700;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
}
.header-title {
  letter-spacing: 1px;
}
.create-btn {
  margin-left: auto;
  font-size: 11px !important;
  color: #409eff !important;
  font-weight: 600;
}
.agent-list {
  flex: 1;
  padding: 6px;
}
.agent-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 2px;
  user-select: none;
}
.agent-item:hover {
  background: #ecf5ff;
}
.agent-item.active {
  background: #d9ecff;
}
.agent-avatar {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #409eff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.avatar-svg {
  width: 16px;
  height: 16px;
}
.agent-avatar.inactive {
  background: #c0c4cc;
}
.agent-info {
  flex: 1;
  min-width: 0;
}
.agent-name {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
}
.agent-desc {
  font-size: 10px;
  color: #909399;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sidebar-footer {
  padding: 10px 14px;
  border-top: 1px solid #e4e7ed;
}
.footer-brand {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.footer-logo {
  font-size: 12px;
  font-weight: 700;
  color: #303133;
  letter-spacing: 0.5px;
}
.footer-ver {
  font-size: 10px;
  color: #909399;
}
.footer-update {
  margin-top: 6px;
}
</style>
