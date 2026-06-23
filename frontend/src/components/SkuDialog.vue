<!--
  SkuDialog.vue — AI-BOS V2.0
  Products.vue 的 SKU Dialog 独立组件
  包含基本信息 Tab + 技术参数 Tab（材质/尺寸/结构/营销/功能）
-->
<template>
  <el-dialog v-model="internalVisible" :title="isEdit ? '编辑 SKU' : '新增 SKU'" width="760px" @close="handleClose">
    <el-tabs v-model="activeTab">
      <!-- 基本信息 Tab -->
      <el-tab-pane label="基本信息" name="basic">
        <el-form ref="basicFormRef" :model="form" :rules="basicFormRules" label-width="110px" class="sku-tab-scroll">
          <!-- 展示名预览 -->
          <div v-if="displayName" class="name-preview" style="margin-bottom: 16px">
            <span class="name-text"
              >📋 展示名：<strong>{{ displayName }}</strong></span
            >
            <el-tooltip content="复制" placement="top">
              <el-button link type="primary" size="small" @click="copyName">📋 复制</el-button>
            </el-tooltip>
          </div>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="SKU 编码"
                ><el-input v-model="form.skuCode" disabled placeholder="自动生成"
              /></el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="色彩" prop="colorCode">
                <el-select v-model="form.colorCode" placeholder="选择色彩" filterable clearable @change="onColorChange">
                  <el-option
                    v-for="c in colorList"
                    :key="c.colorCode"
                    :label="`${c.colorName} / ${c.colorNameEn || c.colorCode}`"
                    :value="c.colorCode"
                  >
                    <span style="display: inline-flex; align-items: center; gap: 8px">
                      <span
                        :style="{
                          display: 'inline-block',
                          width: '14px',
                          height: '14px',
                          borderRadius: '2px',
                          background: (c.hexValue as string) || '#ccc',
                          border: '1px solid #ddd',
                        }"
                      ></span>
                      <span>{{ c.colorName }}</span>
                      <span style="color: #909399; font-size: 12px">/ {{ c.colorNameEn }}</span>
                    </span>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="名称"
            ><el-input v-model="form.skuName" placeholder="可选，系统自动生成展示名"
          /></el-form-item>

          <el-form-item label="关联 SPU" prop="spuId">
            <el-select v-model="form.spuId" placeholder="选择 SPU" clearable filterable @change="onSpuChange">
              <el-option v-for="s in spuList" :key="s.spuId" :label="`${s.spuCode} - ${s.spuName}`" :value="s.spuId" />
            </el-select>
          </el-form-item>

          <el-row :gutter="16">
            <el-col :span="12" class="w-short">
              <el-form-item label="产品级别">
                <el-select v-model="form.productTier" clearable>
                  <el-option label="继承 SPU" value="" />
                  <el-option
                    v-for="t in effectiveTierList"
                    :key="t.tier_code"
                    :label="t.tier_name"
                    :value="t.tier_code"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="结构标准">
                <el-select v-model="form.structureStandardCode" filterable placeholder="继承 SPU 或手动覆盖" clearable>
                  <el-option label="继承 SPU" value="" />
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

          <!-- 效果词选择区 -->
          <div class="effect-section">
            <div class="section-title">
              🎨 效果词（V3.0 命名规范 · 一维效果）<el-tag size="small" type="success" style="margin-left: 8px"
                >Schema</el-tag
              >
            </div>
            <el-row :gutter="16">
              <el-col :span="12">
                <div style="margin-bottom: 8px; font-size: 12px; color: #606266">肤色效果</div>
                <div class="effect-tags">
                  <span
                    v-for="tag in skinTags"
                    :key="tag.effectCode"
                    class="effect-tag"
                    :class="{ active: form.skinToneEffect === (tag.effectName || tag) }"
                    @click="
                      form.skinToneEffect = (tag.effectName as string) || tag
                      updateDisplayName()
                    "
                  >
                    {{ tag.effectName || tag }}
                  </span>
                </div>
                <el-button link size="small" type="primary" style="margin-top: 4px" @click="openEffectDict('skin_tone')"
                  >📖 查看全部</el-button
                >
              </el-col>
              <el-col :span="12">
                <div style="margin-bottom: 8px; font-size: 12px; color: #606266">脸型效果</div>
                <div class="effect-tags">
                  <span
                    v-for="tag in faceTags"
                    :key="tag.effectCode"
                    class="effect-tag"
                    :class="{ active: form.faceShapeEffect === (tag.effectName || tag) }"
                    @click="
                      form.faceShapeEffect = (tag.effectName as string) || tag
                      updateDisplayName()
                    "
                  >
                    {{ tag.effectName || tag }}
                  </span>
                </div>
                <el-button
                  link
                  size="small"
                  type="primary"
                  style="margin-top: 4px"
                  @click="openEffectDict('face_shape')"
                  >📖 查看全部</el-button
                >
              </el-col>
            </el-row>
          </div>

          <!-- 价格行 -->
          <el-row :gutter="16">
            <el-col :span="8" class="w-short"
              ><el-form-item label="统一零售价" prop="retailPrice"
                ><el-input-number v-model="form.retailPrice" :precision="2" :min="0" /></el-form-item
            ></el-col>
            <el-col :span="8" class="w-short"
              ><el-form-item label="成本价"
                ><el-input-number v-model="form.costPrice" :precision="2" :min="0" /></el-form-item
            ></el-col>
            <el-col :span="8" class="w-short"
              ><el-form-item label="最低售价"
                ><el-input-number v-model="form.minPrice" :precision="2" :min="0" /></el-form-item
            ></el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="12" class="w-short"
              ><el-form-item label="库存"><el-input-number v-model="form.stockQuantity" :min="0" /></el-form-item
            ></el-col>
            <el-col :span="12" class="w-short"
              ><el-form-item label="EAN-13"
                ><el-input v-model="form.ean13" maxlength="13" placeholder="自动生成" /></el-form-item
            ></el-col>
          </el-row>

          <el-form-item label="内部条码" class="w-barcode">
            <el-input v-model="form.skuBarcode" readonly />
            <el-button size="small" style="margin-left: 8px" @click="genBarcode">生成</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 技术参数 Tab -->
      <el-tab-pane label="技术参数" name="tech">
        <el-form :model="form" label-width="110px" style="max-height: 500px; overflow-y: auto; padding: 12px 0">
          <el-divider content-position="left">材质配置</el-divider>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="镜框材质">
                <el-select v-model="form.frameMaterial" placeholder="选择材质" filterable clearable>
                  <el-option v-for="m in techDicts.frameMaterials" :key="m.code" :label="m.name" :value="m.code" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="镜腿材质">
                <el-select v-model="form.templeMaterial" placeholder="选择材质" filterable clearable>
                  <el-option label="同镜框" value="__same" />
                  <el-option v-for="m in techDicts.frameMaterials" :key="m.code" :label="m.name" :value="m.code" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="镜框类型">
                <el-select v-model="form.frameType" placeholder="选择类型" filterable clearable>
                  <el-option v-for="t in techDicts.frameTypes" :key="t.code" :label="t.name" :value="t.code" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="表面处理">
                <el-select v-model="form.surfaceTreatment" placeholder="选择处理" filterable clearable>
                  <el-option v-for="s in techDicts.surfaceTreatments" :key="s.code" :label="s.name" :value="s.code" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">尺寸参数 (mm)</el-divider>
          <el-row :gutter="16">
            <el-col :span="8"
              ><el-form-item label="镜片宽度"
                ><el-input :model-value="inheritedLensWidth" disabled />
                <div style="font-size: 11px; color: #909399; line-height: 1.4">继承自结构标准</div></el-form-item
              ></el-col
            >
            <el-col :span="8"
              ><el-form-item label="鼻梁宽度"
                ><el-input :model-value="inheritedBridgeWidth" disabled />
                <div style="font-size: 11px; color: #909399; line-height: 1.4">继承自结构标准</div></el-form-item
              ></el-col
            >
            <el-col :span="8"
              ><el-form-item label="镜腿长度"
                ><el-input-number
                  v-model="form.templeLength"
                  :min="120"
                  :max="160"
                  style="width: 100%"
                  placeholder="填写" /></el-form-item
            ></el-col>
          </el-row>

          <el-divider content-position="left">结构参数</el-divider>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="鼻托类型">
                <el-select v-model="form.nosePadType" placeholder="选择鼻托" filterable clearable>
                  <el-option v-for="n in techDicts.nosePads" :key="n.code" :label="n.name" :value="n.code" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="铰链类型">
                <el-select v-model="form.hingeType" placeholder="选择铰链" filterable clearable>
                  <el-option v-for="h in techDicts.hinges" :key="h.code" :label="h.name" :value="h.code" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="重量">
            <el-input-number v-model="form.weightG" :min="0" :precision="1" style="width: 150px" />
            <span style="margin-left: 8px; color: #909399">g</span>
          </el-form-item>

          <el-divider content-position="left">营销参数</el-divider>
          <el-form-item label="适合脸型">
            <el-checkbox-group v-model="selectedFaceShapes">
              <el-checkbox v-for="f in faceShapeOptions" :key="f.value" :value="f.value">{{ f.label }}</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-divider content-position="left">功能参数</el-divider>
          <el-row :gutter="16">
            <el-col :span="6"
              ><el-form-item label="防蓝光"><el-switch v-model="form.hasBlueLightFilter" /></el-form-item
            ></el-col>
            <el-col :span="6"
              ><el-form-item label="变色"><el-switch v-model="form.hasPhotochromic" /></el-form-item
            ></el-col>
            <el-col :span="6"
              ><el-form-item label="偏光"><el-switch v-model="form.hasPolarized" /></el-form-item
            ></el-col>
            <el-col :span="6">
              <el-form-item label="UV防护">
                <el-select v-model="form.uvProtection">
                  <el-option
                    v-for="opt in uvProtectionOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <!-- 效果词库弹窗 -->
    <el-dialog
      v-model="effectDictVisible"
      :title="dictType === 'skin_tone' ? '🎨 肤色效果词库' : '🎨 脸型效果词库'"
      width="680px"
      append-to-body
    >
      <div class="effect-dict-panel">
        <h4>{{ dictType === 'skin_tone' ? '肤色效果词' : '脸型效果词' }}</h4>
        <div class="effect-dict-grid">
          <div
            v-for="item in dictItems"
            :key="item.effectCode"
            class="effect-dict-item"
            @click="applyEffectFromDict(item)"
          >
            <div class="name">{{ item.effectName || item }}</div>
            <div v-if="item.targetValue" class="target">适用：{{ item.targetValue }}</div>
          </div>
        </div>
      </div>
      <template #footer><el-button @click="effectDictVisible = false">关闭</el-button></template>
    </el-dialog>

    <template #footer>
      <el-button @click="internalVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { createSku, updateSku, getEffectRecommend, getColors } from '@/api/product'
