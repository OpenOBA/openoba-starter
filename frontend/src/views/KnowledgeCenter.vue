<template>
  <div class="knowledge-center">
    <div class="page-header">
      <h2>知识库</h2>
      <el-button type="primary" size="small" @click="showCreate = true">
        <el-icon><Plus /></el-icon> 添加知识
      </el-button>
    </div>

    <!-- 搜索 + 筛选 -->
    <div class="search-area">
      <el-input
        v-model="keyword"
        placeholder="搜索知识..."
        clearable
        size="small"
        style="width: 280px"
        @change="load"
        @clear="load"
      >
        <template #prefix
          ><el-icon><Search /></el-icon
        ></template>
      </el-input>
      <el-select v-model="filterVis" placeholder="可见范围" clearable size="small" style="width: 110px" @change="load">
        <el-option label="公开" value="public" />
        <el-option label="私有" value="private" />
      </el-select>
      <el-select v-model="filterType" placeholder="类型" clearable size="small" style="width: 110px" @change="load">
        <el-option label="经验" value="EXPERIENCE" />
        <el-option label="文档" value="DOCUMENT" />
        <el-option label="数据" value="DATA" />
        <el-option label="FAQ" value="FAQ" />
        <el-option label="策略" value="STRATEGY" />
        <el-option label="规范" value="POLICY" />
        <el-option label="案例" value="CASE" />
      </el-select>
    </div>

    <!-- 标签云 -->
    <div v-if="tagCloud.length > 0" class="tag-cloud">
      <span
        v-for="t in tagCloud"
        :key="t.tag"
        class="tag-item"
        :class="{ active: activeTags.includes(t.tag) }"
        :style="{ fontSize: 12 + Math.min(t.count * 2, 12) + 'px' }"
        @click="toggleTag(t.tag)"
      >
        {{ t.tag }}
      </span>
    </div>

    <!-- 知识卡片列表 -->
    <el-card v-loading="loading" shadow="never">
      <div v-if="items.length === 0" class="empty-hint">暂无知识，点击「添加知识」开始沉淀</div>
      <div v-for="item in items" :key="item.id" class="kb-card" @click="showDetail(item)">
        <div class="kb-card-header">
          <span class="kb-title">
            <el-tag size="small" :type="typeTag(item.type)" effect="plain">{{ typeLabel(item.type) }}</el-tag>
            {{ item.visibility === 'private' ? '' : '' }} {{ item.title }}
          </span>
          <span class="kb-meta"
            >{{ item.weight?.toFixed(2) }} · {{ item.contributor || '未知' }} · {{ fmt(item.updatedAt) }}</span
          >
        </div>
        <div class="kb-tags">
          <el-tag v-for="t in item.tags" :key="t" size="small" type="info" effect="plain" class="kb-tag">{{
            t
          }}</el-tag>
        </div>
        <div class="kb-preview">{{ preview(item.content) }}</div>
        <div v-if="item.attachments?.length" class="kb-files">
          <span v-for="(a, i) in item.attachments" :key="i" class="file-badge">{{ a.name }}</span>
        </div>
      </div>
      <div v-if="total > pageSize" class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev,pager,next"
          small
          @current-change="load"
        />
      </div>
    </el-card>

    <!-- 详情 Dialog -->
    <el-dialog v-model="showDetailDialog" :title="detail?.title || '知识详情'" width="700px">
      <div v-if="detail">
        <div class="detail-meta">
          <el-tag size="small" :type="detail.visibility === 'private' ? 'danger' : 'success'">{{
            detail.visibility === 'private' ? ' 私有' : '公开'
          }}</el-tag>
          <el-tag size="small" :type="typeTag(detail.type)" effect="plain" style="margin-left: 8px">{{
            typeLabel(detail.type)
          }}</el-tag>
          <span style="margin-left: 12px; font-size: 12px; color: #909399"
            >权重 {{ detail.weight?.toFixed(2) }} · {{ detail.contributor }} · {{ fmt(detail.createdAt) }}</span
          >
        </div>
        <div v-if="detail.tags?.length" class="detail-tags">
          <el-tag v-for="t in detail.tags" :key="t" size="small" type="info">{{ t }}</el-tag>
        </div>
        <!-- 附件区域 -->
        <div v-if="detail.attachments?.length" class="detail-attachments">
          <div class="section-title">附件 ({{ detail.attachments.length }})</div>
          <div class="attachment-list">
            <div v-for="(a, i) in detail.attachments" :key="i" class="attachment-item">
              <span class="att-icon">{{ fileIcon(a.type) }}</span>
              <a :href="a.url" target="_blank" rel="noopener noreferrer" class="att-name">{{ a.name }}</a>
              <span v-if="a.size" class="att-size">{{ formatSize(a.size) }}</span>
            </div>
          </div>
        </div>
        <div class="detail-content" v-html="mdContent"></div>
        <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end">
          <el-button size="small" @click="showEdit(detail)"
            ><el-icon><Edit /></el-icon> 编辑</el-button
          >
          <el-button size="small" type="warning" @click="handleArchive(detail.id)">归档</el-button>
          <el-button size="small" type="danger" @click="handleDelete(detail.id)">删除</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 创建/编辑 Dialog -->
    <el-dialog
      v-model="showCreate"
      :title="editingId ? '编辑知识' : '添加知识'"
      width="600px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form :model="form" label-width="70px" size="small">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" placeholder="知识标题" />
        </el-form-item>
        <el-form-item label="标签" required>
          <el-input v-model="tagInput" placeholder="回车添加标签" @keydown.enter.prevent="addTag" />
          <div v-if="form.tags.length > 0" class="tag-input-list">
            <el-tag v-for="(t, i) in form.tags" :key="i" size="small" closable @close="form.tags.splice(i, 1)">{{
              t
            }}</el-tag>
          </div>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type" style="width: 100%">
            <el-option v-for="t in TYPE_OPTIONS" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="可见范围">
          <el-radio-group v-model="form.visibility">
            <el-radio value="public">公开</el-radio>
            <el-radio value="private">私有</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="8"
            placeholder="Markdown 格式，支持标题、列表、表格..."
          />
        </el-form-item>
        <el-form-item label="附件">
          <el-upload
            ref="uploadRef"
            v-model:file-list="fileList"
            :auto-upload="false"
            :limit="10"
            :on-exceed="onExceed"
            :before-upload="beforeUpload"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.json,.xml"
            drag
            multiple
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">拖拽文件到此处 或 <em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">支持图片、PDF、Office 文档、文本文件，单文件不超过 20MB</div>
            </template>
          </el-upload>
          <div v-if="form.existingAttachments?.length" class="existing-files">
            <div class="section-title-small">已有附件</div>
            <div v-for="(a, i) in form.existingAttachments" :key="'old-' + i" class="existing-file">
              <span>{{ a.name }}</span>
              <el-button type="danger" size="small" link @click="removeExisting(i)">删除</el-button>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="贡献者">
          <el-input v-model="form.contributor" placeholder="Henry" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="showCreate = false">取消</el-button>
        <el-button size="small" type="primary" :loading="saving" @click="handleSave">{{
          editingId ? '保存' : '添加'
        }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Edit, UploadFilled } from '@element-plus/icons-vue'
