/**
 * usePricingPromotions.ts — 促销管理
 *
 * Promotions CRUD + 状态切换
 */
import { ref, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  getPromotions, createPromotion, updatePromotion, deletePromotion, updatePromotionStatus,
} from '@/api/product';

export function usePricingPromotions() {
  const promoList = ref<Record<string, unknown>[]>([]);
  const promoLoading = ref(false);
  const promoDialogVisible = ref(false);
  const promoForm = reactive<Record<string, unknown>>({
    promotionId: '', promotionCode: '', promotionName: '',
    promotionType: 'percent', discountValue: null, scope: 'all', skuIds: [],
    startTime: '', endTime: '', status: 'draft', description: '', totalLimit: null,
  });
  const promoItemSkus = ref<Record<string, unknown>[]>([]);

  const loadPromotions = async () => {
    promoLoading.value = true;
    try {
      const res = await getPromotions();
      promoList.value = res || [];
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      ElMessage.error('加载促销失败: ' + err);
    } finally {
      promoLoading.value = false;
    }
  };

  const openPromoDialog = (row?: Record<string, unknown>) => {
    if (row) {
      Object.assign(promoForm, {
        promotionId: row.promotionId, promotionCode: row.promotionCode, promotionName: row.promotionName,
        promotionType: row.promotionType, discountValue: row.discountValue, scope: row.scope,
        skuIds: row.skuIds || [], startTime: row.startTime, endTime: row.endTime,
        status: row.status, description: row.description || '', totalLimit: row.totalLimit || null,
      });
    } else {
      Object.assign(promoForm, {
        promotionId: '', promotionCode: `PROMO-${Date.now()}`, promotionName: '',
        promotionType: 'percent', discountValue: null, scope: 'all', skuIds: [],
        startTime: '', endTime: '', status: 'draft', description: '', totalLimit: null,
      });
    }
    promoDialogVisible.value = true;
  };

  const handleSavePromo = async () => {
    try {
      const payload = { ...promoForm };
      delete payload.promotionId;
      if (promoForm.promotionId) {
        await updatePromotion(promoForm.promotionId as string, payload);
        ElMessage.success('更新成功');
      } else {
        await createPromotion(payload);
        ElMessage.success('创建成功');
      }
      promoDialogVisible.value = false;
      await loadPromotions();
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      ElMessage.error('保存失败: ' + err);
    }
  };

  const handleDeletePromo = async (id: string) => {
    try {
      await ElMessageBox.confirm('确认删除此促销？', '确认');
      await deletePromotion(id);
      ElMessage.success('删除成功');
      await loadPromotions();
    } catch (e: unknown) {
      if (e !== 'cancel') {
        const err = e instanceof Error ? e.message : String(e);
        ElMessage.error('删除失败: ' + err);
      }
    }
  };

  const handleUpdatePromoStatus = async (id: string, status: string) => {
    try {
      await updatePromotionStatus(id, status);
      ElMessage.success('状态已更新');
      await loadPromotions();
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      ElMessage.error('更新状态失败: ' + err);
    }
  };

  return {
    promoList, promoLoading, promoDialogVisible, promoForm, promoItemSkus,
    loadPromotions, openPromoDialog, handleSavePromo, handleDeletePromo, handleUpdatePromoStatus,
  };
}
