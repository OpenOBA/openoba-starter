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
        <div style="min-height:360px">
          <el-alert
            title="配置 LLM 调用方式。已保存的 Key 会加密存储到数据库，进程重启不丢失。ERA-Chat 首页可选择模型。"
            type="info"
            :closable="false"
            style="margin-bottom:16px"
          />

          <!-- LLM 密钥列表 -->
          <el-divider content-position="left">LLM 密钥管理</el-divider>

          <el-table
            :data="keyRows"
            size="small"
            border
            stripe
            style="width:100%"
            :header-cell-style="{ background:'#f5f7fa', color:'#606266', fontWeight:600 }"
          >
            <el-table-column label="Provider" width="130">
              <template #default="{ row }">
                <div style="display:flex;align-items:center;gap:4px">
                  <span style="font-weight:600;color:#303133">{{ row.provider }}</span>
                  <el-tag v-if="row.isBuiltin === false" size="small" type="info">自定义</el-tag>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="模型 / URL" min-width="200">
              <template #default="{ row }">
                <div style="font-weight:500;color:#303133">{{ row.model }}</div>
                <div style="font-size:11px;color:#909399;word-break:break-all">{{ row.baseUrl }}</div>
              </template>
            </el-table-column>

            <el-table-column label="API Key" min-width="180">
              <template #default="{ row }">
                <template v-if="row.editing">
                  <el-input
                    v-model="row.editKey"
                    type="password"
                    show-password
                    size="small"
                    placeholder="sk-..."
                    @keyup.enter="doSaveKey(row)"
                  />
                </template>
                <template v-else>
                  <span v-if="row.maskedKey" style="font-family:monospace;color:#67c23a">
                    {{ row.maskedKey }}
                  </span>
                  <span v-else style="color:#c0c4cc">未配置</span>
                </template>
              </template>
            </el-table-column>

            <el-table-column label="操作" width="260" align="center">
              <template #default="{ row }">
                <template v-if="!row.editing">
                  <!-- 编辑 Key -->
                  <el-button size="small" text type="primary" @click="startEditKey(row)" :title="row.hasKey ? '修改 API Key' : '配置 API Key'">
                    <el-icon><Edit /></el-icon>
                    <span style="font-size:12px;margin-left:2px">{{ row.hasKey ? '改密' : '配密' }}</span>
                  </el-button>
                  <!-- 设为默认 → 所有模型行都显示，用户自己选 -->
                  <el-button
                    v-if="row.hasKey"
                    size="small"
                    text
                    :type="row.isDefault ? 'warning' : 'info'"
                    :title="row.isDefault ? '当前默认模型' : '设为默认模型'"
                    @click="doSetDefault(row)"
                  >
                    <el-icon><StarFilled v-if="row.isDefault" /><Star v-else /></el-icon>
                    <span style="font-size:12px;margin-left:2px">默认</span>
                  </el-button>
                  <!-- 删除按钮 → 所有模型行都可见：有 key 删 key，无 key 删模型记录 -->
                  <el-button
                    size="small"
                    text
                    type="danger"
                    :title="row.hasKey ? '删除此模型的 API Key' : '从列表中移除此模型'"
                    @click="doDeleteKey(row)"
                  >
                    <el-icon><Delete /></el-icon>
                    <span style="font-size:12px;margin-left:2px">{{ row.hasKey ? '删Key' : '移除' }}</span>
                  </el-button>
                </template>
                <template v-else>
                  <el-button size="small" type="primary" :loading="row.saving" @click="doSaveKey(row)">保存</el-button>
                  <el-button size="small" @click="cancelEditKey(row)">取消</el-button>
                </template>
              </template>
            </el-table-column>
          </el-table>

          <div style="margin-top:12px">
            <el-button size="small" @click="showAddProvider = true">
              <el-icon><Plus /></el-icon> 添加 Provider
            </el-button>
          </div>

          <!-- 添加 Provider 弹窗 -->
          <el-dialog v-model="showAddProvider" title="添加 Provider" width="480px" :close-on-click-modal="false">
            <el-form :model="addProviderForm" label-width="110px" size="small">
              <el-form-item label="Provider 名称" required>
                <el-input v-model="addProviderForm.name" placeholder="例如: 本地 Ollama" />
              </el-form-item>
              <el-form-item label="Provider 代码" required>
                <el-input v-model="addProviderForm.code" placeholder="ollama（小写字母/数字/短横）" />
              </el-form-item>
              <el-form-item label="Base URL" required>
                <el-input v-model="addProviderForm.baseUrl" placeholder="http://localhost:11434/v1" />
              </el-form-item>
              <el-form-item label="默认模型名" required>
                <el-input v-model="addProviderForm.modelName" placeholder="llama3.2" />
              </el-form-item>
              <el-form-item label="初始 API Key">
                <el-input v-model="addProviderForm.apiKey" type="password" show-password placeholder="可选" />
              </el-form-item>
            </el-form>
            <template #footer>
              <el-button size="small" @click="showAddProvider = false">取消</el-button>
              <el-button size="small" type="primary" @click="doAddProvider" :loading="addingProvider">添加</el-button>
            </template>
          </el-dialog>

          <!-- OpenOBA Key -->
          <el-divider content-position="left">OpenOBA Key</el-divider>
          <el-form label-width="100px" size="small">
            <el-form-item label="License Key">
              <el-input v-model="apiKey.obaKey" placeholder="OBA-XXXX-XXXX-XXXX" @blur="obaKeyFormatted" style="width:320px" />
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
        </div>
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
import { Edit, Star, StarFilled, Delete, Plus } from '@element-plus/icons-vue'
import request from '@/api/request'

