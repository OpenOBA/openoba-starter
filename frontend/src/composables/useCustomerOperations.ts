import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import {
  addContact, addAddress, updateAddress, deleteAddress,
  addTierPricing, addPrescription, deletePrescription,
  getCustomerLenses, getCustomerLensSummary, addCustomerLens, deleteCustomerLens,
  getContacts, getAddresses,
} from '@/api/customer'
import {
  getWebsiteAccount, getLoginLogs, registerWebsiteAccount,
  resetPassword, toggleAccountStatus, sendLoginCode,
} from '@/api/customer'

/**
 * 瀹㈡埛瀛愬疄浣撴搷浣?composable
 * 璐熻矗锛氳仈绯讳汉 / 鍦板潃 / 闃舵瀹氫环 / 澶勬柟 / 闀滅墖 浠ュ強 瀹樼綉璐︽埛绠＄悊鐨勫脊绐?CRUD
 */
export function useCustomerOperations(
  detail: ReturnType<typeof import('vue').ref<any>>,
  contacts: ReturnType<typeof import('vue').ref<any[]>>,
  addresses: ReturnType<typeof import('vue').ref<any[]>>,
  tierPricings: ReturnType<typeof import('vue').ref<any[]>>,
  prescriptions: ReturnType<typeof import('vue').ref<any[]>>,
  customerLenses: ReturnType<typeof import('vue').ref<any[]>>,
  lensSummary: ReturnType<typeof import('vue').ref<any>>,
) {
  // ===== 鑱旂郴浜?=====
  const contactDialogVisible = ref(false)
  const contactForm = reactive({ contactName: '', role: '', phone: '', email: '', wechat: '', isPrimary: false })
  function openContactDialog() { Object.assign(contactForm, { contactName: '', role: '', phone: '', email: '', wechat: '', isPrimary: false }); contactDialogVisible.value = true }
  async function handleAddContact() {
    await addContact({ ...contactForm, customerId: detail.value.customerId })
    ElMessage.success('鑱旂郴浜哄凡娣诲姞'); contacts.value = await getContacts(detail.value.customerId); contactDialogVisible.value = false
  }

  // ===== 鍦板潃 =====
  const addressDialogVisible = ref(false)
  const isEditAddress = ref(false)
  const editingAddressId = ref('')
  const addressForm = reactive({ addressType: 'shipping', province: '', city: '', district: '', detailAddress: '', receiverName: '', receiverPhone: '', isDefault: false })
  function openAddressDialog() { Object.assign(addressForm, { addressType: 'shipping', province: '', city: '', district: '', detailAddress: '', receiverName: '', receiverPhone: '', isDefault: false }); isEditAddress.value = false; editingAddressId.value = ''; addressDialogVisible.value = true }
  function openEditAddress(row: any) { Object.assign(addressForm, row); isEditAddress.value = true; editingAddressId.value = row.addressId; addressDialogVisible.value = true }
  async function handleSaveAddress() {
    if (isEditAddress.value) { await updateAddress(editingAddressId.value, addressForm); ElMessage.success('鍦板潃宸叉洿鏂?) }
    else { await addAddress({ ...addressForm, customerId: detail.value.customerId }); ElMessage.success('鍦板潃宸叉坊鍔?) }
    addresses.value = await getAddresses(detail.value.customerId); addressDialogVisible.value = false
  }
  async function handleDeleteAddress(id: string) { await deleteAddress(id); ElMessage.success('鍦板潃宸插垹闄?); addresses.value = await getAddresses(detail.value.customerId) }

  // ===== 闃舵瀹氫环 =====
  const tierDialogVisible = ref(false)
  const tierForm = reactive({ tierName: '', minQty: 1, maxQty: 9999, discountRate: 1.0, notes: '' })
  function openTierPricingDialog() { Object.assign(tierForm, { tierName: '', minQty: 1, maxQty: 9999, discountRate: 1.0, notes: '' }); tierDialogVisible.value = true }
  async function handleAddTierPricing() { await addTierPricing({ ...tierForm, customerId: detail.value.customerId }); ElMessage.success('瀹氫环宸叉坊鍔?); tierDialogVisible.value = false }

  // ===== 澶勬柟 =====
  const prescriptionDialogVisible = ref(false)
  const prescriptionForm = reactive<Record<string, any>>({})
  function openPrescriptionDialog() { Object.assign(prescriptionForm, { label: '', odSphere: null, odCylinder: null, odAxis: null, odAdd: null, osSphere: null, osCylinder: null, osAxis: null, osAdd: null, pdValue: null, sourceType: 'manual_upload', prescriptionDate: '', expireDate: '' }); prescriptionDialogVisible.value = true }
  async function handleAddPrescription() { await addPrescription(detail.value.customerId, prescriptionForm); ElMessage.success('澶勬柟宸叉坊鍔?); prescriptions.value = await import('@/api/customer').then(m => m.getPrescriptions(detail.value.customerId)); prescriptionDialogVisible.value = false }
  async function handleDeletePrescription(id: string) { await deletePrescription(id); ElMessage.success('澶勬柟宸插垹闄?); prescriptions.value = await import('@/api/customer').then(m => m.getPrescriptions(detail.value.customerId)) }

  // ===== 闀滅墖 =====
  const lensDialogVisible = ref(false)
  const lensForm = reactive({ customerId: '', lensStandardCode: '', prescriptionId: '', purchaseDate: '', orderId: '' })
  function openLensDialog() { Object.assign(lensForm, { customerId: detail.value.customerId, lensStandardCode: '', prescriptionId: '', purchaseDate: '', orderId: '' }); lensDialogVisible.value = true }
  async function handleAddLens() { await addCustomerLens(lensForm); ElMessage.success('闀滅墖宸叉坊鍔?); customerLenses.value = await getCustomerLenses(detail.value.customerId); try { lensSummary.value = await getCustomerLensSummary(detail.value.customerId) } catch {}; lensDialogVisible.value = false }
  async function handleDeleteLens(id: string) { await deleteCustomerLens(id); ElMessage.success('闀滅墖宸插垹闄?); customerLenses.value = await getCustomerLenses(detail.value.customerId); try { lensSummary.value = await getCustomerLensSummary(detail.value.customerId) } catch {} }

  // ===== 瀹樼綉璐︽埛 =====
  const websiteAccount = ref<any>(null)
  const loginLogs = ref<any[]>([])
  const loginLogsLoading = ref(false)
  const accountLoading = ref(false)

  async function loadWebsiteAccount() { if (!detail.value) return; try { websiteAccount.value = await getWebsiteAccount(detail.value.customerId); if (websiteAccount.value?.accountStatus !== 'none') loadLoginLogs() } catch { websiteAccount.value = null } }
  async function loadLoginLogs() { if (!detail.value) return; loginLogsLoading.value = true; try { const res = await getLoginLogs(detail.value.customerId, 20); loginLogs.value = res.logs || [] } catch { loginLogs.value = [] } finally { loginLogsLoading.value = false } }
  async function handleRegisterAccount() { if (!detail.value) return; accountLoading.value = true; try { await registerWebsiteAccount(detail.value.customerId); ElMessage.success({ message: '瀹樼綉璐︽埛宸插垱寤猴紒', duration: 6000, showClose: true }); await loadWebsiteAccount() } catch (e: unknown) { ElMessage.error((e as any).response?.data?.message || '鍒涘缓澶辫触') } finally { accountLoading.value = false } }
  async function handleResetPassword() { if (!detail.value) return; accountLoading.value = true; try { await resetPassword(detail.value.customerId); ElMessage.success({ message: '瀵嗙爜宸查噸缃?, duration: 6000, showClose: true }) } catch (e: unknown) { ElMessage.error((e as any).response?.data?.message || '閲嶇疆澶辫触') } finally { accountLoading.value = false } }
  async function handleSendLoginCode() { if (!detail.value) return; accountLoading.value = true; try { const res = await sendLoginCode(detail.value.customerId); ElMessage.success(res.message || '楠岃瘉鐮佸凡鍙戦€?) } catch (e: unknown) { ElMessage.error((e as any).response?.data?.message || '鍙戦€佸け璐?) } finally { accountLoading.value = false } }
  async function handleStatusChange(status: string) { if (!detail.value) return; try { const res = await toggleAccountStatus(detail.value.customerId, status); ElMessage.success(res.message); await loadWebsiteAccount() } catch (e: unknown) { ElMessage.error((e as any).response?.data?.message || '鎿嶄綔澶辫触') } }

  return {
    contactDialogVisible, contactForm, openContactDialog, handleAddContact,
    addressDialogVisible, isEditAddress, addressForm, openAddressDialog, openEditAddress, handleSaveAddress, handleDeleteAddress,
    tierDialogVisible, tierForm, openTierPricingDialog, handleAddTierPricing,
    prescriptionDialogVisible, prescriptionForm, openPrescriptionDialog, handleAddPrescription, handleDeletePrescription,
    lensDialogVisible, lensForm, openLensDialog, handleAddLens, handleDeleteLens,
    websiteAccount, loginLogs, loginLogsLoading, accountLoading,
    loadWebsiteAccount, loadLoginLogs, handleRegisterAccount, handleResetPassword, handleSendLoginCode, handleStatusChange,
  }
}