import { generateInternalBarcode, generateTransitionalEAN13 } from '@/utils/barcode'
import type { RuntimeConfig } from '@/api/schema'

const props = defineProps<{
  visible: boolean
  row?: Record<string, unknown> | null
  schemaConfig?: RuntimeConfig | null
  spuList: Record<string, unknown>[]
  tierList: Record<string, unknown>[]
  structureStandards: Record<string, unknown>[]
  skinTags: Array<{ effectCode?: string; effectName?: string; targetValue?: string; [key: string]: unknown }>
  faceTags: Array<{ effectCode?: string; effectName?: string; targetValue?: string; [key: string]: unknown }>
  techDicts: {
    frameMaterials: Record<string, unknown>[]
    frameTypes: Record<string, unknown>[]
    nosePads: Record<string, unknown>[]
    hinges: Record<string, unknown>[]
    surfaceTreatments: Record<string, unknown>[]
  }
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'saved'): void
}>()

const internalVisible = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v),
})
const isEdit = computed(() => !!props.row)
const saving = ref(false)
const activeTab = ref('basic')
const basicFormRef = ref<FormInstance>()

const basicFormRules: FormRules = {
  spuId: [{ required: true, message: '请选择关联 SPU', trigger: 'change' }],
  colorCode: [{ required: true, message: '请选择色彩', trigger: 'change' }],
  retailPrice: [{ required: true, message: '请输入零售价', trigger: 'blur' }],
}

