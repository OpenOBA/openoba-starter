<!--
  EraChatWelcome.vue — P1-3d 前端重构
  ERA-Chat 首页对话区独立组件
  功能：空态品牌 + 快捷任务 + 消息列表 + 确认面板 + CallingInput + 常用语 + 模板编辑弹窗
-->
<template>
  <div class="content-area">
    <!-- 对话区 -->
    <div class="chat-area" ref="chatAreaRef">
      <div v-if="messages.length === 0" class="chat-empty">
        <div class="empty-brand">
          <img src="@/assets/logos/openoba-logo.svg" alt="OpenOBA" class="empty-logo-img">
        </div>
        <div class="empty-title">选择 Agent 或直接描述任务</div>
        <div class="empty-hint">
          <svg class="hint-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#bot"/></svg>
          不指定 Agent 由 MainAgent 自动分派
        </div>
        <div class="empty-hint">
          <svg class="hint-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#users"/></svg>
          @多个 Agent 启动议会模式
        </div>
        <div class="quick-actions">
          <el-button size="small" round @click="$emit('quickTask', 'product')">
            <svg class="qa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#package"/></svg>
            商品上架
          </el-button>
          <el-button size="small" round @click="$emit('quickTask', 'content')">
            <svg class="qa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#pen-line"/></svg>
            内容创作
          </el-button>
          <el-button size="small" round @click="$emit('quickTask', 'data')">
            <svg class="qa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#chart-bar"/></svg>
            数据分析
          </el-button>
          <el-button size="small" round @click="$emit('quickTask', 'service')">
            <svg class="qa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#headphones"/></svg>
            AI客服
          </el-button>
          <el-button size="small" round @click="$emit('quickTask', 'code')">
            <svg class="qa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#code-xml"/></svg>
            代码修改
          </el-button>
          <el-button size="small" round @click="$emit('quickTask', 'custom')">
            <svg class="qa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#wand-sparkles"/></svg>
            功能自定
          </el-button>
        </div>
      </div>

      <div v-for="(msg, i) in messages" :key="i" class="chat-msg" :class="msg.role">
        <div class="msg-meta">
          <span class="msg-sender">{{ msg.sender }}</span>
          <span class="msg-time">{{ msg.time }}</span>
        </div>
        <div class="msg-content">{{ msg.content }}</div>
        <div v-if="msg.data && msg.data.length" class="msg-data">
          <el-tag size="small" type="info" v-for="(item, di) in msg.data" :key="di">{{ item }}</el-tag>
        </div>
        <div v-if="msg.role === 'agent' && msg.needConfirm && !taskDone" class="confirm-panel">
          <div class="confirm-body">{{ msg.confirmText }}</div>
          <div class="confirm-btns">
            <el-button size="small" @click="$emit('cancelConfirm', i)">取消</el-button>
            <el-button size="small" type="primary" :loading="creating" @click="$emit('executeConfirm', i)">立即执行</el-button>
          </div>
        </div>
        <div v-if="msg.taskId" class="msg-task-link">
          <el-button link type="primary" size="small" @click="$emit('goToTask', msg.taskId)">
            进入任务详情
          </el-button>
        </div>
      </div>
    </div>

    <!-- 常用语模板区 -->
    <div class="template-bar">
      <span class="template-label">常用语</span>
      <el-popover
        v-for="(tpl, i) in templates"
        :key="i"
        trigger="contextmenu"
        :width="120"
        placement="top"
      >
        <template #reference>
          <el-button size="small" text @click="$emit('templateApply', tpl)">{{ tpl.text }}</el-button>
        </template>
        <div class="tpl-menu">
          <el-button link size="small" @click="$emit('templateEdit', i)">编辑</el-button>
          <el-button link size="small" type="danger" @click="$emit('templateRemove', i)">删除</el-button>
        </div>
      </el-popover>
      <el-button size="small" text @click="$emit('templateAdd')" class="tpl-add">+</el-button>
      <el-button size="small" text @click="$emit('templateReset')" class="tpl-reset">重置</el-button>
    </div>

    <CallingInput
      ref="callingInputRef"
      :agents="agentList"
      :sending="creating"
      :rows="2"
      @send="$emit('send', $event)"
    />

    <!-- 常用语编辑对话框 -->
    <el-dialog v-model="showTemplateDialog" title="编辑常用语" width="400px" destroy-on-close>
      <el-form :model="editingTemplate" label-width="60px" size="small">
        <el-form-item label="名称">
          <el-input v-model="editingTemplate.text" placeholder="按钮上显示的文字" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="editingTemplate.fill" type="textarea" :rows="3" placeholder="点击按钮时填入输入框的内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="showTemplateDialog = false">取消</el-button>
        <el-button size="small" type="primary" @click="saveTemplate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import CallingInput from '@/components/CallingInput.vue'

