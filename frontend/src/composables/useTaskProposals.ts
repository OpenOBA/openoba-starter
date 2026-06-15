import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/api/request'
import { getTask, approveTask } from '@/api/task-engine'

/**
 * 任务提案系统 composable
 *
 * 负责：同意方案 / 导出MD / 插入执行总结 / 提案同步
 *
 * 依赖外部注入：
 *   - taskId — computed ref（当前任务ID）
 *   - taskDone — ref（任务是否结束）
 *   - taskInfo — ref（任务信息）
 *   - agentLoading — ref（Agent 是否在思考中）
 *   - messages — shallowRef（消息列表，用于判断 hasAgentReply 和插入总结）
 *   - triggerRef — 手动触发 messages 响应
 *   - saveCache — 保存到 localStorage 的函数
 */
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
    // proposals 只在 TaskDetail 历史档案中查看，此函数仅做状态同步
  }

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
      ElMessage.success('已同意方案')
    } catch {
      ElMessage.error('操作失败')
    } finally {
      agreeing.value = false
    }
  }

  function insertSummary(t: any, fileUrl: string, fileName: string) {
    const proposals = t.proposals || []
    const hasProposal = proposals.length > 0
    const lines: string[] = ['**方案已同意 · 执行总结**', '']
    if (hasProposal) {
      const last = proposals[proposals.length - 1]
      const modelMatch = last.content?.match(/🔻 使用模型: (.+)/)
      const kbMatch = last.content?.match(/📎 引用知识: (.+)/)
      if (modelMatch) lines.push(`**模型**：${modelMatch[1]}`)
      if (kbMatch) lines.push(`**知识引用**：${kbMatch[1]}`)
      lines.push(`**版本**：V${last.version}`)
    }
    const allTools: string[] = []
    for (const m of messages.value) {
      if (m.role === 'agent' && m.toolCalls) {
        for (const tc of m.toolCalls || []) {
          if (!allTools.includes(tc.name)) allTools.push(tc.name)
        }
      }
    }
    if (allTools.length > 0) lines.push(`**调用工具**：${allTools.join('、')}`)
    lines.push(`**任务编号**：[${t.taskNo}](/tasks/${t.id})`)
    lines.push(`**历史档案**：[查看提案记录](/tasks/${t.id})`)
    if (fileUrl && fileName) {
      lines.push('')
      lines.push(`**方案文件**：[${fileName}](${fileUrl})  → 右键另存 / 用 Markdown 编辑器打开`)
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
