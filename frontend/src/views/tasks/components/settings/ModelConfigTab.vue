<template>
  <div>
    <el-alert
      title="配置 LLM 调用方式。已保存的 Key 会加密存储到数据库，进程重启不丢失。ERA-Chat 首页可选择模型。"
      type="info" :closable="false" style="margin-bottom:16px"
    />
    <el-divider content-position="left">LLM 密钥管理</el-divider>
    <el-table
      :data="keyRows" size="small" border stripe style="width:100%"
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
            <el-input v-model="row.editKey" type="password" show-password size="small" placeholder="sk-..." @keyup.enter="doSaveKey(row)" />
          </template>
          <template v-else>
            <span v-if="row.maskedKey" style="font-family:monospace;color:#67c23a">{{ row.maskedKey }}</span>
            <span v-else style="color:#c0c4cc">未配置</span>
          </template>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="260" align="center">
        <template #default="{ row }">
          <template v-if="!row.editing">
            <el-button size="small" text type="primary" @click="startEditKey(row)" :title="row.hasKey ? '修改 API Key' : '配置 API Key'">
              <el-icon><Edit /></el-icon><span style="font-size:12px;margin-left:2px">{{ row.hasKey ? '改密' : '配密' }}</span>
            </el-button>
            <el-button v-if="row.hasKey" size="small" text :type="row.isDefault ? 'warning' : 'info'" :title="row.isDefault ? '当前默认模型' : '设为默认模型'" @click="doSetDefault(row)">
              <el-icon><StarFilled v-if="row.isDefault" /><Star v-else /></el-icon><span style="font-size:12px;margin-left:2px">默认</span>
            </el-button>
            <el-button size="small" text type="danger" :title="row.hasKey ? '删除此模型的 API Key' : '从列表中移除此模型'" @click="doDeleteKey(row)">
              <el-icon><Delete /></el-icon><span style="font-size:12px;margin-left:2px">{{ row.hasKey ? '删Key' : '移除' }}</span>
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
      <el-button size="small" @click="showAddProvider = true"><el-icon><Plus /></el-icon> 添加 Provider</el-button>
    </div>
    <el-dialog v-model="showAddProvider" title="添加 Provider" width="480px" :close-on-click-modal="false">
      <el-form :model="addProviderForm" label-width="110px" size="small">
        <el-form-item label="Provider 名称" required><el-input v-model="addProviderForm.name" placeholder="例如: 本地 Ollama" /></el-form-item>
        <el-form-item label="Provider 代码" required><el-input v-model="addProviderForm.code" placeholder="ollama（小写字母/数字/短横）" /></el-form-item>
        <el-form-item label="Base URL" required><el-input v-model="addProviderForm.baseUrl" placeholder="http://localhost:11434/v1" /></el-form-item>
        <el-form-item label="默认模型名" required><el-input v-model="addProviderForm.modelName" placeholder="llama3.2" /></el-form-item>
        <el-form-item label="初始 API Key"><el-input v-model="addProviderForm.apiKey" type="password" show-password placeholder="可选" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="showAddProvider = false">取消</el-button>
        <el-button size="small" type="primary" @click="doAddProvider" :loading="addingProvider">添加</el-button>
      </template>
    </el-dialog>
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
        <el-form-item label="Token 配额"><span style="font-size:12px;color:#606266">{{ obaQuota }}</span></el-form-item>
        <el-form-item label="席位"><span style="font-size:12px;color:#606266">{{ obaSeats }}</span></el-form-item>
      </template>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Star, StarFilled, Delete, Plus } from '@element-plus/icons-vue'
import request from '@/api/request'

const emit = defineEmits<{
  modelsUpdated: []
}>()

interface KeyRow {
  keyId: string; registryId: string; providerCode: string; provider: string;
  model: string; modelCode: string; baseUrl: string; maskedKey: string;
  hasKey: boolean; isDefault: boolean; isBuiltin: boolean | null;
  editing: boolean; editKey: string; saving: boolean;
}

const keyRows = ref<KeyRow[]>([])

async function loadKeyRows() {
  try {
    const [providersRes, keysRes] = await Promise.all([
      request.get('/system/llm/providers'),
      request.get('/system/llm/keys'),
    ]) as unknown as [Record<string, unknown>, Record<string, unknown>]
    const providers = providersRes?.success ? (providersRes.providers as unknown as Array<Record<string, unknown>>) : []
    const keys = Array.isArray(keysRes) ? keysRes : (keysRes?.keys || [])
    const rows: KeyRow[] = []
    for (const p of providers) {
      const keyInfo = (keys as unknown as Record<string, unknown>[]).find((k) => k.providerCode === p.providerCode)
      const hasKey: boolean = !!(p.hasKey || keyInfo?.hasKey)
      for (const m of (p.models as unknown as Array<Record<string, unknown>> || [])) {
        const models = (keyInfo as unknown as Record<string, unknown>)?.models as unknown as Record<string, unknown>[]
        const modelKeyInfo = models?.find((mk) => mk.modelCode === m.modelCode || mk.modelCode === m.id)
        const isDefault = modelKeyInfo?.isDefault || false
        rows.push({
          keyId: (keyInfo?.id as string) || '', registryId: (m.id || '') as string,
          providerCode: (p.providerCode as string) || '', provider: (p.providerName as string) || (p.name as string) || '',
          model: (m.modelName as string) || (m.name as string) || '', modelCode: (m.modelCode as string) || (m.id as string) || '',
          baseUrl: (p.baseUrl as string) || '', maskedKey: hasKey ? '●●●●****' : '',
          hasKey, isDefault: !!isDefault, isBuiltin: (p.isBuiltin as boolean | null) ?? null,
          editing: false, editKey: '', saving: false,
        })
      }
    }
    keyRows.value = rows
  } catch { /* fall through */ }
}