const { settings: s, resetToDefaults, resetSection } = useERASettings()

const activeTab = ref('workspace')

// ═══════════════════════════
// API Key 列表式管理 (P1-1)
// ═══════════════════════════

interface KeyRow {
  keyId: string
  registryId: string
  providerCode: string
  provider: string
  model: string
  modelCode: string
  baseUrl: string
  maskedKey: string
  hasKey: boolean
  isDefault: boolean
  isBuiltin: boolean | null
  editing: boolean
  editKey: string
  saving: boolean
}

const keyRows = ref<KeyRow[]>([])

async function loadKeyRows() {
  try {
    // 合并 providers 和 keys 两个接口的数据
    const [providersRes, keysRes] = await Promise.all([
      request.get('/system/llm/providers') as Promise<any>,
      request.get('/system/llm/keys') as Promise<any>,
    ])

    const providers = providersRes?.success ? providersRes.providers : []
    const keys = Array.isArray(keysRes) ? keysRes : (keysRes?.keys || [])

    const rows: KeyRow[] = []

    for (const p of providers) {
      // 找到该 provider 的已配置 key
      const keyInfo = keys.find((k: any) => k.providerCode === p.providerCode)
      const hasKey = p.hasKey || keyInfo?.hasKey || false

      for (const m of (p.models || [])) {
        const modelKeyInfo = keyInfo?.models?.find((mk: any) => mk.modelCode === m.modelCode || mk.modelCode === m.id)
        // 默认标记统一从 key models 关联表读取（DB 权威来源）
        const isDefault = modelKeyInfo?.isDefault || false

        rows.push({
          keyId: keyInfo?.id || '',
          registryId: m.id || '',
          providerCode: p.providerCode || p.id,
          provider: p.providerName || p.name,
          model: m.modelName || m.name,
          modelCode: m.modelCode || m.id,
          baseUrl: p.baseUrl || '',
          maskedKey: hasKey ? '●●●●****' : '',
          hasKey,
          isDefault: !!isDefault,
          isBuiltin: p.isBuiltin !== false ? true : false,
          editing: false,
          editKey: '',
          saving: false,
        })
      }
    }

    keyRows.value = rows
  } catch {
    // fall through, keep empty
  }
}

function startEditKey(row: KeyRow) {
  row.editKey = ''
  row.editing = true
}

function cancelEditKey(row: KeyRow) {
  row.editing = false
  row.editKey = ''
}

async function doSaveKey(row: KeyRow) {
  if (!row.editKey) {
    ElMessage.warning('请输入 API Key')
    return
  }
  row.saving = true
  try {
    const res: any = await request.post('/system/llm/config', {
      provider: row.providerCode,
      apiKey: row.editKey,
      modelCode: row.modelCode,
    })
    if (res?.success === false) {
      ElMessage.error(res?.error || '保存失败')
      return
    }
    row.hasKey = true
    row.maskedKey = '●●●●****'
    row.editing = false
    row.editKey = ''
    ElMessage.success(`${row.provider} · ${row.model} Key 已保存`)
    await loadKeyRows()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    row.saving = false
  }
}

async function doSetDefault(row: KeyRow) {
  try {
    const res: any = await request.post('/system/llm/config/set-default', {
      provider: row.providerCode,
      modelCode: row.modelCode,
    })
    if (res?.success === false) {
      ElMessage.error(res?.error || '操作失败')
      return
    }
    ElMessage.success(res?.isDefault ? '已设为默认' : '已取消默认')
    await loadKeyRows()
  } catch {
    ElMessage.error('操作失败')
  }
}

