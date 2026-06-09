import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { ProductCategory } from './product-category.entity'
import { PRODUCT_STATUS } from '../product.constants'

@Entity('product_set')
export class ProductSet {
  @PrimaryGeneratedColumn('uuid', { name: 'set_id' })
  setId: string

  @Column({ comment: 'set 编码',  name: 'set_code', unique: true, length: 64 })
  setCode: string

  @Column({ comment: 'set 名称',  name: 'set_name', length: 256 })
  setName: string

  @Column({ comment: 'SKU编码列表',  name: 'sku_list', type: 'json' })
  skuList: string[]

  @Column({ comment: 'set 价格',  name: 'set_price', type: 'decimal', precision: 10, scale: 2 })
  setPrice: number

  @Column({ comment: 'originalTotal 价格',  name: 'original_total_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  originalTotalPrice?: number

  @Column({ comment: '折扣率',  name: 'discount_rate', type: 'decimal', precision: 3, scale: 2, nullable: true })
  discountRate?: number

  @Column({ name: 'retail_price', type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '所选SKU统一零售价累加' })
  retailPrice?: number

  /** @see PRODUCT_STATUS (dict_product_status) */
  @Column({ comment: '状态',  length: 32, default: 'draft' })
  status: string

  // P1-5: Added fields
  @Column({ comment: '描述',  type: 'text', nullable: true })
  description?: string

  @Column({ comment: 'category ID',  name: 'category_id', length: 36, nullable: true })
  categoryId?: string

  @ManyToOne(() => ProductCategory, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category?: ProductCategory

  @Column({ comment: '主图URL',  name: 'main_image', length: 512, nullable: true })
  mainImage?: string

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
