<!--
  SpuDialog.vue — AI-BOS V2.0
  Products.vue 的 SPU Dialog 独立组件
  字段由 Schema 驱动（config.genderOptions / config.statusOptions / config.tierLabels）
-->
<template>
  <el-dialog v-model="internalVisible" :title="isEdit ? '编辑 SPU' : '新增 SPU'" width="640px" @close="handleClose">
    <el-form ref="formRef" v-loading="saving" :model="form" :rules="formRules" label-width="90px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="SPU 编码">
            <el-input v-model="form.spuCode" placeholder="新建时自动生成" :disabled="isEdit" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="SPU 名称">
            <el-input v-model="form.spuName" placeholder="输入 SPU 名称">
              <template #append>
                <el-button :disabled="!generatedName" @click="fillSpuName">✨ 建议</el-button>
              </template>
            </el-input>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="产品级别">
            <el-select v-model="form.productTier" clearable>
              <el-option v-for="t in effectiveTierList" :key="t.tier_code" :label="t.tier_name" :value="t.tier_code">
                <span>{{ t.tier_name }}</span>
                <span
                  :style="{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: t.icon_color as string,
                    marginLeft: '6px',
                  }"
                ></span>
              </el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="款式">
            <el-select v-model="form.gender" clearable @change="$emit('update:gender', $event)">
              <el-option v-for="opt in genderOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="商品品类">
            <el-select v-model="form.categoryId" placeholder="选择品类" clearable filterable style="width: 100%">
              <el-option v-for="c in categoryList" :key="c.categoryId" :label="c.categoryName" :value="c.categoryId" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="结构标准">
            <el-select v-model="form.structureStandardCode" filterable placeholder="选择结构标准" clearable>
              <el-option
                v-for="l in structureStandards"
                :key="l.structureId"
                :label="`${l.internalCode} - ${l.shapeCode}`"
                :value="l.internalCode"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="系列">
            <el-select v-model="form.seriesCode" placeholder="选择系列" clearable filterable>
              <el-option v-for="s in seriesList" :key="s.code" :label="s.name" :value="s.code" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态">
            <el-select v-model="form.status">
              <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="场景标签">
        <el-select v-model="form.sceneTags" multiple filterable placeholder="选择场景">
          <el-option v-for="tag in sceneTags" :key="tag" :label="tag" :value="tag" />
        </el-select>
      </el-form-item>

      <el-form-item label="描述">
        <el-input v-model="form.description" type="textarea" :rows="2" />
      </el-form-item>

      <!-- 展示名预览（Schema 驱动） -->
      <div v-if="generatedName" class="name-preview">
        <el-tag type="success" size="small">展示名</el-tag>
        <span class="preview-text">{{ generatedName }}</span>
        <el-tooltip content="复制展示名"
          ><el-button link type="primary" size="small" @click="copyName">📋 复制</el-button></el-tooltip
        >
      </div>
    </el-form>

    <template #footer>
      <el-button @click="internalVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { createSpu, updateSpu } from '@/api/product'
import type { RuntimeConfig } from '@/api/schema'

const props = defineProps<{
  visible: boolean
  row?: Record<string, unknown> | null
  schemaConfig?: RuntimeConfig | null
  tierList: Record<string, unknown>[]
  structureStandards: Record<string, unknown>[]
  seriesList: Record<string, unknown>[]
  sceneTags: string[]
  genderOptions: Record<string, unknown>[]
  statusOptions: Record<string, unknown>[]
  categoryList: Record<string, unknown>[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'saved'): void
  (e: 'update:gender', v: string): void
}>()

const internalVisible = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v),
})
const isEdit = computed(() => !!props.row)
const saving = ref(false)
const formRef = ref<FormInstance>()

// Schema tier fallback
const TIER_DEFAULT_MAP: Record<string, { name: string; color: string }> = {
  color: { name: '色彩级', color: '#4CAF50' },
  style: { name: '风格级', color: '#2196F3' },
  texture: { name: '质感级', color: '#FF9800' },
  'light-luxury': { name: '轻奢级', color: '#E91E63' },
  smart: { name: '智能级', color: '#9C27B0' },
  luxury: { name: '奢华级', color: '#1a1a1a' },
}
const configTierMap = computed(() => props.schemaConfig?.tierLabels || {})
const activeTierMap = computed(() => (Object.keys(configTierMap.value).length ? configTierMap.value : TIER_DEFAULT_MAP))
const effectiveTierList = computed(() => {
  if (props.tierList.length) return props.tierList
  return Object.entries(activeTierMap.value).map(([code, info]) => ({
    tier_code: code,
    tier_name: info.name,
    icon_color: info.color,
  }))
})