import type { UploadFile, UploadRawFile } from 'element-plus'
import request from '@/api/request'
import DOMPurify from 'dompurify'

// ══════════════════════════════════════
// 常量
// ══════════════════════════════════════

const TYPE_OPTIONS = [
  { label: '经验', value: 'EXPERIENCE' },
  { label: '文档', value: 'DOCUMENT' },
  { label: '数据', value: 'DATA' },
  { label: 'FAQ', value: 'FAQ' },
  { label: '策略', value: 'STRATEGY' },
  { label: '规范', value: 'POLICY' },
  { label: '案例', value: 'CASE' },
]

const TYPE_LABEL_MAP: Record<string, string> = {
  EXPERIENCE: '经验',
  DOCUMENT: '文档',
  DATA: '数据',
  FAQ: 'FAQ',
  STRATEGY: '策略',
  POLICY: '规范',
  CASE: '案例',
}

const TYPE_TAG_MAP: Record<string, string> = {
  EXPERIENCE: 'warning',
  DOCUMENT: '',
  CASE: 'success',
  DATA: 'primary',
  FAQ: 'info',
  STRATEGY: 'danger',
  POLICY: 'danger',
}

function typeLabel(t: string) {
  return TYPE_LABEL_MAP[t] || t
}
function typeTag(t: string) {
  return TYPE_TAG_MAP[t] || 'info'
}

