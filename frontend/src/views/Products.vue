<template>
  <div class="products-page">
    <el-tabs v-model="activeTab" type="card">
      <!-- SPU -->
      <el-tab-pane label="SPU 管理" name="spu">
        <div class="tab-content">
          <div class="toolbar">
            <el-input
              v-model="spuSearch.keyword"
              placeholder="搜索 SPU 名称/编码"
              clearable
              style="width: 240px"
              @keyup.enter="loadSpus"
            />
            <el-select v-model="spuSearch.gender" placeholder="性别" clearable style="width: 100px">
              <el-option v-for="opt in genderOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
            <el-select v-model="spuSearch.status" placeholder="状态" clearable style="width: 100px">
              <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
            <el-select v-model="spuSearch.productTier" placeholder="级别" clearable style="width: 110px">
              <el-option v-for="t in tierList" :key="t.tier_code" :label="t.tier_name" :value="t.tier_code">
                <span>{{ t.tier_name }}</span>
                <span
                  :style="{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: t.icon_color,
                    marginLeft: '6px',
                  }"
                ></span>
              </el-option>
            </el-select>
            <el-button type="primary" @click="loadSpus">搜索</el-button>
            <el-button type="success" @click="openSpuDialog()">新增 SPU</el-button>
            <el-button type="primary" :disabled="spuSelection.length === 0" @click="batchEditSpus()">编辑</el-button>
            <el-popconfirm
              title="确认批量删除所选SPU？"
              :disabled="spuSelection.length === 0"
              @confirm="batchDeleteSpus"
            >
              <template #reference
                ><el-button type="danger" :disabled="spuSelection.length === 0">删除</el-button></template
              >
            </el-popconfirm>
          </div>
          <el-table
            v-loading="spuLoading"
            :data="spuList"
            stripe
            @selection-change="spuSelection = $event"
            @row-dblclick="openSpuDialog"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column prop="spuCode" label="SPU 编码" width="160" />
            <el-table-column label="级别" width="100">
              <template #default="{ row }">
                <span
                  v-if="row.productTier"
                  :style="{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: getTierColor(row.productTier) + '18',
                    color: getTierColor(row.productTier),
                    fontSize: '12px',
                    fontWeight: '600',
                  }"
                >
                  <span
                    :style="{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: getTierColor(row.productTier),
                    }"
                  ></span>
                  {{ getTierName(row.productTier) }}
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="spuName" label="名称" min-width="180" />
            <el-table-column label="分类" width="120">
              <template #default="{ row }">{{ row.category?.categoryName || '-' }}</template>
            </el-table-column>
            <el-table-column label="性别" width="80">
              <template #default="{ row }">
                <el-tag :type="genderTagTypes[row.gender] || 'info'" size="small">
                  {{ genderLabels[row.gender] || row.gender || '-' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="场景" min-width="140">
              <template #default="{ row }">
                <template v-if="row.scene_tags && row.scene_tags.length">
                  <el-tag v-for="tag in row.scene_tags" :key="tag" size="small" style="margin-right: 4px">{{
                    tag
                  }}</el-tag>
                </template>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag
                  :type="row.status === 'on_sale' ? 'success' : row.status === 'draft' ? 'info' : 'danger'"
                  size="small"
                >
                  {{ statusOptions.find((o) => o.value === row.status)?.label || row.status || '-' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-if="spuTotal > spuPageSize"
            v-model:current-page="spuPage"
            v-model:page-size="spuPageSize"
            style="margin-top: 16px; justify-content: flex-end"
            :page-sizes="[10, 20, 50, 100]"
            :total="spuTotal"
            layout="total, sizes, prev, pager, next"
            @size-change="loadSpus"
            @current-change="loadSpus"
          />
        </div>
      </el-tab-pane>

      <!-- SKU -->
      <el-tab-pane label="SKU 管理" name="sku">
        <div class="tab-content">
          <div class="toolbar">
            <el-input
              v-model="skuSearch.keyword"
              placeholder="搜索 SKU 名称/编码"
              clearable
              style="width: 220px"
              @keyup.enter="loadSkus"
            />
            <el-select
              v-model="skuSearch.spuId"
              placeholder="按 SPU 筛选"
              clearable
              filterable
              style="width: 200px"
              @change="loadSkus"
            >
              <el-option
                v-for="s in spuListAll"
                :key="s.spuId"
                :label="`${s.spuCode} - ${s.spuName}`"
                :value="s.spuId"
              />
            </el-select>
            <el-select
              v-model="skuSearch.skinToneEffect"
              placeholder="肤色效果"
              clearable
              filterable
              style="width: 160px"
              @change="loadSkus"
            >
              <el-option
                v-for="t in skinEffectTags"
                :key="'skin-' + t.effectCode"
                :label="t.effectName"
                :value="t.effectName"
              />
            </el-select>
            <el-select
              v-model="skuSearch.faceShapeEffect"
              placeholder="脸型效果"
              clearable
              filterable
              style="width: 160px"
              @change="loadSkus"
            >
              <el-option
                v-for="t in faceEffectTags"
                :key="'face-' + t.effectCode"
                :label="t.effectName"
                :value="t.effectName"
              />
            </el-select>
            <el-button type="primary" @click="loadSkus">搜索</el-button>
            <el-button type="success" @click="openSkuDialog()">新增 SKU</el-button>
            <el-button type="primary" :disabled="skuSelection.length === 0" @click="batchEditSkus()">编辑</el-button>
            <el-popconfirm
              title="确认批量删除所选SKU？"
              :disabled="skuSelection.length === 0"
              @confirm="batchDeleteSkus"
            >
              <template #reference
                ><el-button type="danger" :disabled="skuSelection.length === 0">删除</el-button></template
              >
            </el-popconfirm>
          </div>
          <el-table
            v-loading="skuLoading"
            :data="skuList"
            stripe
            row-key="skuId"
            @selection-change="skuSelection = $event"
            @row-dblclick="openSkuDialog"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column type="expand">
              <template #default="{ row }">
                <div class="tech-spec-row" style="padding: 12px 24px; background: #fafafa">
                  <table class="tech-table">
                    <tbody>
                      <tr>
                        <td class="tech-label">尺寸标注</td>
                        <td class="tech-value">
                          {{ [row.lensWidth, row.bridgeWidth, row.templeLength].filter((v) => v).join('□') || '-' }}
                        </td>
                        <td class="tech-label">镜框材质</td>
                        <td class="tech-value">{{ getDictName('frameMaterials', row.frameMaterial) }}</td>
                      </tr>
                      <tr>
                        <td class="tech-label">镜框类型</td>
                        <td class="tech-value">{{ getDictName('frameTypes', row.frameType) }}</td>
                        <td class="tech-label">重量</td>
                        <td class="tech-value">{{ row.weightG != null ? row.weightG + 'g' : '-' }}</td>
                      </tr>
                      <tr>
                        <td class="tech-label">鼻托类型</td>
                        <td class="tech-value">{{ getDictName('nosePads', row.nosePadType) }}</td>
                        <td class="tech-label">铰链类型</td>
                        <td class="tech-value">{{ getDictName('hinges', row.hingeType) }}</td>
                      </tr>
                      <tr>
                        <td class="tech-label">镜框高度</td>
                        <td class="tech-value">{{ row.frameHeight != null ? row.frameHeight + 'mm' : '-' }}</td>
                        <td class="tech-label">表面处理</td>
                        <td class="tech-value">{{ getDictName('surfaceTreatments', row.surfaceTreatment) }}</td>
                      </tr>
                      <tr>
                        <td class="tech-label">适合脸型</td>
                        <td class="tech-value">
                          <template v-if="row.suitableFaceShapes && row.suitableFaceShapes.length">
                            <el-tag
                              v-for="f in row.suitableFaceShapes"
                              :key="f"
                              size="small"
                              style="margin-right: 4px"
                              >{{ getFaceShapeLabel(f) }}</el-tag
                            > </template
                          ><span v-else>-</span>
                        </td>
                        <td class="tech-label">功能</td>
                        <td class="tech-value">
                          <span v-if="row.hasBlueLightFilter" style="color: #409eff">防蓝光 </span>
                          <span v-if="row.hasPhotochromic" style="color: #67c23a">变色 </span>
                          <span v-if="row.hasPolarized" style="color: #e6a23c">偏光 </span>
                          <span v-if="row.uvProtection && row.uvProtection !== 'None'">{{ row.uvProtection }}</span>
                          <span
                            v-if="
                              !row.hasBlueLightFilter &&
                              !row.hasPhotochromic &&
                              !row.hasPolarized &&
                              (!row.uvProtection || row.uvProtection === 'None')
                            "
                            >-</span
                          >
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="skuCode" label="SKU 编码" width="170" />
            <el-table-column label="级别" width="100">
              <template #default="{ row }">
                <span
                  v-if="row.productTier || row.spu?.productTier"
                  :style="{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: getTierColor(row.productTier || row.spu?.productTier) + '18',
                    color: getTierColor(row.productTier || row.spu?.productTier),
                    fontSize: '12px',
                    fontWeight: '600',
                  }"
                >
                  <span
                    :style="{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: getTierColor(row.productTier || row.spu?.productTier),
                    }"
                  ></span>
                  {{ getTierName(row.productTier || row.spu?.productTier) }}
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="主图" width="80">
              <template #default="{ row }">
                <el-image
                  v-if="row.primaryImage"
                  :src="row.primaryImage.imageUrl"
                  fit="cover"
                  style="width: 40px; height: 40px; border-radius: 4px"
                />
              </template>
            </el-table-column>
            <el-table-column prop="skuName" label="名称" min-width="120" />
            <el-table-column label="关联 SPU" width="140">
              <template #default="{ row }">{{ row.spu?.spuCode || '-' }}</template>
            </el-table-column>
            <el-table-column prop="skuBarcode" label="内部条码" min-width="200" show-overflow-tooltip />
            <el-table-column prop="ean13" label="EAN-13" width="130" />
            <el-table-column prop="retailPrice" label="统一零售价" width="100" />
            <el-table-column prop="stockQuantity" label="库存" width="80" />
          </el-table>
          <el-pagination
            v-if="skuTotal > skuPageSize"
            v-model:current-page="skuPage"
            v-model:page-size="skuPageSize"
            style="margin-top: 16px; justify-content: flex-end"
            :page-sizes="[10, 20, 50, 100]"
            :total="skuTotal"
            layout="total, sizes, prev, pager, next"
            @size-change="loadSkus"
            @current-change="loadSkus"
          />
        </div>
      </el-tab-pane>

      <!-- SKU 图片 → P1-3c 独立组件 -->
      <el-tab-pane label="SKU 图片" name="sku-image">
        <SkuImagePanel
          :sku-list-for-select="skuListForSelect"
          :sku-select-loading="skuSelectLoading"
          @refresh="loadSkusAll"
        />
      </el-tab-pane>
      <!-- 套装 -->
      <el-tab-pane label="套装管理" name="set">
        <div class="tab-content">
          <div class="toolbar">
            <el-button type="success" @click="openSetDialog()">新增套装</el-button>
            <el-button type="primary" :disabled="setSelection.length === 0" @click="batchEditSets()">编辑</el-button>
            <el-popconfirm
              title="确认批量删除所选套装？"
              :disabled="setSelection.length === 0"
              @confirm="batchDeleteSets"
            >
              <template #reference
                ><el-button type="danger" :disabled="setSelection.length === 0">删除</el-button></template
              >
            </el-popconfirm>
          </div>
          <el-table
            v-loading="setLoading"
            :data="setList"
            stripe
            @selection-change="setSelection = $event"
            @row-dblclick="openSetDialog"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column prop="setCode" label="编码" width="140" />
            <el-table-column prop="setName" label="名称" min-width="180" />
            <el-table-column label="SKU" width="50"
              ><template #default="{ row }">{{ row.skuList ? row.skuList.length : 0 }}</template></el-table-column
            >
            <el-table-column label="统一零售价" width="100"
              ><template #default="{ row }">¥{{ (Number(row.retailPrice) || 0).toFixed(2) }}</template></el-table-column
            >
            <el-table-column label="套装价" width="80"
              ><template #default="{ row }">¥{{ (Number(row.setPrice) || 0).toFixed(2) }}</template></el-table-column
            >
            <el-table-column label="折扣" width="60"
              ><template #default="{ row }">{{
                row.discountRate ? (row.discountRate * 10).toFixed(1) + '折' : '-'
              }}</template></el-table-column
            >
            <el-table-column prop="category?.categoryName" label="品类" width="80" />
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag
                  :type="row.status === 'on_sale' ? 'success' : row.status === 'draft' ? 'info' : 'danger'"
                  size="small"
                >
                  {{ row.status === 'on_sale' ? '在售' : row.status === 'off_sale' ? '下架' : '草稿' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- S-SKU 副品管理 -->
      <el-tab-pane label="S-SKU 副品" name="sub-sku">
        <SubSkuTab />
      </el-tab-pane>
    </el-tabs>

    <!-- SPU Dialog (AI-BOS V2.0) -->
    <SpuDialog
      v-model:visible="spuDialogVisible"
      :row="spuEditRow"
      :schema-config="schemaData?.config || null"
      :tier-list="tierList"
      :structure-standards="structureStandardList"
      :series-list="computedSeriesList"
      :scene-tags="sceneTagOptions"
      :gender-options="genderOptions"
      :status-options="statusOptions"
      :category-list="categoryList"
      @saved="onSpuDialogSaved"
    />

    <!-- SKU Dialog -->
    <!-- SKU Dialog (AI-BOS V2.0) -->
    <SkuDialog
      v-model:visible="skuDialogVisible"
      :row="skuEditRow"
      :schema-config="schemaData?.config || null"
      :spu-list="spuListAll"
      :tier-list="tierList"
      :structure-standards="structureStandardList"
      :skin-tags="skinEffectTags"
      :face-tags="faceEffectTags"
      :tech-dicts="techDictsData"
      @saved="onSkuDialogSaved"
    />

    <!-- Set Dialog -->
    <!-- Set Dialog → P1-3c 独立组件 -->
    <SetDialog
      :visible="setDialogVisible"
      :edit-row="setEditRow"
      :sku-list-for-select="skuListForSelect"
      :category-list="categoryList"
      @close="setDialogVisible = false"
      @saved="loadSets"
    />
    <!-- 批量上传 Dialog -->
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getSpus,
  deleteSpu,
  getSkus,
  deleteSku,
  getTierPricings,
  getSets,
  deleteSet,
  getFrameMaterials,
  getFrameTypes,
  getNosePads,
  getHinges,
  getSurfaceTreatments,
  getSeriesList,
  getEffectTags,
} from '@/api/product'
import { getCategoriesFlat } from '@/api/category'
import { getStructureList } from '@/api/structure'
import { getSchema, type IndustrySchema } from '@/api/schema'
import type { DictItem } from '@/composables/useDict'
import type { StructureStandard } from '@/api/structure'
import SpuDialog from '@/components/SpuDialog.vue'
import SetDialog from '@/components/SetDialog.vue'
import SkuDialog from '@/components/SkuDialog.vue'
import SkuImagePanel from '@/components/SkuImagePanel.vue'
import SubSkuTab from './products/SubSkuTab.vue'

// 产品级别映射
const TIER_MAP: Record<string, { name: string; color: string }> = {
  color: { name: '色彩级', color: '#4CAF50' },
  style: { name: '风格级', color: '#2196F3' },
  texture: { name: '质感级', color: '#FF9800' },
  'light-luxury': { name: '轻奢级', color: '#E91E63' },
  smart: { name: '智能级', color: '#9C27B0' },
  luxury: { name: '奢华级', color: '#1a1a1a' },
}
function getTierName(code: string): string {
  return activeTierMap.value[code]?.name || code || '-'
}
function getTierColor(code: string): string {
  return activeTierMap.value[code]?.color || '#999'
}
// ===== AI-BOS V2.0: Schema 驱动数据 =====
const schemaData = ref<IndustrySchema | null>(null)
const schemaLoading = ref(false)
const loadSchema = async () => {
  try {
    const [fullSchema] = await Promise.all([getSchema('eyewear')])
    schemaData.value = fullSchema
  } catch (e) {
    console.warn('[AI-BOS] Schema 加载失败', e)
  } finally {
    schemaLoading.value = false
  }
}
const schemaConfig = computed(() => schemaData.value?.config)
const sceneTagOptions = computed(
  () => schemaConfig.value?.sceneTags || ['通勤', '职场', '约会', '拍照', '运动', '旅行', '休闲', '派对'],
)
const genderOptions = computed(
  () =>
    schemaConfig.value?.genderOptions || [
      { value: 'female', label: '女款' },
      { value: 'male', label: '男款' },
      { value: 'unisex', label: '中性' },
      { value: 'limited', label: '限量' },
    ],
)
const statusOptions = computed(
  () =>
    schemaConfig.value?.statusOptions || [
      { value: 'on_sale', label: '在售' },
      { value: 'draft', label: '草稿' },
      { value: 'off_sale', label: '下架' },
    ],
)
const tierLabelsConfig = computed(() => schemaConfig.value?.tierLabels || {})

const genderTagTypes: Record<string, string> = { female: 'danger', male: 'primary', unisex: 'info', limited: 'warning' }
const genderLabels: Record<string, string> = { female: '女款', male: '男款', unisex: '通用', limited: '限量' }

const spuEditRow = ref<Record<string, unknown> | null>(null)
const skuEditRow = ref<Record<string, unknown> | null>(null)
function onSpuDialogSaved() {
  loadSpus()
  loadSpusAll()
  spuEditRow.value = null
}
function onSkuDialogSaved() {
  loadSkus()
  skuEditRow.value = null
}
const techDictsData = computed(() => ({
  frameMaterials: frameMaterials.value,
  frameTypes: frameTypes.value,
  nosePads: nosePads.value,
  hinges: hinges.value,
  surfaceTreatments: surfaceTreatments.value,
}))
const activeTierMap = computed(() =>
  tierLabelsConfig.value && Object.keys(tierLabelsConfig.value).length ? tierLabelsConfig.value : TIER_MAP,
)

// ===== 字典中文映射 =====
function getDictName(dictKey: string, code: string): string {
  if (!code) return '-'
  const dictMap: Record<string, DictItem[]> = {
    frameMaterials: frameMaterials.value,
    frameTypes: frameTypes.value,
    nosePads: nosePads.value,
    hinges: hinges.value,
    surfaceTreatments: surfaceTreatments.value,
  }
  const items = dictMap[dictKey]
  if (!items || !items.length) return code
  const found = items.find((d) => d.code === code)
  return found?.name || code
}

function getFaceShapeLabel(code: string): string {
  if (!code) return '-'
  const map: Record<string, string> = {
    round: '圆脸',
    oval: '椭圆脸',
    square: '方脸',
    diamond: '菱形脸',
    heart: '心形脸',
    oblong: '长脸',
  }
  return map[code] || code
}

const activeTab = ref('spu')

// ===== 产品级别字典 =====
interface TierItem {
  tier_code: string
  tier_name: string
  icon_color: string
  [key: string]: unknown
}
const tierList = ref<TierItem[]>([])
const loadTiers = async () => {
  try {
    const res = await getTierPricings()
    tierList.value = res.map((t) => ({
      tier_code: String(t.tierCode || t.tier_code),
      tier_name: String(t.tierName || t.tier_name),
      icon_color: TIER_MAP[String(t.tierCode || t.tier_code)]?.color || '#999',
      ...t,
    }))
  } catch (e: unknown) {
    console.warn('Failed to load tiers', e)
  }
}

// ===== Phase 8B: 技术参数字典 =====
const frameMaterials = ref<DictItem[]>([])
const frameTypes = ref<DictItem[]>([])
const nosePads = ref<DictItem[]>([])
const hinges = ref<DictItem[]>([])
const surfaceTreatments = ref<DictItem[]>([])
const seriesList = ref<DictItem[]>([])
const computedSeriesList = computed(() => seriesList.value.map((s) => ({ code: s.code, name: s.name })))

const skinToneEffects = ref<DictItem[]>([])
const faceShapeEffects = ref<DictItem[]>([])
const skinEffectTags = computed(() => skinToneEffects.value)
const faceEffectTags = computed(() => faceShapeEffects.value)
const loadEffectTags = async () => {
  try {
    const [skin, face] = await Promise.all([getEffectTags('skin_tone'), getEffectTags('face_shape')])
    skinToneEffects.value = Array.isArray(skin) ? skin : []
    faceShapeEffects.value = Array.isArray(face) ? face : []
  } catch {
    /* ignore */
  }
}

const loadTechDicts = async () => {
  try {
    const [fm, ft, np, hg, st, sl] = await Promise.all([
      getFrameMaterials(),
      getFrameTypes(),
      getNosePads(),
      getHinges(),
      getSurfaceTreatments(),
      getSeriesList(),
    ])
    seriesList.value = sl
    frameMaterials.value = fm
    frameTypes.value = ft
    nosePads.value = np
    hinges.value = hg
    surfaceTreatments.value = st
  } catch (e: unknown) {
    console.warn('Failed to load tech dicts', e)
  }
}

// ===== SPU =====
const spuList = ref<Record<string, unknown>[]>([])
const spuSelection = ref<Record<string, unknown>[]>([])
const setSelection = ref<Record<string, unknown>[]>([])
const spuListAll = ref<Record<string, unknown>[]>([]) // 全量 SPU 列表（下拉框用，不分页）
const spuLoading = ref(false)
const spuPage = ref(1)
const spuPageSize = ref(20)
const spuTotal = ref(0)
const spuSearch = reactive({ keyword: '', gender: '', status: '', productTier: '' })
const spuDialogVisible = ref(false)

const loadSpus = async () => {
  spuLoading.value = true
  try {
    const res = await getSpus({ page: spuPage.value, pageSize: spuPageSize.value, ...spuSearch })
    if (Array.isArray(res)) {
      spuList.value = res
      spuTotal.value = res.length
    } else if (res && typeof res === 'object' && Array.isArray(res.items)) {
      spuList.value = res.items.map((i) => ({ ...i }))
      spuTotal.value = res.total || res.items.length
    } else {
      spuList.value = []
      spuTotal.value = 0
    }
  } catch (e: unknown) {
    ElMessage.error((e as Error)?.message || '加载失败')
  } finally {
    spuLoading.value = false
  }
}
// 全量加载 SPU（下拉框用，不传分页参数）
const loadSpusAll = async () => {
  try {
    const res = await getSpus({ pageSize: 9999 })
    spuListAll.value = Array.isArray(res) ? res : (res as unknown as { items?: Record<string, unknown>[] })?.items || []
  } catch {
    /* ignore */
  }
}
const openSpuDialog = (row?: Record<string, unknown>) => {
  spuEditRow.value = row || null
  spuDialogVisible.value = true
}
const batchEditSpus = () => {
  if (spuSelection.value.length === 1) openSpuDialog(spuSelection.value[0])
  else if (spuSelection.value.length > 1) ElMessage.warning('暂仅支持单条编辑')
}
const batchDeleteSpus = async () => {
  try {
    for (const r of spuSelection.value) await deleteSpu(r.spuId as string)
    ElMessage.success(spuSelection.value.length + ' 条已删除')
    spuSelection.value = []
    loadSpus()
  } catch {
    ElMessage.error('删除失败')
  }
}

// ===== SKU =====
const skuList = ref<Record<string, unknown>[]>([])
const skuSelection = ref<Record<string, unknown>[]>([])
const skuLoading = ref(false)
const skuPage = ref(1)
const skuPageSize = ref(20)
const skuTotal = ref(0)
const skuSearch = reactive({ keyword: '', spuId: '', skinToneEffect: '', faceShapeEffect: '' })
const skuDialogVisible = ref(false) // suitableFaceShapes 用独立 ref（避免 reactive 嵌套数组响应式断裂）

const loadSkus = async () => {
  skuLoading.value = true
  try {
    const cleanSearch = Object.fromEntries(
      Object.entries(skuSearch).filter(([_, v]) => v !== undefined && v !== null && v !== ''),
    )
    const res = await getSkus({ page: skuPage.value, pageSize: skuPageSize.value, ...cleanSearch })
    if (Array.isArray(res)) {
      skuList.value = res
      skuTotal.value = res.length
    } else if (res && typeof res === 'object' && Array.isArray(res.items)) {
      skuList.value = res.items.map((i) => ({ ...i }))
      skuTotal.value = res.total || res.items.length
    } else {
      skuList.value = []
      skuTotal.value = 0
    }
  } catch (e: unknown) {
    ElMessage.error((e as Error)?.message || '加载失败')
  } finally {
    skuLoading.value = false
  }
}
const openSkuDialog = (row?: Record<string, unknown>) => {
  skuEditRow.value = row || null
  skuDialogVisible.value = true
}
const batchEditSkus = () => {
  if (skuSelection.value.length === 1) openSkuDialog(skuSelection.value[0])
  else if (skuSelection.value.length > 1) ElMessage.warning('暂仅支持单条编辑')
}
const batchDeleteSkus = async () => {
  try {
    for (const r of skuSelection.value) await deleteSku(r.skuId as string)
    ElMessage.success(skuSelection.value.length + ' 条已删除')
    skuSelection.value = []
    loadSkus()
  } catch {
    ElMessage.error('删除失败')
  }
}

// ===== 结构标准 =====
const structureStandardList = ref<StructureStandard[]>([])
const loadStructureStandards = async () => {
  try {
    const res = await getStructureList({ page: 1, pageSize: 500 })
    // request.ts 拦截器已经解包
    if (Array.isArray(res)) {
      structureStandardList.value = res
    } else if (res && typeof res === 'object' && Array.isArray(res.items)) {
      structureStandardList.value = res.items
    } else {
      structureStandardList.value = []
    }
  } catch {
    /* ignore */
  }
}

// ===== Category (供 SPU/SKU/Set 表单下拉选择) =====
const categoryList = ref<Record<string, unknown>[]>([])
const loadCategoryList = async () => {
  try {
    categoryList.value = await getCategoriesFlat()
  } catch {
    categoryList.value = []
  }
}

// ===== Set (P1-3c: 弹窗逻辑已迁移至 SetDialog.vue) =====
const setList = ref<Record<string, unknown>[]>([])
const setLoading = ref(false)
const setDialogVisible = ref(false)
const setEditRow = ref<Record<string, unknown> | null>(null)

const loadSets = async () => {
  setLoading.value = true
  try {
    const res = await getSets({})
    setList.value = Array.isArray(res.items) ? res.items : []
  } catch {
    setList.value = []
  } finally {
    setLoading.value = false
  }
}

const openSetDialog = (row?: Record<string, unknown>) => {
  setEditRow.value = row || null
  setDialogVisible.value = true
}

const batchEditSets = () => {
  if (setSelection.value.length === 1) openSetDialog(setSelection.value[0])
  else ElMessage.warning('请只勾选一个套装进行编辑')
}
const batchDeleteSets = async () => {
  try {
    for (const r of setSelection.value) await deleteSet(r.setId as string)
    ElMessage.success('已删除')
    setSelection.value = []
    loadSets()
  } catch (e: unknown) {
    ElMessage.error((e as Error)?.message || '批量删除失败')
  }
}

// ===== SKU 列表（供 SkuImagePanel + SetDialog 使用）=====
const skuListForSelect = ref<Record<string, unknown>[]>([])
const skuSelectLoading = ref(false)

// 全量加载 SKU（套装多选/图片下拉框用）
const loadSkusAll = async () => {
  try {
    const res = await getSkus({ pageSize: 9999 })
    skuListForSelect.value = Array.isArray(res)
      ? res
      : (res as unknown as { items?: Record<string, unknown>[] })?.items || []
  } catch {
    /* ignore */
  }
}

const TAB_LOADERS: Record<string, (() => void)[]> = {
  spu: [loadSpus, loadSpusAll],
  sku: [loadSkus, loadSpusAll],
  set: [loadSets],
  'sku-image': [loadSkusAll],
}

// 首次只加载全局基础字典（所有 Tab 共用），具体数据按需加载
onMounted(() => {
  loadSchema()
  loadTiers()
  loadTechDicts()
  loadStructureStandards()
  loadEffectTags()
  loadCategoryList()
  // 全量加载 SPU/SKU 列表（下拉框/多选用，不分页）
  loadSpusAll()
  loadSkusAll()
  // 默认激活 spu tab，加载其数据
  loadSpus()
})

// Tab 切换时只刷新当前 Tab 的数据
watch(activeTab, (tab) => {
  const loaders = TAB_LOADERS[tab]
  if (loaders) {
    loaders.forEach((fn) => fn())
  }
})
</script>

<style scoped>
.products-page {
  padding: 16px;
}
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  align-items: center;
}
.tab-content {
  min-height: 300px;
}