// 表单模型
const form = reactive<Record<string, unknown>>({
  spuCode: '',
  spuName: '',
  productTier: '',
  gender: '',
  categoryId: '',
  structureStandardCode: '',
  seriesCode: '',
  status: 'draft',
  sceneTags: [],
  description: '',
})

// 表单校验规则
const formRules: FormRules = {
  spuName: [{ required: true, message: '请输入 SPU 名称', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择款式', trigger: 'change' }],
  structureStandardCode: [{ required: true, message: '请选择结构标准', trigger: 'change' }],
}

// Schema 驱动的展示名（含性别）
const generatedName = computed(() => {
  if (!form.structureStandardCode) return ''
  const struct = props.structureStandards.find((l) => l.internalCode === form.structureStandardCode)
  if (!struct) return ''
  const extCode = struct.externalCode || '???'
  const shapeM: Record<string, string> = props.schemaConfig?.shapeLabels || {}
  const seriesM: Record<string, string> = props.schemaConfig?.seriesLabels || {}
  const shape = shapeM[(struct.shapeCode as string) || ''] || (struct.shapeCode as string) || ''
  const series = seriesM[form.seriesCode as string] || ''
  const genderLabel = form.gender
    ? (props.genderOptions as unknown as Record<string, unknown>[]).find((o) => o.value === form.gender)?.label || ''
    : ''
  const genderPart = genderLabel ? ` · ${genderLabel}` : ''
  return `秒镜 S${extCode} · ${shape}${series}系列${genderPart}`
})

// 自动填充：当 generatedName 变化时，如果 spuName 为空则自动建议
watch(generatedName, (name) => {
  if (name && !form.spuName) {
    form.spuName = name
  }
})

function copyName() {
  navigator.clipboard?.writeText(generatedName.value)
  ElMessage.success('已复制')
}

function fillSpuName() {
  if (generatedName.value) {
    form.spuName = generatedName.value
    ElMessage.success('已填充系统建议名称')
  }
}

function resetForm() {
  form.spuCode = ''
  form.spuName = ''
  form.productTier = ''
  form.gender = ''
  form.categoryId = ''
  form.structureStandardCode = ''
  form.seriesCode = ''
  form.status = 'draft'
  form.sceneTags = []
  form.description = ''
  formRef.value?.resetFields()
}

watch(
  () => props.row,
  (row) => {
    if (row) {
      Object.assign(form, {
        spuCode: row.spuCode || '',
        spuName: row.spuName || '',
        productTier: row.productTier || '',
        gender: row.gender || '',
        categoryId: row.categoryId || '',
        structureStandardCode: row.structureStandardCode || '',
        seriesCode: row.seriesCode || '',
        status: row.status || 'draft',
        sceneTags: row.sceneTags || [],
        description: row.description || '',
      })
    } else {
      resetForm()
    }
  },
  { immediate: true },
)

async function handleSave() {
  // 先做表单校验
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const allowedFields = [
      'spuCode',
      'spuName',
      'productTier',
      'gender',
      'categoryId',
      'structureStandardCode',
      'seriesCode',
      'status',
      'sceneTags',
      'description',
    ]
    const payload: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (form[key] !== undefined && form[key] !== null && form[key] !== '') {
        payload[key] = form[key]
      }
    }
    if (isEdit.value) {
      if (!props.row) return
      await updateSpu(props.row.spuId as string, payload)
      ElMessage.success('SPU 已更新')
    } else {
      await createSpu(payload)
      ElMessage.success('SPU 已创建')
    }
    emit('saved')
    internalVisible.value = false
  } catch (e: unknown) {
    ElMessage.error((e as Error)?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function handleClose() {
  emit('update:visible', false)
  resetForm()
}
</script>

<style scoped>
.name-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f0f9eb;
  border-radius: 6px;
  margin-top: 8px;
}
.preview-text {
  font-size: 13px;
  color: #67c23a;
  font-weight: 600;
  flex: 1;
}
</style>
