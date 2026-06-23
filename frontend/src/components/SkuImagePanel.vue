<!--
  SkuImagePanel.vue — P1-3c 前端重构
  Products.vue 的 SKU 图片管理面板独立组件
  包含：SKU 选择 + 类型筛选 + 图片列表 + 新增/编辑/批量上传 + 排序/拖拽 + 预览全屏
  Props: skuListForSelect + skuSelectLoading
  Emits: refresh
-->
<template>
  <div class="tab-content">
    <div class="toolbar">
      <el-select
        v-model="imageSearch.skuId"
        placeholder="选择 SKU"
        clearable
        filterable
        style="width: 280px"
        :loading="skuSelectLoading"
        :disabled="skuSelectLoading"
        @change="loadSkuImages"
      >
        <el-option
          v-for="s in skuListForSelect"
          :key="s.skuId"
          :label="`${s.skuCode} - ${s.skuName || '-'}`"
          :value="s.skuId"
        />
      </el-select>
      <el-button type="primary" @click="loadSkuImages">刷新</el-button>
      <el-button type="success" :disabled="!imageSearch.skuId" @click="openImageDialog()">+ 新增</el-button>
      <el-button type="warning" :disabled="!imageSearch.skuId" @click="openBatchDialog()">批量上传</el-button>
    </div>

    <div class="image-type-tabs">
      <el-radio-group v-model="imageSearch.imageType" @change="loadSkuImages">
        <el-radio-button label="">全部</el-radio-button>
        <el-radio-button label="main">主图</el-radio-button>
        <el-radio-button label="gallery">图集</el-radio-button>
        <el-radio-button label="detail">详情</el-radio-button>
        <el-radio-button label="lifestyle">场景</el-radio-button>
        <el-radio-button label="360view">360°</el-radio-button>
        <el-radio-button label="website_banner">横幅</el-radio-button>
      </el-radio-group>
    </div>

    <el-table v-loading="imageLoading" :data="sortedImageList" stripe row-key="imageId">
      <el-table-column label="" width="40">
        <template #default>
          <el-icon class="drag-handle" style="cursor: grab; color: #909399"><Rank /></el-icon>
        </template>
      </el-table-column>
      <el-table-column label="预览" width="100">
        <template #default="{ row }">
          <el-image
            :src="row.imageUrl"
            fit="cover"
            style="width: 60px; height: 60px; border-radius: 4px; cursor: pointer"
            @click="previewImage(row.imageUrl)"
          />
        </template>
      </el-table-column>
      <el-table-column prop="imageUrl" label="URL" min-width="200" show-overflow-tooltip />
      <el-table-column label="类型" width="90">
        <template #default="{ row }">
          <el-tag :type="typeColorMap[row.imageType] || 'info'" size="small">
            {{ typeLabelMap[row.imageType] || row.imageType }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="主图" width="60">
        <template #default="{ row }"><el-tag v-if="row.isPrimary" type="danger" size="small">&nbsp;</el-tag></template>
      </el-table-column>
      <el-table-column label="状态" width="70">
        <template #default="{ row }"
          ><el-tag :type="row.isActive ? 'success' : 'danger'" size="small">{{
            row.isActive ? '启用' : '禁用'
          }}</el-tag></template
        >
      </el-table-column>
      <el-table-column prop="altText" label="替代文本" min-width="120" show-overflow-tooltip />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row, $index }">
          <el-button link type="info" size="small" :disabled="$index === 0" title="上移" @click="moveImage($index, -1)"
            >↑</el-button
          >
          <el-button
            link
            type="info"
            size="small"
            :disabled="$index === sortedImageList.length - 1"
            title="下移"
            @click="moveImage($index, 1)"
            >↓</el-button
          >
          <el-button link type="primary" @click="openImageDialog(row)">编辑</el-button>
          <el-popconfirm title="确认删除？" @confirm="handleDeleteImage(row.imageId)">
            <template #reference><el-button link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="hasReordered" class="save-order-bar">
      <el-button type="primary" @click="handleSaveOrder">保存排序</el-button>
      <el-button @click="cancelReorder">取消</el-button>
    </div>

    <!-- 图片预览全屏层 -->
    <div
      v-if="previewVisible"
      class="fullscreen-preview"
      @click="previewVisible = false"
      @wheel.prevent="onPreviewWheel"
    >
      <div class="preview-toolbar">
        <span class="preview-zoom">{{ Math.round(previewScale * 100) }}%</span>
        <el-button circle size="small" @click.stop="previewScale = Math.min(3, previewScale + 0.25)">+</el-button>
        <el-button circle size="small" @click.stop="previewScale = Math.max(0.25, previewScale - 0.25)">−</el-button>
        <el-button
          circle
          size="small"
          @click.stop="
            previewScale = 1
            previewVisible = false
          "
          >✕</el-button
        >
      </div>
      <img :src="previewSrc" :style="{ transform: `scale(${previewScale})` }" @click.stop />
    </div>

    <!-- 批量上传 Dialog -->
    <el-dialog v-model="batchDialogVisible" title="批量上传图片" width="640px" destroy-on-close>
      <el-tabs v-model="batchTab">
        <el-tab-pane label="URL 输入" name="url">
          <el-alert
            title="每行一个图片 URL，格式：URL | 类型 | 排序 | 主图(Y/N) | 替代文本"
            type="info"
            :closable="false"
            style="margin-bottom: 12px"
          />
          <el-input
            v-model="batchText"
            type="textarea"
            :rows="10"
            placeholder="示例：
