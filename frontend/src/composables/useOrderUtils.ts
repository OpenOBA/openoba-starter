import { useDict } from '@/composables/useDict'

const orderStatusDict = useDict('dict_order_status')
const paymentStatusDict = useDict('dict_payment_status')
const customerTypeDict = useDict('dict_customer_type')

export function useOrderUtils() {
  function statusTag(s: string): string {
    if (orderStatusDict.labels.value[s]) {
      const m: Record<string, string> = {
        pending: 'info',
        confirmed: 'primary',
        paid: 'success',
        shipped: 'warning',
        completed: '',
        cancelled: 'danger',
      }
      return m[s] || ''
    }
    const m: Record<string, string> = {
      pending: 'info',
      confirmed: 'primary',
      paid: 'success',
      shipped: 'warning',
      completed: '',
      cancelled: 'danger',
    }
    return m[s] || ''
  }

  function statusLabel(s: string): string {
    return (
      orderStatusDict.labels.value[s] ||
      {
        pending: '待处理',
        confirmed: '已确认',
        paid: '已支付',
        shipped: '已发货',
        completed: '已完成',
        cancelled: '已取消',
      }[s] ||
      s
    )
  }

  function orderTypeLabel(t: string): string {
    return customerTypeDict.labels.value[t] || { retail: '零售', wholesale: '批发', partner: '合作' }[t] || t
  }

  function payLabel(s: string): string {
    return paymentStatusDict.labels.value[s] || { unpaid: '未支付', paid: '已支付', partial: '部分支付' }[s] || s
  }

  function fulfillmentTag(t: string): string {
    const m: Record<string, string> = { frame_only: '', lens_and_frame: 'warning', lens_only: 'info' }
    return m[t] || ''
  }

  function fulfillmentLabel(t: string): string {
    const m: Record<string, string> = { frame_only: '框架', lens_and_frame: '眼镜', lens_only: '单片' }
    return m[t] || t
  }

  function lensStatusTag(s: string): string {
    const m: Record<string, string> = {
      not_needed: 'info',
      pending: 'warning',
      processing: '',
      completed: 'success',
      self_supplied: 'info',
    }
    return m[s] || ''
  }

  function lensStatusLabel(s: string): string {
    const m: Record<string, string> = {
      not_needed: '不需要',
      pending: '待处方',
      processing: '加工中',
      completed: '已完成',
      self_supplied: '客户自配',
    }
    return m[s] || s
  }

  function formatDate(d: string): string {
    if (!d) return '-'
    return new Date(d).toLocaleString('zh-CN', { hour12: false })
  }

  return {
    statusTag,
    statusLabel,
    orderTypeLabel,
    payLabel,
    fulfillmentTag,
    fulfillmentLabel,
    lensStatusTag,
    lensStatusLabel,
    formatDate,
  }
}