// ══════════════════════════════════════
// 状态
// ══════════════════════════════════════

const loading = ref(false)
const saving = ref(false)
const items = ref<KnowledgeItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const filterType = ref('')
const filterVis = ref('')
const activeTags = ref<string[]>([])
const tagCloud = ref<Array<{ tag: string; count: number }>>([])
const showCreate = ref(false)
const editingId = ref<string | null>(null)
const showDetailDialog = ref(false)
const detail = ref<KnowledgeItem | null>(null)
const fileList = ref<UploadFile[]>([])

interface AttachMeta {
  name: string
  type: string
  url: string
  size?: number
}

interface KnowledgeItem {
  id: string
  type: string
  title: string
  content: string
  weight: number
  contributor: string
  updatedAt: string
  createdAt: string
  visibility: string
  tags: string[]
  attachments: AttachMeta[]
}
interface KnowledgePageResponse {
  items: Record<string, unknown>[]
  total: number
}
interface KnowledgeTagResponse {
  tag: string
  count: number
}

const form = reactive({
  title: '',
  type: 'EXPERIENCE',
  tags: [] as string[],
  content: '',
  visibility: 'public',
  contributor: 'Henry',
  existingAttachments: [] as AttachMeta[],
})
const tagInput = ref('')

// ══════════════════════════════════════
// 工具函数
// ══════════════════════════════════════

const fmt = (t: string) => (t ? new Date(t).toLocaleDateString('zh-CN') : '-')

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB'
}

function fileIcon(type: string): string {
  const m: Record<string, string> = {
    'image/jpeg': '文件',
    'image/png': '文件',
    'image/gif': '文件',
    'image/webp': '文件',
    'application/pdf': 'PDF',
    'application/msword': '',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '',
    'application/vnd.ms-excel': '',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '',
    'application/vnd.ms-powerpoint': 'PPT',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPT',
    'text/plain': '文本',
    'text/markdown': '文本',
    'text/csv': '',
    'application/json': '',
    'application/xml': '',
  }
  return m[type] || ''
}

