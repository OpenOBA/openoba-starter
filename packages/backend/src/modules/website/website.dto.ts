import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

/**
 * Website æ¨¡å DTO
 * å®ç½åå°ä¸ç¨ååºæ ¼å¼ ï¿½?è½»éãæå¹³ãåç«¯åï¿½? * ä¸èµ° admin TransformInterceptorï¼ç´æ¥è¿ï¿½?data
 */

// ============ éç¨åé¡µ ============
export class PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ============ ååä¿¡æ¯ï¼å®ç½ç²¾ç®çï¼ ============

/**
 * SKU ç²¾ç®ä¿¡æ¯ ï¿½?ç¨äºååå¡ç
 */
export class SkuCardDto {
  skuId: string
  skuCode: string
  skuName: string
  colorCode: string
  colorName: string
  colorHex: string
  price: number
  retailPrice: number
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock'
  availableQuantity: number
  /** 6 ä½ééæ°å­ï¼ç¨äºåç«¯ badge æ¾ç¤º */
  salesVolume: number
  /** ä¸»å¾ URLï¼ç¸å¯¹è·¯å¾ï¼ */
  primaryImage: string | null
}

/**
 * SPU ç²¾ç®ä¿¡æ¯ ï¿½?ç¨äºåååè¡¨/å¡ç
 */
export class SpuCardDto {
  spuId: string
  spuCode: string
  spuName: string
  categoryName: string
  gender: string
  sceneTags: string[]
  description: string
  /** æä½ä»·ï¼æï¿½?SKU ä¸­æä½ç priceï¿½?*/
  minPrice: number
  /** æä½ä¿éï¿½?*/
  minPromoPrice: number | null
  /** æ»ééï¼æï¿½?SKU ééä¹åï¼ */
  totalSales: number
  /** åºå­ç¶æï¼æä¸ä¸ªæè´§å°±ç®æï¿½?*/
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock'
  /** ä¸»å¾ */
  mainImage: string | null
  /** éçæ åéç¹ */
  structureStandardCode: string
  /** å ¼å®¹çº§å«åè¡¨ */
  compatibilityLevels: string[]
  /** å ¼å®¹éæ¡æ°é ï¿½?CTA æé®æ¾ç¤º */
  compatibleFrameCount: number
  /** CTA è·³è½¬è·¯å¾ï¼åç«¯æ¼æ¥ï¼ */
  ctaCompatibleFramesUrl: string
  /** äº§åçº§å« */
  productTier: string
  /** çº§å«ä¸­æåç§° */
  tierName: string
  /** çº§å«å¾½ç« é¢è² */
  tierIconColor: string
  /** SKU ç²¾ç®åè¡¨ï¼ç¨äºé¢è²åæ¢ï¼ */
  skus: SkuCardDto[]
}

/**
 * SPU å®æ´è¯¦æ  ï¿½?ç¨äºååè¯¦æ ï¿½? */
export class SpuDetailDto {
  spuId: string
  spuCode: string
  spuName: string
  categoryName: string
  categoryId: string
  gender: string
  sceneTags: string[]
  description: string
  mainImage: string | null
  images: string[]
  attributes: Record<string, any>
  structureStandardCode: string
  compatibilityLevels: string[]
  /** æä½ä»· */
  minPrice: number
  minPromoPrice: number | null
  totalSales: number
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock'
  /** å®æ´ SKU åè¡¨ */
  skus: SkuDetailDto[]
  /** å ¼å®¹éæ¡æ°éï¼å®ï¿½?CTA çæ ¸å¿æ°æ®ï¼ */
  compatibleFrameCount: number
  /** CTA è·³è½¬è·¯å¾ï¼åç«¯æ¼æ¥ï¼ */
  ctaCompatibleFramesUrl: string
  /** äº§åçº§å« */
  productTier: string
  /** çº§å«ä¸­æåç§° */
  tierName: string
  /** çº§å«å¾½ç« é¢è² */
  tierIconColor: string
  createdAt: Date
}

