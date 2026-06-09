/**
 * usePricingTiers.ts — 定价管理（分级/阶梯/协议价）
 *
 * Tier/Wholesale/Agreement CRUD
 */
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getTierPricings, createTierPricing, updateTierPricing, deleteTierPricing,
  getWholesaleTiers, createWholesaleTier, updateWholesaleTier, deleteWholesaleTier,
  getSkus, getPriceHistory,
} from '@/api/product';
import { getCustomerList, getTierPricings as getCustomerPricings, addTierPricing, updateTierPricing as updateCustomerPricing, deleteTierPricing as deleteCustomerPricing } from '@/api/customer';

export function usePricingTiers() {
  // ===== 分级定义 =====
  const tierList = ref<any[]>([]);
  const tierLoading = ref(false);
  const tierDialogVisible = ref(false);
  const tierForm = reactive<any>({ tierId: '', tierCode: '', tierName: '', positioning: '', sortOrder: 0 });

  const loadTiers = async () => {
    tierLoading.value = true;
    try {
      const res = await getTierPricings();
      tierList.value = res.data || res.items || res || [];
    } catch (e: unknown) {
      ElMessage.error('加载分级失败: ' + (e.response?.data?.message || e.message));
    } finally {
      tierLoading.value = false;
    }
  };

  const openTierDialog = (row?: Record<string, unknown>) => {
    if (row) {
      Object.assign(tierForm, { tierId: row.tierId, tierCode: row.tierCode, tierName: row.tierName, positioning: row.positioning || '', sortOrder: row.sortOrder });
    } else {
      Object.assign(tierForm, { tierId: '', tierCode: '', tierName: '', positioning: '', sortOrder: tierList.value.length + 1 });
    }
    tierDialogVisible.value = true;
  };

  const handleSaveTier = async () => {
    try {
      if (tierForm.tierId) {
        await updateTierPricing(tierForm.tierId, { tierName: tierForm.tierName, positioning: tierForm.positioning, sortOrder: tierForm.sortOrder });
        ElMessage.success('更新成功');
      } else {
        tierForm.tierId = `tier-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await createTierPricing({ ...tierForm, isActive: true });
        ElMessage.success('创建成功');
      }
      tierDialogVisible.value = false;
      await loadTiers();
    } catch (e: unknown) {
      ElMessage.error('保存失败: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleDeleteTier = async (id: string) => {
    try {
      await deleteTierPricing(id);
      ElMessage.success('删除成功');
      await loadTiers();
    } catch (e: unknown) {
      ElMessage.error('删除失败: ' + (e.response?.data?.message || e.message));
    }
  };

  // ===== 阶梯定价 =====
  const wholesaleList = ref<any[]>([]);
  const wholesaleLoading = ref(false);
  const wholesaleDialogVisible = ref(false);
  const wholesaleForm = reactive<any>({ tierId: '', tierName: '', minQty: 1, maxQty: 99, discountRate: 1 });

  const loadWholesaleTiers = async () => {
    wholesaleLoading.value = true;
    try {
      const res = await getWholesaleTiers();
      wholesaleList.value = res.data || res.items || res || [];
    } catch (e: unknown) {
      ElMessage.error('加载阶梯定价失败: ' + (e.response?.data?.message || e.message));
    } finally {
      wholesaleLoading.value = false;
    }
  };

  const openWholesaleDialog = (row?: Record<string, unknown>) => {
    if (row) {
      Object.assign(wholesaleForm, { tierId: row.tierId, tierName: row.tierName, minQty: row.minQty, maxQty: row.maxQty, discountRate: row.discountRate });
    } else {
      Object.assign(wholesaleForm, { tierId: '', tierName: '', minQty: 1, maxQty: 99, discountRate: 1 });
    }
    wholesaleDialogVisible.value = true;
  };

  const handleSaveWholesale = async () => {
    try {
      if (wholesaleForm.tierId) {
        await updateWholesaleTier(wholesaleForm.tierId, { tierName: wholesaleForm.tierName, minQty: wholesaleForm.minQty, maxQty: wholesaleForm.maxQty, discountRate: wholesaleForm.discountRate });
        ElMessage.success('更新成功');
      } else {
        await createWholesaleTier(wholesaleForm);
        ElMessage.success('创建成功');
      }
      wholesaleDialogVisible.value = false;
      await loadWholesaleTiers();
    } catch (e: unknown) {
      ElMessage.error('保存失败: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleDeleteWholesale = async (id: string) => {
    try {
      await deleteWholesaleTier(id);
      ElMessage.success('删除成功');
      await loadWholesaleTiers();
    } catch (e: unknown) {
      ElMessage.error('删除失败: ' + (e.response?.data?.message || e.message));
    }
  };

  // ===== 协议价管理 =====
  const agreementList = ref<any[]>([]);
  const agreementLoading = ref(false);
  const agreementDialogVisible = ref(false);
  const agreementForm = reactive<any>({ pricingId: '', customerId: '', customerName: '', tierId: '', fixedPrice: null, discountRate: null, priceMode: 'discount' });
  const agreementCustomers = ref<any[]>([]);
  const agreementSearch = reactive({ keyword: '', page: 1, pageSize: 20 });
  const agreementSearchTotal = ref(0);

  const loadAgreements = async () => {
    agreementLoading.value = true;
    try {
      const res = await getCustomerPricings();
      agreementList.value = res.data || res.items || res || [];
    } catch (e: unknown) {
      ElMessage.error('加载协议价失败: ' + (e.response?.data?.message || e.message));
    } finally {
      agreementLoading.value = false;
    }
  };

  const openAgreementDialog = (row?: Record<string, unknown>) => {
    if (row) {
      Object.assign(agreementForm, { pricingId: row.pricingId, customerId: row.customerId, customerName: row.customerName, tierId: row.tierId, fixedPrice: row.fixedPrice, discountRate: row.discountRate, priceMode: row.priceMode || 'discount' });
    } else {
      Object.assign(agreementForm, { pricingId: '', customerId: '', customerName: '', tierId: '', fixedPrice: null, discountRate: null, priceMode: 'discount' });
    }
    agreementDialogVisible.value = true;
  };

  const handleSaveAgreement = async () => {
    try {
      const payload: Record<string, unknown> = { customerId: agreementForm.customerId, tierId: agreementForm.tierId, priceMode: agreementForm.priceMode };
      if (agreementForm.priceMode === 'fixed') payload.fixedPrice = agreementForm.fixedPrice;
      else payload.discountRate = agreementForm.discountRate;
      if (agreementForm.pricingId) {
        await updateCustomerPricing(agreementForm.pricingId, payload);
        ElMessage.success('更新成功');
      } else {
        await addTierPricing(payload);
        ElMessage.success('创建成功');
      }
      agreementDialogVisible.value = false;
      await loadAgreements();
    } catch (e: unknown) {
      ElMessage.error('保存失败: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleDeleteAgreement = async (id: string) => {
    try {
      await deleteCustomerPricing(id);
      ElMessage.success('删除成功');
      await loadAgreements();
    } catch (e: unknown) {
      ElMessage.error('删除失败: ' + (e.response?.data?.message || e.message));
    }
  };

  const searchAgreementCustomers = async () => {
    try {
      const res = await getCustomerList(agreementSearch);
      agreementCustomers.value = res.items || res.data?.items || [];
      agreementSearchTotal.value = res.total || 0;
    } catch (e: unknown) {
      ElMessage.error('搜索客户失败: ' + (e.response?.data?.message || e.message));
    }
  };

  return {
    tierList, tierLoading, tierDialogVisible, tierForm,
    loadTiers, openTierDialog, handleSaveTier, handleDeleteTier,
    wholesaleList, wholesaleLoading, wholesaleDialogVisible, wholesaleForm,
    loadWholesaleTiers, openWholesaleDialog, handleSaveWholesale, handleDeleteWholesale,
    agreementList, agreementLoading, agreementDialogVisible, agreementForm,
    agreementCustomers, agreementSearch, agreementSearchTotal,
    loadAgreements, openAgreementDialog, handleSaveAgreement, handleDeleteAgreement,
    searchAgreementCustomers,
  };
}
