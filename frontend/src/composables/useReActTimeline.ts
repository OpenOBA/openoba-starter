/**
 * ReAct 统一时间线事件处理器 composable
 *
 * 负责：SSE/WS 事件的统一处理 → 渲染到统一时间线
 * 支持事件类型：
 *   - thought       → 思维链追加
 *   - tool_start    → 工具调用卡片
 *   - observation   → 观察表
 *   - tool_progress → 进度条更新
 *   - tool_stream   → 实时流式输出
 *   - tool_end      → 工具结果完成
 *   - content       → 主内容 delta 追加
 *   - heartbeat     → 心跳忽略
 *
 * 依赖外部注入：
 *   - messages — shallowRef<any[]>（必须）
 *   - triggerMessages — () => void
 *   - saveReActCache — () => void
 *   - usedModel — ref<string>
 */
export function useReActTimeline(
  messages: ReturnType<typeof import('vue').shallowRef<any[]>>,
  triggerMessages: () => void,
  saveReActCache: () => void,
  usedModel: ReturnType<typeof import('vue').ref<string>>,
) {
  interface ChatSSEEvent {
    type: string
    content?: string
    thought?: string
    toolName?: string
    toolArgs?: Record<string, unknown>
    toolResult?: string
    observation?: string
    progress?: { current: number; total: number }
    agentName?: string
    model?: string
    status?: string
    error?: string
  }

  function formatFooterTime(): string {
    return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  function handleSSEEvent(json: ChatSSEEvent, msgIdx: number) {
    const msg = messages.value[msgIdx]
    if (!msg || !msg.reactTimeline) {
      msg.reactTimeline = []
    }

    if (json.type === 'heartbeat') {
      return // skip heartbeat
    }

    if (json.type === 'thought') {
      const last = msg.reactTimeline[msg.reactTimeline.length - 1]
      if (last && last.type === 'thought') {
        last.content += json.thought || ''
      } else {
        msg.reactTimeline.push({ type: 'thought', content: json.thought || '' })
      }
      // insert empty observation placeholder after last thought
      const lastIdx = msg.reactTimeline.length - 1
      if (lastIdx >= 0 && msg.reactTimeline[lastIdx].type === 'thought') {
        const nextIdx = lastIdx + 1
        if (nextIdx >= msg.reactTimeline.length || msg.reactTimeline[nextIdx].type !== 'observation') {
          msg.reactTimeline.push({ type: 'observation', content: '' })
        }
      }
    } else if (json.type === 'tool_start') {
      msg.reactTimeline.push({
        type: 'tool',
        name: json.toolName || '',
        args: json.toolArgs || {},
        status: 'running',
        result: '',
        progress: null,
        _expanded: false,
      })
    } else if (json.type === 'observation') {
      // fill the observation placeholder
      for (let i = msg.reactTimeline.length - 1; i >= 0; i--) {
        if (msg.reactTimeline[i].type === 'observation') {
          msg.reactTimeline[i].content = json.observation || ''
          break
        }
      }
    } else if (json.type === 'tool_progress') {
      const lastInfo = msg.reactTimeline[msg.reactTimeline.length - 1]
      if (lastInfo && lastInfo.type === 'tool') {
        lastInfo.progress = json.progress || null
      }
    } else if (json.type === 'tool_end') {
      const lastInfo = msg.reactTimeline[msg.reactTimeline.length - 1]
      if (lastInfo && lastInfo.type === 'tool') {
        lastInfo.status = 'done'
        lastInfo.result = json.toolResult || ''
      }
    } else if (json.type === 'tool_stream') {
      const lastInfo = msg.reactTimeline[msg.reactTimeline.length - 1]
      if (lastInfo && lastInfo.type === 'tool') {
        lastInfo.result = (lastInfo.result || '') + (json.toolResult || '')
      }
    } else if (json.type === 'content') {
      msg.content = (msg.content || '') + (json.content || '')
    } else if (json.type === 'done') {
      msg.agentFooter = {
        name: json.agentName || 'AI 执行官',
        model: json.model || usedModel.value || '',
        ts: formatFooterTime(),
      }
      msg.streaming = false
      saveReActCache()
    } else if (json.type === 'error') {
      msg.streaming = false
      const lastInfo = msg.reactTimeline[msg.reactTimeline.length - 1]
      if (lastInfo && lastInfo.type === 'tool') {
        lastInfo.status = 'error'
        lastInfo.result = json.error || '工具执行失败'
      }
    } else if (json.type === 'status') {
      msg.status = json.status || ''
    }

    triggerMessages()
  }

  return { handleSSEEvent }
}
