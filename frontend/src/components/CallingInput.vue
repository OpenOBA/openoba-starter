<template>
  <div class="calling-input">
    <!-- 已选 Agent 标签 -->
    <div v-if="selectedAgents.length > 0 || attachedFiles.length > 0" class="selected-tags">
      <el-tag v-for="ag in selectedAgents" :key="'ag-' + ag.id" closable size="small" @close="removeAgent(ag)">
        @{{ ag.displayName }}
        <span v-if="eraSettings.agent.defaultModel" style="font-size: 10px; color: #909399; margin-left: 4px">
          {{ eraSettings.agent.defaultModel }}
        </span>
      </el-tag>
      <el-tag
        v-for="(f, i) in attachedFiles"
        :key="'f-' + i"
        closable
        size="small"
        type="success"
        @close="attachedFiles.splice(i, 1)"
      >
        {{ f.name }}
      </el-tag>
    </div>

    <!-- 输入区 -->
    <div class="input-row">
      <el-input
        ref="inputRef"
        v-model="text"
        type="textarea"
        :rows="rows"
        :placeholder="placeholder"
        resize="none"
        @keydown.enter.exact="handleSend"
      />
    </div>

    <!-- 底部操作栏 -->
    <div class="input-footer">
      <div class="footer-left">
        <el-dropdown trigger="click" @command="handleAgentCmd">
          <el-button link size="small">@Agent</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="a in agents" :key="a.id" :command="a">
                {{ a.displayName }}
                <span style="color: #909399; font-size: 10px; margin-left: 6px">{{ a.description }}</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button link size="small" @click="triggerUpload">上传文件</el-button>
        <input
          ref="fileInputRef"
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv"
          style="display: none"
          @change="handleFileChange"
        />
      </div>
      <div class="footer-right">
        <span class="input-hint">Enter 发送</span>
        <el-button class="send-btn" size="small" :disabled="!canSend" :loading="sending" @click="handleSend">
          发送
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { AgentEntry } from './AgentSidebar.vue'

const props = withDefaults(
  defineProps<{
    agents: AgentEntry[]
    sending?: boolean
    rows?: number
  }>(),
  {
    sending: false,
    rows: 2,
  },
)

const emit = defineEmits<{
  (e: 'send', payload: { text: string; agentIds: string[]; files?: File[]; modelCode?: string }): void
}>()

const text = ref('')
const fileInputRef = ref<HTMLInputElement>()
const selectedAgents = ref<AgentEntry[]>([])
const attachedFiles = ref<File[]>([])
// bound in <template ref="inputRef">, noUnusedLocals suppressed via void
const inputRef = ref()
void inputRef.value
// 模型来源：首页 Header 的 eraSettings.agent.defaultModel
import { useERASettings } from '@/composables/useERASettings'
const { settings: eraSettings } = useERASettings()

const placeholder = computed(() => {
  if (selectedAgents.value.length === 1) {
    return `@${selectedAgents.value[0].displayName} — ${selectedAgents.value[0].description}`
  }
  if (selectedAgents.value.length > 1) {
    return '多 Agent 议会模式 — 各 Agent 独立分析后汇总讨论'
  }
  return '描述任务，或 @Agent 召唤（不指定则由 MainAgent 自动分派）'
})

const canSend = computed(() => text.value.trim().length > 0 && !props.sending)

function selectAgent(agent: AgentEntry) {
  if (!selectedAgents.value.find((a) => a.id === agent.id)) {
    selectedAgents.value.push(agent)
  }
}

function removeAgent(agent: AgentEntry) {
  selectedAgents.value = selectedAgents.value.filter((a) => a.id !== agent.id)
}

function handleAgentCmd(agent: AgentEntry) {
  selectAgent(agent)
}

async function handleSend() {
  if (!canSend.value) return
  const agentIds = selectedAgents.value.map((a) => a.id)
  const files = attachedFiles.value.length > 0 ? [...attachedFiles.value] : undefined
  const modelCode = eraSettings.agent.defaultModel || undefined
  emit('send', { text: text.value.trim(), agentIds, files, modelCode })
  text.value = ''
  selectedAgents.value = []
  attachedFiles.value = []
}

function triggerUpload() {
  fileInputRef.value?.click()
}

function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) {
    for (let i = 0; i < input.files.length; i++) {
      const f = input.files[i]
      const maxSize = 20 * 1024 * 1024
      if (f.size > maxSize) {
        console.warn(`文件 ${f.name} 超过 20MB 限制，已跳过`)
        continue
      }
      attachedFiles.value.push(f)
    }
    input.value = ''
  }
}

defineExpose({ selectAgent })
</script>

<style scoped>
.calling-input {
  background: #fff;
  padding: 12px 16px;
  flex-shrink: 0;
}
.selected-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.input-row :deep(.el-textarea__inner) {
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  background: #fafbfc;
  padding: 10px 14px;
  resize: none;
}
.input-row :deep(.el-textarea__inner:focus) {
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
  background: #fff;
}
.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.footer-left,
.footer-right {
  display: flex;
  gap: 4px;
  align-items: center;
}
.send-btn {
  background: #409eff;
  border-color: #409eff;
  color: #000;
  border-radius: 20px;
  padding: 4px 20px;
  font-weight: 500;
}
.send-btn:hover {
  background: #337ecc;
  border-color: #337ecc;
  color: #000;
}
.send-btn:disabled {
  background: #a0cfff;
  border-color: #a0cfff;
  color: #000;
}
.footer-left :deep(.el-button),
.footer-right :deep(.el-button) {
  font-size: 12px;
  color: #909399;
}
.model-select {
  width: 160px;
  margin-right: 8px;
}
.input-hint {
  font-size: 11px;
  color: #c0c4cc;
  margin-right: 8px;
}
</style>
