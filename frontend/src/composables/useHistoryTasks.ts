import { ref } from 'vue'
import { queryTasks } from '@/api/task-engine'

export function useHistoryTasks() {
  const historyTasks = ref<Record<string, unknown>[]>([])
  const historyLoading = ref(false)

  async function loadHistoryTasks() {
    historyLoading.value = true
    try {
      const res = (await queryTasks({ pageSize: 20 })) as unknown as {
        items?: Record<string, unknown>[]
        data?: { items?: Record<string, unknown>[] }
      }
      const items = res?.items || res?.data?.items || []
      historyTasks.value = items.filter((t) =>
        ['drafted', 'proposed', 'executing', 'completed', 'delivered', 'published', 'cancelled', 'aborted'].includes(
          t.status as string,
        ),
      )
    } catch {
      /* ignore */
    } finally {
      historyLoading.value = false
    }
  }

  function historyStatusType(s: string): string {
    const m: Record<string, string> = {
      drafted: 'info',
      executing: 'primary',
      completed: 'success',
      proposed: 'warning',
      delivered: 'success',
      published: 'success',
      cancelled: 'danger',
      aborted: 'danger',
    }
    return m[s] || 'info'
  }

  function historyStatusLabel(s: string): string {
    const m: Record<string, string> = {
      drafted: '草稿',
      executing: '执行中',
      completed: '已完成',
      proposed: '待审批',
      delivered: '已交付',
      published: '已发布',
      cancelled: '已取消',
      aborted: '已中止',
    }
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

  return { historyTasks, historyLoading, loadHistoryTasks, historyStatusType, historyStatusLabel, formatHistoryTime }
}
