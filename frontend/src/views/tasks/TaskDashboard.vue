<template>
  <div class="task-dashboard">
    <!-- 顶部 Header：标题 + 模型选择 -->
    <div class="dash-header">
      <div class="dash-brand">
        <img src="@/assets/logos/openoba-logo.svg" class="dash-logo" alt="OpenOBA" />
        <h2 class="dash-title">ERA-Chat</h2>
      </div>
      <div class="dash-model-select">
        <label class="dash-model-label">默认模型</label>
        <el-select
          v-model="selectedModel"
          size="small"
          :loading="loadingModels"
          style="width:240px"
          placeholder="选择默认模型"
          @change="onModelChange"
        >
          <el-option
            v-for="m in availableModels"
            :key="m.value"
            :label="m.label"
            :value="m.value"
          />
        </el-select>
      </div>
    </div>

    <!-- 对话区 -->
    <div class="main-area">
      <AgentSidebar :agents="agentList" @select="onAgentSelect" @create="goToAgentManagement" @update:agents="onAgentsUpdate" />

      <EraChatWelcome
        ref="eraChatWelcomeRef"
        :agent-list="agentList"
        :creating="creating"
        :messages="messages"
        :task-done="false"
        :templates="templates"
        @quick-task="quickTask"
        @send="handleCallingSend"
        @agent-select="onAgentSelect"
        @template-edit="handleTemplateEdit"
        @template-remove="removeTemplate"
        @template-add="handleTemplateAdd"
        @template-reset="resetTemplates"
        @template-apply="applyTemplate"
        @templates-saved="onTemplatesSaved"
        @cancel-confirm="cancelConfirm"
        @execute-confirm="executeConfirm"
        @go-to-task="goToTask"
      />

      <TaskListPanel
        :tasks="tasks"
        :total="total"
        :loading="loading"
        :display-limit="displayLimit"
        :search-keyword="searchKeyword"
        :filter-status="filterStatus"
        :page="page"
        :page-size="pageSize"
        :has-more="hasMore"
        :selected-ids="selectedIds"
        @update:search-keyword="(val: string) => { searchKeyword = val; loadTasks() }"
        @update:filter-status="(val: string) => { filterStatus = val; loadTasks() }"
        @load-tasks="loadTasks"
        @load-more="loadMore"
        @page-change="(val: number) => { page = val; loadTasks() }"
        @selection-change="handleSelectionChange"
        @batch-delete="batchDelete"
        @go-detail="goDetail"
      />
    </div>
  </div>

</template>

<script setup lang="ts">
import { ref } from 'vue'
import EraChatWelcome from '@/components/EraChatWelcome.vue'
import TaskListPanel from '@/components/TaskListPanel.vue'
import AgentSidebar from '@/components/AgentSidebar.vue'
import type { AgentEntry } from '@/components/AgentSidebar.vue'
import { useTaskDashboard } from './composables/useTaskDashboard'

const eraChatWelcomeRef = ref<InstanceType<typeof EraChatWelcome>>()

const {
  templates, applyTemplate, removeTemplate, resetTemplates,
  selectedModel, availableModels, loadingModels, agentList,
  loading, creating, tasks, total, page, pageSize, filterStatus,
  searchKeyword, displayLimit, hasMore, selectedIds, messages,
  onModelChange, onAgentsUpdate, onAgentSelect, quickTask,
  handleCallingSend, cancelConfirm, executeConfirm,
  loadTasks, loadMore, handleSelectionChange, batchDelete,
  goDetail, goToTask, goToAgentManagement,
} = useTaskDashboard()

function onTemplatesSaved(items: { icon: string; text: string; fill: string }[]) {
  templates.value = items
}

function handleTemplateAdd() {
  eraChatWelcomeRef.value?.openAddTemplate()
}
function handleTemplateEdit(index: number) {
  eraChatWelcomeRef.value?.editTemplate(index)
}
</script>

<style scoped>
.task-dashboard {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0;
  background: linear-gradient(160deg, #f0f4fa 0%, #faf8fc 50%, #f0f7f8 100%);
}

/* 首页 Header：标题 + 模型选择 */
.dash-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px; border-bottom: 1px solid rgba(3,105,161,0.08);
  background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); flex-shrink: 0;
}
.dash-brand { display: flex; align-items: center; gap: 10px; }
.dash-logo { height: 48px; width: auto; flex-shrink: 0; }
.dash-title { margin: 0; font-size: 18px; font-weight: 700; color: #1e293b; }
.dash-model-select { display: flex; align-items: center; gap: 8px; }
.dash-model-label { font-size: 12px; color: #909399; font-weight: 500; }

.page-header {
  height: 48px;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(3,105,161,0.08);
  flex-shrink: 0;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(12px);
}
.page-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}
.header-tabs :deep(.el-radio-button__inner) {
  font-size: 12px;
  padding: 5px 12px;
}

.main-area {
  flex: 1;
  display: flex;
  padding-left: 200px;
  overflow: visible;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: visible;
  min-width: 0;
  background: transparent;
}

/* 对话区 */
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  background: transparent;
}

