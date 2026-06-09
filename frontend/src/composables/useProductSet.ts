/**
 * useProductSet.ts — 套装管理
 *
 * Set CRUD + SKU 多选 + 折扣逻辑 + 套装编码生成
 */
import { ref, reactive, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { getSets, createSet, updateSet, deleteSet } from '@/api/product';
import type { ProductSet } from '@/types';

export function useProductSet(
  skuListRef: ReturnType<typeof ref<any[]>>
) {
  const setList = ref<ProductSet[]>([]);
  const setLoading = ref(false);
  const setDialogVisible = ref(false);
  const setForm = reactive<any>({
    setId: '', setCode: '', setName: '', setPrice: 0, originalTotalPrice: 0,
    discountRate: 0, retailPrice: 0, status: 'draft', categoryId: '',
    description: '', mainImage: '',
  });
  const selectedSkuIds = ref<string[]>([]);

  // 选中 SKU 行数据
  const selectedSkuRows = computed(() => {
    return skuListRef.value.filter((s: Record<string, unknown>) => selectedSkuIds.value.includes(s.skuId));
  });

  // 所有选中 SKU 的零售价累加（价格锚点）
  const totalRetailPrice = computed(() => {
    return selectedSkuRows.value.reduce((sum: number, s: Record<string, unknown>) => sum + (Number(s.retailPrice) || 0), 0);
  });

  // 折扣率百分比显示
  const discountRatePercent = computed(() => {
    if (setForm.discountRate == null) return '-';
    return (setForm.discountRate * 100).toFixed(0) + '%';
  });

  // 套装编码生成
  function generateSetCode(): string {
    const now = new Date();
    const y = now.getFullYear().toString().slice(-2);
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const seq = Math.floor(Math.random() * 900 + 100);
    return `SET${y}${m}${d}${seq}`;
  }

  // SKU 选择变化：自动设原价，按折扣率算套装价
  const onSkuSelectionChange = () => {
    const retail = totalRetailPrice.value;
    setForm.retailPrice = retail;
    setForm.originalTotalPrice = retail;
    if (retail > 0 && !setForm.setId && setForm.discountRate > 0) {
      setForm.setPrice = parseFloat((retail * setForm.discountRate).toFixed(2));
    } else if (retail > 0 && !setForm.setId) {
      setForm.discountRate = 0.75;
      setForm.setPrice = parseFloat((retail * 0.75).toFixed(2));
    } else if (retail > 0 && setForm.setPrice > 0) {
      setForm.discountRate = parseFloat((setForm.setPrice / retail).toFixed(2));
    } else {
      setForm.setPrice = 0;
      setForm.discountRate = 0;
    }
  };

  // 删除已选 SKU
  const removeSku = (skuId: string) => {
    selectedSkuIds.value = selectedSkuIds.value.filter(id => id !== skuId);
    onSkuSelectionChange();
  };

  // 改折扣率 → 自动算套装价
  const onDiscountRateChange = (val: number | undefined) => {
    const retail = totalRetailPrice.value;
    if (retail > 0 && val && val > 0) {
      setForm.setPrice = parseFloat((retail * val).toFixed(2));
    }
  };

  // 改套装价 → 自动反推折扣率
  const onSetPriceChange = (val: number | undefined) => {
    const retail = totalRetailPrice.value;
    if (retail > 0 && val && val > 0) {
      setForm.discountRate = parseFloat((val / retail).toFixed(2));
    }
  };

  const loadSets = async () => {
    setLoading.value = true;
    try {
      const res = await getSets({});
      setList.value = res.items || res;
    } catch (e: unknown) {
      ElMessage.error(e.message);
    } finally {
      setLoading.value = false;
    }
  };

  const openSetDialog = (row?: Record<string, unknown>) => {
    if (row) {
      setForm.setId = row.setId || '';
      setForm.setCode = row.setCode || '';
      setForm.setName = row.setName || '';
      setForm.setPrice = Number(row.setPrice) || 0;
      setForm.originalTotalPrice = Number(row.originalTotalPrice) || 0;
      setForm.discountRate = Number(row.discountRate) || 0;
      setForm.retailPrice = Number(row.retailPrice) || 0;
      setForm.status = row.status || 'draft';
      setForm.categoryId = row.categoryId || '';
      setForm.description = row.description || '';
      setForm.mainImage = row.mainImage || '';
      selectedSkuIds.value = Array.isArray(row.skuList) ? [...row.skuList] : [];
    } else {
      setForm.setId = '';
      setForm.setCode = generateSetCode();
      setForm.setName = '';
      setForm.setPrice = 0;
      setForm.originalTotalPrice = 0;
      setForm.discountRate = 0;
      setForm.retailPrice = 0;
      setForm.status = 'draft';
      setForm.categoryId = '';
      setForm.description = '';
      setForm.mainImage = '';
      selectedSkuIds.value = [];
    }
    setDialogVisible.value = true;
  };

  const handleSaveSet = async () => {
    const payload: Record<string, unknown> = {
      setName: setForm.setName,
      skuList: selectedSkuIds.value,
      setPrice: setForm.setPrice,
      originalTotalPrice: setForm.originalTotalPrice,
      discountRate: setForm.discountRate,
      retailPrice: setForm.retailPrice,
    };
    if (setForm.categoryId) payload.categoryId = setForm.categoryId;
    if (setForm.description) payload.description = setForm.description;
    if (setForm.mainImage) payload.mainImage = setForm.mainImage;
    if (setForm.status) payload.status = setForm.status;
    if (!setForm.setId && setForm.setCode) payload.setCode = setForm.setCode;
    try {
      if (setForm.setId) await updateSet(setForm.setId, payload);
      else await createSet(payload);
      ElMessage.success('保存成功');
      setDialogVisible.value = false;
      loadSets();
    } catch (e: unknown) {
      ElMessage.error(e.message);
    }
  };

  const handleDeleteSet = async (id: string) => {
    try {
      await deleteSet(id);
      ElMessage.success('已删除');
      loadSets();
    } catch (e: unknown) {
      ElMessage.error(e.message);
    }
  };

  return {
    setList,
    setLoading,
    setDialogVisible,
    setForm,
    selectedSkuIds,
    selectedSkuRows,
    totalRetailPrice,
    discountRatePercent,
    generateSetCode,
    onSkuSelectionChange,
    removeSku,
    onDiscountRateChange,
    onSetPriceChange,
    loadSets,
    openSetDialog,
    handleSaveSet,
    handleDeleteSet,
  };
}
