/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('order_item')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid', { name: 'item_id' })
  itemId: string

  @Column({ comment: '关联订单ID',  name: 'order_id', length: 36 })
  orderId: string

  @Column({ comment: '商品类型(frame/lens/service)',  name: 'product_type', length: 32 })
  productType: string

  @Column({ comment: '商品ID',  name: 'product_id', length: 36 })
  productId: string

  @Column({ comment: '商品名称',  name: 'product_name', length: 256 })
  productName: string

  @Column({ comment: 'sku 编码',  name: 'sku_code', length: 64, nullable: true })
  skuCode?: string

  @Column({ default: 1 })
  quantity: number

  @Column({ comment: '单价',  name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number

  // ===== Phase 9A: 价格快照 =====
  @Column({ comment: 'retail 价格',  name: 'retail_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  retailPrice?: number

  @Column({ comment: '优惠金额',  name: 'discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number

  @Column({ comment: '优惠原因',  name: 'discount_reason', length: 64, nullable: true })
  discountReason?: string

  @Column({ comment: '优惠引用ID',  name: 'discount_ref_id', length: 36, nullable: true })
  discountRefId?: string

  @Column({ comment: '成本单价',  name: 'unit_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitCost?: number

  @Column({ comment: '毛利润',  name: 'gross_profit', type: 'decimal', precision: 10, scale: 2, default: 0 })
  grossProfit: number

  @Column({ comment: '小计',  type: 'decimal', precision: 12, scale: 2 })
  subtotal: number

  @Column({ name: 'structure_standard_code', length: 64, default: '', comment: '结构标准锚点（交易快照）' })
  structureStandardCode: string

  @Column({ comment: '产品层级(color/style)',  name: 'product_tier', length: 20, nullable: true })
  productTier?: string

  // 订单履行类型（裸框是核心，配镜是增值）
  @Column({
    name: 'order_fulfillment_type',
    length: 32,
    default: 'frame_only',
    comment: 'frame_only(裸框)/lens_and_frame(眼镜)/lens_only(单配镜片)',
  })
  orderFulfillmentType: string

  // 镜片加工状态
  @Column({
    name: 'lens_status',
    length: 32,
    default: 'not_needed',
    comment: 'not_needed(不需要)/pending(待处方)/processing(加工中)/completed(已完成)/self_supplied(客户自配)',
  })
  lensStatus: string

  @Column({ comment: '镜框颜色',  name: 'frame_color', length: 64, nullable: true })
  frameColor?: string

  @Column({ comment: '镜框尺寸',  name: 'frame_size', length: 32, nullable: true })
  frameSize?: string

  @Column({ comment: '是否需要处方',  name: 'prescription_required', default: false })
  prescriptionRequired: boolean

  @Column({ name: 'sku_attributes', type: 'json', nullable: true, comment: 'SKU属性快照' })
  skuAttributes?: Record<string, any>

  // 评价状态（商品维度）
  @Column({ name: 'review_status', length: 32, default: 'unreviewed', comment: 'unreviewed/reviewed/overdue' })
  reviewStatus: string

  // 售后状态（商品维度）
  @Column({ name: 'after_sale_status', length: 32, default: 'none', comment: 'none/pending/processing/completed' })
  afterSaleStatus: string

  @Column({ comment: '备注',  type: 'varchar', length: 512, nullable: true })
  remark?: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
