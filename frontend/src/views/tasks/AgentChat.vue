<template>
  <div class="agent-chat">
    <!-- 悬浮 Header -->
    <div class="chat-header-floating">
      <el-button link type="primary" @click="$router.push('/tasks')">
        <el-icon><ArrowLeft /></el-icon> 返回
      </el-button>
      <div class="header-info">
        <h3>{{ taskTitle || 'Agent 对话' }}</h3>
      </div>
    </div>

    <!-- 主体：侧边栏 + 对话区 -->
    <div class="chat-main">
      <AgentChatSidebar
        :task-info="taskInfo"
        :task-id="taskId"
        :history-tasks="(historyTasks as unknown as Array<{ id: string; title: string; status: string; createdAt: string; updatedAt: string }>)"
        :history-loading="historyLoading"
        :logs="(logs as unknown as Array<{ id: string; type: string; actor: string; title: string; time: string }>)"
        @switch-task="switchToTask"
      />

      <!-- 对话区 -->
      <div class="chat-mid">
        <div class="chat-body">
          <div v-for="(msg, i) in messages" :key="i">
            <div v-if="msg.role === 'human'" class="chat-bubble human">
              <div class="bubble-meta"><svg class="bubble-avatar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#user"/></svg><span>You</span><span>{{ msg.time }}</span></div>
              <div class="bubble-text" v-html="renderMarkdown(msg.content)"></div>
            </div>
            <div v-else-if="msg.role === 'agent'" class="chat-bubble agent">
              <div class="bubble-meta"><svg class="bubble-avatar agent-avatar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#bot"/></svg><span>Agent</span><span>{{ msg.time }}</span></div>
              <div v-if="msg.statusHint" class="bubble-status">{{ msg.statusHint }}</div>
              <div v-if="msg.reactTimeline && msg.reactTimeline.length > 0" class="react-timeline">
                <template v-for="(item, ti) in msg.reactTimeline" :key="'rt'+ti">
                  <div v-if="item.kind === 'thought'" class="thought-bubble">{{ item.text }}</div>
                  <div v-else-if="item.kind === 'tool'" class="tool-card" :class="{ done: item.status === 'done' }">
                    <div class="tool-card-head" @click="item._expanded = !item._expanded">
                      <span>{{ item.status === 'done' ? '✅' : '🔧' }} {{ item.name }}</span>
                      <span class="tool-arrow">{{ item._expanded ? '收起' : '展开' }}</span>
                    </div>
                    <div v-if="item._expanded" class="tool-card-body">
                      <div class="tool-args">参数: {{ JSON.stringify(item.args) }}</div>
                      <div v-if="item.progress" class="tool-progress">
                        <div class="tool-progress-bar" :style="{ width: (item.progress.current / item.progress.total * 100) + '%' }"></div>
                        <span class="tool-progress-text">{{ item.progress.current }}/{{ item.progress.total }} {{ item.progress.message }}</span>
                      </div>
                      <div v-if="item.streamLines && item.streamLines.length > 0" class="tool-stream">
                        <div v-for="(line, li) in item.streamLines.slice(-50)" :key="'sl'+li" class="tool-stream-line">{{ line }}</div>
                      </div>
                      <div class="tool-result" v-if="item.result">{{ item.result }}</div>
                    </div>
                  </div>
                  <div v-else-if="item.kind === 'observation'" class="obs-line">{{ item.text }}</div>
                </template>
              </div>
              <div v-if="msg.streaming" class="bubble-text streaming">{{ msg.content }}<span class="cursor">|</span></div>
              <div v-else class="bubble-text" v-html="renderMarkdown(msg.content)"></div>
              <div v-if="!msg.streaming && msg.content && msg.agentFooter" class="agent-footer">
                <span class="footer-name">{{ msg.agentFooter.name }}</span>
                <span class="footer-sep">·</span>
                <span class="footer-time">{{ msg.agentFooter.ts }}</span>
                <span class="footer-sep">·</span>
                <span class="footer-model">{{ msg.agentFooter.model }}</span>
              </div>
            </div>
            <div v-else class="chat-bubble system">
              <div class="bubble-text" v-html="renderMarkdown(msg.content)"></div>
            </div>
          </div>
        </div>

        <!-- 底部输入 -->
        <div class="chat-input-bar" v-if="!taskDone">
          <el-input v-model="inputText" type="textarea" :rows="2" placeholder="输入消息..." :disabled="agentLoading" @keydown.enter.exact.prevent="handleSend" />
          <div class="input-actions">
            <span class="input-hint">Enter 发送</span>
            <div>
              <el-button v-if="isStreaming" size="small" type="danger" @click="handleAbort">停止</el-button>
              <el-button v-if="showAgreeBtn" size="small" type="success" :loading="agreeing" @click="handleAgree">同意方案</el-button>
              <el-button type="primary" size="small" :loading="isLoading" :disabled="!inputText.trim()" @click="handleSend">发送</el-button>
            </div>
          </div>
        </div>
        <div v-else class="chat-done-bar">
          任务已结束
          <el-button size="small" @click="$router.push('/tasks/' + taskId)">查看历史</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import AgentChatSidebar from '@/components/AgentChatSidebar.vue'
