// useChatMessages.ts — message list management, persistence, markdown rendering
import { shallowRef, triggerRef, nextTick, computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { ChatMsg, TimelineItem } from './useAgentChat'

export function useChatMessages(taskId: { value: string }) {
  const messages = shallowRef<ChatMsg[]>([])
  const LS_KEY = computed(() => 'chat-' + taskId.value)

  function renderMarkdown(text: string): string {
    if (!text) return ''
    // V1.6.0: 过滤 Agent 工具调用 XML 标签，防止泄露到前端渲染层
    const cleaned = text
      .replace(/<invoke[\s\S]*?<\/invoke>/gi, '')
      .replace(/<function[\s\S]*?<\/function>/gi, '')
      .replace(/<parameter[\s\S]*?<\/parameter>/gi, '')
      .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
      .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
      .replace(/<\/?invoke[^>]*>/gi, '')
      .replace(/<\/?function[^>]*>/gi, '')
      .replace(/<\/?parameter[^>]*>/gi, '')
      .trim()
    return DOMPurify.sanitize(marked.parse(cleaned, { breaks: true, gfm: true }) as string)
  }

  function formatTime(isoStr?: string): string {
    const d = isoStr ? new Date(isoStr) : new Date()
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  function formatFooterTime(): string {
    const now = new Date()
    return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }

  function saveReActCache() {
    try {
      const clean = messages.value.map((m: ChatMsg) => ({
        role: m.role,
        content: m.content || '',
        time: m.time || '',
        agentFooter: m.agentFooter || undefined,
        reactTimeline: m.reactTimeline
          ? m.reactTimeline.slice(-40).map((item: TimelineItem) => ({
              ...item,
              result: item.result ? item.result.substring(0, 500) : '',
            }))
          : undefined,
      }))
      const trimmed = clean.slice(-50)
      localStorage.setItem(LS_KEY.value, JSON.stringify(trimmed))
    } catch (e) {
      console.warn('localStorage 写入失败:', e)
    }
  }

  function saveCache() {
    saveReActCache()
  }

  function scrollBottom() {
    nextTick(() => {
      const chatBodyRef = document.querySelector('.chat-body') as HTMLElement | null
      if (chatBodyRef) {
        chatBodyRef.scrollTop = chatBodyRef.scrollHeight
      }
    })
  }

  return {
    messages,
    renderMarkdown,
    formatTime,
    formatFooterTime,
    saveReActCache,
    saveCache,
    scrollBottom,
    triggerRef,
  }
}
