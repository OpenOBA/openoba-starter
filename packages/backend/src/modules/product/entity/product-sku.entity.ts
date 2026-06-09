import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { ProductSpu } from './product-spu.entity'
import { DictSkuColor } from './dict-spu-color.entity'
import { SKU_STATUS } from '../product.constants'

@Entity('product_sku')
export class ProductSku {
  @PrimaryGeneratedColumn('uuid', { name: 'sku_id' })
  skuId: string

  @Column({ name: 'sku_code', unique: true, length: 128 })
  skuCode: string

  @Column({ name: 'spu_id', length: 32 })
  spuId: string

  @Column({ name: 'sku_name', length: 256, nullable: true })
  skuName?: string

  @Column({ name: 'color_code', length: 64, nullable: false, comment: '⚠️ V3.0 必填：色彩代码' })
  colorCode: string

  // ===== V2.0 命名规范：效果字段 =====
  @Column({ name: 'skin_tone_effect', length: 32, nullable: true, comment: '肤色效果词，如黄皮肤增白' })
  skinToneEffect?: string

  @Column({ name: 'face_shape_effect', length: 32, nullable: true, comment: '脸型效果词，如圆脸显瘦' })
  faceShapeEffect?: string

  @Column({ name: 'display_name', length: 256, nullable: true, comment: '完整展示名(V2.0规范)' })
  displayName?: string

  @Column({ name: 'structure_standard_code', length: 64, comment: '结构标准锚点（SKU级别精确匹配）' })
  structureStandardCode: string

  @Column({ name: 'product_tier', length: 20, nullable: true })
  productTier?: string

  @Column({ name: 'sku_attributes', type: 'json', nullable: true })
  skuAttributes?: Record<string, any>

  @Column({ name: 'cost_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  costPrice?: number

  @Column({ name: 'retail_price', type: 'decimal', precision: 10, scale: 2, comment: '统一零售价（价格锚点）' })
  retailPrice: number

  @Column({ name: 'min_price', type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '最低售价' })
  minPrice?: number

  @Column({ name: 'stock_quantity', default: 0 })
  stockQuantity: number

  // ===== Phase 9A: 价格历史关联（非外键，通过 skuId 查询） =====

  @Column({ name: 'warning_quantity', default: 10 })
  warningQuantity: number

  @Column({ length: 128, nullable: true })
  barcode?: string // 旧字段，逐步废弃

  @Column({ name: 'sku_barcode', length: 64, unique: true, nullable: true })
  skuBarcode?: string // 秒镜内部条码（Code 128），格式: {sku_code}/{lens}/{qty}

  @Column({ name: 'ean13', length: 13, nullable: true })
  ean13?: string // EAN-13 条码（过渡期自编 200-299 前缀）

  /** @see SKU_STATUS (dict_sku_status) */
  @Column({ length: 32, default: 'active' })
  status: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  // ===== Phase 8B: 技术参数 =====
  // 尺寸参数
  @Column({ name: 'structure_width', type: 'int', nullable: true, comment: '结构标准-镜片宽度(mm)' })
  lensWidth?: number

  @Column({ name: 'bridge_width', type: 'int', nullable: true, comment: '鼻梁宽度(mm)' })
  bridgeWidth?: number

  @Column({ name: 'temple_length', type: 'int', nullable: true, comment: '镜腿长度(mm)' })
  templeLength?: number

  // ⚠️ 2026-04-24：镜框高度已废弃。业务评估结论：镜框高度在行业和用户场景中价值低，
  // 不应作为产品技术参数。保留字段仅用于数据库向后兼容，前端已隐藏。
  @Column({ name: 'frame_height', type: 'int', nullable: true, comment: '【已废弃】镜框高度(mm)，2026-04-24 起不再使用' })
  frameHeight?: number

  @Column({ name: 'total_width', type: 'int', nullable: true, comment: '总宽度(mm)' })
  totalWidth?: number

  // 材质参数
  @Column({ name: 'frame_material', length: 32, nullable: true, comment: '镜框材质 code' })
  frameMaterial?: string

  @Column({ name: 'temple_material', length: 32, nullable: true, comment: '镜腿材质 code' })
  templeMaterial?: string

  @Column({ name: 'frame_type', length: 20, nullable: true, comment: '镜框类型 code' })
  frameType?: string

  // 结构参数
  @Column({ name: 'nose_pad_type', length: 32, nullable: true, comment: '鼻托类型 code' })
  nosePadType?: string

  @Column({ name: 'hinge_type', length: 32, nullable: true, comment: '铰链类型 code' })
  hingeType?: string

  // 物理参数
  @Column({ name: 'weight_g', type: 'decimal', precision: 5, scale: 1, nullable: true, comment: '重量(克)' })
  weightG?: number

  // 营销参数
  @Column({ name: 'suitable_face_shapes', type: 'json', nullable: true, comment: '适用脸型' })
  suitableFaceShapes?: string[]

  @Column({ name: 'surface_treatment', length: 32, nullable: true, comment: '表面处理 code' })
  surfaceTreatment?: string

  // 功能参数
  @Column({ name: 'has_blue_light_filter', type: 'tinyint', default: 0, comment: '防蓝光' })
  hasBlueLightFilter: number

  @Column({ name: 'has_photochromic', type: 'tinyint', default: 0, comment: '变色' })
  hasPhotochromic: number

  @Column({ name: 'has_polarized', type: 'tinyint', default: 0, comment: '偏光' })
  hasPolarized: number

  @Column({ name: 'uv_protection', length: 10, default: 'UV400', comment: 'UV防护等级' })
  uvProtection: string

  @Column({ name: 'tech_spec_extra', type: 'json', nullable: true, comment: '扩展技术参数预留' })
  techSpecExtra?: Record<string, any>

  @ManyToOne(() => ProductSpu, (spu) => spu.skus)
  @JoinColumn({ name: 'spu_id' })
  spu: ProductSpu

  @ManyToOne(() => DictSkuColor)
  @JoinColumn({ name: 'color_code' })
  color: DictSkuColor
}