https://cdn.example.com/img1.jpg | main | 0 | Y | 马卡龙粉主图
https://cdn.example.com/img2.jpg | gallery | 1 | N | 侧面展示"
          />
        </el-tab-pane>
        <el-tab-pane label="本地上传" name="local">
          <input
            ref="batchFileInput"
            type="file"
            accept="image/*"
            multiple
            style="display: none"
            @change="onBatchFileSelect"
          />
          <div style="margin-bottom: 12px">
            <el-button @click="triggerBatchFileSelect">选择多张图片</el-button>
            <span v-if="batchUploading" style="color: #409eff; margin-left: 12px"
              >上传中... {{ batchUploadedCount }}/{{ batchFileList.length }}</span
            >
            <span v-else-if="batchUploadedCount > 0" style="color: #67c23a; margin-left: 12px"
              >已上传 {{ batchUploadedCount }} 张</span
            >
          </div>
          <div v-if="batchFileList.length > 0" class="batch-file-list">
            <div v-for="(f, i) in batchFileList" :key="i" class="batch-file-item">
              <span>{{ i + 1 }}. {{ f.name }}</span>
              <el-tag v-if="f.status === 'uploading'" type="warning" size="small">上传中</el-tag>
              <el-tag v-else-if="f.status === 'success'" type="success" size="small">成功</el-tag>
              <el-tag v-else-if="f.status === 'error'" type="danger" size="small">失败</el-tag>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button v-if="batchTab === 'url'" type="primary" @click="handleBatchUpload">📤 开始上传</el-button>
        <el-button
          v-if="batchTab === 'local' && batchFileList.length > 0 && !batchUploading"
          type="primary"
          @click="startBatchFileUpload"
          >📤 开始上传 ({{ batchFileList.length }} 张)</el-button
        >
      </template>
    </el-dialog>

    <!-- 图片编辑 Dialog -->
    <el-dialog
      v-model="imageDialogVisible"
      :title="imageForm.imageId ? '编辑图片' : '新增图片'"
      width="560px"
      destroy-on-close
    >
      <el-form :model="imageForm" label-width="100px">
        <el-form-item label="上传图片">
          <input ref="imageFileInput" type="file" accept="image/*" style="display: none" @change="onImageFileSelect" />
          <div style="display: flex; gap: 12px; align-items: center">
            <el-button @click="triggerImageFileSelect">📁 选择图片</el-button>
            <span v-if="imageUploading" style="color: #409eff">⏳ 上传中...</span>
            <span v-else-if="imageForm.imageUrl" style="color: #67c23a">✅ 已选择</span>
          </div>
          <div v-if="imageForm.imageUrl" style="margin-top: 8px">
            <el-image
              :src="imageForm.imageUrl"
              fit="contain"
              style="max-width: 200px; max-height: 150px; border-radius: 4px"
            />
          </div>
        </el-form-item>
        <el-form-item label="图片 URL">
          <el-input v-model="imageForm.imageUrl" placeholder="上传后自动填充，也可手动输入 CDN 地址" />
        </el-form-item>
        <el-form-item label="图片类型">
          <el-select v-model="imageForm.imageType">
            <el-option label="主图" value="main" />
            <el-option label="图集" value="gallery" />
            <el-option label="详情" value="detail" />
            <el-option label="场景" value="lifestyle" />
            <el-option label="360度" value="360view" />
            <el-option label="官网横幅" value="website_banner" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序"><el-input-number v-model="imageForm.sortOrder" :min="0" /></el-form-item>
        <el-form-item label="设为主图"><el-switch v-model="imageForm.isPrimary" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="imageForm.isActive" /></el-form-item>
        <el-form-item label="替代文本"
          ><el-input v-model="imageForm.altText" placeholder="SEO/无障碍描述"
        /></el-form-item>
      </el-form>
      <template #footer
        ><el-button @click="imageDialogVisible = false">取消</el-button
        ><el-button type="primary" @click="handleSaveImage">保存</el-button></template
      >
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Rank } from '@element-plus/icons-vue'
import {
  getSkuImages,
  createSkuImage,
  batchCreateSkuImages,
  updateSkuImage,
  deleteSkuImage,
  reorderSkuImages,
  uploadImage,
} from '@/api/product'