import { useChatMessages } from './composables/useChatMessages'
import { useReactTimeline } from './composables/useReactTimeline'
import { useAgentChat } from './composables/useAgentChat'

const route = useRoute()
const router = useRouter()

// ── Composables ──
const chatMessages = useChatMessages(ref(''))
const { messages, renderMarkdown, formatTime, formatFooterTime, saveReActCache, saveCache, scrollBottom, triggerRef } = chatMessages

const timeline = useReactTimeline(messages, saveReActCache, () => triggerRef(messages))
const { handleSSEEvent, syncProposals, insertSummary } = timeline

const chat = useAgentChat(
  messages, () => triggerRef(messages), handleSSEEvent, saveCache, saveReActCache,
  scrollBottom, formatTime, formatFooterTime, syncProposals, insertSummary as unknown as (t: unknown, fileUrl: string, fileName: string) => void,
)
const {
  taskId, taskTitle, taskDone, taskInfo, logs, inputText, agentLoading,
  isLoading, isStreaming, agreeing, showAgreeBtn,
  historyTasks, historyLoading, loadTask, loadHistoryTasks, switchToTask,
  handleSend, handleAbort, handleAgree,
} = chat

// ── Lifecycle ──
onMounted(() => {
  if (!taskId.value || taskId.value === 'undefined') {
    ElMessage.error('无效任务')
    router.push('/chat')
    return
  }
  chat.ws.connect()
  loadTask()
  loadHistoryTasks()
})

onBeforeUnmount(() => {
  if (messages.value.length > 0) saveCache()
})

watch(() => route.params.id, (newId) => {
  if (newId) { loadTask(); loadHistoryTasks() }
})
</script>

