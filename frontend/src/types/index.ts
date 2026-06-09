// ============================================================
// 秒镜 ERP - 前端共享业务类型定义
// AI-BOS V2.0
// ============================================================

// ---- 通用 ----
export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface DictItem {
  code: string
  name: string
  sort_order: number
  is_active: number
  [key: string]: unknown
}

// ---- 结构标准 ----
export interface StructureStandard {
  structureId: string
  internalCode: string
  externalCode?: string
  shapeCode: string
  shapeName?: string
  seriesCode: string
  seriesName?: string
  materialCode: string
}

// ---- 商品分类 ----
export interface ProductCategory {
  categoryId: string
  categoryCode: string
  categoryName: string
  categoryType?: string
  parentId?: string
  level: number
  sortOrder: number
  isActive: boolean
  icon?: string
  description?: string
  isRecommended?: number
  children?: ProductCategory[]
}

// ---- SPU ----
export interface ProductSpu {
  spuId: string
  spuCode: string
  spuName: string
  categoryId?: string
  category?: ProductCategory
  productTier?: string
  seriesCode?: string
  gender: string
  sceneTags: string[]
  description?: string
  status: string
  structureStandardCode?: string
}

// ---- SKU ----
export interface ProductSku {
  skuId: string
  skuCode: string
  skuName?: string
  spuId: string
  spu?: ProductSpu
  colorCode: string
  color?: SkuColor
  productTier?: string
  structureStandardCode?: string
  price?: number
  retailPrice?: number
  skuBarcode?: string
  status: string
  primaryImage?: SkuImage
  // Tech params
  frameMaterial?: string
  frameType?: string
  nosePadType?: string
  hingeType?: string
  surfaceTreatment?: string
  lensWidth?: number
  bridgeWidth?: number
  templeLength?: number
  frameHeight?: number
  weightG?: number
  suitableFaceShapes?: string[]
  hasBlueLightFilter?: boolean
  hasPhotochromic?: boolean
  hasPolarized?: boolean
  uvProtection?: string
}

export interface SkuColor {
  colorId: string
  colorCode: string
  colorName: string
  colorNameEn?: string
  hexValue?: string
  pinyinName?: string
  pinyinInitial?: string
  pantoneRef?: string
  colorFamily?: string
  trendScore?: number
}

// ---- 技术参数字典 ----
export interface TechDictItem {
  code: string
  name: string
}

export interface TechDicts {
  frameMaterials: TechDictItem[]
  frameTypes: TechDictItem[]
  nosePads: TechDictItem[]
  hinges: TechDictItem[]
  surfaceTreatments: TechDictItem[]
}

// ---- 套装 ----
export interface ProductSet {
  setId: string
  setCode: string
  setName: string
  skuList: string[]
  setPrice: number
  originalTotalPrice?: number
  discountRate?: number
  retailPrice?: number
  status: string
  description?: string
  categoryId?: string
  category?: ProductCategory
  mainImage?: string
}

// ---- 产品级别 ----
export interface ProductTier {
  tier_code: string
  tier_name: string
  icon_color: string
}

// ---- 效果词 ----
export interface EffectTag {
  code: string
  name: string
  type: string
}

// ---- SKU 图片 ----
export interface SkuImage {
  imageId: string
  skuId: string
  imageUrl: string
  imageType: string
  sortOrder: number
  isPrimary: boolean
  isActive: boolean
  altText?: string
  width?: number
  height?: number
}

// ---- 订单 ----
export interface Order {
  orderId: string
  orderCode: string
  customerId: string
  customerName?: string
  status: string
  totalAmount: number
  discountAmount?: number
  shippingFee?: number
  items: OrderItem[]
  createdAt: string
  updatedAt?: string
}

export interface OrderItem {
  itemId: string
  orderId: string
  skuId: string
  skuCode: string
  skuName?: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface OrderPayment {
  paymentId: string
  orderId: string
  amount: number
  paymentMethod: string
  status: string
  paidAt?: string
}

export interface OrderShipment {
  shipmentId: string
  orderId: string
  trackingNo?: string
  carrier?: string
  status: string
  shippedAt?: string
}

// ---- 颜色标准库 ----
// 材质-色彩映射

export interface ColorMapping {
  mappingId: string
  materialCode: string
  colorCode: string
  feasibility: string
  craftProcess?: string
  notes?: string
}

export interface ColorPalette {
  paletteId: string
  paletteName: string
  season: string
  theme?: string
  status: string
  items?: PaletteItem[]
}

export interface PaletteItem {
  itemId: string
  paletteId: string
  colorCode: string
  roleInPalette: string
  sortOrder: number
}

export interface ColorProject {
  projectId: string
  projectName: string
  projectCode?: string
  status: string
  priority: string
  targetSeason?: string
}

// ---- 客户 ----

export interface Customer {
  customerId: string
  customerCode: string
  customerType: string
  customerLevel: string
  contactName: string
  phone: string
  email?: string
  status: string
  totalAmount?: number
  createdAt: string
}

// ---- 定价 ----

export interface ProductTierPricing {
  tierId: string
  tierCode: string
  tierName: string
  price?: number
  iconColor?: string
}

export interface Promotion {
  promotionId: string
  name: string
  type: string
  status: string
  startDate?: string
  endDate?: string
  discountRate?: number
}