/* 空状态 */
.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}
.empty-brand {
  margin-bottom: 24px;
}
.empty-logo-img {
  height: 48px;
  width: auto;
  margin-bottom: 8px;
}
.empty-subtitle {
  font-size: 11px;
  color: #7C8DB5;
  letter-spacing: 2px;
  margin-top: 4px;
}
.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: #4a6fa5;
  margin-bottom: 6px;
}
.empty-hint {
  color: #7C8DB5;
  font-size: 13px;
  margin-bottom: 3px;
  line-height: 1.6;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.hint-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}
.quick-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 20px;
}
.qa-icon {
  width: 14px;
  height: 14px;
  margin-right: 2px;
  vertical-align: -2px;
}

/* 消息气泡 */
.chat-msg {
  margin-bottom: 16px;
  padding: 14px 18px;
  border-radius: 16px;
  max-width: 85%;
  box-shadow: 0 2px 8px rgba(15,23,42,0.04);
}
.chat-msg.human {
  background: linear-gradient(135deg, #e8f4fd 0%, #dceefb 100%);
  margin-left: auto;
  border-bottom-right-radius: 6px;
  border: 1px solid rgba(3,105,161,0.08);
}
.chat-msg.agent {
  background: #ffffff;
  border-bottom-left-radius: 6px;
  border: 1px solid rgba(83,74,183,0.06);
  box-shadow: 0 2px 12px rgba(83,74,183,0.04);
}
.chat-msg.system {
  background: linear-gradient(135deg, #fef7e0 0%, #fdf4d0 100%);
  text-align: center;
  max-width: 100%;
  font-size: 12px;
  color: #909399;
  padding: 10px 16px;
  box-shadow: none;
  border-radius: 10px;
}

.msg-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 6px;
  font-size: 11px;
  color: #909399;
}
.msg-sender {
  font-weight: 600;
  color: #606266;
}
.msg-content {
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  color: #303133;
}
.msg-data {
  margin-top: 8px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.msg-task-link {
  margin-top: 8px;
}

/* 常用语模板 */
.template-bar {
  padding: 6px 16px;
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(3,105,161,0.06);
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.template-label {
  font-size: 11px;
  color: #c0c4cc;
  margin-right: 4px;
  white-space: nowrap;
}
.template-bar :deep(.el-button) {
  font-size: 11px;
  color: #909399;
  padding: 2px 8px;
}
.template-bar :deep(.el-button:hover) {
  color: #409eff;
  background: #ecf5ff;
}
.tpl-add {
  font-size: 14px !important;
}
.tpl-reset {
  margin-left: auto !important;
  font-size: 10px !important;
  color: #c0c4cc !important;
}

.tpl-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 确认面板 */
.confirm-panel {
  margin-top: 12px;
  padding: 14px 16px;
  background: rgba(255,255,255,0.8);
  border: 1px solid rgba(3,105,161,0.1);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(3,105,161,0.04);
}
.confirm-body {
  font-size: 12px;
  color: #909399;
  margin-bottom: 10px;
  line-height: 1.5;
}
.confirm-btns {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
/* 任务列表折叠 */
.task-collapse {
  border-top: 1px solid rgba(3,105,161,0.06);
  flex-shrink: 0;
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(8px);
  position: relative;
  z-index: 230;
}
.task-collapse :deep(.el-collapse-item__header) {
  padding: 0 16px;
  font-size: 13px;
  height: 40px;
}
.task-collapse :deep(.el-collapse-item__content) {
  padding: 0 16px 12px;
}
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.filter-left {
  display: flex;
  gap: 10px;
  align-items: center;
}
.task-time {
  font-size: 11px;
  color: #909399;
}
.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding: 0 4px;
}
.task-count-info {
  font-size: 12px;
  color: #909399;
}
.pagination-wrap {
  margin-top: 8px;
  display: flex;
  justify-content: center;
}

:deep(.clickable-row) {
  cursor: pointer;
}

</style>
