/**
 * useProductTechDicts.ts — 技术参数字典加载
 *
 * 加载镜框材质、镜框类型、鼻托、铰链、表面处理等字典数据，
 * 提供 getDictName() 将 code 映射为中文名称。
 */
import { ref, computed } from 'vue';
import {
  getFrameMaterials, getFrameTypes, getNosePads, getHinges, getSurfaceTreatments,
  getSeriesList, getEffectTags, getTierPricings,
} from '@/api/product';
import { getStructureList } from '@/api/structure';
import { TIER_MAP } from '@/composables/product-utils';
import type { ProductTier, StructureStandard, EffectTag } from '@/types';

export function useProductTechDicts() {
  // ===== 技术参数字典 =====
  const frameMaterials = ref<any[]>([]);
  const frameTypes = ref<any[]>([]);
  const nosePads = ref<any[]>([]);
  const hinges = ref<any[]>([]);
  const surfaceTreatments = ref<any[]>([]);
  const seriesList = ref<any[]>([]);
  const effectTags = ref<EffectTag[]>([]);
  const structureStandards = ref<StructureStandard[]>([]);

  const loadTechDicts = async () => {
    try {
      const [fm, ft, np, hi, st, sl, et] = await Promise.all([
        getFrameMaterials(), getFrameTypes(), getNosePads(), getHinges(),
        getSurfaceTreatments(), getSeriesList(), getEffectTags(),
      ]);
      frameMaterials.value = Array.isArray(fm) ? fm : (fm as any).data || [];
      frameTypes.value = Array.isArray(ft) ? ft : (ft as any).data || [];
      nosePads.value = Array.isArray(np) ? np : (np as any).data || [];
      hinges.value = Array.isArray(hi) ? hi : (hi as any).data || [];
      surfaceTreatments.value = Array.isArray(st) ? st : (st as any).data || [];
      seriesList.value = Array.isArray(sl) ? sl : (sl as any).data || [];
      effectTags.value = Array.isArray(et) ? et : (et as any).data || [];
    } catch (e) {
      console.warn('[useProductTechDicts] 加载技术字典失败', e);
    }
  };

  const loadStructureStandards = async () => {
    try {
      const res = await getStructureList();
      const raw = (res as any).data || (res as any).items || res || [];
      structureStandards.value = Array.isArray(raw) ? raw : [];
    } catch (e) {
      console.warn('[useProductTechDicts] 加载结构标准失败', e);
    }
  };

  const loadEffectTagsInner = async () => {
    try {
      const et = await getEffectTags();
      effectTags.value = Array.isArray(et) ? et : (et as any).data || [];
    } catch (e) {
      console.warn('[useProductTechDicts] 加载效果词失败', e);
    }
  };

  // ===== 产品级别字典 =====
  const tierList = ref<ProductTier[]>([]);
  const loadTiers = async () => {
    try {
      const res = await getTierPricings();
      const raw = res.data || res.items || res || [];
      tierList.value = raw.map((t: Record<string, unknown>) => ({
        tier_code: t.tierCode || t.tier_code,
        tier_name: t.tierName || t.tier_name,
        icon_color: TIER_MAP[t.tierCode || t.tier_code]?.color || '#999',
        ...t,
      }));
    } catch (e) {
      console.warn('[useProductTechDicts] 加载级别字典失败', e);
    }
  };

  // ===== 字典中文映射 =====
  const techDictsData = computed(() => ({
    frameMaterials: frameMaterials.value,
    frameTypes: frameTypes.value,
    nosePads: nosePads.value,
    hinges: hinges.value,
    surfaceTreatments: surfaceTreatments.value,
  }));

  function getDictName(dictKey: string, code: string): string {
    if (!code) return '-';
    const dictMap: Record<string, any[]> = {
      frameMaterials: frameMaterials.value,
      frameTypes: frameTypes.value,
      nosePads: nosePads.value,
      hinges: hinges.value,
      surfaceTreatments: surfaceTreatments.value,
    };
    const items = dictMap[dictKey];
    if (!items || !items.length) return code;
    const found = items.find((d: Record<string, unknown>) => d.code === code);
    return found?.name || code;
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
  };
}
