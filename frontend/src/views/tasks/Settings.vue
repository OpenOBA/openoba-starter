<template>
  <div class="settings-page">
    <div class="settings-header">
      <h3>设置</h3>
      <el-button size="small" type="warning" plain @click="resetToDefaults">恢复默认</el-button>
    </div>

    <el-tabs v-model="activeTab" type="border-card" class="settings-tabs">
      <!-- Content management tabs → SkillConfigTab -->
      <SkillConfigTab
        :s="
          s as unknown as {
            workspace: Record<string, unknown>
            deliverables: Record<string, unknown>
            files: Record<string, unknown>
            [key: string]: unknown
          }
        "
        :reset-section="resetSectionAny"
      />

      <!-- Agent config tabs → RoleConfigTab -->
      <RoleConfigTab
        :s="
          s as unknown as {
            agent: Record<string, unknown>
            notifications: Record<string, unknown>
            [key: string]: unknown
          }
        "
        :reset-section="resetSectionAny"
      />

      <!-- 7. 外观 -->
      <el-tab-pane label="外观" name="appearance">
        <el-form label-width="120px" size="small">
          <el-form-item label="主题色">
            <el-color-picker v-model="s.appearance.themeColor" show-alpha />
            <span class="form-tip" style="margin-left: 8px">应用后刷新页面生效</span>
          </el-form-item>
          <el-form-item label="字体大小">
            <el-select v-model="s.appearance.fontSize" style="width: 160px">
              <el-option label="小 (12px)" value="small" />
              <el-option label="中 (14px)" value="medium" />
              <el-option label="大 (16px)" value="large" />
            </el-select>
          </el-form-item>
          <el-form-item label="消息密度">
            <el-select v-model="s.appearance.messageDensity" style="width: 160px">
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
            style="margin-bottom: 16px"
          />
          <el-form-item label="HTTP 代理"
            ><el-input v-model="s.network.httpProxy" placeholder="http://proxy.example.com:8080"
          /></el-form-item>
          <el-form-item label="HTTPS 代理"
            ><el-input v-model="s.network.httpsProxy" placeholder="https://proxy.example.com:8443"
          /></el-form-item>
          <el-divider />
          <el-button size="small" @click="resetSection('network')">清除代理</el-button>
        </el-form>
      </el-tab-pane>

      <!-- 9. API Key → ModelConfigTab -->
      <el-tab-pane label="API Key" name="apikey">
        <div style="min-height: 360px">
          <ModelConfigTab ref="modelConfigRef" @models-updated="fetchModels" />
        </div>
      </el-tab-pane>

      <!-- 元镜引擎 -->
      <el-tab-pane label="元镜引擎" name="metamirror">
        <div class="mm-tab-wrap">
          <p class="mm-tab-desc">
            代码质量看板 — 质量门禁 · 版本守护 · 回滚安全网。由元镜引擎自动扫描生成。
          </p>
          <div class="mm-tab-links">
            <el-button type="primary" @click="$router.push('/meta-mirror')">打开元镜引擎</el-button>
            <span class="mm-tab-hint">包含 23 条代码质量门禁、版本一致性检测、Checkpoint 回滚点管理</span>
          </div>
        </div>
      </el-tab-pane>

      <!-- 10. 关于 -->
      <el-tab-pane label="关于" name="about">
        <el-descriptions :column="1" border size="small" style="max-width: 500px">
          <el-descriptions-item label="ERA 版本">{{ about.version }}</el-descriptions-item>
          <el-descriptions-item label="Agent 数量">{{ about.agentCount }} 个</el-descriptions-item>
          <el-descriptions-item label="后端 API">{{ about.apiBase }}</el-descriptions-item>
          <el-descriptions-item label="部署模式">
            <el-tag
              :type="
                about.deployMode === 'operator' ? 'success' : about.deployMode === 'developer' ? 'warning' : 'danger'
              "
              size="small"
            >
              {{ about.deployMode }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="工作区路径">
            <code style="font-size: 11px">{{ s.workspace.rootDir }}</code>
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
import { ref, reactive, onMounted } from 'vue'
import { useERASettings } from '@/composables/useERASettings'
import request from '@/api/request'
import SkillConfigTab from './components/settings/SkillConfigTab.vue'
import RoleConfigTab from './components/settings/RoleConfigTab.vue'
import ModelConfigTab from './components/settings/ModelConfigTab.vue'

const { settings: s, resetToDefaults, resetSection } = useERASettings()
const resetSectionAny = resetSection as (section: string) => void
const activeTab = ref('workspace')
const modelConfigRef = ref<InstanceType<typeof ModelConfigTab>>()

// ── 动态模型列表（Agent 行为 tab 用） ──
async function fetchModels() {
  // delegated to RoleConfigTab / ModelConfigTab
  modelConfigRef.value?.loadKeyRows()
}

// ── OpenOBA Key storage key (shared) ──
// const LLM_KEY_STORAGE = 'openoba_llm_config'

const about = reactive({
  version: '-',
  agentCount: 0,
  apiBase: (request as unknown as { defaults?: { baseURL?: string } }).defaults?.baseURL || window.location.origin,
  deployMode: 'operator',
})

async function loadAbout() {
  try {
    const res = (await request.get('/system/version/check', { params: { current: __APP_VERSION__ } })) as Record<
      string,
      unknown
    >
    about.version = (res?.currentVersion as string) || __APP_VERSION__
    about.deployMode = 'operator'
  } catch {
    about.version = __APP_VERSION__
    about.deployMode = 'operator'
  }
  try {
    const raw = localStorage.getItem('***')
    if (raw) {
      const agents = JSON.parse(raw)
      about.agentCount = agents.filter((a: Record<string, unknown>) => a.status === 'active').length || agents.length
    } else {
      about.agentCount = 7
    }
  } catch {
    about.agentCount = 0
  }
}

onMounted(() => {
  modelConfigRef.value?.loadLlmConfig()
  fetchModels()
  modelConfigRef.value?.loadKeyRows()
  loadAbout()
})
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
.mm-tab-wrap { padding: 20px 0; }
.mm-tab-desc { color: #606266; font-size: 13px; margin-bottom: 16px; }
.mm-tab-links { display: flex; align-items: center; gap: 12px; }
.mm-tab-hint { font-size: 12px; color: #909399; }
</style>
