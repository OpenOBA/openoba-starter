import request from './request'

// ── 通用 CRUD 类型 ──
type CreateUpdateData = Record<string, unknown>

export interface Customer {
  customerId: string
  customerType: string
  customerLevel: string
  companyName: string | null
  contactName: string
  phone: string
  email: string | null
  wechat: string | null
  address: string | null
  city: string | null
  province: string | null
  status: string
  notes: string | null
  totalOrders: number
  totalAmount: number
  lastOrderAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Contact {
  contactId: string
  customerId: string
  contactName: string
  role: string
  phone: string
  email: string | null
  wechat: string | null
  isPrimary: boolean
  createdAt: string
}

export interface Address {
  addressId: string
  customerId: string
  addressType: string
  province: string | null
  city: string | null
  district: string | null
  detailAddress: string
  receiverName: string
  receiverPhone: string
  isDefault: boolean
  createdAt: string
}

export interface TierPricing {
  pricingId: string
  customerId: string
  tierName: string
  minQty: number
  maxQty: number | null
  discountRate: number
  notes: string | null
  createdAt: string
}

// ===== Customer CRUD =====
// 过滤空字符串，避免后端 @IsEnum 验证失败
const cleanParams = (p: Record<string, unknown>) => {
  const cleaned: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(p)) {
    if (v !== '' && v !== null && v !== undefined) cleaned[k] = v
  }
  return cleaned
}

export const getCustomerList = (params: {
  page?: number
  pageSize?: number
  keyword?: string
  customerType?: string
  customerLevel?: string
  status?: string
}): Promise<{ items: Customer[]; total: number; page: number; pageSize: number }> =>
  request.get('/customers', { params: cleanParams(params) })

export const getCustomerDetail = (id: string): Promise<Record<string, unknown>> =>
  request.get(`/customers/${id}`) as Promise<Record<string, unknown>>

export const createCustomer = (data: CreateUpdateData): Promise<Record<string, unknown>> =>
  request.post('/customers', data) as Promise<Record<string, unknown>>

export const updateCustomer = (id: string, data: CreateUpdateData): Promise<Record<string, unknown>> =>
  request.put(`/customers/${id}`, data) as Promise<Record<string, unknown>>

export const deleteCustomer = (id: string) => request.delete(`/customers/${id}`)

// ===== Contacts =====
export const getContacts = (customerId: string): Promise<Record<string, unknown>[]> =>
  request.get(`/customers/${customerId}/contacts`) as Promise<Record<string, unknown>[]>

export const addContact = (data: CreateUpdateData) => request.post<Contact>('/customers/contacts', data)

export const updateContact = (id: string, data: CreateUpdateData) =>
  request.put<Contact>(`/customers/contacts/${id}`, data)

export const deleteContact = (id: string) => request.delete(`/customers/contacts/${id}`)

// ===== Addresses =====
export const getAddresses = (customerId: string): Promise<Record<string, unknown>[]> =>
  request.get(`/customers/${customerId}/addresses`) as Promise<Record<string, unknown>[]>

export const addAddress = (data: CreateUpdateData) => request.post<Address>('/customers/addresses', data)

export const updateAddress = (id: string, data: CreateUpdateData) =>
  request.put<Address>(`/customers/addresses/${id}`, data)

export const deleteAddress = (id: string) => request.delete(`/customers/addresses/${id}`)

// ===== Tier Pricings =====
export const getTierPricings = (customerId?: string): Promise<Record<string, unknown>[]> =>
  request.get(`/customers/${customerId}/pricings`) as Promise<Record<string, unknown>[]>

export const addTierPricing = (data: CreateUpdateData) => request.post<TierPricing>('/customers/pricings', data)

export const updateTierPricing = (id: string, data: CreateUpdateData) =>
  request.put<TierPricing>(`/customers/pricings/${id}`, data)

export const deleteTierPricing = (id: string) => request.delete(`/customers/pricings/${id}`)

// ===== 处方 =====
export const getPrescriptions = (customerId: string): Promise<Record<string, unknown>[]> =>
  request.get<Record<string, unknown>[]>(`/customers/${customerId}/prescriptions`)

export const addPrescription = (data: CreateUpdateData) =>
  request.post<Record<string, unknown>>('/customers/prescriptions', data)

export const deletePrescription = (id: string) => request.delete(`/customers/prescriptions/${id}`)

// ===== 客户镜片 =====
export const getCustomerLenses = (customerId: string): Promise<Record<string, unknown>[]> =>
  request.get<Record<string, unknown>[]>(`/customers/${customerId}/lenses`)

export const getCustomerLensSummary = (customerId: string): Promise<{ lenses: Array<Record<string, unknown>> }> =>
  request.get(`/customers/${customerId}/lens-summary`)

export const addCustomerLens = (data: CreateUpdateData) =>
  request.post<Record<string, unknown>>('/customers/lenses', data)

export const deleteCustomerLens = (id: string) => request.delete(`/customers/lenses/${id}`)