// ===== 色彩列表（从色彩标准库加载） =====
const colorList = ref<Record<string, unknown>[]>([])
const loadColors = async () => {
  try {
    const res = await getColors({})
    if (Array.isArray(res)) {
      colorList.value = res.filter((c: Record<string, unknown>) => c.colorId)
    } else if (res?.items) {
      colorList.value = res.items.filter((c: Record<string, unknown>) => c.colorId)
    }
  } catch (e) {
    console.warn('[SkuDialog] Failed to load colors', e)
  }
}

// Dialog打开时自动加载色彩列表
watch(
  () => props.visible,
  (v) => {
    if (v && !colorList.value.length) loadColors()
  },
)

// 脸型选项（Schema 驱动 + 默认值）
const faceShapeOptions = computed(() => {
  const labels = props.schemaConfig?.faceShapeLabels
  if (labels && Object.keys(labels).length) {
    return Object.entries(labels).map(([value, label]) => ({ value, label }))
  }
  return [
    { label: '圆脸', value: 'round' },
    { label: '椭圆脸', value: 'oval' },
    { label: '方脸', value: 'square' },
    { label: '菱形脸', value: 'diamond' },
    { label: '心形脸', value: 'heart' },
    { label: '长脸', value: 'oblong' },
  ]
})
const uvProtectionOptions = computed(() => {
  return (
    props.schemaConfig?.uvProtectionOptions || [
      { value: 'UV400', label: 'UV400' },
      { value: 'UV380', label: 'UV380' },
      { value: 'None', label: '无' },
    ]
  )
})