/* 图片类型筛选 */
.image-type-tabs {
  margin-bottom: 12px;
}

/* 保存排序栏 */
.save-order-bar {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 批量上传提示 */
.batch-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}

/* 上传预览 */
.upload-preview {
  text-align: center;
  padding: 8px;
}
.upload-placeholder {
  text-align: center;
  padding: 20px;
}

/* 批量文件列表 */
.batch-file-list {
  margin-top: 12px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}
.batch-file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
}
.batch-file-item:last-child {
  border-bottom: none;
}

/* 输入框宽度修复 */
.el-dialog .el-input,
.el-dialog .el-select,
.el-dialog .el-date-editor {
  width: 100% !important;
}
.el-dialog .el-input-number {
  width: 100% !important;
}

/* 已选 SKU 列表明细 */
.selected-sku-section {
  margin: 0 0 16px 110px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  max-width: 590px;
}
.selected-sku-header {
  background: #f5f7fa;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  border-bottom: 1px solid #e8e8e8;
}
.selected-sku-list {
  max-height: 180px;
  overflow-y: auto;
}
.selected-sku-item {
  display: flex;
  align-items: center;
  padding: 6px 14px;
  font-size: 13px;
  border-bottom: 1px solid #f0f0f0;
}
.selected-sku-item:last-child {
  border-bottom: none;
}
.sku-code {
  width: 120px;
  color: #303133;
  font-family: monospace;
}
.sku-name {
  flex: 1;
  color: #606266;
  margin: 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sku-retail {
  color: #e6a23c;
  font-weight: 700;
  width: 80px;
  text-align: right;
}
.selected-sku-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: #fff7e6;
  font-size: 14px;
  color: #606266;
  font-weight: 600;
}
.total-price {
  font-size: 18px;
  font-weight: 700;
  color: #e6a23c;
}

/* 条码输入框宽度适配 */
.w-barcode :deep(.el-input) {
  max-width: 520px;
}

/* SKU 展开行技术规格表 */
.tech-table {
  width: 100%;
  border-collapse: collapse;
}
.tech-table td {
  padding: 6px 8px;
  border: 1px solid #ebeef5;
  font-size: 13px;
}
.tech-table .tech-label {
  background: #f5f7fa;
  font-weight: 600;
  color: #606266;
  width: 90px;
  padding-left: 28px;
  white-space: nowrap;
}
.tech-table .tech-value {
  min-width: 140px;
  color: #303133;
}

/* 图片预览全屏层 */
.fullscreen-preview {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}
.fullscreen-preview img {
  max-width: 95vw;
  max-height: 95vh;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.5);
  cursor: default;
  transition: transform 0.15s ease;
}
.preview-toolbar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  z-index: 10001;
}
.preview-zoom {
  color: #fff;
  font-size: 13px;
  min-width: 48px;
  text-align: center;
}
</style>
