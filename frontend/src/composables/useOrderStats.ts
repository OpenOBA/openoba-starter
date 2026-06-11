import { ref, computed } from 'vue'
import { getOrderStats } from '@/api/order'

export function useOrderStats() {
  const stats = ref<any>({ total: 0, pending: 0, paid: 0, shipping: 0, completed: 0, cancelled: 0, todaySales: '0' })

  function ensureStats(s: any) {
    return {
      total: s?.total ?? 0,
      pending: s?.pending ?? 0,
      paid: s?.paid ?? 0,
      shipping: s?.shipping ?? 0,
      completed: s?.completed ?? 0,
      cancelled: s?.cancelled ?? 0,
      todaySales: s?.todaySales ?? '0',
    }
  }

  const statCards = computed(() => {
    const s = ensureStats(stats.value)
    return [
      { label: '鎬昏鍗?, value: s.total },
      { label: '寰呭鐞?, value: s.pending },
      { label: '宸叉敮浠?, value: s.paid },
      { label: '鍙戣揣涓?, value: s.shipping },
      { label: '宸插畬鎴?, value: s.completed },
      { label: '浠婃棩閿€鍞?, value: `楼${(parseFloat(s.todaySales) || 0).toFixed(0)}` },
    ]
  })

  async function loadStats() {
    try {
      const res = await getOrderStats()
      stats.value = ensureStats(res)
    } catch (e) {
      console.error('loadStats error:', e)
    }
  }

  return { stats, statCards, loadStats }
}