// 产品级别（Schema config 降级 + API 降级）
const TIER_DEFAULT_MAP: Record<string, { name: string; color: string }> = {
  color: { name: '色彩级', color: '#4CAF50' },
  style: { name: '风格级', color: '#2196F3' },
  texture: { name: '质感级', color: '#FF9800' },
  'light-luxury': { name: '轻奢级', color: '#E91E63' },
  smart: { name: '智能级', color: '#9C27B0' },
  luxury: { name: '奢华级', color: '#1a1a1a' },
}
const effectiveTierList = computed(() => {
  if (props.tierList?.length) return props.tierList
  const configTiers = props.schemaConfig?.tierLabels
  if (configTiers && Object.keys(configTiers).length) {
    return Object.entries(configTiers).map(([code, info]) => ({
      tier_code: code,
      tier_name: info.name,
      icon_color: info.color,
    }))
  }
  return Object.entries(TIER_DEFAULT_MAP).map(([code, info]) => ({
    tier_code: code,
    tier_name: info.name,
    icon_color: info.color,
  }))
})

// 表单模型
const form = reactive<Record<string, unknown>>({
  skuId: '',
  skuCode: '',
  skuName: '',
  spuId: '',
  spu: null,
  colorCode: '',
  productTier: '',
  structureStandardCode: '',
  skinToneEffect: '',
  faceShapeEffect: '',
  retailPrice: null,
  costPrice: null,
  minPrice: null,
  stockQuantity: null,
  ean13: '',
  skuBarcode: '',
  frameMaterial: '',
  templeMaterial: '',
  frameType: '',
  surfaceTreatment: '',
  templeLength: null,
  nosePadType: '',
  hingeType: '',
  weightG: null,
  suitableFaceShapes: [],
  hasBlueLightFilter: false,
  hasPhotochromic: false,
  hasPolarized: false,
  uvProtection: 'None',
})
const selectedFaceShapes = ref<string[]>([])

// 继承自结构标准的尺寸
const inheritedLensWidth = computed(() => {
  const s = props.structureStandards.find((l) => l.internalCode === form.structureStandardCode)
  return s?.width ?? '-'
})
const inheritedBridgeWidth = computed(() => {
  const s = props.structureStandards.find((l) => l.internalCode === form.structureStandardCode)
  return s?.bridgeWidth ?? '-'
})

