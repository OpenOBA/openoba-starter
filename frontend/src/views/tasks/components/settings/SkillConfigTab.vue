<template>
  <div>
    <!-- 1. 工作区 -->
    <el-tab-pane label="工作区" name="workspace">
      <el-form label-width="140px" size="small">
        <el-alert title="工作区是 ERA 管理所有文件的根目录，Agent 在此目录下读写文件" type="info" :closable="false" style="margin-bottom:16px" />
        <el-form-item label="工作区根目录"><el-input v-model="s.workspace.rootDir" placeholder="例如 C:/Users/99tan/mj" /></el-form-item>
        <el-form-item label="交付物存储路径"><el-input v-model="s.workspace.deliverablesDir" /></el-form-item>
        <el-form-item label="草稿存储路径"><el-input v-model="s.workspace.draftsDir" /></el-form-item>
        <el-form-item label="日志归档路径"><el-input v-model="s.workspace.logsDir" /></el-form-item>
        <el-form-item label="知识库路径"><el-input v-model="s.workspace.knowledgeDir" /></el-form-item>
        <el-divider />
        <el-button size="small" @click="resetSection('workspace')">恢复工作区默认</el-button>
      </el-form>
    </el-tab-pane>

    <!-- 2. 交付物 -->
    <el-tab-pane label="交付物" name="deliverables">
      <el-form label-width="160px" size="small">
        <el-alert title="交付物是 Agent 完成任务后的最终产出文件。每个任务按版本组织，自动生成清单和时间线。" type="info" :closable="false" style="margin-bottom:16px" />
        <el-form-item label="版本号格式">
          <el-select v-model="s.deliverables.versionFormat" style="width:200px">
            <el-option label="V{n} (V1, V2, V3...)" value="V{n}" />
            <el-option label="v{n}.{m} (v1.0, v1.1...)" value="v{n}.{m}" />
          </el-select>
        </el-form-item>
        <el-form-item label="自动创建版本目录"><el-switch v-model="s.deliverables.autoCreateVersionDir" /><span class="form-tip">交付时自动创建 V{n}/ 子目录</span></el-form-item>
        <el-form-item label="自动生成交付清单"><el-switch v-model="s.deliverables.autoGenerateManifest" /><span class="form-tip">每版本生成 manifest.json</span></el-form-item>
        <el-form-item label="自动更新总索引"><el-switch v-model="s.deliverables.autoUpdateIndex" /><span class="form-tip">更新 _index.json</span></el-form-item>
        <el-form-item label="自动写入时间线"><el-switch v-model="s.deliverables.autoWriteTimeline" /><span class="form-tip">追加 timeline.md</span></el-form-item>
        <el-divider />
        <el-button size="small" @click="resetSection('deliverables')">恢复交付物默认</el-button>
      </el-form>
    </el-tab-pane>

    <!-- 5. 文件管理 -->
    <el-tab-pane label="文件管理" name="files">
      <el-form label-width="160px" size="small">
        <el-form-item label="临时文件保留天数"><el-input-number v-model="s.files.tempRetentionDays" :min="1" :max="90" /></el-form-item>
        <el-form-item label="单文件上传上限（MB）"><el-input-number v-model="s.files.maxUploadSizeMB" :min="1" :max="100" :step="5" /></el-form-item>
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
  </div>
</template>

<script setup lang="ts">
defineProps<{
  s: { name?: string; workspace: { rootDir?: string; deliverablesDir?: string; draftsDir?: string; logsDir?: string; knowledgeDir?: string }; deliverables: { versionFormat?: string; autoCreateVersionDir?: boolean; autoGenerateManifest?: boolean; autoUpdateIndex?: boolean; autoWriteTimeline?: boolean }; files: { tempRetentionDays?: number; maxUploadSizeMB?: number; exportFormats?: string[] }; [key:string]: unknown }
  resetSection: (section: string) => void
}>()
</script>
