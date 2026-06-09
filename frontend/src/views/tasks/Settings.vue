<template>
  <div class="settings-page">
    <div class="settings-header">
      <h3>设置</h3>
      <el-button size="small" @click="resetToDefaults" type="warning" plain>恢复默认</el-button>
    </div>

    <el-tabs v-model="activeTab" type="border-card" class="settings-tabs">
      <!-- 1. 工作区 -->
      <el-tab-pane label="工作区" name="workspace">
        <el-form label-width="140px" size="small">
          <el-alert
            title="工作区是 ERA 管理所有文件的根目录，Agent 在此目录下读写文件"
            type="info"
            :closable="false"
            style="margin-bottom:16px"
          />
          <el-form-item label="工作区根目录">
            <el-input v-model="s.workspace.rootDir" placeholder="例如 C:/Users/99tan/mj" />
          </el-form-item>
          <el-form-item label="交付物存储路径">
            <el-input v-model="s.workspace.deliverablesDir" />
          </el-form-item>
          <el-form-item label="草稿存储路径">
            <el-input v-model="s.workspace.draftsDir" />
          </el-form-item>
          <el-form-item label="日志归档路径">
            <el-input v-model="s.workspace.logsDir" />
          </el-form-item>
          <el-form-item label="知识库路径">
            <el-input v-model="s.workspace.knowledgeDir" />
          </el-form-item>
          <el-divider />
          <el-button size="small" @click="resetSection('workspace')">恢复工作区默认</el-button>
        </el-form>
      </el-tab-pane>

      <!-- 2. 交付物 -->
      <el-tab-pane label="交付物" name="deliverables">
        <el-form label-width="160px" size="small">
          <el-alert
            title="交付物是 Agent 完成任务后的最终产出文件。每个任务按版本组织，自动生成清单和时间线。"
            type="info"
            :closable="false"
            style="margin-bottom:16px"
          />
          <el-form-item label="版本号格式">
            <el-select v-model="s.deliverables.versionFormat" style="width:200px">
              <el-option label="V{n} (V1, V2, V3...)" value="V{n}" />
              <el-option label="v{n}.{m} (v1.0, v1.1...)" value="v{n}.{m}" />
            </el-select>
          </el-form-item>
          <el-form-item label="自动创建版本目录">
            <el-switch v-model="s.deliverables.autoCreateVersionDir" />
            <span class="form-tip">交付时自动创建 V{n}/ 子目录</span>
          </el-form-item>
          <el-form-item label="自动生成交付清单">
            <el-switch v-model="s.deliverables.autoGenerateManifest" />
            <span class="form-tip">每版本生成 manifest.json</span>
          </el-form-item>
          <el-form-item label="自动更新总索引">
            <el-switch v-model="s.deliverables.autoUpdateIndex" />
            <span class="form-tip">更新 _index.json</span>
          </el-form-item>
          <el-form-item label="自动写入时间线">
            <el-switch v-model="s.deliverables.autoWriteTimeline" />
            <span class="form-tip">追加 timeline.md</span>
          </el-form-item>
          <el-divider />
          <el-button size="small" @click="resetSection('deliverables')">恢复交付物默认</el-button>
        </el-form>
      </el-tab-pane>

      <!-- 3. Agent 记忆 -->
      <el-tab-pane label="Agent 记忆" name="memory">
        <el-form label-width="180px" size="small">
          <el-alert
            title="Agent 的记忆分为四层：瞬时（会话上下文）、短期（DB 90天）、长期（文件 MEMORY.md）、进化（evolution.md）。"
            type="info"
            :closable="false"
            style="margin-bottom:16px"
          />
          <el-form-item label="Agent 工作空间路径">
            <el-input v-model="s.agent.workspacePath" />
          </el-form-item>
          <el-form-item label="认知日志保留天数">
            <el-input-number v-model="s.agent.logRetentionDays" :min="7" :max="365" />
            <span class="form-tip">超过后归档到文件系统</span>
          </el-form-item>
          <el-form-item label="到期自动归档">
            <el-switch v-model="s.agent.autoArchiveLogs" />
          </el-form-item>
          <el-form-item label="Agent 自动提炼长期记忆">
            <el-switch v-model="s.agent.autoRefineMemory" />
            <span class="form-tip">从认知日志中自动提炼关键洞察</span>
          </el-form-item>
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
          <el-form-item label="最大重试次数">
            <el-input-number v-model="s.agent.maxRetries" :min="0" :max="10" />
            <span class="form-tip">Agent 异常自处理的重试上限</span>
          </el-form-item>
          <el-form-item label="单次调用超时（秒）">
            <el-input-number v-model="s.agent.timeoutSeconds" :min="30" :max="600" :step="30" />
          </el-form-item>
          <el-form-item label="自动同意方案">
            <el-switch v-model="s.agent.autoApprove" />
            <span class="form-tip warning">开启后跳过人工确认，直接执行（不推荐）</span>
          </el-form-item>
          <el-divider />
          <el-button size="small" @click="resetSection('agent')">恢复行为默认</el-button>
        </el-form>
      </el-tab-pane>

      <!-- 5. 文件管理 -->
      <el-tab-pane label="文件管理" name="files">
        <el-form label-width="160px" size="small">
          <el-form-item label="临时文件保留天数">
            <el-input-number v-model="s.files.tempRetentionDays" :min="1" :max="90" />
          </el-form-item>
          <el-form-item label="单文件上传上限（MB）">
            <el-input-number v-model="s.files.maxUploadSizeMB" :min="1" :max="100" :step="5" />
          </el-form-item>
          <el-form-item label="默认导出格式">
            <el-checkbox-group v-model="s.files.exportFormats">
              <el-checkbox label="markdown">Markdown (.md)</el-checkbox>
              <el-checkbox label="pdf">PDF</el-checkbox>
              <el-checkbox label="html">HTML</el-checkbox>
              <el-checkbox label="json">JSON</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-divider />
          <el-button size="small" @click="resetSection('files')">恢复文件默认</el-button>
        </el-form>
      </el-tab-pane>

      <!-- 6. 通知 -->
      <el-tab-pane label="通知" name="notifications">
        <el-form label-width="180px" size="small">
          <el-form-item label="任务完成时弹窗通知">
            <el-switch v-model="s.notifications.taskComplete" />
          </el-form-item>
          <el-form-item label="Agent 异常时弹窗通知">
            <el-switch v-model="s.notifications.errorAlert" />
          </el-form-item>
          <el-divider />
          <el-button size="small" @click="resetSection('notifications')">恢复通知默认</el-button>
        </el-form>
      </el-tab-pane>

      <!-- 7. 外观 -->
      <el-tab-pane label="外观" name="appearance">
        <el-form label-width="120px" size="small">
          <el-form-item label="主题色">
            <el-color-picker v-model="s.appearance.themeColor" show-alpha />
            <span class="form-tip" style="margin-left:8px">应用后刷新页面生效</span>
          </el-form-item>
          <el-form-item label="字体大小">
            <el-select v-model="s.appearance.fontSize" style="width:160px">
              <el-option label="小 (12px)" value="small" />
              <el-option label="中 (14px)" value="medium" />
              <el-option label="大 (16px)" value="large" />
            </el-select>
          </el-form-item>
          <el-form-item label="消息密度">
            <el-select v-model="s.appearance.messageDensity" style="width:160px">
              <el-option label="紧凑" value="compact" />
              <el-option label="舒适" value="comfortable" />
              <el-option label="宽松" value="relaxed" />
            </el-select>
          </el-form-item>
          <el-divider />
          <el-button size="small" @click="resetSection('appearance')">恢复外观默认</el-button>
        </el-form>
      </el-tab-pane>

      <!-- 8. 网络代理 -->
      <el-tab-pane label="网络代理" name="network">
        <el-form label-width="140px" size="small">
          <el-alert
            title="如果你的网络环境需要通过代理访问外部 API（如企业内部网络），请在此配置。"
            type="info"
            :closable="false"
            style="margin-bottom:16px"
          />
          <el-form-item label="HTTP 代理">
            <el-input v-model="s.network.httpProxy" placeholder="http://proxy.example.com:8080" />
          </el-form-item>
          <el-form-item label="HTTPS 代理">
            <el-input v-model="s.network.httpsProxy" placeholder="https://proxy.example.com:8443" />
          </el-form-item>
          <el-divider />
          <el-button size="small" @click="resetSection('network')">清除代理</el-button>
        </el-form>
      </el-tab-pane>

      <!-- 9. API Key -->
      <el-tab-pane label="API Key" name="apikey">
        <el-form label-width="140px" size="small">
          <el-alert
            title="配置 LLM 调用方式。两种方式任选其一，OpenOBA Key 自动覆盖 LLM 直连 Key。"
            type="info"
            :closable="false"
            style="margin-bottom:16px"
          />

          <!-- 方案1：LLM 直连 Key -->
          <el-divider content-position="left">LLM 直连 Key</el-divider>
          <el-form-item label="Provider">
            <el-select v-model="apiKey.llmProvider" style="width:200px" placeholder="选择 LLM 提供商">
              <el-option label="DeepSeek" value="deepseek" />
              <el-option label="Qwen / 阿里云百炼" value="qwen" />
              <el-option label="OpenAI" value="openai" />
              <el-option label="自定义" value="custom" />
            </el-select>
          </el-form-item>
          <el-form-item label="API Key">
            <el-input v-model="apiKey.llmKey" type="password" show-password placeholder="sk-..." />
          </el-form-item>
          <el-form-item v-if="apiKey.llmProvider === 'custom'" label="Base URL">
            <el-input v-model="apiKey.llmBaseUrl" placeholder="https://your-llm-api.com/v1" />
          </el-form-item>
          <el-form-item>
            <el-button size="small" type="primary" @click="testLlmConnection" :loading="testingLlm">测试连接</el-button>
            <el-button size="small" @click="saveLlmKey">保存</el-button>
            <el-button size="small" @click="addMoreProvider">添加更多</el-button>
            <span v-if="llmStatus" :style="{ color: llmStatus === 'ok' ? '#67c23a' : '#e6a23c', marginLeft: '8px', fontSize: '12px' }">{{ llmStatusText }}</span>
          </el-form-item>

          <!-- 方案2：OpenOBA Key -->
          <el-divider content-position="left">OpenOBA Key</el-divider>
          <el-form-item label="License Key">
            <el-input v-model="apiKey.obaKey" placeholder="OBA-XXXX-XXXX-XXXX" @blur="obaKeyFormatted" />
          </el-form-item>
          <el-form-item>
            <el-button size="small" type="primary" @click="activateObaKey" :loading="activatingOba">验证并激活</el-button>
            <span v-if="obaStatus === 'active'" style="color:#67c23a;margin-left:8px;font-size:12px">✅ 已激活 · 中转版</span>
            <span v-if="obaStatus === 'error'" style="color:#e6a23c;margin-left:8px;font-size:12px">{{ obaError }}</span>
          </el-form-item>
          <template v-if="obaStatus === 'active'">
            <el-form-item label="Token 配额">
              <span style="font-size:12px;color:#606266">{{ obaQuota }}</span>
            </el-form-item>
            <el-form-item label="席位">
              <span style="font-size:12px;color:#606266">{{ obaSeats }}</span>
            </el-form-item>
          </template>
        </el-form>
      </el-tab-pane>

      <!-- 10. 关于 -->
      <el-tab-pane label="关于" name="about">
        <el-descriptions :column="1" border size="small" style="max-width:500px">
          <el-descriptions-item label="ERA 版本">
            {{ about.version }}
          </el-descriptions-item>
          <el-descriptions-item label="Agent 数量">
            {{ about.agentCount }} 个
          </el-descriptions-item>
          <el-descriptions-item label="后端 API">
            {{ about.apiBase }}
          </el-descriptions-item>
          <el-descriptions-item label="部署模式">
            <el-tag :type="about.deployMode === 'operator' ? 'success' : about.deployMode === 'developer' ? 'warning' : 'danger'" size="small">
              {{ about.deployMode }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="工作区路径">
            <code style="font-size:11px">{{ s.workspace.rootDir }}</code>
          </el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>
    </el-tabs>

    <div class="settings-footer">
      <span class="save-hint">所有设置自动保存</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useERASettings } from '@/composables/useERASettings'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api/request'