const props = defineProps<{
  skuListForSelect: Record<string, unknown>[]
  skuSelectLoading: boolean
}>()

const typeColorMap: Record<string, string> = {
  main: 'danger',
  gallery: 'primary',
  detail: 'info',
  lifestyle: 'success',
  '360view': 'warning',
  website_banner: 'warning',
}
const typeLabelMap: Record<string, string> = {
  main: '主图',
  gallery: '图集',
  detail: '详情',
  lifestyle: '场景',
  '360view': '360°',
  website_banner: '横幅',
}

const emit = defineEmits<{
  refresh: []
}>()

// ===== 图片搜索 =====
const imageSearch = reactive({ skuId: '', imageType: '' })
const skuImageList = ref<Record<string, unknown>[]>([])
const imageLoading = ref(false)

// ===== 排序 =====
const hasReordered = ref(false)
const originalOrder = ref<Record<string, unknown>[]>([])

const sortedImageList = computed(() => {
  return [...skuImageList.value].sort((a, b) => ((a.sortOrder as number) ?? 0) - ((b.sortOrder as number) ?? 0))
})

async function loadSkuImages() {
  if (!imageSearch.skuId) {
    skuImageList.value = []
    return
  }
  imageLoading.value = true
  try {
    const res = await getSkuImages({ skuId: imageSearch.skuId, imageType: imageSearch.imageType || undefined })
    skuImageList.value = Array.isArray(res)
      ? res
      : ((res as unknown as Record<string, unknown>)?.items as Record<string, unknown>[]) || []
    originalOrder.value = [...skuImageList.value]
    hasReordered.value = false
  } catch {
    skuImageList.value = []
  } finally {
    imageLoading.value = false
  }
}

