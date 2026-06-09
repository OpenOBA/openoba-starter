/**
 * useProductSchema.ts — AI-BOS V2.0 Schema 驱动数据
 *
 * 加载 Schema 配置，提供 gender/status/scene/tier 等选项。
 * 返回 activeTierMap 供 getTierName/getTierColor 使用。
 */
import { ref, computed } from 'vue';
import { getSchema, type IndustrySchema } from '@/api/schema';
import { useDict } from '@/composables/useDict';
import { TIER_MAP } from '@/composables/product-utils';

export function useProductSchema() {
  const schemaData = ref<IndustrySchema | null>(null);
  const schemaLoading = ref(false);

  const loadSchema = async () => {
    schemaLoading.value = true;
    try {
      const [fullSchema] = await Promise.all([getSchema('eyewear')]);
      schemaData.value = fullSchema;
      console.log('[AI-BOS] Schema:', fullSchema.industry, 'v' + fullSchema.version);
    } catch (e) {
      console.warn('[AI-BOS] Schema 加载失败', e);
    } finally {
      schemaLoading.value = false;
    }
  };

  const schemaConfig = computed(() => schemaData.value?.config);

  const sceneTagOptions = computed(() =>
    schemaConfig.value?.sceneTags || ['通勤', '职场', '约会', '拍照', '运动', '旅行', '休闲', '派对']
  );

  const genderOptions = computed(() =>
    schemaConfig.value?.genderOptions || [
      { value: 'female', label: '女款' },
      { value: 'male', label: '男款' },
      { value: 'unisex', label: '中性' },
      { value: 'limited', label: '限量' },
    ]
  );

  const statusOptions = computed(() =>
    schemaConfig.value?.statusOptions || [
      { value: 'on_sale', label: '在售' },
      { value: 'draft', label: '草稿' },
      { value: 'off_sale', label: '下架' },
    ]
  );

  const productTypeDict = useDict('dict_product_type');
  const productTypeOptions = computed(() =>
    productTypeDict.items.value.map((d: Record<string, unknown>) => ({ label: d.name, value: d.code }))
  );

  const shapeLabels = computed(() => schemaConfig.value?.shapeLabels || {});
  const seriesLabels = computed(() => schemaConfig.value?.seriesLabels || {});
  const faceShapeLabelsConfig = computed(() => schemaConfig.value?.faceShapeLabels || {});
  const tierLabelsConfig = computed(() => schemaConfig.value?.tierLabels || {});

  /**
   * 激活的级别映射：Schema 优先，fallback 到静态 TIER_MAP
   */
  const activeTierMap = computed(() =>
    tierLabelsConfig.value && Object.keys(tierLabelsConfig.value).length
      ? tierLabelsConfig.value
      : TIER_MAP
  );

  function getTierName(code: string): string {
    return activeTierMap.value[code]?.name || code || '-';
  }

  function getTierColor(code: string): string {
    return activeTierMap.value[code]?.color || '#999';
  }

  return {
    schemaData,
    schemaLoading,
    loadSchema,
    schemaConfig,

    // Options
    sceneTagOptions,
    genderOptions,
    statusOptions,
    productTypeDict,
    productTypeOptions,

    // Labels
    shapeLabels,
    seriesLabels,
    faceShapeLabelsConfig,
    tierLabelsConfig,

    // Tier mapping
    activeTierMap,
    getTierName,
    getTierColor,
  };
}