const { settings: s, resetToDefaults, resetSection } = useERASettings()

const activeTab = ref('workspace')

// ═══════════════════════════
// API Key 配置
// ═══════════════════════════
const LLM_KEY_STORAGE = 'openoba_llm_config'

// ── 动态模型列表 ──
const availableModels = ref<Array<{ id: string; name: string }>>([])
const builtinProviders = ref<Array<{ id: string; name: string }>>([])
const loadingModels = ref(false)

async function fetchModels() {
  loadingModels.value = true
  try {
    const res: any = await request.get('/system/llm/providers')
    if (res?.success) {
      const allModels: Array<{ id: string; name: string }> = []
      for (const p of res.providers) {
        for (const m of p.models) {
          allModels.push({ id: m.id, name: p.name + ' · ' + m.name })
        }
      }
      availableModels.value = allModels
      builtinProviders.value = res.providers.map((p: any) => ({ id: p.id, name: p.name }))
    }
  } catch { /* 静默 */ }
  finally { loadingModels.value = false }
}

const apiKey = reactive({
  llmProvider: 'deepseek',
  llmKey: '',
  llmBaseUrl: '',
  obaKey: '',
})

// 任何字段变化时自动持久化
watch(() => [apiKey.llmProvider, apiKey.llmKey, apiKey.llmBaseUrl, apiKey.obaKey], () => {
  persistLlmConfig()
}, { deep: false })
const testingLlm = ref(false)
const llmStatus = ref('')
const llmStatusText = ref('')
const activatingOba = ref(false)
const obaStatus = ref('')
const obaError = ref('')
const obaQuota = ref('')
const obaSeats = ref('')

