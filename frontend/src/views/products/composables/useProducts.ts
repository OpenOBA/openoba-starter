// useProducts.ts — data fetching + state management for Products.vue
import { ref, reactive, computed, watch } from 'vue'
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
import type { StructureStandard } from '@/api/structure'
import type { PaginatedData } from '@/api/api-types'
import type { DictItem } from '@/composables/useDict'

// 产品级别映射
const TIER_MAP: Record<string, { name: string; color: string }> = {
  color: { name: '色彩级', color: '#4CAF50' },
  style: { name: '风格级', color: '#2196F3' },
  texture: { name: '质感级', color: '#FF9800' },
  'light-luxury': { name: '轻奢级', color: '#E91E63' },
  smart: { name: '智能级', color: '#9C27B0' },
  luxury: { name: '奢华级', color: '#1a1a1a' },
}

export function useProducts() {
  // Schema
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
  // V1.5.1: seasonTags from Schema (Schema-driven rendering)
  const seasonTagOptions = computed(
    () => schemaConfig.value?.seasonTags || ['春季', '夏季', '秋季', '冬季', '四季通用'],
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

  const genderTagTypes: Record<string, string> = {
    female: 'danger',
    male: 'primary',
    unisex: 'info',
    limited: 'warning',
  }
  const genderLabels: Record<string, string> = { female: '女款', male: '男款', unisex: '通用', limited: '限量' }

  const activeTierMap = computed(() =>
    tierLabelsConfig.value && Object.keys(tierLabelsConfig.value).length ? tierLabelsConfig.value : TIER_MAP,
  )

  function getTierName(code: string): string {
    return activeTierMap.value[code]?.name || code || '-'
  }
  function getTierColor(code: string): string {
    return activeTierMap.value[code]?.color || '#999'
  }

  // Tech dicts
  const frameMaterials = ref<DictItem[]>([])
  const frameTypes = ref<DictItem[]>([])
  const nosePads = ref<DictItem[]>([])
  const hinges = ref<DictItem[]>([])
  const surfaceTreatments = ref<DictItem[]>([])
  const seriesList = ref<DictItem[]>([])
  const computedSeriesList = computed(() => seriesList.value.map((s) => ({ code: s.code, name: s.name })))

  const techDictsData = computed(() => ({
    frameMaterials: frameMaterials.value,
    frameTypes: frameTypes.value,
    nosePads: nosePads.value,
    hinges: hinges.value,
    surfaceTreatments: surfaceTreatments.value,
  }))

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
    const found = items.find((d: Record<string, unknown>) => d.code === code)
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

  // Effect tags
  const skinToneEffects = ref<DictItem[]>([])
  const faceShapeEffects = ref<DictItem[]>([])
  const skinEffectTags = computed(() => skinToneEffects.value)
  const faceEffectTags = computed(() => faceShapeEffects.value)

  const loadEffectTags = async () => {
    try {
      const [skin, face] = await Promise.all([getEffectTags('skin_tone'), getEffectTags('face_shape')])
      skinToneEffects.value = Array.isArray(skin) ? skin : []
      faceShapeEffects.value = Array.isArray(face) ? face : []
    } catch (e) {
      /* ignore */
    }
  }

  // Tiers
  const tierList = ref<Record<string, unknown>[]>([])
  const loadTiers = async () => {
    try {
      const raw = await getTierPricings()
      tierList.value = raw.map((t) => ({
        tier_code: t.tierCode || t.tier_code,
        tier_name: t.tierName || t.tier_name,
        icon_color: TIER_MAP[String(t.tierCode || t.tier_code)]?.color || '#999',
        ...t,
      }))
    } catch (e: unknown) {
      console.warn('Failed to load tiers', e)
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

  // Structure standards
  const structureStandardList = ref<StructureStandard[]>([])
  const loadStructureStandards = async () => {
    try {
      const res = await getStructureList({ page: 1, pageSize: 500 })
      structureStandardList.value = res.items
    } catch {
      /* ignore */
    }
  }

  // Category
  const categoryList = ref<Record<string, unknown>[]>([])
  const loadCategoryList = async () => {
    try {
      categoryList.value = await getCategoriesFlat()
    } catch {
      categoryList.value = []
    }
  }

  // SPU
  const spuList = ref<Record<string, unknown>[]>([])
  const spuSelection = ref<Record<string, unknown>[]>([])
  const spuListAll = ref<Record<string, unknown>[]>([])
  const spuLoading = ref(false)
  const spuPage = ref(1)
  const spuPageSize = ref(20)
  const spuTotal = ref(0)
  const spuSearch = reactive({ keyword: '', gender: '', status: '', productTier: '' })
  const spuDialogVisible = ref(false)
  const spuEditRow = ref<Record<string, unknown> | null>(null)

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
      const errMsg = (e as Error)?.message || '加载失败'
      ElMessage.error(errMsg)
    } finally {
      spuLoading.value = false
    }
  }

  const loadSpusAll = async () => {
    try {
      const res = await getSpus({ pageSize: 9999 })
      spuListAll.value = Array.isArray(res)
        ? res
        : (res as unknown as PaginatedData<Record<string, unknown>>)?.items || []
    } catch {
      /* ignore */
    }
  }

  const openSpuDialog = (row?: Record<string, unknown>) => {
    spuEditRow.value = row || null
    spuDialogVisible.value = true
  }

  const onSpuDialogSaved = () => {
    loadSpus()
    loadSpusAll()
    spuEditRow.value = null
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

  // SKU
  const skuList = ref<Record<string, unknown>[]>([])
  const skuSelection = ref<Record<string, unknown>[]>([])
  const skuLoading = ref(false)
  const skuPage = ref(1)
  const skuPageSize = ref(20)
  const skuTotal = ref(0)
  const skuSearch = reactive({ keyword: '', spuId: '', skinToneEffect: '', faceShapeEffect: '' })
  const skuDialogVisible = ref(false)
  const skuEditRow = ref<Record<string, unknown> | null>(null)

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

  const onSkuDialogSaved = () => {
    loadSkus()
    skuEditRow.value = null
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

  // Sets
  const setSelection = ref<Record<string, unknown>[]>([])
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

  // SKU list for select (used by SkuImagePanel + SetDialog)
  const skuListForSelect = ref<Record<string, unknown>[]>([])
  const skuSelectLoading = ref(false)

  const loadSkusAll = async () => {
    try {
      const res = await getSkus({ pageSize: 9999 })
      skuListForSelect.value = Array.isArray(res)
        ? res
        : (res as unknown as PaginatedData<Record<string, unknown>>)?.items || []
    } catch {
      /* ignore */
    }
  }

  // Active tab
  const activeTab = ref('spu')

  const TAB_LOADERS: Record<string, (() => void)[]> = {
    spu: [loadSpus, loadSpusAll],
    sku: [loadSkus, loadSpusAll],
    set: [loadSets],
    'sku-image': [loadSkusAll],
  }

  // Initialize
  const init = () => {
    loadSchema()
    loadTiers()
    loadTechDicts()
    loadStructureStandards()
    loadEffectTags()
    loadCategoryList()
    loadSpusAll()
    loadSkusAll()
    loadSpus()
  }

  // Tab change
  watch(activeTab, (tab) => {
    const loaders = TAB_LOADERS[tab]
    if (loaders) {
      loaders.forEach((fn) => fn())
    }
  })

  return {
    // Schema & options
    schemaData,
    sceneTagOptions,
    seasonTagOptions,
    genderOptions,
    statusOptions,
    tierList,
    genderTagTypes,
    genderLabels,
    getTierName,
    getTierColor,
    getDictName,
    getFaceShapeLabel,
    // Tech dicts
    frameMaterials,
    frameTypes,
    nosePads,
    hinges,
    surfaceTreatments,
    seriesList,
    computedSeriesList,
    techDictsData,
    skinEffectTags,
    faceEffectTags,
    // SPU
    spuList,
    spuSelection,
    spuListAll,
    spuLoading,
    spuPage,
    spuPageSize,
    spuTotal,
    spuSearch,
    spuDialogVisible,
    spuEditRow,
    loadSpus,
    loadSpusAll,
    openSpuDialog,
    onSpuDialogSaved,
    batchEditSpus,
    batchDeleteSpus,
    // SKU
    skuList,
    skuSelection,
    skuLoading,
    skuPage,
    skuPageSize,
    skuTotal,
    skuSearch,
    skuDialogVisible,
    skuEditRow,
    loadSkus,
    openSkuDialog,
    onSkuDialogSaved,
    batchEditSkus,
    batchDeleteSkus,
    // Sets
    setSelection,
    setList,
    setLoading,
    setDialogVisible,
    setEditRow,
    loadSets,
    openSetDialog,
    batchEditSets,
    batchDeleteSets,
    // SKU for select
    skuListForSelect,
    skuSelectLoading,
    loadSkusAll,
    // Structure & Category
    structureStandardList,
    categoryList,
    // Tab
    activeTab,
    // Init
    init,
  }
}
