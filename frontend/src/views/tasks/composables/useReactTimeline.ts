// useReactTimeline.ts — ReAct timeline data processing
import type { ChatMsg } from './useAgentChat'

interface ChatSSEEvent {
  type?: string
  delta?: string
  tool?: string
  args?: Record<string, unknown>
  result?: string
  text?: string
  runId?: string
  partialContent?: string
  message?: string
  current?: number
  total?: number
  line?: string
  durationMs?: number
}

export function useReactTimeline(
  messages: { value: ChatMsg[] },
  saveReActCache: () => void,
  triggerMessages: () => void,
) {
  function handleSSEEvent(json: ChatSSEEvent, msgIdx: number) {
    if (!messages.value[msgIdx]) return
    if (json.type === 'heartbeat') return

    const msg = messages.value[msgIdx]
    msg.reactTimeline = msg.reactTimeline || []

    if (json.type === 'thought') {
      const last = msg.reactTimeline[msg.reactTimeline.length - 1]
      if (last?.kind === 'thought' && last._streaming !== false) {
        last.text = (last.text || '') + (json.text || '')
      } else {
        msg.reactTimeline.push({ kind: 'thought', text: json.text, ts: Date.now(), _streaming: true })
      }
      msg.statusHint = `${(json.text || '').substring(0, 60)}...`
      triggerMessages()
    } else if (json.type === 'tool_start') {
      const lastThought = msg.reactTimeline[msg.reactTimeline.length - 1]
      if (lastThought?.kind === 'thought') lastThought._streaming = false
      const entry = {
        kind: 'tool' as const,
        name: json.tool || '',
        args: json.args,
        status: 'running' as const,
        result: '',
        _expanded: false,
        ts: Date.now(),
      }
      msg.reactTimeline.push(entry)
      msg.statusHint = `正在执行: ${json.tool || ''}...`
      triggerMessages()
    } else if (json.type === 'observation') {
      msg.reactTimeline.push({ kind: 'observation', text: json.text, ts: Date.now() })
      msg.statusHint = `${(json.text || '').substring(0, 60)}...`
      triggerMessages()
    } else if (json.type === 'tool_progress') {
      for (let i = msg.reactTimeline.length - 1; i >= 0; i--) {
        const item = msg.reactTimeline[i]
        if (item.kind === 'tool' && item.name === json.tool) {
          item.progress = { current: json.current || 0, total: json.total || 0, message: json.message }
          break
        }
      }
      msg.statusHint = `${json.tool}: ${json.current}/${json.total}`
      triggerMessages()
    } else if (json.type === 'tool_stream') {
      for (let i = msg.reactTimeline.length - 1; i >= 0; i--) {
        const item = msg.reactTimeline[i]
        if (item.kind === 'tool' && item.name === json.tool) {
          item.streamLines = item.streamLines || []
          item.streamLines.push(json.line || '')
          break
        }
      }
    } else if (json.type === 'tool_end') {
      for (let i = msg.reactTimeline.length - 1; i >= 0; i--) {
        const item = msg.reactTimeline[i]
        if (item.kind === 'tool' && item.name === json.tool && item.status === 'running') {
          item.status = 'done'
          item.result = json.result
          item.durationMs = json.durationMs
          break
        }
      }
      msg.statusHint = ''
      saveReActCache()
      triggerMessages()
    } else if (json.type === 'content') {
      if (msg.statusHint) msg.statusHint = ''
      const lastThought = msg.reactTimeline[msg.reactTimeline.length - 1]
      if (lastThought?.kind === 'thought') lastThought._streaming = false
      msg.content += json.delta || ''
      triggerMessages()
    }
  }

  function syncProposals(_proposals: Array<{ version: number; content: string; timestamp: string; status: string }>) {
    // proposals 只在 TaskDetail 历史档案中查看
  }

  function insertSummary(t: Record<string, unknown>, fileUrl: string, fileName: string) {
    const proposals = (t.proposals as unknown as Record<string, unknown>[]) || []
    const hasProposal = proposals.length > 0
    const lines: string[] = ['**方案已同意 · 执行总结**', '']
    if (hasProposal) {
      const last = proposals[proposals.length - 1]
      const modelMatch = (last.content as string)?.match(/🤖 使用模型: (.+)/)
      const kbMatch = (last.content as string)?.match(/📚 引用知识: (.+)/)
      if (modelMatch) lines.push(`**模型**：${modelMatch[1]}`)
      if (kbMatch) lines.push(`**知识引用**：${kbMatch[1]}`)
      lines.push(`**版本**：V${last.version}`)
    }
    const allTools: string[] = []
    for (const m of messages.value) {
      if (m.role === 'agent' && m.reactTimeline) {
        for (const item of m.reactTimeline) {
          if (item.kind === 'tool' && item.name && !allTools.includes(item.name)) allTools.push(item.name)
        }
      }
    }
    if (allTools.length > 0) lines.push(`**调用工具**：${allTools.join('、')}`)
    lines.push(`**任务编号**：[${t.taskNo}](/tasks/${t.id})`)
    lines.push(`**历史档案**：[查看提案记录](/tasks/${t.id})`)
    if (fileUrl && fileName) {
      lines.push('')
      lines.push(`**方案文件**：[${fileName}](${fileUrl})  ← 右键另存 / 用 Markdown 编辑器打开`)
    }
    lines.push('')
    lines.push(` ${new Date().toLocaleString('zh-CN')}`)
    messages.value.push({ role: 'system', content: lines.join('\n'), time: '' })
  }

  return {
    handleSSEEvent,
    syncProposals,
    insertSummary,
  }
}