// 从 localStorage 恢复 API Key
function loadLlmConfig() {
  try {
    const saved = localStorage.getItem(LLM_KEY_STORAGE)
    if (saved) {
      const config = JSON.parse(saved)
      if (config.llmProvider) apiKey.llmProvider = config.llmProvider
      if (config.llmKey) apiKey.llmKey = config.llmKey
      if (config.llmBaseUrl) apiKey.llmBaseUrl = config.llmBaseUrl
      if (config.obaKey) apiKey.obaKey = config.obaKey
    }
  } catch { /* ignore */ }
}

// 持久化 API Key 到 localStorage
function persistLlmConfig() {
  try {
    localStorage.setItem(LLM_KEY_STORAGE, JSON.stringify({
      llmProvider: apiKey.llmProvider,
      llmKey: apiKey.llmKey,
      llmBaseUrl: apiKey.llmBaseUrl,
      obaKey: apiKey.obaKey,
    }))
  } catch { /* ignore */ }
}

onMounted(() => { loadLlmConfig(); fetchModels() })

async function testLlmConnection() {
  testingLlm.value = true
  llmStatus.value = ''
  try {
    await request.post('/system/llm/test', {
      provider: apiKey.llmProvider,
      apiKey: apiKey.llmKey,
      baseUrl: apiKey.llmBaseUrl || undefined,
    })
    llmStatus.value = 'ok'
    llmStatusText.value = '✅ 连接成功'
  } catch {
    llmStatus.value = 'error'
    llmStatusText.value = '❌ 连接失败'
  } finally {
    testingLlm.value = false
  }
}