// 展示名预览
const displayName = computed(() => {
  if (!form.spuId || !form.colorCode) return ''
  const spu = props.spuList.find((s) => s.spuId === form.spuId)
  if (!spu) return ''
  const struct = props.structureStandards.find(
    (l) => l.internalCode === (form.structureStandardCode || spu.structureStandardCode),
  )
  if (!struct) return ''
  const color = colorList.value.find((c) => c.colorCode === form.colorCode)
  const shapeM: Record<string, string> = props.schemaConfig?.shapeLabels || {}
  const seriesM: Record<string, string> = props.schemaConfig?.seriesLabels || {}
  const genderM: Record<string, string> = props.schemaConfig?.genderOptions
    ? Object.fromEntries(props.schemaConfig.genderOptions.map((o) => [o.value, o.label]))
    : { female: '女款', male: '男款', unisex: '中性', limited: '限量' }
  const shapeCode = struct.shapeCode as string
  const shapeName = shapeM[shapeCode] || shapeCode || ''
  const seriesName = seriesM[spu.seriesCode as string] || ''
  const colorName = (color?.colorName as string) || '未知色'
  const skinEffect = form.skinToneEffect as string
  const faceEffect = form.faceShapeEffect as string
  // V3.0 一维效果：优先脸型 → 肤色 → 兜底
  const effect = faceEffect || skinEffect || '中性百搭'
  const genderLabel = genderM[spu.gender as string] || '中性'
  // V3.0 四段式：{效果} · {色彩} · {造型}{系列}系列 · {款式}
  return `${effect} · ${colorName} · ${shapeName}${seriesName}系列 · ${genderLabel}`
})

// ===== 效果词库弹窗 =====
const effectDictVisible = ref(false)
const dictType = ref<'skin_tone' | 'face_shape'>('skin_tone')
const dictItems = computed(() => {
  const tags = dictType.value === 'skin_tone' ? props.skinTags : props.faceTags
  if (tags?.length) return tags
  const defaults: Record<string, string[]> = {
    skin_tone: [
      '冷白皮提气',
      '黄皮肤增白',
      '中性百搭',
      '暖皮显气质',
      '黄皮肤提亮',
      '暖皮提亮',
      '冷白皮显白',
      '暖皮显白',
      '黄皮肤显白',
      '冷白皮显嫩',
    ],
    face_shape: ['心形脸平衡', '圆脸立体', '菱形脸修饰', '方脸修饰', '长脸缩短', '圆脸显瘦', '方脸柔和', '鹅蛋脸万能'],
  }
  return defaults[dictType.value].map((name) => ({ effectCode: name, effectName: name, targetValue: '通用' }))
})
function openEffectDict(type: 'skin_tone' | 'face_shape') {
  dictType.value = type
  effectDictVisible.value = true
}
function applyEffectFromDict(tag: Record<string, unknown>) {
  const name = (tag.effectName as string) || tag
  if (dictType.value === 'skin_tone') form.skinToneEffect = name as string
  else form.faceShapeEffect = name as string
  effectDictVisible.value = false
}

// ===== 条码工具（使用 @/utils/barcode 共享库） =====
function genBarcode() {
  const spu = props.spuList.find((s) => s.spuId === form.spuId)
  const tier = (form.productTier || spu?.productTier || '') as string
  form.skuBarcode = generateInternalBarcode(
    form.skuCode as string,
    (form.structureStandardCode as string) || '',
    1,
    tier,
  )
  form.ean13 = generateTransitionalEAN13(form.skuCode as string)
}

// ===== 事件处理 =====
function onSpuChange(spuId: string) {
  const spu = props.spuList.find((s: Record<string, unknown>) => s.spuId === spuId)
  if (spu) {
    form.structureStandardCode = spu.structureStandardCode || ''
    form.productTier = form.productTier || spu.productTier || 'color'
    if (!isEdit.value) {
      form.skuCode = ''
    }
  } else {
    form.structureStandardCode = ''
  }
  genBarcode()
}

async function onColorChange(colorCode: string) {
  form.colorCode = colorCode || ''
  if (colorCode && !isEdit.value) {
    try {
      const rec = (await getEffectRecommend(colorCode)) as unknown as Record<string, unknown>
      if (rec) {
        form.skinToneEffect = rec.skinToneEffect || ''
        form.faceShapeEffect = rec.faceShapeEffect || ''
      }
    } catch (e) {
      console.warn('[SkuDialog] getEffectRecommend failed for', colorCode, e)
    }
  }
}

function updateDisplayName() {
  // 展示名为 computed，不需额外操作
}