<style scoped>
/* ═══ ERA-Chat 视觉升级 ═══ */
.agent-chat { height: 100%; display: flex; flex-direction: column; max-width: 100%; margin: 0; background: linear-gradient(160deg, #f0f4fa 0%, #faf8fc 50%, #f0f7f8 100%); }
.chat-header-floating { position: sticky; top: 0; z-index: 210; display: flex; align-items: center; padding: 8px 12px 8px 192px; border-bottom: 1px solid rgba(3,105,161,0.08); gap: 8px; flex-shrink: 0; background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); }
.header-info { flex: 1; min-width: 0; }
.header-info h3 { margin: 0; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #1e293b; }
.chat-main { flex: 1; display: flex; overflow: hidden; }
.chat-mid { flex: 1; display: flex; flex-direction: column; min-width: 0; padding-left: 180px; }
.chat-body { flex: 1; overflow-y: auto; padding: 16px 24px; background: transparent; }
.chat-bubble { margin-bottom: 16px; padding: 14px 18px; border-radius: 16px; max-width: 85%; box-shadow: 0 2px 8px rgba(15,23,42,0.04); }
.chat-bubble.human { background: linear-gradient(135deg, #e8f4fd 0%, #dceefb 100%); margin-left: auto; border-bottom-right-radius: 6px; border: 1px solid rgba(3,105,161,0.08); }
.chat-bubble.agent { background: #ffffff; border-bottom-left-radius: 6px; border: 1px solid rgba(83,74,183,0.06); box-shadow: 0 2px 12px rgba(83,74,183,0.04); }
.chat-bubble.system { background: linear-gradient(135deg, #fef7e0 0%, #fdf4d0 100%); text-align: center; max-width: 100%; font-size: 12px; color: #909399; padding: 10px 16px; box-shadow: none; border-radius: 10px; }
.bubble-meta { display: flex; gap: 12px; margin-bottom: 6px; font-size: 11px; color: #909399; align-items: center; }
.bubble-avatar { width: 16px; height: 16px; color: #606266; flex-shrink: 0; }
.bubble-avatar.agent-avatar { color: #534AB7; }
.bubble-meta span:first-child { font-weight: 600; color: #606266; }
.bubble-text { font-size: 14px; line-height: 1.7; word-break: break-word; }
.bubble-text :deep(h1), .bubble-text :deep(h2), .bubble-text :deep(h3) { font-size: 15px; margin: 8px 0 4px; }
.bubble-text :deep(table) { border-collapse: collapse; margin: 8px 0; width: 100%; }
.bubble-text :deep(th), .bubble-text :deep(td) { border: 1px solid #dcdfe6; padding: 4px 8px; text-align: left; font-size: 12px; }
.bubble-text :deep(th) { background: #f5f7fa; font-weight: 600; }
.bubble-text :deep(code) { background: #f0f2f5; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
.bubble-text :deep(pre) { background: #f5f7fa; padding: 8px 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
.bubble-text :deep(a) { color: #409eff; text-decoration: underline; }
.bubble-text :deep(blockquote) { border-left: 3px solid #dcdfe6; padding-left: 10px; color: #909399; margin: 6px 0; }
.bubble-text :deep(ul), .bubble-text :deep(ol) { padding-left: 20px; margin: 4px 0; }
.bubble-text :deep(li) { margin: 2px 0; }
.bubble-status { font-size: 11px; color: #409eff; padding: 2px 0 4px; font-style: italic; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
.react-timeline { margin: 4px 0; }
.thought-bubble { font-size: 11px; color: #909399; background: #f5f7fa; border-left: 3px solid #c0c4cc; padding: 4px 8px; border-radius: 0 6px 6px 0; margin-bottom: 3px; font-style: italic; line-height: 1.5; }
.obs-line { font-size: 10px; color: #67c23a; background: #f0f9eb; border-left: 3px solid #67c23a; padding: 3px 8px; border-radius: 0 6px 6px 0; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tool-card { border: 1px solid #d3d6db; border-radius: 6px; margin-bottom: 4px; overflow: hidden; }
.tool-card.done { border-color: #67c23a; }
.tool-card-head { display: flex; justify-content: space-between; padding: 5px 8px; background: #f5f7fa; cursor: pointer; font-size: 11px; }
.tool-card-head:hover { background: #e8eaed; }
.tool-arrow { color: #909399; font-size: 10px; }
.tool-card-body { padding: 6px 8px; font-size: 10px; }
.tool-args { color: #909399; margin-bottom: 4px; word-break: break-all; }
.tool-result { white-space: pre-wrap; max-height: 200px; overflow-y: auto; background: #fff; padding: 4px 6px; border-radius: 4px; color: #606266; }
.tool-progress { margin-bottom: 4px; }
.tool-progress-bar { height: 4px; background: #67c23a; border-radius: 2px; transition: width 0.3s; }
.tool-progress-text { font-size: 10px; color: #909399; display: block; margin-top: 2px; }
.tool-stream { max-height: 200px; overflow-y: auto; background: #2b2b2b; color: #e0e0e0; padding: 4px 6px; border-radius: 4px; margin-bottom: 4px; font-family: 'Courier New', monospace; }
.tool-stream-line { font-size: 10px; line-height: 1.4; white-space: pre-wrap; word-break: break-all; }
.bubble-text.streaming { color: #606266; }
.cursor { animation: blink 1s infinite; color: #409eff; }
@keyframes blink { 0%,50% { opacity: 1; } 51%,100% { opacity: 0; } }
.chat-input-bar { padding: 10px 16px; border-top: 1px solid rgba(3,105,161,0.08); background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); flex-shrink: 0; position: relative; z-index: 1; border-radius: 0 0 12px 12px; }
.input-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.input-hint { font-size: 11px; color: #c0c4cc; }
.chat-done-bar { padding: 12px 16px; border-top: 1px solid #e4e7ed; background: #f0f9eb; text-align: center; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 10px; flex-shrink: 0; }
.agent-footer { margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(148,163,184,0.12); font-size: 11px; color: #94a3b8; display: flex; gap: 6px; }
.footer-name { font-weight: 500; color: #64748b; }
.footer-sep { color: #cbd5e1; }
</style>
