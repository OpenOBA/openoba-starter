<template>
  <div>
    <!-- 3. Agent 记忆 -->
    <el-tab-pane label="Agent 记忆" name="memory">
      <el-form label-width="180px" size="small">
        <el-alert title="Agent 的记忆分为四层：瞬时（会话上下文）、短期（DB 90天）、长期（文件 MEMORY.md）、进化（evolution.md）。" type="info" :closable="false" style="margin-bottom:16px" />
        <el-form-item label="Agent 工作空间路径"><el-input v-model="s.agent.workspacePath" /></el-form-item>
        <el-form-item label="认知日志保留天数"><el-input-number v-model="s.agent.logRetentionDays" :min="7" :max="365" /><span class="form-tip">超过后归档到文件系统</span></el-form-item>
        <el-form-item label="到期自动归档"><el-switch v-model="s.agent.autoArchiveLogs" /></el-form-item>
        <el-form-item label="Agent 自动提炼长期记忆"><el-switch v-model="s.agent.autoRefineMemory" /><span class="form-tip">从认知日志中自动提炼关键洞察</span></el-form-item>
        <el-divider />
        <el-button size="small" @click="resetSection('agent')">恢复记忆默认</el-button>
      </el-form>
    </el-tab-pane>

    <!-- 4. Agent 行为 -->
    <el-tab-pane label="Agent 行为" name="behavior">
      <el-form label-width="160px" size="small">
        <el-form-item label="默认 LLM 模型">
          <el-select v-model="s.agent.defaultModel" style="width:240px" :loading="loadingModels">
            <el-option v-if="availableModels.length === 0 && !loadingModels" label="（请先配置 API Key）" value="" disabled />
            <el-option v-for="m in availableModels" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="最大重试次数"><el-input-number v-model="s.agent.maxRetries" :min="0" :max="10" /><span class="form-tip">Agent 异常自处理的重试上限</span></el-form-item>
        <el-form-item label="单次调用超时（秒）"><el-input-number v-model="s.agent.timeoutSeconds" :min="30" :max="600" :step="30" /></el-form-item>
        <el-form-item label="自动同意方案"><el-switch v-model="s.agent.autoApprove" /><span class="form-tip warning">开启后跳过人工确认，直接执行（不推荐）</span></el-form-item>
        <el-divider />
        <el-button size="small" @click="resetSection('agent')">恢复行为默认</el-button>
      </el-form>
    </el-tab-pane>

    <!-- 6. 通知 -->
    <el-tab-pane label="通知" name="notifications">
      <el-form label-width="180px" size="small">
        <el-form-item label="任务完成时弹窗通知"><el-switch v-model="s.notifications.taskComplete" /></el-form-item>
        <el-form-item label="Agent 异常时弹窗通知"><el-switch v-model="s.notifications.errorAlert" /></el-form-item>
        <el-divider />
        <el-button size="small" @click="resetSection('notifications')">恢复通知默认</el-button>
      </el-form>
    </el-tab-pane>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/api/request'

const props = defineProps<{
  s: { agent: { workspacePath?: string; logRetentionDays?: number; autoArchiveLogs?: boolean; docFormat?: string; codeStyle?: string; creativity?: number; autoApprove?: boolean; autoRefineMemory?: boolean; defaultModel?: string; maxRetries?: number; timeoutSeconds?: number }; notifications: { enabled?: boolean; channels?: string[]; taskComplete?: boolean; errorAlert?: boolean }; [key:string]: unknown }
  resetSection: (section: string) => void
}>()

const availableModels = ref<Array<{ id: string; name: string }>>([])
const loadingModels = ref(false)

async function fetchModels() {
  loadingModels.value = true
  try {
    const res = await request.get('/system/llm/providers') as unknown as { success?: boolean; providers?: Array<{ hasKey?: boolean; models?: Array<{ id: string; name: string; modelCode?: string }> }> }
    if (res?.success) {
      const allModels: Array<{ id: string; name: string }> = []
      for (const p of res.providers ?? []) {
        if (!p.hasKey) continue
        for (const m of p.models ?? []) {
          allModels.push({ id: (m.id || m.modelCode || '') as string, name: ((p as unknown as Record<string, unknown>).providerName as string || (p as unknown as Record<string, unknown>).name as string) + ' · ' + ((m as unknown as Record<string, unknown>).modelName as string || m.name) })
        }
      }
      availableModels.value = allModels
    }
  } catch { /* 静默 */ }
  finally { loadingModels.value = false }
}

onMounted(() => { fetchModels() })
</script>
