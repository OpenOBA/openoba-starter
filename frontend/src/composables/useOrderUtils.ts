import { useDict } from '@/composables/useDict'

const orderStatusDict = useDict('dict_order_status')
const paymentStatusDict = useDict('dict_payment_status')
const customerTypeDict = useDict('dict_customer_type')

export function useOrderUtils() {
  function statusTag(s: string): string {
    if (orderStatusDict.labels.value[s]) {
      const m: Record<string, string> = { pending: 'info', confirmed: 'primary', paid: 'success', shipped: 'warning', completed: '', cancelled: 'danger' }
      return m[s] || ''
    }
    const m: Record<string, string> = { pending: 'info', confirmed: 'primary', paid: 'success', shipped: 'warning', completed: '', cancelled: 'danger' }
    return m[s] || ''
  }

  function statusLabel(s: string): string {
    return orderStatusDict.labels.value[s] || { pending: '寰呭鐞?, confirmed: '宸茬‘璁?, paid: '宸叉敮浠?, shipped: '宸插彂璐?, completed: '宸插畬鎴?, cancelled: '宸插彇娑? }[s] || s
  }

  function orderTypeLabel(t: string): string {
    return customerTypeDict.labels.value[t] || { retail: '闆跺敭', wholesale: '鎵瑰彂', partner: '鍚堜綔' }[t] || t
  }

  function payLabel(s: string): string {
    return paymentStatusDict.labels.value[s] || { unpaid: '鏈敮浠?, paid: '宸叉敮浠?, partial: '閮ㄥ垎鏀粯' }[s] || s
  }

  function fulfillmentTag(t: string): string {
    const m: Record<string, string> = { frame_only: '', lens_and_frame: 'warning', lens_only: 'info' }
    return m[t] || ''
  }

  function fulfillmentLabel(t: string): string {
    const m: Record<string, string> = { frame_only: '瑁告', lens_and_frame: '鐪奸暅', lens_only: '鍗曢暅鐗? }
    return m[t] || t
  }

  function lensStatusTag(s: string): string {
    const m: Record<string, string> = { not_needed: 'info', pending: 'warning', processing: '', completed: 'success', self_supplied: 'info' }
    return m[s] || ''
  }

  function lensStatusLabel(s: string): string {
    const m: Record<string, string> = { not_needed: '涓嶉渶瑕?, pending: '寰呭鏂?, processing: '鍔犲伐涓?, completed: '宸插畬鎴?, self_supplied: '瀹㈡埛鑷厤' }
    return m[s] || s
  }

  function formatDate(d: string): string {
    if (!d) return '-'
    return new Date(d).toLocaleString('zh-CN', { hour12: false })
  }

  return { statusTag, statusLabel, orderTypeLabel, payLabel, fulfillmentTag, fulfillmentLabel, lensStatusTag, lensStatusLabel, formatDate }
}