function startEditKey(row: KeyRow) { row.editKey = ''; row.editing = true }
function cancelEditKey(row: KeyRow) { row.editing = false; row.editKey = '' }

async function doSaveKey(row: KeyRow) {
  if (!row.editKey) { ElMessage.warning('请输入 API Key'); return }
  row.saving = true
  try {
    const res = await request.post('/system/llm/config', { provider: row.providerCode, apiKey: row.editKey, modelCode: row.modelCode }) as unknown as Record<string, unknown>
    if (res?.success === false) { ElMessage.error(res?.error || '保存失败'); return }
    row.hasKey = true; row.maskedKey = '●●●●****'; row.editing = false; row.editKey = ''
    ElMessage.success(`${row.provider} · ${row.model} Key 已保存`)
    await loadKeyRows(); emit('modelsUpdated')
  } catch { ElMessage.error('保存失败') }
  finally { row.saving = false }
}

async function doSetDefault(row: KeyRow) {
  try {
    const res = await request.post('/system/llm/config/set-default', { provider: row.providerCode, modelCode: row.modelCode }) as unknown as Record<string, unknown>
    if (res?.success === false) { ElMessage.error(res?.error || '操作失败'); return }
    ElMessage.success(res?.isDefault ? '已设为默认' : '已取消默认'); await loadKeyRows(); emit('modelsUpdated')
  } catch { ElMessage.error('操作失败') }
}

async function doDeleteKey(row: KeyRow) {
  const isDelModel = !row.hasKey || !row.keyId
  const confirmMsg = isDelModel
    ? `确定从列表中移除模型「${row.provider} · ${row.model}」？`
    : `确定删除「${row.provider} · ${row.model}」的 API Key？`
  try { await ElMessageBox.confirm(confirmMsg, '确认删除', { type: 'warning' }) } catch { return }
  try {
    if (isDelModel) {
      await request.delete(`/system/llm/models/${row.registryId}`)
      ElMessage.success(`已移除模型「${row.provider} · ${row.model}」`)
    } else {
      await request.delete(`/system/llm/config/${row.keyId}`)
      row.hasKey = false; row.maskedKey = ''
      ElMessage.success('已删除 Key')
    }
    await loadKeyRows(); emit('modelsUpdated')
  } catch { ElMessage.error(isDelModel ? '移除模型失败' : '删除 Key 失败') }
}

const showAddProvider = ref(false)
const addingProvider = ref(false)
const addProviderForm = reactive({ name: '', code: '', baseUrl: '', modelName: '', apiKey: '' })

async function doAddProvider() {
  if (!addProviderForm.name || !addProviderForm.code || !addProviderForm.baseUrl || !addProviderForm.modelName) {
    ElMessage.warning('请填写所有必填项'); return
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(addProviderForm.code)) {
    ElMessage.warning('Provider 代码只能包含小写字母、数字和短横'); return
  }
  addingProvider.value = true
  try {
    const res = await request.post('/system/llm/config', {
      provider: addProviderForm.code, apiKey: addProviderForm.apiKey || '',
      baseUrl: addProviderForm.baseUrl, modelCode: addProviderForm.modelName,
      providerName: addProviderForm.name, customProviderCode: addProviderForm.code,
    }) as unknown as { success?: boolean; error?: string }
    if (res?.success === false) { ElMessage.error(res?.error || '添加失败'); return }
    ElMessage.success(`Provider "${addProviderForm.name}" 已添加`)
    showAddProvider.value = false
    addProviderForm.name = ''; addProviderForm.code = ''; addProviderForm.baseUrl = ''
    addProviderForm.modelName = ''; addProviderForm.apiKey = ''
    await loadKeyRows(); emit('modelsUpdated')
  } catch { ElMessage.error('添加失败') }
  finally { addingProvider.value = false }
}

const LLM_KEY_STORAGE = 'openoba_llm_config'
const apiKey = reactive({ obaKey: '' })
const activatingOba = ref(false)
const obaStatus = ref('')
const obaError = ref('')
const obaQuota = ref('')
const obaSeats = ref('')

function obaKeyFormatted() { apiKey.obaKey = apiKey.obaKey.toUpperCase().trim() }

async function activateObaKey() {
  activatingOba.value = true; obaError.value = ''
  try {
    const res = await request.post('/system/license/activate', { key: apiKey.obaKey }) as Record<string, unknown>
    obaStatus.value = 'active'; obaQuota.value = (res.quota || '-') as string; obaSeats.value = (res.seats || '-') as string
    localStorage.setItem(LLM_KEY_STORAGE, JSON.stringify({ obaKey: apiKey.obaKey }))
    ElMessage.success('OpenOBA Key 已激活')
  } catch (e: unknown) {
    const errResp = (e as unknown as { response?: { data?: { message?: string } } })?.response?.data?.message
    obaStatus.value = 'error'; obaError.value = errResp || '激活失败，请检查 Key 是否正确'
  } finally { activatingOba.value = false }
}

function loadLlmConfig() {
  try {
    const saved = localStorage.getItem(LLM_KEY_STORAGE)
    if (saved) { const config = JSON.parse(saved); if (config.obaKey) apiKey.obaKey = config.obaKey }
  } catch { /* ignore */ }
}

import { watch } from 'vue'
watch(() => apiKey.obaKey, () => {
  try { localStorage.setItem(LLM_KEY_STORAGE, JSON.stringify({ obaKey: apiKey.obaKey })) } catch { /* ignore */ }
})

defineExpose({ loadKeyRows, loadLlmConfig })
</script>
