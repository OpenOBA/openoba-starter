import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/api/request'
import { getTask, approveTask } from '@/api/task-engine'

/**
 * 浠诲姟鎻愭绯荤粺 composable
 *
 * 璐熻矗锛氬悓鎰忔柟妗?/ 瀵煎嚭MD / 鎻掑叆鎵ц鎬荤粨 / 鎻愭鍚屾
 *
 * 渚濊禆澶栭儴娉ㄥ叆锛? *   - taskId 鈥?computed ref锛堝綋鍓嶄换鍔D锛? *   - taskDone 鈥?ref锛堜换鍔℃槸鍚︾粨鏉燂級
 *   - taskInfo 鈥?ref锛堜换鍔′俊鎭級
 *   - agentLoading 鈥?ref锛圓gent 鏄惁鍦ㄦ€濊€冧腑锛? *   - messages 鈥?shallowRef锛堟秷鎭垪琛紝鐢ㄤ簬鍒ゆ柇 hasAgentReply 鍜屾彃鍏ユ€荤粨锛? *   - triggerRef 鈥?鎵嬪姩瑙﹀彂 messages 鍝嶅簲
 *   - saveCache 鈥?淇濆瓨鍒?localStorage 鐨勫嚱鏁? */
export function useTaskProposals(
  taskId: ReturnType<typeof import('vue').computed<any>>,
  taskDone: ReturnType<typeof import('vue').ref<boolean>>,
  taskInfo: ReturnType<typeof import('vue').ref<any>>,
  agentLoading: ReturnType<typeof import('vue').ref<boolean>>,
  messages: ReturnType<typeof import('vue').shallowRef<any[]>>,
  triggerMessages: () => void,
  saveCache: () => void,
) {
  const agreeing = ref(false)

  const showAgreeBtn = computed(() => {
    if (taskDone.value) return false
    if (agentLoading.value) return false
    const hasAgentReply = messages.value.some((m: any) => m.role === 'agent' && m.content && !m.streaming)
    return hasAgentReply
  })

  function syncProposals(_proposals: Array<{ version: number; content: string; timestamp: string; status: string }>) {
    // proposals 鍙湪 TaskDetail 鍘嗗彶妗ｆ涓煡鐪嬶紝姝ゅ嚱鏁颁粎鍋氱姸鎬佸悓姝?  }

  async function handleAgree() {
    agreeing.value = true
    try {
      await approveTask(taskId.value, { action: 'approved' })
      for (const msg of messages.value) {
        if (msg.role === 'proposal' && msg.status !== 'accepted') msg.status = 'accepted'
      }
      const t = await getTask(taskId.value)
      taskInfo.value = t
      taskDone.value = ['completed', 'cancelled', 'aborted'].includes(t.status)
      syncProposals(t.proposals || [])

      let fileUrl = ''
      let fileName = ''
      try {
        const json: any = await request.post(`/eros/tasks/${taskId.value}/export-md`)
        fileUrl = json?.url || ''
        fileName = json?.fileName || ''
      } catch { /* ignore */ }

      insertSummary(t, fileUrl, fileName)
      saveCache()
      triggerMessages()
      ElMessage.success('宸插悓鎰忔柟妗?)
    } catch {
      ElMessage.error('鎿嶄綔澶辫触')
    } finally {
      agreeing.value = false
    }
  }

  function insertSummary(t: any, fileUrl: string, fileName: string) {
    const proposals = t.proposals || []
    const hasProposal = proposals.length > 0
    const lines: string[] = ['**鏂规宸插悓鎰?路 鎵ц鎬荤粨**', '']
    if (hasProposal) {
      const last = proposals[proposals.length - 1]
      const modelMatch = last.content?.match(/馃 浣跨敤妯″瀷: (.+)/)
      const kbMatch = last.content?.match(/馃摎 寮曠敤鐭ヨ瘑: (.+)/)
      if (modelMatch) lines.push(`**妯″瀷**锛?{modelMatch[1]}`)
      if (kbMatch) lines.push(`**鐭ヨ瘑寮曠敤**锛?{kbMatch[1]}`)
      lines.push(`**鐗堟湰**锛歏${last.version}`)
    }
    const allTools: string[] = []
    for (const m of messages.value) {
      if (m.role === 'agent' && m.toolCalls) {
        for (const tc of m.toolCalls || []) {
          if (!allTools.includes(tc.name)) allTools.push(tc.name)
        }
      }
    }
    if (allTools.length > 0) lines.push(`**璋冪敤宸ュ叿**锛?{allTools.join('銆?)}`)
    lines.push(`**浠诲姟缂栧彿**锛歔${t.taskNo}](/tasks/${t.id})`)
    lines.push(`**鍘嗗彶妗ｆ**锛歔鏌ョ湅鎻愭璁板綍](/tasks/${t.id})`)
    if (fileUrl && fileName) {
      lines.push('')
      lines.push(`**鏂规鏂囦欢**锛歔${fileName}](${fileUrl})  鈫?鍙抽敭鍙﹀瓨 / 鐢?Markdown 缂栬緫鍣ㄦ墦寮€`)
    }
    lines.push('')
    lines.push(` ${new Date().toLocaleString('zh-CN')}`)
    messages.value.push({
      role: 'system',
      content: lines.join('\n'),
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    })
  }

  return { agreeing, showAgreeBtn, handleAgree, syncProposals, insertSummary }
}