function resetForm() {
  Object.assign(form, {
    skuId: '',
    skuCode: '',
    skuName: '',
    spuId: '',
    spu: null,
    colorCode: '',
    productTier: '',
    structureStandardCode: '',
    skinToneEffect: '',
    faceShapeEffect: '',
    retailPrice: null,
    costPrice: null,
    minPrice: null,
    stockQuantity: null,
    ean13: '',
    skuBarcode: '',
    frameMaterial: '',
    templeMaterial: '',
    frameType: '',
    surfaceTreatment: '',
    templeLength: null,
    nosePadType: '',
    hingeType: '',
    weightG: null,
    suitableFaceShapes: [],
    hasBlueLightFilter: false,
    hasPhotochromic: false,
    hasPolarized: false,
    uvProtection: 'None',
  })
  selectedFaceShapes.value = []
  activeTab.value = 'basic'
  basicFormRef.value?.resetFields()
}

function copyName() {
  navigator.clipboard?.writeText(displayName.value)
  ElMessage.success('已复制')
}

watch(
  () => props.row,
  (row) => {
    if (row) {
      const data = { ...row }
      if (data.templeMaterial && data.templeMaterial === data.frameMaterial) {
        data.templeMaterial = '__same'
      }
      Object.assign(form, data)
      selectedFaceShapes.value = Array.isArray(row.suitableFaceShapes) ? [...row.suitableFaceShapes] : []
    } else {
      resetForm()
    }
  },
  { immediate: true },
)

async function handleSave() {
  // 先做基本信息表单校验
  const valid = await basicFormRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const dropKeys = [
      'spu',
      'color',
      'primaryImage',
      'skuImages',
      'skuId',
      'skuCode',
      'skuBarcode',
      'ean13',
      'status',
      'isDeleted',
      'createdAt',
      'updatedAt',
      'warningQuantity',
      'spuId',
    ]
    const saveData: Record<string, unknown> = {}
    for (const key of Object.keys(form)) {
      if (!dropKeys.includes(key) && form[key] !== undefined && form[key] !== null) {
        saveData[key] = form[key]
      }
    }
    if (saveData.retailPrice === undefined || saveData.retailPrice === null) {
      saveData.retailPrice = 0
    }
    // 必填字段：从 form 显式注入（不在 dropKeys 排除之列）
    saveData.spuId = form.spuId || undefined
    saveData.colorCode = form.colorCode || undefined
    if (saveData.templeMaterial === '__same') {
      saveData.templeMaterial = saveData.frameMaterial || ''
    }
    saveData.suitableFaceShapes = selectedFaceShapes.value
    if (!saveData.skinToneEffect) delete saveData.skinToneEffect
    if (!saveData.faceShapeEffect) delete saveData.faceShapeEffect
    delete saveData.lensWidth
    delete saveData.bridgeWidth
    delete saveData.totalWidth
    delete saveData.frameHeight
    const isNew = !isEdit.value
    if (isNew) {
      await createSku(saveData)
    } else {
      await updateSku(props.row!.skuId as string, saveData)
    }
    ElMessage.success('保存成功')
    emit('saved')
    internalVisible.value = false
  } catch (e: unknown) {
    const msg = (e as Error)?.message || '保存失败'
    ElMessage.error(msg)
  } finally {
    saving.value = false
    activeTab.value = 'basic'
  }
}

function handleClose() {
  emit('update:visible', false)
  resetForm()
}
</script>

<style scoped>
.sku-tab-scroll {
  max-height: 500px;
  overflow-y: auto;
  padding: 12px 0;
}
.name-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f0f9eb;
  border-radius: 6px;
  margin-bottom: 16px;
}
.name-text {
  font-size: 13px;
  color: #67c23a;
  font-weight: 600;
  flex: 1;
}
.effect-section {
  margin: 16px 0;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #303133;
}
.effect-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.effect-tag {
  display: inline-block;
  padding: 4px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 16px;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
}
.effect-tag:hover {
  border-color: #409eff;
  color: #409eff;
}
.effect-tag.active {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}
.effect-dict-panel h4 {
  margin-bottom: 16px;
  color: #303133;
}
.effect-dict-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
.effect-dict-item {
  padding: 10px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.effect-dict-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}
.effect-dict-item .name {
  font-weight: 600;
  font-size: 14px;
}
.effect-dict-item .target {
  font-size: 11px;
  color: #909399;
  margin-top: 4px;
}
</style>
