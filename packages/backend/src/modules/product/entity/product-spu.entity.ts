import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm'
import { ProductCategory } from './product-category.entity'
import { ProductSku } from './product-sku.entity'
import { PRODUCT_STATUS } from '../product.constants'

@Entity('product_spu')
export class ProductSpu {
  @PrimaryGeneratedColumn('uuid', { name: 'spu_id' })
  spuId: string

  @Column({ comment: 'SPU编码',  name: 'spu_code', unique: true, length: 64 })
  spuCode: string

  @Column({ comment: 'spu 名称',  name: 'spu_name', length: 256 })
  spuName: string

  @ManyToOne(() => ProductCategory, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  @ManyToOne(() => ProductCategory, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: ProductCategory

  @Column({ name: 'structure_standard_code', length: 64, comment: '结构标准锚点（裸框=兼容标准，眼镜=内置标准）' })
  structureStandardCode: string

  @Column({ comment: '产品层级',  name: 'product_tier', length: 20, nullable: true })
  productTier?: string

  @Column({ comment: '系列编码',  name: 'series_code', length: 64, nullable: true })
  seriesCode?: string

  @Column({ name: 'gender', length: 16, default: 'unisex', comment: '款式：female=女款, male=男款, unisex=中性, limited=限量' })
  gender: string

  @Column({ comment: '场景标签',  name: 'scene_tags', type: 'json', nullable: true })
  sceneTags?: string[] // ["通勤", "拍照", "职场"]

  @Column({ comment: '描述',  type: 'text', nullable: true })
  description?: string

  @Column({ comment: '主图URL',  name: 'main_image', length: 512, nullable: true })
  mainImage?: string

  @Column({ comment: '图片列表JSON',  type: 'json', nullable: true })
  images?: string[]

  @Column({ comment: '扩展属性JSON',  type: 'json', nullable: true })
  attributes?: Record<string, any>

  @Column({ comment: '兼容等级列表',  name: 'compatibility_levels', type: 'json', nullable: true })
  compatibilityLevels?: string[]

  /** @see PRODUCT_STATUS (dict_product_status) */
  @Column({ comment: '状态',  length: 32, default: 'draft' })
  status: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @OneToMany(() => ProductSku, (sku) => sku.spu)
  skus: ProductSku[]
}
