<!--
  TaskListPanel.vue — P1-3d 前端重构
  TaskDashboard.vue 的任务列表独立组件
  功能：筛选 + 表格 + 分页/查看更多 + 多选批量删除
-->
<template>
  <el-collapse v-model="activeCollapse" class="task-collapse">
    <el-collapse-item name="tasks">
      <template #title>
        <span>任务列表</span>
        <el-tag size="small" type="info" style="margin-left:8px">{{ total }}</el-tag>
      </template>

      <div class="filter-bar">
        <div class="filter-left">
          <el-input
            v-model="localSearchKeyword"
            size="small"
            placeholder="搜索任务编号或标题"
            clearable
            style="width:220px"
            @change="$emit('update:searchKeyword', localSearchKeyword)"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-radio-group v-model="localFilterStatus" size="small" @change="$emit('update:filterStatus', localFilterStatus)">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button value="proposed">待审批</el-radio-button>
            <el-radio-button value="executing">执行中</el-radio-button>
            <el-radio-button value="completed">已完成</el-radio-button>
          </el-radio-group>
          <el-popconfirm
            title="确定删除选中任务？"
            @confirm="$emit('batchDelete')"
            confirm-button-text="删除"
            cancel-button-text="取消"
          >
            <template #reference>
              <el-button size="small" type="danger" plain :disabled="selectedIds.length === 0">
                删除 ({{ selectedIds.length }})
              </el-button>
            </template>
          </el-popconfirm>
        </div>
      </div>

      <el-table
        :data="displayedTasks"
        stripe
        v-loading="loading"
        @selection-change="$emit('selectionChange', $event as any)"
        @row-dblclick="$emit('goDetail', $event as any)"
        row-class-name="clickable-row"
        size="small"
      >
        <el-table-column type="selection" width="40" />
        <el-table-column prop="taskNo" label="编号" width="140" />
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column prop="agentId" label="Agent" width="130" />
        <el-table-column prop="status" label="状态" width="85">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="时间" width="95">
          <template #default="{ row }">
            <span class="task-time">{{ formatTaskTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="task-footer" v-if="hasMore || total > displayLimit">
        <span class="task-count-info">显示 {{ displayedTasks.length }} / {{ total }} 条</span>
        <el-button v-if="hasMore" link type="primary" size="small" @click="$emit('loadMore')">查看更多</el-button>
      </div>
      <div class="pagination-wrap" v-if="total > pageSize && !searchKeyword">
        <el-pagination
          v-model:current-page="localPage"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          small
          @current-change="$emit('pageChange', localPage)"
        />
      </div>
    </el-collapse-item>
  </el-collapse>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import type { AgentTask, TaskStatus } from '@/api/task-engine'

const props = defineProps<{
  tasks: AgentTask[]
  total: number
  loading: boolean
  displayLimit: number
  searchKeyword: string
  filterStatus: string
  page: number
  pageSize: number
  hasMore: boolean
  selectedIds: string[]
}>()

const emit = defineEmits<{
  'update:searchKeyword': [val: string]
  'update:filterStatus': [val: string]
  loadTasks: []
  loadMore: []
  pageChange: [page: number]
  selectionChange: [rows: AgentTask[]]
  batchDelete: []
  goDetail: [task: AgentTask]
}>()

const activeCollapse = ref<string[]>([])
const localSearchKeyword = ref(props.searchKeyword)
const localFilterStatus = ref(props.filterStatus)
const localPage = ref(props.page)

watch(() => props.searchKeyword, (v) => { localSearchKeyword.value = v })
watch(() => props.filterStatus, (v) => { localFilterStatus.value = v })
watch(() => props.page, (v) => { localPage.value = v })

const displayedTasks = computed(() => {
  if (props.searchKeyword) return props.tasks
  return props.tasks.slice(0, props.displayLimit)
})

const statusLabel = (s: TaskStatus) => ({
  drafted: '草稿', proposed: '待审批', revised: '待修改',
  executing: '执行中', delivered: '已交付', published: '已发布',
  completed: '已完成', cancelled: '已取消', aborted: '已中止', escalated: '已升级',
}[s] || s)

const statusTagType = (s: TaskStatus) => {
  const m: Record<string, string> = { drafted: 'info', proposed: 'warning', executing: 'primary', delivered: 'success', published: 'success', completed: 'success', cancelled: 'danger', escalated: 'danger' }
  return m[s] || 'info'
}

function formatTaskTime(t: string) {
  if (!t) return '-'
  const d = new Date(t)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}
</script>

<style scoped>
.task-collapse { margin-top: 8px; }
.filter-bar { margin-bottom: 8px; }
.filter-left { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.task-footer { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
.task-count-info { font-size: 12px; color: #909399; }
.pagination-wrap { display: flex; justify-content: center; padding: 8px 0; }
.task-time { font-size: 12px; color: #909399; }
</style>