// ===== 单张图片 Dialog =====
interface ImageForm {
  imageId: string
  skuId: string
  imageUrl: string
  imageType: string
  sortOrder: number
  isPrimary: boolean
  isActive: boolean
  altText: string
  fileSize?: number
  width?: number
  height?: number
}
const imageDialogVisible = ref(false)
const imageForm = reactive<ImageForm>({
  imageId: '',
  skuId: '',
  imageUrl: '',
  imageType: 'gallery',
  sortOrder: 0,
  isPrimary: false,
  isActive: true,
  altText: '',
})
const imageFileInput = ref<HTMLInputElement | null>(null)
const imageUploading = ref(false)

function triggerImageFileSelect() {
  imageFileInput.value?.click()
}

function openImageDialog(row?: Record<string, unknown>) {
  if (row) {
    Object.assign(imageForm, {
      imageId: row.imageId as string,
      skuId: row.skuId as string,
      imageUrl: (row.imageUrl as string) || '',
      imageType: (row.imageType as string) || 'gallery',
      sortOrder: (row.sortOrder as number) ?? 0,
      isPrimary: (row.isPrimary as boolean) ?? false,
      isActive: (row.isActive as boolean) ?? true,
      altText: (row.altText as string) || '',
    })
  } else {
    Object.assign(imageForm, {
      imageId: '',
      skuId: imageSearch.skuId,
      imageUrl: '',
      imageType: 'gallery',
      sortOrder: 0,
      isPrimary: false,
      isActive: true,
      altText: '',
    })
  }
  imageDialogVisible.value = true
}

async function onImageFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  imageUploading.value = true
  try {
    const res = (await uploadImage(file)) as unknown as Record<string, unknown>
    const result = (res?.data || res) as Record<string, unknown>
    imageForm.imageUrl = (result?.url as string) || ''
    if (result?.size) imageForm.fileSize = result.size as number
    if (result?.width) imageForm.width = result.width as number
    if (result?.height) imageForm.height = result.height as number
  } catch (err: unknown) {
    ElMessage.error((err as Error)?.message || '上传失败')
  } finally {
    imageUploading.value = false
  }
}

async function handleSaveImage() {
  try {
    if (imageForm.imageId) {
      // 仅提交 updatable 字段
      const payload = {
        imageUrl: imageForm.imageUrl,
        imageType: imageForm.imageType,
        sortOrder: imageForm.sortOrder,
        isPrimary: imageForm.isPrimary,
        isActive: imageForm.isActive,
        altText: imageForm.altText,
        width: imageForm.width,
        height: imageForm.height,
        fileSize: imageForm.fileSize,
      }
      await updateSkuImage(imageForm.imageId, payload)
      ElMessage.success('图片已更新')
    } else {
      await createSkuImage(imageForm)
      ElMessage.success('图片已创建')
    }
    imageDialogVisible.value = false
    loadSkuImages()
    emit('refresh')
  } catch (e: unknown) {
    ElMessage.error((e as Error)?.message || '保存失败')
  }
}

async function handleDeleteImage(id: string) {
  try {
    await deleteSkuImage(id)
    ElMessage.success('已删除')
    loadSkuImages()
    emit('refresh')
  } catch (e: unknown) {
    ElMessage.error((e as Error)?.message || '删除失败')
  }
}

// ===== 图片预览 =====
const previewSrc = ref('')
const previewVisible = ref(false)
const previewScale = ref(1)

function previewImage(url: string) {
  previewSrc.value = url
  previewVisible.value = true
  previewScale.value = 1
}
function onPreviewWheel(e: WheelEvent) {
  previewScale.value = Math.min(3, Math.max(0.25, previewScale.value - e.deltaY * 0.005))
}

// ===== 排序 =====
async function handleSaveOrder() {
  try {
    const ids = sortedImageList.value.map((i) => i.imageId as string)
    await reorderSkuImages({ skuId: imageSearch.skuId, imageType: imageSearch.imageType || '', orderedIds: ids })
    ElMessage.success('排序已保存')
    hasReordered.value = false
    originalOrder.value = [...skuImageList.value]
  } catch (e: unknown) {
    ElMessage.error((e as Error)?.message || '保存失败')
  }
}