// ===== 客户镜框 =====
export const getCustomerFrames = (lensId: string): Promise<Record<string, unknown>[]> =>
  request.get<Record<string, unknown>[]>(`/customers/lenses/${lensId}/frames`)

export const addCustomerFrame = (data: CreateUpdateData) =>
  request.post<Record<string, unknown>>('/customers/frames', data)

export const deleteCustomerFrame = (id: string) => request.delete(`/customers/frames/${id}`)

// ===== TASK-010: 会员管理 =====
export const getMemberLevels = () => request.get<Record<string, unknown>[]>('/pricing/members/levels')

export const createMemberLevel = (data: Record<string, unknown>) => request.post('/pricing/members/levels', data)

export const updateMemberLevel = (levelCode: string, data: Record<string, unknown>) =>
  request.put(`/pricing/members/levels/${levelCode}`, data)

export const deleteMemberLevel = (levelCode: string) => request.delete(`/pricing/members/levels/${levelCode}`)

export const getMemberPricingRules = (params?: Record<string, string>) =>
  request.get<Record<string, unknown>[]>('/pricing/members/rules', { params })

export const createMemberPricingRule = (data: Record<string, unknown>) => request.post('/pricing/members/rules', data)

export const updateMemberPricingRule = (ruleId: string, data: Record<string, unknown>) =>
  request.put(`/pricing/members/rules/${ruleId}`, data)

export const deleteMemberPricingRule = (ruleId: string) => request.delete(`/pricing/members/rules/${ruleId}`)

export const scanMemberDowngrades = () => request.post<Record<string, unknown>>('/pricing/members/downgrade-scan')

// ===== 会员仪表盘 =====
export const getMemberDashboard = () => request.get<Record<string, unknown>>('/customers/member-dashboard')

export const getMemberAnalytics = (params?: Record<string, string | number>) =>
  request.get<Record<string, unknown>>('/customers/member-analytics', { params })

export const scanMemberDowngradesNew = () => request.post<Record<string, unknown>>('/customers/member-downgrade-scan')

// ===== P1+ 客户管理重构 =====
export const getMemberLevelLogs = (customerId: string): Promise<Record<string, unknown>[]> =>
  request.get<Record<string, unknown>[]>(`/customers/${customerId}/member-level-logs`)

export const getPointsTransactions = (customerId: string): Promise<Record<string, unknown>[]> =>
  request.get<Record<string, unknown>[]>(`/customers/${customerId}/points-transactions`)

export const getAccountInfo = (customerId: string): Promise<Record<string, unknown>> =>
  request.get<Record<string, unknown>>(`/customers/${customerId}/account-info`)

// ===== 客户订单列表（复用 order API） =====
export const getCustomerOrders = (customerId: string, page = 1, pageSize = 20): Promise<Record<string, unknown>> =>
  request.get<Record<string, unknown>>(`/orders`, { params: { customerId, page, pageSize } })

// ===== 官网账户管理（管理端 API） =====

export interface WebsiteAccount {
  customerId: string
  customerCode: string
  contactName: string
  phone: string
  email: string | null
  nickname: string | null
  avatarUrl: string | null
  accountStatus: string
  hasPassword: boolean
  registeredAt: string | null
  lastLoginAt: string | null
  totalOrders: number
  totalAmount: number
  lastOrderAt: string | null
  memberDiscountRate: number
  pointsBalance: number
  subscriptionStatus: string
  memberSince: string | null
  memberValidUntil: string | null
}

export interface LoginLog {
  logId: string
  loginMethod: string
  loginResult: string
  ipAddress: string | null
  userAgent: string | null
  deviceId: string | null
  failReason: string | null
  createdAt: string
}

export const getWebsiteAccount = (customerId: string): Promise<Record<string, unknown>> =>
  request.get(`/customer-auth-admin/${customerId}`) as Promise<Record<string, unknown>>

export const getLoginLogs = (
  customerId: string,
  limit = 20,
): Promise<{ total: number; logs: Record<string, unknown>[] }> =>
  request.get(`/customer-auth-admin/${customerId}/login-logs`, { params: { limit } }) as Promise<{
    total: number
    logs: Record<string, unknown>[]
  }>

export const registerWebsiteAccount = (customerId: string): Promise<{ message: string }> =>
  request.post<{ message: string; phone: string; initialPassword: string }>(
    `/customer-auth-admin/${customerId}/register`,
  )

export const resetPassword = (customerId: string): Promise<{ message: string }> =>
  request.post<{ message: string; newPin: string }>(`/customer-auth-admin/${customerId}/reset-password`)

export const toggleAccountStatus = (customerId: string, status: string): Promise<{ message: string; status: string }> =>
  request.post<{ message: string; status: string }>(`/customer-auth-admin/${customerId}/toggle-status`, { status })

export const sendLoginCode = (customerId: string): Promise<{ message: string }> =>
  request.post<{ message: string }>(`/customer-auth-admin/${customerId}/send-login-code`)
