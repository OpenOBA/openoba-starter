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
      { label: '总订单', value: s.total },
      { label: '待处理', value: s.pending },
      { label: '已支付', value: s.paid },
      { label: '发货中', value: s.shipping },
      { label: '已完成', value: s.completed },
      { label: '今日销售', value: `¥${(parseFloat(s.todaySales) || 0).toFixed(0)}` },
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