function preview(content: string) {
  return (
    content
      ?.replace(/[#*`>|\\-]/g, '')
      .replace(/\n/g, ' ')
      .substring(0, 100) || ''
  )
}

const mdContent = computed(() => {
  if (!detail.value?.content) return ''
  const html = detail.value.content
    .replace(/## (.+)/g, '<h3>$1</h3>')
    .replace(/### (.+)/g, '<h4>$1</h4>')
    .replace(/- (.+)/g, '· $1')
    .replace(/\|(.+)\|/g, (m: string) =>
      m.startsWith('|') && !m.includes('---|')
        ? `<tr>${m
            .split('|')
            .filter(Boolean)
            .map((c: string) => `<td>${c.trim()}</td>`)
            .join('')}</tr>`
        : m,
    )
    .replace(/\n/g, '<br>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
  return DOMPurify.sanitize(html)
})

// ══════════════════════════════════════
// 标签操作
// ══════════════════════════════════════

function addTag() {
  const v = tagInput.value.trim()
  if (v && !form.tags.includes(v)) form.tags.push(v)
  tagInput.value = ''
}

// ══════════════════════════════════════
// 文件上传
// ══════════════════════════════════════

function onExceed() {
  ElMessage.warning('最多上传 10 个文件')
}

function beforeUpload(file: UploadRawFile) {
  const maxSize = 20 * 1024 * 1024 // 20MB
  if (file.size > maxSize) {
    ElMessage.error(`文件 ${file.name} 超过 20MB 限制`)
    return false
  }
  return true
}

function removeExisting(index: number) {
  form.existingAttachments.splice(index, 1)
}

// ══════════════════════════════════════
// 表单操作
// ══════════════════════════════════════

function resetForm() {
  editingId.value = null
  form.title = ''
  form.type = 'EXPERIENCE'
  form.tags = []
  form.content = ''
  form.visibility = 'public'
  form.contributor = 'Henry'
  form.existingAttachments = []
  tagInput.value = ''
  fileList.value = []
}

function showEdit(row: Record<string, unknown>) {
  editingId.value = String(row.id ?? '')
  const r = row as Record<string, unknown>
  form.title = String(r.title ?? '')
  form.type = String(r.type ?? '')
  form.tags = Array.isArray(r.tags) ? [...r.tags] : []
  form.content = String(r.content ?? '')
  form.visibility = String(r.visibility ?? '')
  form.contributor = String(r.contributor ?? 'Henry')
  form.existingAttachments = Array.isArray(r.attachments) ? [...r.attachments] : []
  fileList.value = []
  showDetailDialog.value = false
  showCreate.value = true
}

// ══════════════════════════════════════
// 数据加载
// ══════════════════════════════════════

async function load() {
  loading.value = true
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: pageSize.value }
    if (keyword.value) params.keyword = keyword.value
    if (filterType.value) params.type = filterType.value
    if (filterVis.value) params.visibility = filterVis.value
    if (activeTags.value.length > 0) params.tags = activeTags.value.join(',')
    const r: KnowledgePageResponse = await request.get('/knowledge', { params })
    items.value = r.items as unknown as KnowledgeItem[]
    total.value = r.total
  } catch {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function loadTags() {
  try {
    const r: KnowledgeTagResponse[] = await request.get('/knowledge/tags')
    tagCloud.value = r
  } catch {
    /* 静默 */
  }
}

function toggleTag(tag: string) {
  const idx = activeTags.value.indexOf(tag)
  if (idx >= 0) activeTags.value.splice(idx, 1)
  else activeTags.value.push(tag)
  page.value = 1
  load()
}

function showDetail(row: Record<string, unknown>) {
  detail.value = row as unknown as KnowledgeItem
  showDetailDialog.value = true
}

// ══════════════════════════════════════
// 保存 / 归档 / 删除
// ══════════════════════════════════════

async function handleSave() {
  if (!form.title || !form.content || form.tags.length === 0) {
    ElMessage.warning('标题、内容、至少一个标签必填')
    return
  }

  // 收集待上传的文件（排除 blob URL）
  const newFiles = fileList.value.filter((f) => f.raw).map((f) => f.raw!)

  saving.value = true
  try {
    // 先上传新文件
    const uploaded: AttachMeta[] = []
    if (newFiles.length > 0) {
      for (const f of newFiles) {
        const formData = new FormData()
        formData.append('file', f)
        try {
          const r: { url?: string; path?: string } = await request.post('/upload/single', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          uploaded.push({ name: f.name, type: f.type, url: r.url || r.path || '', size: f.size })
        } catch {
          ElMessage.warning(`文件 ${f.name} 上传失败，将跳过`)
        }
      }
    }

    // 合并附件
    const attachments = [...form.existingAttachments, ...uploaded]
    const payload = {
      title: form.title,
      type: form.type,
      tags: form.tags,
      content: form.content,
      visibility: form.visibility,
      contributor: form.contributor,
      attachments: attachments.length > 0 ? attachments : undefined,
    }

    if (editingId.value) {
      await request.put(`/knowledge/${editingId.value}`, payload)
      ElMessage.success('已更新')
    } else {
      await request.post('/knowledge', payload)
      ElMessage.success('知识已添加')
    }
    showCreate.value = false
    resetForm()
    load()
    loadTags()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function handleArchive(id: string) {
  try {
    await ElMessageBox.confirm('确定归档该知识？归档后仍可查看但不再被 Agent 检索。', '确认归档')
    await request.post(`/knowledge/${id}/archive`)
    ElMessage.success('已归档')
    showDetailDialog.value = false
    load()
    loadTags()
  } catch {
    /* 取消 */
  }
}

async function handleDelete(id: string) {
  try {
    await ElMessageBox.confirm('确定永久删除该知识？此操作不可恢复。', '确认删除', { type: 'warning' })
    await request.delete(`/knowledge/${id}`)
    ElMessage.success('已删除')
    showDetailDialog.value = false
    load()
    loadTags()
  } catch {
    /* 取消 */
  }
}

onMounted(() => {
  load()
  loadTags()
})
</script>

<style scoped>
.knowledge-center {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-header h2 {
  margin: 0;
  font-size: 20px;
}
.search-area {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
  padding: 10px 12px;
  background: #f8f9fb;
  border-radius: 8px;
}
.tag-item {
  cursor: pointer;
  color: #606266;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all 0.2s;
  user-select: none;
  white-space: nowrap;
}
.tag-item:hover {
  color: #409eff;
  background: #ecf5ff;
}
.tag-item.active {
  color: #fff;
  background: #409eff;
  font-weight: bold;
}

.kb-card {
  padding: 14px 0;
  border-bottom: 1px solid #ebeef5;
  cursor: pointer;
  transition: background 0.2s;
}
.kb-card:hover {
  background: #f5f7fa;
  margin: 0 -12px;
  padding: 14px 12px;
  border-radius: 6px;
}
.kb-card:last-child {
  border-bottom: none;
}
.kb-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.kb-title {
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}
.kb-meta {
  font-size: 11px;
  color: #c0c4cc;
}
.kb-tags {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}
.kb-tag {
  font-size: 11px !important;
  padding: 0 6px !important;
  height: 20px !important;
  line-height: 20px !important;
}
.kb-preview {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kb-files {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
}
.file-badge {
  font-size: 11px;
  color: #909399;
  background: #f0f2f5;
  padding: 1px 6px;
  border-radius: 3px;
}

.detail-meta {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
}
.detail-tags {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}
.detail-attachments {
  margin-bottom: 14px;
}
.section-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #303133;
}
.section-title-small {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
  margin-bottom: 4px;
}
.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.attachment-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #f8f9fb;
  border-radius: 4px;
  font-size: 12px;
}
.att-icon {
  font-size: 16px;
}
.att-name {
  color: #409eff;
  text-decoration: none;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.att-size {
  color: #c0c4cc;
  font-size: 11px;
  white-space: nowrap;
}

.detail-content {
  background: #f5f7fa;
  padding: 14px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.8;
  max-height: 400px;
  overflow-y: auto;
}
.detail-content :deep(h3) {
  font-size: 15px;
  margin: 10px 0 6px;
}
.detail-content :deep(h4) {
  font-size: 14px;
  margin: 8px 0 4px;
}
.detail-content :deep(code) {
  background: #e6e8eb;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
}
.detail-content :deep(tr) {
  display: table-row;
}
.detail-content :deep(td) {
  padding: 2px 8px;
  border: 1px solid #dcdfe6;
}

.tag-input-list {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.pagination-wrap {
  margin-top: 14px;
  display: flex;
  justify-content: center;
}
.empty-hint {
  text-align: center;
  color: #c0c4cc;
  padding: 40px 0;
  font-size: 14px;
}

.existing-files {
  margin-top: 8px;
}
.existing-file {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  margin-bottom: 4px;
}
</style>