async function saveLlmKey() {
  persistLlmConfig()
  try {
    const res: any = await request.post('/system/llm/config', {
      provider: apiKey.llmProvider,
      apiKey: apiKey.llmKey,
      baseUrl: apiKey.llmBaseUrl || undefined,
    })
    if (res?.success === false) {
      ElMessage.error(res?.error || '保存失败')
      return
    }
    ElMessage.success('LLM Key 已保存')
  } catch {
    ElMessage.error('保存失败')
  }
}

function obaKeyFormatted() {
  apiKey.obaKey = apiKey.obaKey.toUpperCase().trim()
}

function addMoreProvider() {
  ElMessage.info('更多 LLM 提供商即将支持')
}

async function activateObaKey() {
  activatingOba.value = true
  obaError.value = ''
  try {
    const res = await request.post('/system/license/activate', { key: apiKey.obaKey })
    obaStatus.value = 'active'
    obaQuota.value = res.quota || '-'
    obaSeats.value = res.seats || '-'
    persistLlmConfig()
    ElMessage.success('OpenOBA Key 已激活')
  } catch (e: any) {
    obaStatus.value = 'error'
    obaError.value = e?.response?.data?.message || '激活失败，请检查 Key 是否正确'
  } finally {
    activatingOba.value = false
  }
}

const about = reactive({
  version: '-',
  agentCount: 0,
  apiBase: request.defaults?.baseURL || window.location.origin,
  deployMode: 'operator',
})

async function loadAbout() {
  // 版本信息：尝试从后端获取，失败则用默认值
  try {
    const res = await request.get('/eros/tasks/stats')
    about.version = '1.3.0'
    about.deployMode = 'operator'
  } catch {
    about.version = '1.3.0'
    about.deployMode = 'operator'
  }

  // Agent 数量：从 localStorage 读取（TaskDashboard 会持久化 Agent 列表）
  try {
    const raw = localStorage.getItem('***')
    if (raw) {
      const agents = JSON.parse(raw)
      const activeCount = agents.filter((a: any) => a.status === 'active').length
      about.agentCount = activeCount || agents.length
    } else {
      about.agentCount = 7 // 默认7个Agent
    }
  } catch {
    about.agentCount = '-'
  }
}

async function resetToDefaultsConfirm() {
  try {
    await ElMessageBox.confirm('确定恢复所有设置为默认值？', '恢复默认', { type: 'warning' })
    resetToDefaults()
    ElMessage.success('已恢复默认设置')
  } catch { /* cancelled */ }
}

onMounted(loadAbout)
</script>

<style scoped>
.settings-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0;
}
.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
  flex-shrink: 0;
}
.settings-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}
.settings-tabs {
  flex: 1;
  overflow: auto;
  margin: 12px 16px;
}
.settings-tabs :deep(.el-tabs__content) {
  padding: 16px 20px;
  min-height: 400px;
}
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-left: 10px;
}
.form-tip.warning {
  color: #e6a23c;
}
.settings-footer {
  padding: 8px 20px;
  text-align: center;
  border-top: 1px solid #e4e7ed;
  background: #fff;
  flex-shrink: 0;
}
.save-hint {
  font-size: 11px;
  color: #c0c4cc;
}
</style>
