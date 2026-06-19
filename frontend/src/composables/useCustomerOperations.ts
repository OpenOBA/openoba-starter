import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import {
  addContact, addAddress, updateAddress, deleteAddress,
  addTierPricing, addPrescription, deletePrescription, getPrescriptions,
  getCustomerLenses, getCustomerLensSummary, addCustomerLens, deleteCustomerLens,
  getContacts, getAddresses,
} from '@/api/customer'
import {
  getWebsiteAccount, getLoginLogs, registerWebsiteAccount,
  resetPassword, toggleAccountStatus, sendLoginCode,
} from '@/api/customer'

/**
 * 客户子实体操作 composable
 * 负责：联系人 / 地址 / 阶梯定价 / 处方 / 镜片 以及 官网账户管理的弹窗 CRUD
 */
export function useCustomerOperations(
  detail: ReturnType<typeof import('vue').ref<any>>,
  contacts: ReturnType<typeof import('vue').ref<any[]>>,
  addresses: ReturnType<typeof import('vue').ref<any[]>>,
  _tierPricings: ReturnType<typeof import('vue').ref<any[]>>,
  prescriptions: ReturnType<typeof import('vue').ref<any[]>>,
  customerLenses: ReturnType<typeof import('vue').ref<any[]>>,
  lensSummary: ReturnType<typeof import('vue').ref<any>>,
) {
  // ===== 联系人 =====
  const contactDialogVisible = ref(false)
  const contactForm = reactive({ contactName: '', role: '', phone: '', email: '', wechat: '', isPrimary: false })
  function openContactDialog() { Object.assign(contactForm, { contactName: '', role: '', phone: '', email: '', wechat: '', isPrimary: false }); contactDialogVisible.value = true }
  async function handleAddContact() {
    await addContact({ ...contactForm, customerId: detail.value.customerId })
    ElMessage.success('联系人已添加'); contacts.value = await getContacts(detail.value.customerId); contactDialogVisible.value = false
  }

  // ===== 地址 =====
  const addressDialogVisible = ref(false)
  const isEditAddress = ref(false)
  const editingAddressId = ref('')
  const addressForm = reactive({ addressType: 'shipping', province: '', city: '', district: '', detailAddress: '', receiverName: '', receiverPhone: '', isDefault: false })
  function openAddressDialog() { Object.assign(addressForm, { addressType: 'shipping', province: '', city: '', district: '', detailAddress: '', receiverName: '', receiverPhone: '', isDefault: false }); isEditAddress.value = false; editingAddressId.value = ''; addressDialogVisible.value = true }
  function openEditAddress(row: any) { Object.assign(addressForm, row); isEditAddress.value = true; editingAddressId.value = row.addressId; addressDialogVisible.value = true }
  async function handleSaveAddress() {
    if (isEditAddress.value) { await updateAddress(editingAddressId.value, addressForm); ElMessage.success('地址已更新') }
    else { await addAddress({ ...addressForm, customerId: detail.value.customerId }); ElMessage.success('地址已添加') }
    addresses.value = await getAddresses(detail.value.customerId); addressDialogVisible.value = false
  }
  async function handleDeleteAddress(id: string) { await deleteAddress(id); ElMessage.success('地址已删除'); addresses.value = await getAddresses(detail.value.customerId) }

  // ===== 阶梯定价 =====
  const tierDialogVisible = ref(false)
  const tierForm = reactive({ tierName: '', minQty: 1, maxQty: 9999, discountRate: 1.0, notes: '' })
  function openTierPricingDialog() { Object.assign(tierForm, { tierName: '', minQty: 1, maxQty: 9999, discountRate: 1.0, notes: '' }); tierDialogVisible.value = true }
  async function handleAddTierPricing() { await addTierPricing({ ...tierForm, customerId: detail.value.customerId }); ElMessage.success('定价已添加'); tierDialogVisible.value = false }

  // ===== 处方 =====
  const prescriptionDialogVisible = ref(false)
  const prescriptionForm = reactive<Record<string, any>>({})
  function openPrescriptionDialog() { Object.assign(prescriptionForm, { label: '', odSphere: null, odCylinder: null, odAxis: null, odAdd: null, osSphere: null, osCylinder: null, osAxis: null, osAdd: null, pdValue: null, sourceType: 'manual_upload', prescriptionDate: '', expireDate: '' }); prescriptionDialogVisible.value = true }
  async function handleAddPrescription() { await addPrescription({ ...prescriptionForm, customerId: detail.value.customerId }); ElMessage.success('处方已添加'); prescriptions.value = await getPrescriptions(detail.value.customerId); prescriptionDialogVisible.value = false }
  async function handleDeletePrescription(id: string) { await deletePrescription(id); ElMessage.success('处方已删除'); prescriptions.value = await getPrescriptions(detail.value.customerId) }

  // ===== 镜片 =====
  const lensDialogVisible = ref(false)
  const lensForm = reactive({ customerId: '', lensStandardCode: '', prescriptionId: '', purchaseDate: '', orderId: '' })
  function openLensDialog() { Object.assign(lensForm, { customerId: detail.value.customerId, lensStandardCode: '', prescriptionId: '', purchaseDate: '', orderId: '' }); lensDialogVisible.value = true }
  async function handleAddLens() { await addCustomerLens(lensForm); ElMessage.success('镜片已添加'); customerLenses.value = await getCustomerLenses(detail.value.customerId); try { lensSummary.value = await getCustomerLensSummary(detail.value.customerId) } catch {}; lensDialogVisible.value = false }
  async function handleDeleteLens(id: string) { await deleteCustomerLens(id); ElMessage.success('镜片已删除'); customerLenses.value = await getCustomerLenses(detail.value.customerId); try { lensSummary.value = await getCustomerLensSummary(detail.value.customerId) } catch {} }

  // ===== 官网账户 =====
  const websiteAccount = ref<any>(null)
  const loginLogs = ref<any[]>([])
  const loginLogsLoading = ref(false)
  const accountLoading = ref(false)

  async function loadWebsiteAccount() { if (!detail.value) return; try { websiteAccount.value = await getWebsiteAccount(detail.value.customerId); if (websiteAccount.value?.accountStatus !== 'none') loadLoginLogs() } catch { websiteAccount.value = null } }
  async function loadLoginLogs() { if (!detail.value) return; loginLogsLoading.value = true; try { const res = await getLoginLogs(detail.value.customerId, 20); loginLogs.value = res.logs || [] } catch { loginLogs.value = [] } finally { loginLogsLoading.value = false } }
  async function handleRegisterAccount() { if (!detail.value) return; accountLoading.value = true; try { await registerWebsiteAccount(detail.value.customerId); ElMessage.success({ message: '官网账户已创建！', duration: 6000, showClose: true }); await loadWebsiteAccount() } catch (e: unknown) { const err = e instanceof Error ? e.message : String(e); ElMessage.error(err || '创建失败') } finally { accountLoading.value = false } }
  async function handleResetPassword() { if (!detail.value) return; accountLoading.value = true; try { await resetPassword(detail.value.customerId); ElMessage.success({ message: '密码已重置', duration: 6000, showClose: true }) } catch (e: unknown) { const err = e instanceof Error ? e.message : String(e); ElMessage.error(err || '重置失败') } finally { accountLoading.value = false } }
  async function handleSendLoginCode() { if (!detail.value) return; accountLoading.value = true; try { const res = await sendLoginCode(detail.value.customerId); ElMessage.success(res.message || '验证码已发送') } catch (e: unknown) { const err = e instanceof Error ? e.message : String(e); ElMessage.error(err || '发送失败') } finally { accountLoading.value = false } }
  async function handleStatusChange(status: string) { if (!detail.value) return; try { const res = await toggleAccountStatus(detail.value.customerId, status); ElMessage.success(res.message); await loadWebsiteAccount() } catch (e: unknown) { const err = e instanceof Error ? e.message : String(e); ElMessage.error(err || '操作失败') } }

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
