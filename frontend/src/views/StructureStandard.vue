<template>
  <div class="structure-page">
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>结构标准库</span>
          <el-button type="success" @click="openDialog()">新增结构标准</el-button>
        </div>
      </template>

      <!-- 筛选 -->
      <el-form :inline="true" :model="query" class="filter-form">
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="编号/说明" clearable style="width: 160px" @keyup.enter="loadData" />
        </el-form-item>
        <el-form-item label="造型">
          <el-select v-model="query.shapeCode" placeholder="全部" clearable style="width: 120px" @change="loadData" :options="shapeOptions" />
        </el-form-item>
        <el-form-item label="系列">
          <el-select v-model="query.seriesCode" placeholder="全部" clearable style="width: 120px" @change="loadData" :options="seriesOptions" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 100px" @change="loadData">
            <el-option label="启用" :value="STRUCT_STATUS[0]" />
            <el-option label="停用" :value="STRUCT_STATUS[1]" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <div style="margin: 12px 0; display: flex; gap: 8px">
        <el-button type="primary" size="small" :disabled="selection.length===0" @click="onBatchEdit">编辑</el-button>
        <el-popconfirm title="确认批量删除所选结构标准？" @confirm="onBatchDelete" :disabled="selection.length===0">
          <template #reference><el-button type="danger" size="small" :disabled="selection.length===0">删除</el-button></template>
        </el-popconfirm>
      </div>
      <el-table :data="tableData" stripe border v-loading="loading" @selection-change="selection=$event" @row-dblclick="openDetail">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="externalCode" label="编号" width="90" fixed>
          <template #default="{ row }">
            <el-tag type="primary" effect="dark">{{ row.externalCode }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="造型" width="90">
          <template #default="{ row }">{{ row.shape_name || row.shapeCode }}</template>
        </el-table-column>
        <el-table-column label="系列" width="100">
          <template #default="{ row }">{{ row.series_name || row.seriesCode }}</template>
        </el-table-column>
        <el-table-column prop="width" label="宽(mm)" width="80" />
        <el-table-column prop="height" label="高(mm)" width="80" />
        <el-table-column prop="bridgeWidth" label="鼻梁(mm)" width="90">
          <template #default="{ row }">{{ row.bridgeWidth || '—' }}</template>
        </el-table-column>
        <el-table-column label="基弧" width="90">
          <template #default="{ row }">{{ row.baseCurve ? `BASE ${row.baseCurve}` : '—' }}</template>
        </el-table-column>
        <el-table-column prop="circumference" label="周长(mm)" width="90" />
        <el-table-column label="球面" width="120">
          <template #default="{ row }">
            <el-tag v-for="t in (row.surfaceTypes || [])" :key="t" size="small" style="margin-right: 2px">{{ t }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="折射率" width="120">
          <template #default="{ row }">
            <el-tag v-for="r in (row.refractiveIndexes || [])" :key="r" size="small" type="info" style="margin-right: 2px">{{ r }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === STRUCT_STATUS[0] ? 'success' : 'danger'" size="small">
              {{ row.status === STRUCT_STATUS[0] ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @current-change="loadData"
        @size-change="loadData"
      />
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑结构标准' : '新增结构标准'" width="780px" destroy-on-close>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <!-- 标准编号：宽度×高度 自动生成 -->
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="标准编号">
              <el-tag type="primary" effect="dark" size="large" style="font-size: 16px">{{ standardCodeDisplay }}</el-tag>
              <el-text type="info" size="small" style="margin-left: 8px">宽×高 自动生成</el-text>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="对内编号" prop="internalCode">
              <el-input v-model="form.internalCode" placeholder="研发内部编号（可选）" maxlength="64" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="造型" prop="shapeCode">
              <el-select v-model="form.shapeCode" placeholder="选择造型" :options="shapeOptions" filterable style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="系列">
              <el-select v-model="form.seriesCode" placeholder="可选（同一标准可用于不同系列）" clearable :options="seriesOptions" filterable style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="宽度(mm)" prop="width">
              <el-input-number v-model="form.width" :min="40" :max="60" :step="0.1" :precision="1" controls-position="right" style="width: 100%" @change="updateStandardCode" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="高度(mm)" prop="height">
              <el-input-number v-model="form.height" :min="25" :max="55" :step="0.1" :precision="1" controls-position="right" style="width: 100%" @change="updateStandardCode" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="鼻梁(mm)" prop="bridgeWidth">
              <el-input-number v-model="form.bridgeWidth" :min="12" :max="25" :step="1" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="周长(mm)" prop="circumference">
              <el-input-number v-model="form.circumference" :min="140" :max="180" :step="0.1" :precision="1" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="基弧" prop="baseCurve">
              <el-input-number v-model="form.baseCurve" :min="150" :max="300" :step="5" controls-position="right" style="width: 100%" />
              <el-text type="info" size="small" style="margin-top: 4px">BASE XXX 曲率半径mm</el-text>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="球面类型" prop="surfaceTypes">
              <el-select v-model="form.surfaceTypes" multiple collapse-tags collapse-tags-tooltip style="width: 100%">
                <el-option label="球面 SPH" value="SPH" />
                <el-option label="非球面 ASP" value="ASP" />
                <el-option label="双非 DAS" value="DAS" />
                <el-option label="自由曲面 FRM" value="FRM" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="折射率" prop="refractiveIndexes">
              <el-select v-model="form.refractiveIndexes" multiple collapse-tags collapse-tags-tooltip style="width: 100%">
                <el-option :value="1.56" label="1.56" />
                <el-option :value="1.60" label="1.60" />
                <el-option :value="1.67" label="1.67" />
                <el-option :value="1.74" label="1.74" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio :value="STRUCT_STATUS[0]">启用</el-radio>
                <el-radio :value="STRUCT_STATUS[1]">停用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="描述说明、设计亮点、适用场景" />
        </el-form-item>

        <!-- 附件上传 -->
        <el-divider content-position="left">技术资料</el-divider>
        <el-upload
          :http-request="handleUpload"
          :before-upload="beforeUpload"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,application/pdf,.dwg,.dxf,.stl,.stp,.step,.obj,.fbx,.iges,.igs,.3mf,.skp,.dwf,.dgn,.bmp,.tiff"
          :limit="10"
          multiple
          drag
          v-if="isEdit && editId"
        >
          <template #trigger><el-button type="primary">上传文件</el-button></template>
          <el-text type="info" style="margin-left: 12px">支持图片/PDF/DWG/DXF/STL/STP/STEP/OBJ/FBX/IGES 等，单文件最大 100MB</el-text>
        </el-upload>
        <el-text v-if="!isEdit" type="info">请先保存后再上传技术资料</el-text>

        <div v-if="isEdit && editId" style="margin-top: 12px">
          <el-table :data="attachments" border size="small">
            <el-table-column label="文件名" min-width="150">
              <template #default="{ row }">
                <el-link :href="row.fileUrl" target="_blank" :underline="false">{{ row.fileName }}</el-link>
              </template>
            </el-table-column>
            <el-table-column label="类型" width="60">
              <template #default="{ row }">
                <el-tag :type="row.fileType === 'image' ? 'success' : 'danger'" size="small">{{ row.fileType === 'image' ? '图片' : 'PDF' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="大小" width="80">
              <template #default="{ row }">{{ row.fileSize ? (row.fileSize / 1024).toFixed(1) + 'KB' : '-' }}</template>
            </el-table-column>
            <el-table-column label="说明" min-width="120">
              <template #default="{ row }">{{ row.description || '-' }}</template>
            </el-table-column>
            <el-table-column label="预览" width="70" align="center">
              <template #default="{ row }">
                <el-button v-if="row.fileType === 'image'" size="small" link @click="previewImage(row)">👁️</el-button>
                <el-tag v-else size="small" type="info">PDF</el-tag>
              </template>
            </el-table-column>
            <el-table-column width="50" align="center">
              <template #default="{ row }">
                <el-popconfirm title="确认删除该附件？" @confirm="deleteAttachment(row.attachmentId)">
                  <template #reference><el-button size="small" type="danger" link>×</el-button></template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" title="结构标准详情" size="500px">
      <template v-if="detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="对外编号">
            <el-tag type="primary" effect="dark">{{ detail.externalCode }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="对内编号">{{ detail.internalCode }}</el-descriptions-item>
          <el-descriptions-item label="造型">{{ detail.shape_name || detail.shapeCode }}</el-descriptions-item>
          <el-descriptions-item label="系列">{{ detail.series_name || detail.seriesCode }}</el-descriptions-item>
          <el-descriptions-item label="尺寸">{{ detail.width }} × {{ detail.height }} mm</el-descriptions-item>
          <el-descriptions-item label="周长">{{ detail.circumference }} mm</el-descriptions-item>
          <el-descriptions-item label="基弧">{{ detail.baseCurve ? `BASE ${detail.baseCurve}` : '—' }}</el-descriptions-item>
          <el-descriptions-item label="鼻梁">{{ detail.bridgeWidth || '—' }}mm</el-descriptions-item>
          <el-descriptions-item label="球面类型">
            <el-tag v-for="t in (detail.surfaceTypes || [])" :key="t" size="small" style="margin-right: 4px">{{ t }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="折射率">
            <el-tag v-for="r in (detail.refractiveIndexes || [])" :key="r" size="small" type="info" style="margin-right: 4px">{{ r }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="描述">{{ detail.description || '—' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ detail.createdAt }}</el-descriptions-item>
        </el-descriptions>

        <el-divider>兼容镜框</el-divider>
        <el-table :data="frames" size="small" border>
          <el-table-column prop="productSkuId" label="SKU ID" />
          <el-table-column prop="compatibilityLevel" label="兼容等级" width="100" />
          <el-table-column prop="notes" label="备注" show-overflow-tooltip />
        </el-table>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { getStructureList, createStructure, updateStructure, deleteStructure, getStructureDetail, getCompatibleFrames } from '@/api/structure'
import request from '@/api/request'
import { useDict } from '@/composables/useDict'

// 系统级状态常量（与 common/system-status.ts 值域一致）
const STRUCT_STATUS = ['active', 'inactive'] as const

// 球面类型常量（structure_shape 字典值）
const SURFACE_TYPE = {
  SPH: 'SPH',     // 球面
  ASP: 'ASP',     // 非球面
  DAS: 'DAS',     // 双非
  FRM: 'FRM',     // 自由曲面
} as const

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// 上传用相对路径，走 request 实例（自带 JWT interceptor）
const uploadUrl = computed(() => `/structures/${editId.value}/upload`)

// 自定义上传：用 request.post 替代原生 XMLHttpRequest
async function handleUpload(options: Record<string, unknown>) {
  const { file, onSuccess, onError } = options as { file: File; onSuccess: (res: unknown) => void; onError: (e: unknown) => void };
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await request.post(uploadUrl.value, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    onSuccess(res)
    ElMessage.success('上传成功')
    loadAttachments(editId.value)
  } catch (e: unknown) {
    onError(e)
    const err = e instanceof Error ? e.message : String(e);
    const msg = err || '未知错误'
    ElMessage.error(`上传失败: ${msg}`)
  }
}

const loading = ref(false)
const saving = ref(false)
const tableData = ref<any[]>([])
const selection = ref<any[]>([])
const total = ref(0)
const dialogVisible = ref(false)

// 造型/系列字典（useDict 返回 items，字段为 code/name）
const shapeDict = useDict('structure_shape')
const seriesDict = useDict('structure_series')

// el-select :options 需要 { label, value } 格式
const shapeOptions = computed(() => shapeDict.items.value.map((s) => ({ label: `${s.name} (${s.code})`, value: s.code })))
const seriesOptions = computed(() => seriesDict.items.value.map((s) => ({ label: `${s.name} (${s.code})`, value: s.code })))
const detailVisible = ref(false)
const isEdit = ref(false)
const editId = ref('')
const formRef = ref<FormInstance>()
const detail = ref<any>(null)
const frames = ref<any[]>([])

const query = reactive({ page: 1, pageSize: 20, keyword: '', shapeCode: '', seriesCode: '', status: '' })

const form = reactive({
  internalCode: '', shapeCode: '', seriesCode: '' as string | null,
  width: 51.0, height: 47.0, bridgeWidth: null as number | null, circumference: 157.0, baseCurve: 200 as number | null,
  surfaceTypes: [SURFACE_TYPE.ASP] as string[], refractiveIndexes: [1.60] as number[], description: '', status: STRUCT_STATUS[0],
})

// 标准编号实时预览：宽度×高度
const standardCodeDisplay = computed(() => `${Math.round(form.width)}${Math.round(form.height)}`)
function updateStandardCode() {
  // 宽度/高度变化时自动更新 standardCodeDisplay（computed 自动响应）
}

const attachments = ref<any[]>([])

const rules = {
  shapeCode: [{ required: true, message: '请选择造型', trigger: 'change' }],
  width: [{ required: true, message: '请输入宽度', trigger: 'blur' }],
  height: [{ required: true, message: '请输入高度', trigger: 'blur' }],
  circumference: [{ required: true, message: '请输入周长', trigger: 'blur' }],
  surfaceTypes: [{ required: true, message: '请选择球面类型', trigger: 'change', type: 'array' as const }],
  refractiveIndexes: [{ required: true, message: '请选择折射率', trigger: 'change', type: 'array' as const }],
}

async function loadData() {
  loading.value = true
  try {
    const res = await getStructureList(query)
    tableData.value = res.items
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  Object.assign(query, { page: 1, pageSize: 20, keyword: '', shapeCode: '', seriesCode: '', status: '' })
  loadData()
}

function onBatchEdit() { if(selection.value.length===1) openDialog(selection.value[0]); else if(selection.value.length>1) ElMessage.warning('暂仅支持单条编辑'); }
async function onBatchDelete() { try { for(const r of selection.value) { await deleteStructure(r.structureId); } selection.value=[]; loadData(); ElMessage.success('批量删除成功'); } catch { ElMessage.error('删除失败'); } }

function openDialog(row?: any) {
  isEdit.value = !!row
  editId.value = row?.structureId || ''
  attachments.value = []
  if (row) {
    // 兼容旧数据：如果返回的是 surfaceType/refractiveIndex 单值，转为数组
    const surfaceTypes = row.surfaceTypes || (row.surfaceType ? [row.surfaceType] : ['ASP'])
    const refractiveIndexes = row.refractiveIndexes || (row.refractiveIndex ? [row.refractiveIndex] : [1.60])
    Object.assign(form, { ...row, surfaceTypes, refractiveIndexes })
    loadAttachments(row.structureId)
  } else {
    Object.assign(form, { internalCode: '', shapeCode: '', seriesCode: null, width: 51.0, height: 47.0, bridgeWidth: null, circumference: 157.0, baseCurve: 200, surfaceTypes: [SURFACE_TYPE.ASP], refractiveIndexes: [1.60], description: '', status: STRUCT_STATUS[0] })
  }
  dialogVisible.value = true
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    // 严格构造 DTO payload，避免 forbidNonWhitelisted 拒绝；null → undefined 确保 @IsOptional() 跳过校验
    const basePayload = {
      shapeCode: form.shapeCode,
      seriesCode: form.seriesCode || undefined,
      width: form.width,
      height: form.height,
      bridgeWidth: form.bridgeWidth ?? undefined,
      circumference: form.circumference,
      baseCurve: form.baseCurve ?? undefined,
      surfaceTypes: form.surfaceTypes,
      refractiveIndexes: form.refractiveIndexes,
      description: form.description || undefined,
      status: form.status,
    }
    if (isEdit.value) {
      await updateStructure(editId.value, basePayload)
      ElMessage.success('更新成功')
      dialogVisible.value = false
      loadData()
    } else {
      // 新增：internalCode 可选，externalCode 由后端自动生成
      const result = await createStructure({ ...basePayload, internalCode: form.internalCode || undefined })
      ElMessage.success('创建成功')
      // 保存后自动切换为编辑态，用户可直接上传附件
      isEdit.value = true
      editId.value = result.structureId
      attachments.value = []
      // 不关闭对话框，不刷新列表，让用户继续操作
    }
  } catch (e: unknown) {
    console.error('保存失败:', e)
  } finally {
    saving.value = false
  }
}

async function openDetail(row: Record<string, unknown>) {
  detail.value = await getStructureDetail(String(row.structureId ?? ''))
  frames.value = await getCompatibleFrames(String(row.externalCode ?? ''))
  detailVisible.value = true
}

// 附件管理
async function loadAttachments(structureId: string) {
  try {
    const detail = await getStructureDetail(structureId)
    attachments.value = (detail as unknown as Record<string, unknown>).attachments as any[] || []
  } catch {}
}

function beforeUpload(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  const allowedExts = [
    // 图片
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff',
    // 文档
    'pdf', 'dwg', 'dxf',
    // 3D 模型
    'stl', 'stp', 'step', 'obj', 'fbx', 'iges', 'igs', '3mf', 'skp', 'dwf', 'dgn',
  ]
  if (ext && !allowedExts.includes(ext)) {
    ElMessage.error(`不支持的文件类型 (.${ext})，支持：图片/PDF/DWG/DXF/STL/STP/STEP/OBJ/FBX/IGES/3MF/SKP 等`)
    return false
  }
  if (file.size > 100 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 100MB')
    return false
  }
  return true
}

function previewImage(row: Record<string, unknown>) {
  ElMessageBox.alert(`<img src="${BASE_URL}${String(row.fileUrl ?? '')}" style="max-width:100%;max-height:80vh" />`, String(row.fileName ?? ''), { dangerouslyUseHTMLString: true, customClass: '' })
}

async function deleteAttachment(attachmentId: string) {
  await request.delete(`/structures/attachments/${attachmentId}`)
  ElMessage.success('删除成功')
  loadAttachments(editId.value)
}

onMounted(() => { loadData() })
</script>

<style scoped>
.structure-page { padding: 0; }
.filter-form { margin-bottom: 0; }


/* 输入框宽度修复 */
.el-dialog .el-input,
.el-dialog .el-select,
.el-dialog .el-date-editor { width: 100% !important; }
.el-dialog .el-input-number { width: 100% !important; }

/* el-input-number 数值显示不被遮盖 */
.el-dialog .el-input-number .el-input__inner {
  text-align: left;
  padding-right: 36px;
}
</style>
