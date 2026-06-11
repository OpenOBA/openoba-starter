import { ref } from 'vue'
import { queryTasks } from '@/api/task-engine'
import type { AgentTask, TaskStatus } from '@/api/task-engine'

export function useTaskList() {
  const loading = ref(false)
  const tasks = ref<AgentTask[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const filterStatus = ref('')
  const searchKeyword = ref('')
  const displayLimit = ref(10)
  const hasMore = ref(false)

  async function loadTasks() {
    loading.value = true
    try {
      const params: Record<string, number | string> = {
        page: 1,
        pageSize: searchKeyword.value ? 50 : pageSize.value,
      }
      if (filterStatus.value) params.status = filterStatus.value
      if (searchKeyword.value) params.search = searchKeyword.value
      const res = await queryTasks(params)
      tasks.value = res.items
      total.value = res.total
      hasMore.value = total.value > displayLimit.value
    } catch { /* ignore */ } finally {
      loading.value = false
    }
  }

  function loadMore() {
    displayLimit.value += 20
    hasMore.value = total.value > displayLimit.value
  }

  function statusLabel(s: TaskStatus): string {
    return {
      drafted: '鑽夌', proposed: '寰呭鎵?, revised: '寰呬慨鏀?,
      executing: '鎵ц涓?, delivered: '宸蹭氦浠?, published: '宸插彂甯?,
      completed: '宸插畬鎴?, cancelled: '宸插彇娑?, aborted: '宸蹭腑姝?, escalated: '宸插崌绾?,
    }[s] || s
  }

  function statusTagType(s: TaskStatus): string {
    const m: Record<string, string> = {
      drafted: 'info', proposed: 'warning', executing: 'primary',
      delivered: 'success', published: 'success', completed: 'success',
      cancelled: 'danger', escalated: 'danger',
    }
    return m[s] || 'info'
  }

  function formatTaskTime(t: string): string {
    if (!t) return '-'
    const d = new Date(t)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 86400000) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    if (diff < 604800000) return Math.floor(diff / 86400000) + '澶╁墠'
    return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }

  return {
    loading, tasks, total, page, pageSize,
    filterStatus, searchKeyword, displayLimit, hasMore,
    loadTasks, loadMore, statusLabel, statusTagType, formatTaskTime,
  }
}
