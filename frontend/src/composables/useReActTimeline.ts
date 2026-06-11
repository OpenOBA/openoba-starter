/**
 * ReAct 缁熶竴鏃堕棿绾夸簨浠跺鐞嗗櫒 composable
 *
 * 璐熻矗锛歋SE/WS 浜嬩欢鐨勭粺涓€澶勭悊 鈫?娓叉煋鍒扮粺涓€鏃堕棿绾? *
 * 鏀寔浜嬩欢绫诲瀷锛? *   - thought       鈫?鎬濈淮閾捐拷鍔? *   - tool_start    鈫?宸ュ叿璋冪敤鍗＄墖
 *   - observation   鈫?瑙傚療琛? *   - tool_progress 鈫?杩涘害鏉℃洿鏂? *   - tool_stream   鈫?瀹炴椂娴佸紡杈撳嚭
 *   - tool_end      鈫?宸ュ叿缁撴灉瀹屾垚
 *   - content       鈫?涓诲唴瀹?delta 杩藉姞
 *   - heartbeat     鈫?蹇冭烦蹇界暐
 *
 * 渚濊禆澶栭儴娉ㄥ叆锛? *   - messages 鈥?shallowRef<any[]>锛堝繀椤伙級
 *   - triggerMessages 鈥?() => void
 *   - saveReActCache 鈥?() => void
 *   - usedModel 鈥?ref<string>
 */
export function useReActTimeline(
  messages: ReturnType<typeof import('vue').shallowRef<any[]>>,
  triggerMessages: () => void,
  saveReActCache: () => void,
  usedModel: ReturnType<typeof import('vue').ref<string>>,
) {
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
    progressMessage?: string
    durationMs?: number
    agentName?: string
    model?: string
  }

  function handleSSEEvent(json: ChatSSEEvent, msgIdx: number) {
    if (!messages.value[msgIdx]) return
    if (json.type === 'heartbeat') return

    const msg = messages.value[msgIdx]
    msg.reactTimeline = msg.reactTimeline || []

    if (json.type === 'thought') {
      const last = msg.reactTimeline[msg.reactTimeline.length - 1]
      if (last?.kind === 'thought' && last._streaming !== false) {
        last.text += json.text
      } else {
        msg.reactTimeline.push({ kind: 'thought', text: json.text, ts: Date.now(), _streaming: true })
      }
      msg.statusHint = `${(json.text || '').substring(0, 60)}...`
      triggerMessages()

    } else if (json.type === 'tool_start') {
      const lastThought = msg.reactTimeline[msg.reactTimeline.length - 1]
      if (lastThought?.kind === 'thought') lastThought._streaming = false
      msg.reactTimeline.push({
        kind: 'tool', name: json.tool, args: json.args,
        status: 'running', result: '', _expanded: false, ts: Date.now(),
      })
      msg.statusHint = `姝ｅ湪鎵ц: ${json.tool}...`
      triggerMessages()

    } else if (json.type === 'observation') {
      msg.reactTimeline.push({ kind: 'observation', text: json.text, ts: Date.now() })
      msg.statusHint = `${(json.text || '').substring(0, 60)}...`
      triggerMessages()

    } else if (json.type === 'tool_progress') {
      for (let i = msg.reactTimeline.length - 1; i >= 0; i--) {
        const item = msg.reactTimeline[i]
        if (item.kind === 'tool' && item.name === json.tool) {
          item.progress = { current: json.current, total: json.total, message: json.progressMessage || '' }
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
          item.streamLines.push(json.line)
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
      msg.content += json.delta
      triggerMessages()

    } else if (json.type === 'ack') {
      msg.statusHint = 'Agent 姝ｅ湪鎬濊€?..'

    } else if (json.type === 'model' && json.model) {
      usedModel.value = json.model

    } else if (json.type === 'done') {
      msg.agentFooter = {
        name: json.agentName || 'AI 鎵ц瀹?,
        model: json.model || usedModel.value || '',
        ts: formatFooterTime(),
      }
      msg.streaming = false
      saveReActCache()

    } else if (json.type === 'aborted') {
      if (json.partialContent) msg.content = json.partialContent
      msg.content += '\n\n*[宸蹭腑姝*'
      msg.streaming = false

    } else if (json.type === 'error') {
      msg.content = '鈿狅笍 ' + (json.message || '鏈煡閿欒')
      msg.streaming = false
      saveReActCache()
    }
  }

  function formatFooterTime(): string {
    const now = new Date()
    return `${now.getFullYear()}骞?{now.getMonth() + 1}鏈?{now.getDate()}鏃?${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }

  return { handleSSEEvent }
}