interface TemplateItem { icon: string; text: string; fill: string }

const props = defineProps<{
  agentList: any[]
  creating: boolean
  messages: any[]
  taskDone: boolean
  templates: TemplateItem[]
}>()

const emit = defineEmits<{
  quickTask: [type: string]
  send: [payload: { text: string; agentIds: string[]; taskType?: string }]
  agentSelect: [agent: any]
  templateEdit: [index: number]
  templateRemove: [index: number]
  templateAdd: []
  templateReset: []
  templateApply: [tpl: TemplateItem]
  cancelConfirm: [index: number]
  executeConfirm: [index: number]
  goToTask: [taskId: string]
  templatesSaved: [items: TemplateItem[]]
}>()

const chatAreaRef = ref<HTMLElement>()
const callingInputRef = ref()

// 常用语编辑弹窗
const showTemplateDialog = ref(false)
const editingTemplate = reactive<TemplateItem>({ icon: '', text: '', fill: '' })
const editingIndex = ref(-1)

function openAddTemplate() {
  editingTemplate.icon = ''; editingTemplate.text = ''; editingTemplate.fill = ''
  editingIndex.value = -1
  showTemplateDialog.value = true
}

function editTemplate(index: number) {
  const tpl = props.templates[index]
  if (!tpl) return
  editingTemplate.icon = tpl.icon; editingTemplate.text = tpl.text; editingTemplate.fill = tpl.fill
  editingIndex.value = index
  showTemplateDialog.value = true
}

function saveTemplate() {
  if (!editingTemplate.text.trim() || !editingTemplate.fill.trim()) return
  const items = [...props.templates]
  if (editingIndex.value >= 0) {
    items[editingIndex.value] = { ...editingTemplate }
  } else {
    items.push({ ...editingTemplate })
  }
  showTemplateDialog.value = false
  // 将完整 items 传出，父组件负责持久化
  emit('templatesSaved', items)
}

// 暴露给父组件
defineExpose({ chatAreaRef, callingInputRef, openAddTemplate, editTemplate })

// ===== 模板编辑相关 Emits 被父组件接住后处理 localStorage =====
// 以下 watch 在父组件中实现：将 templates 持久化
</script>

<style scoped>
.content-area { display: flex; flex-direction: column; flex: 1; min-width: 0; gap: 0; }
.chat-area { flex: 1; overflow-y: auto; padding: 20px 24px 12px; }

.chat-empty { text-align: center; padding: 60px 20px 40px; }
.empty-brand { margin-bottom: 20px; }
.empty-logo-img { height: 80px; width: auto; border-radius: 8px; }
.empty-title { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 12px; }
.empty-hint { font-size: 13px; color: #64748b; display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 6px; }
.hint-icon { width: 16px; height: 16px; color: #94a3b8; }
.quick-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 20px; }
.qa-icon { width: 14px; height: 14px; }

.chat-msg { margin-bottom: 12px; padding: 10px 14px; border-radius: 12px; max-width: 80%; }
.chat-msg.human { background: linear-gradient(135deg, #e8f4fd, #dceefb); margin-left: auto; border-bottom-right-radius: 4px; }
.chat-msg.agent { background: #f8fafc; border: 1px solid #e2e8f0; border-bottom-left-radius: 4px; }
.chat-msg.system { text-align: center; max-width: 100%; font-size: 12px; color: #94a3b8; background: transparent; }
.msg-meta { display: flex; gap: 8px; margin-bottom: 4px; font-size: 11px; }
.msg-sender { font-weight: 600; color: #475569; }
.msg-time { color: #94a3b8; }
.msg-content { font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
.msg-data { margin-top: 4px; display: flex; gap: 4px; flex-wrap: wrap; }
.msg-task-link { margin-top: 6px; }

.confirm-panel { margin-top: 8px; padding: 10px 12px; background: #fef7e0; border-radius: 8px; border: 1px solid #fde68a; }
.confirm-body { font-size: 12px; color: #92400e; margin-bottom: 8px; }
.confirm-btns { display: flex; gap: 8px; justify-content: flex-end; }

.template-bar { display: flex; align-items: center; gap: 4px; padding: 6px 12px; border-top: 1px solid #f0f0f0; background: #fafafa; overflow-x: auto; }
.template-label { font-size: 11px; color: #94a3b8; margin-right: 4px; flex-shrink: 0; }
.tpl-add, .tpl-reset { font-size: 16px; font-weight: 700; color: #94a3b8; }
.tpl-menu { display: flex; flex-direction: column; gap: 4px; }
</style>