async function doDeleteKey(row: KeyRow) {
  // 两种模式：有 key 则删 key 配置，无 key 则删模型记录
  const isDelModel = !row.hasKey || !row.keyId
  const confirmMsg = isDelModel
    ? `确定从列表中移除模型「${row.provider} · ${row.model}」？`
    : `确定删除「${row.provider} · ${row.model}」的 API Key？`
  try {
    await ElMessageBox.confirm(confirmMsg, '确认删除', { type: 'warning' })
  } catch {
    return
  }
  try {
    if (isDelModel) {
      // 删除模型记录（registry 级别）
      await request.delete(`/system/llm/models/${row.registryId}`)
      ElMessage.success(`已移除模型「${row.provider} · ${row.model}」`)
    } else {
      // 删除 key 配置
      await request.delete(`/system/llm/config/${row.keyId}`)
      row.hasKey = false
      row.maskedKey = ''
      ElMessage.success('已删除 Key')
    }
    await loadKeyRows()
  } catch {
    ElMessage.error(isDelModel ? '移除模型失败' : '删除 Key 失败')
  }
}

// ── 添加 Provider ──
const showAddProvider = ref(false)
const addingProvider = ref(false)
const addProviderForm = reactive({
  name: '',
  code: '',
  baseUrl: '',
  modelName: '',
  apiKey: '',
})

async function doAddProvider() {
  if (!addProviderForm.name || !addProviderForm.code || !addProviderForm.baseUrl || !addProviderForm.modelName) {
    ElMessage.warning('请填写所有必填项')
    return
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(addProviderForm.code)) {
    ElMessage.warning('Provider 代码只能包含小写字母、数字和短横')
    return
  }
  addingProvider.value = true
  try {
    const res: any = await request.post('/system/llm/config', {
      provider: addProviderForm.code,
      apiKey: addProviderForm.apiKey || '',
      baseUrl: addProviderForm.baseUrl,
      modelCode: addProviderForm.modelName,
      providerName: addProviderForm.name,
      customProviderCode: addProviderForm.code,
    })
    if (res?.success === false) {
      ElMessage.error(res?.error || '添加失败')
      return
    }
    ElMessage.success(`Provider "${addProviderForm.name}" 已添加`)
    showAddProvider.value = false
    addProviderForm.name = ''
    addProviderForm.code = ''
    addProviderForm.baseUrl = ''
    addProviderForm.modelName = ''
    addProviderForm.apiKey = ''
    await loadKeyRows()
  } catch {
    ElMessage.error('添加失败')
  } finally {
    addingProvider.value = false
  }
}

// ── 动态模型列表（Agent 行为 tab 用） ──
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
        // 只显示已配置 Key 的 Provider 的模型
        if (!p.hasKey) continue
        for (const m of p.models) {
          allModels.push({ id: m.id || m.modelCode, name: (p.providerName || p.name) + ' · ' + (m.modelName || m.name) })
        }
      }
      availableModels.value = allModels
      builtinProviders.value = res.providers.map((p: any) => ({ id: p.id || p.providerCode, name: p.providerName || p.name }))
    }
  } catch { /* 静默 */ }
  finally { loadingModels.value = false }
}

// ── OpenOBA Key ──
const LLM_KEY_STORAGE = 'openoba_llm_config'

const apiKey = reactive({
  obaKey: '',
})

watch(() => apiKey.obaKey, () => {
  try { localStorage.setItem(LLM_KEY_STORAGE, JSON.stringify({ obaKey: apiKey.obaKey })) } catch { /* ignore */ }
})

const activatingOba = ref(false)
const obaStatus = ref('')
const obaError = ref('')
const obaQuota = ref('')
const obaSeats = ref('')

function loadLlmConfig() {
  try {
    const saved = localStorage.getItem(LLM_KEY_STORAGE)
    if (saved) {
      const config = JSON.parse(saved)
      if (config.obaKey) apiKey.obaKey = config.obaKey
    }
  } catch { /* ignore */ }
}

function obaKeyFormatted() {
  apiKey.obaKey = apiKey.obaKey.toUpperCase().trim()
}

async function activateObaKey() {
  activatingOba.value = true
  obaError.value = ''
  try {
    const res = await request.post('/system/license/activate', { key: apiKey.obaKey }) as Record<string,any>
    obaStatus.value = 'active'
    obaQuota.value = (res.quota || '-') as string
    obaSeats.value = (res.seats || '-') as string
    localStorage.setItem(LLM_KEY_STORAGE, JSON.stringify({ obaKey: apiKey.obaKey }))
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
  apiBase: (request as any).defaults?.baseURL || window.location.origin,
  deployMode: 'operator',
})

async function loadAbout() {
  // 版本信息：从版本接口获取
  try {
    const res = await request.get('/system/version/check', { params: { current: '1.4.0-alpha7' } }) as Record<string,any>
    about.version = res?.currentVersion as string || '1.4.0-alpha7'
    about.deployMode = 'operator'
  } catch {
    about.version = '1.4.0-alpha7'
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
    about.agentCount = 0
  }
}



onMounted(() => { loadLlmConfig(); fetchModels(); loadKeyRows(); loadAbout() })
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
