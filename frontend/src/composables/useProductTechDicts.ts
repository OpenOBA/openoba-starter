/**
 * useProductTechDicts.ts — 技术参数字典加载
 *
 * 加载镜框材质、镜框类型、鼻托、铰链、表面处理等字典数据，
 * 提供 getDictName() 将 code 映射为中文名称。
 */
import { ref, computed } from 'vue'
import {
  getFrameMaterials,
  getFrameTypes,
  getNosePads,
  getHinges,
  getSurfaceTreatments,
  getSeriesList,
  getEffectTags,
  getTierPricings,
} from '@/api/product'
import { getStructureList } from '@/api/structure'
import { TIER_MAP } from '@/composables/product-utils'
import type { ProductTier } from '@/types'
import type { StructureStandard } from '@/api/structure'
import type { DictItem } from '@/composables/useDict'

export function useProductTechDicts() {
  // ===== 技术参数字典 =====
  const frameMaterials = ref<DictItem[]>([])
  const frameTypes = ref<DictItem[]>([])
  const nosePads = ref<DictItem[]>([])
  const hinges = ref<DictItem[]>([])
  const surfaceTreatments = ref<DictItem[]>([])
  const seriesList = ref<DictItem[]>([])
  const effectTags = ref<DictItem[]>([])
  const structureStandards = ref<StructureStandard[]>([])

  const loadTechDicts = async () => {
    try {
      const [fm, ft, np, hi, st, sl, et] = await Promise.all([
        getFrameMaterials(),
        getFrameTypes(),
        getNosePads(),
        getHinges(),
        getSurfaceTreatments(),
        getSeriesList(),
        getEffectTags('skin_tone'),
      ])
      frameMaterials.value = fm
      frameTypes.value = ft
      nosePads.value = np
      hinges.value = hi
      surfaceTreatments.value = st
      seriesList.value = sl
      effectTags.value = Array.isArray(et) ? et : []
    } catch (e) {
      console.warn('[useProductTechDicts] 加载技术字典失败', e)
    }
  }

  const loadStructureStandards = async () => {
    try {
      const res = await getStructureList({ pageSize: 9999 })
      structureStandards.value = res?.items || []
    } catch (e) {
      console.warn('[useProductTechDicts] 加载结构标准失败', e)
    }
  }

  const loadEffectTagsInner = async () => {
    try {
      const et = await getEffectTags('skin_tone')
      effectTags.value = Array.isArray(et) ? et : []
    } catch (e) {
      console.warn('[useProductTechDicts] 加载效果词失败', e)
    }
  }

  // ===== 产品级别字典 =====
  const tierList = ref<ProductTier[]>([])
  const loadTiers = async () => {
    try {
      const res = await getTierPricings()
      // res is Record<string,unknown>[] — access .data/.items for wrapped responses
      const rawArr =
        (res as unknown as Record<string, unknown>).data || (res as unknown as Record<string, unknown>).items || res
      const list = (Array.isArray(rawArr) ? rawArr : []) as Record<string, unknown>[]
      tierList.value = list.map((t) => ({
        tier_code: String(t.tierCode || t.tier_code || ''),
        tier_name: String(t.tierName || t.tier_name || ''),
        icon_color: TIER_MAP[String(t.tierCode || t.tier_code)]?.color || '#999',
        ...t,
      }))
    } catch (e) {
      console.warn('[useProductTechDicts] 加载级别字典失败', e)
    }
  }

  // ===== 字典中文映射 =====
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

  return {
    frameMaterials,
    frameTypes,
    nosePads,
    hinges,
    surfaceTreatments,
    seriesList,
    effectTags,
    structureStandards,
    tierList,
    techDictsData,
    getDictName,
    loadTechDicts,
    loadStructureStandards,
    loadEffectTags: loadEffectTagsInner,
    loadTiers,
  }
}
