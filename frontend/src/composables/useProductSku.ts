/**
 * useProductSku.ts — SKU 管理
 *
 * SKU CRUD + 搜索 + Dialog 管理
 */
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { getSkus, deleteSku } from '@/api/product';
import type { ProductSku } from '@/types';

export function useProductSku(skuEditRow: ReturnType<typeof ref<ProductSku | null>>) {
  const skuList = ref<ProductSku[]>([]);
  const skuLoading = ref(false);
  const skuSearch = reactive({ keyword: '' });
  const skuDialogVisible = ref(false);

  const loadSkus = async () => {
    skuLoading.value = true;
    try {
      const res = await getSkus({ pageSize: 999, ...skuSearch });
      if (Array.isArray(res)) {
        skuList.value = res;
      } else if (res && typeof res === 'object' && Array.isArray(res.items)) {
        skuList.value = res.items;
      } else {
        skuList.value = [];
      }
    } catch (e: unknown) {
      ElMessage.error(e.message);
    } finally {
      skuLoading.value = false;
    }
  };

  const openSkuDialog = (row?: Record<string, unknown>) => {
    skuEditRow.value = row || null;
    skuDialogVisible.value = true;
  };

  const handleDeleteSku = async (id: string) => {
    try {
      await deleteSku(id);
      ElMessage.success('已删除');
      loadSkus();
    } catch (e: unknown) {
      ElMessage.error(e.message);
    }
  };

  return {
    skuList,
    skuLoading,
    skuSearch,
    skuDialogVisible,
    loadSkus,
    openSkuDialog,
    handleDeleteSku,
  };
}