/**
 * SKU è¯¦ç»ä¿¡æ¯
 */
export class SkuDetailDto {
  skuId: string
  skuCode: string
  skuName: string
  colorCode: string
  colorName: string
  colorHex: string
  colorPreviewImage: string | null
  price: number
  retailPrice: number
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock'
  availableQuantity: number
  salesVolume: number
  skuAttributes: Record<string, any>
  /** å¾çæç±»ååï¿½?*/
  images: Record<string, WebsiteImageDto[]>
  /** Phase 8B: ææ¯åæ°ï¼å±ç¤ºç¨ç²¾ç®ï¿½?+ å®æ´çï¼ */
  displayParams?: {
    sizeLabel: string
    frameMaterial: string
    frameType: string
    nosePad: string
    weight: string
    weightLabel: string
    // â ï¸ 2026-04-24ï¼éæ¡é«åº¦å·²åºå¼ï¼ä¿çä» ç¨äºååå ¼å®¹ï¼åç«¯å·²éèï¼è¿åç©ºå­ç¬¦ä¸²
    suitableFaceShapes: string[]
    surfaceTreatment: string
  }
  fullTechSpec?: {
    lensWidth: number | null
    bridgeWidth: number | null
    templeLength: number | null
    // â ï¸ 2026-04-24ï¼éæ¡é«åº¦å·²åºå¼ï¼ä¿çä» ç¨äºååå ¼å®¹ï¼è¿å null
    totalWidth: number | null
    frameMaterial: { code: string; name: string } | null
    frameType: { code: string; name: string } | null
    nosePad: { code: string; name: string } | null
    hingeType: { code: string; name: string } | null
    weightGrams: number | null
    surfaceTreatment: { code: string; name: string } | null
    suitableFaceShapes: string[]
    hasBlueLightFilter: boolean
    hasPhotochromic: boolean
    hasPolarized: boolean
    uvProtection: string
  }
}

/**
 * å¾ç DTO
 */
export class WebsiteImageDto {
  imageId: string
  imageUrl: string
  imageType: string
  altText: string
  isPrimary: boolean
  sortOrder: number
}

// ============ é¦é¡µèå ============

export class HomeResponseDto {
  /** åç±»å¯¼èª */
  categories: CategoryNodeDto[]
  /** æ¨è/ç²¾éååï¼æå¨æéï¼ */
  featured: SpuCardDto[]
  /** çæ¬¾ï¼æééæåºï¼ */
  bestsellers: SpuCardDto[]
  /** æ°åï¼æåå»ºæ¶é´æåºï¿½?*/
  newArrivals: SpuCardDto[]
  /** åºæ¯æ ç­¾æ±æ»ï¼ç¨äºåºæ¯ç­éå ¥å£ï¼ */
  sceneTags: string[]
  /** CDN åºç¡ URL */
  cdnBaseUrl: string
}

// ============ åç±»å¯¼èª ============

export class CategoryNodeDto {
  categoryId: string
  categoryCode: string
  categoryName: string
  parentId: string | null
  level: number
  sortOrder: number
  /** è¯¥åç±»ä¸çååæ°ï¿½?*/
  productCount: number
  children: CategoryNodeDto[]
}

// ============ å ¼å®¹éæ¡ ============

export class CompatibleFrameDto {
  skuId: string
  skuCode: string
  spuName: string
  categoryName: string
  colorName: string
  colorHex: string
  price: number
  retailPrice: number
  compatibilityLevel: string
  primaryImage: string | null
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock'
}

// ============ å®ç½é ç½® ============

export class WebsiteConfigDto {
  cdnBaseUrl: string
  currency: string
  lowStockThreshold: number
  imageTypes: string[]
}

// ============ æç´¢ ============

export class SearchResultDto {
  products: SpuCardDto[]
  suggestions: string[]
  total: number
}

export class SearchSuggestionDto {
  suggestions: string[]
}