function cancelReorder() {
  hasReordered.value = false
  skuImageList.value = [...originalOrder.value]
}

function moveImage(index: number, direction: number) {
  const list = [...skuImageList.value]
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= list.length) return
  ;[list[index], list[newIndex]] = [list[newIndex], list[index]]
  list[index].sortOrder = index
  list[newIndex].sortOrder = newIndex
  skuImageList.value = list
  if (!hasReordered.value) {
    originalOrder.value = [...originalOrder.value]
    hasReordered.value = true
  }
}

// ===== 批量上传 Dialog =====
const batchDialogVisible = ref(false)
const batchText = ref('')
const batchTab = ref('url')
const batchFileInput = ref<HTMLInputElement | null>(null)
const batchFileList = ref<{ name: string; file: File; status: string }[]>([])
const batchUploading = ref(false)
const batchUploadedCount = ref(0)

function openBatchDialog() {
  batchText.value = ''
  batchTab.value = 'url'
  batchFileList.value = []
  batchUploadedCount.value = 0
  batchDialogVisible.value = true
}

async function handleBatchUpload() {
  const lines = batchText.value.split('\n').filter((l) => l.trim())
  if (!lines.length) return ElMessage.warning('请输入图片 URL')
  batchUploading.value = true
  batchUploadedCount.value = 0
  try {
    const items = lines.map((line) => {
      const parts = line.split('|').map((p) => p.trim())
      return {
        skuId: imageSearch.skuId,
        imageUrl: parts[0],
        imageType: parts[1] || 'gallery',
        sortOrder: parseInt(parts[2]) || 0,
        isPrimary: parts[3]?.toUpperCase() === 'Y',
        altText: parts[4] || '',
      }
    })
    await batchCreateSkuImages({ skuId: imageSearch.skuId, images: items })
    ElMessage.success(`批量上传完成：${lines.length} 张图片`)
    batchUploadedCount.value = lines.length
    batchDialogVisible.value = false
    loadSkuImages()
    emit('refresh')
  } catch (e: unknown) {
    ElMessage.error((e as Error)?.message || '批量上传失败')
  } finally {
    batchUploading.value = false
  }
}

function triggerBatchFileSelect() {
  batchFileInput.value?.click()
}

function onBatchFileSelect(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files) return
  batchFileList.value = Array.from(files).map((f) => ({ name: f.name, file: f, status: 'pending' }))
}

async function startBatchFileUpload() {
  batchUploading.value = true
  batchUploadedCount.value = 0
  for (const item of batchFileList.value) {
    item.status = 'uploading'
    try {
      const res = (await uploadImage(item.file)) as unknown as Record<string, unknown>
      await createSkuImage({
        skuId: imageSearch.skuId,
        imageUrl: (res?.url || (res?.data as Record<string, unknown>)?.url || '') as string,
        imageType: 'gallery',
        sortOrder: 0,
        isPrimary: false,
        isActive: true,
      })
      item.status = 'success'
      batchUploadedCount.value++
    } catch {
      item.status = 'error'
    }
  }
  batchUploading.value = false
  loadSkuImages()
  emit('refresh')
  ElMessage.success(`批量上传完成：${batchUploadedCount.value} 张图片`)
}
</script>

<style scoped>
.image-type-tabs {
  margin-bottom: 12px;
}
.fullscreen-preview {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.fullscreen-preview img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  transition: transform 0.1s;
}
.preview-toolbar {
  position: absolute;
  top: 16px;
  right: 24px;
  display: flex;
  gap: 8px;
  align-items: center;
  background: rgba(255, 255, 255, 0.15);
  padding: 8px 16px;
  border-radius: 8px;
}
.preview-zoom {
  color: #fff;
  font-size: 14px;
  margin-right: 8px;
}
.save-order-bar {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding: 12px;
  background: #fdf6ec;
  border-radius: 4px;
}
.batch-file-list {
  max-height: 200px;
  overflow-y: auto;
}
.batch-file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
}
</style>
