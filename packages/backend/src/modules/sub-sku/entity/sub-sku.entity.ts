/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { SubSkuCategory } from './sub-sku-category.entity'

@Entity('sub_sku')
export class SubSku {
  @PrimaryColumn({ length: 36 })
  id: string

  @Column({ comment: '验证码', unique: true, length: 50 })
  code: string

  @Column({ comment: '名称', length: 200 })
  name: string

  @Column({ comment: 'category ID', name: 'category_id', length: 36 })
  categoryId: string

  @Column({ comment: 'specTemplate ID', name: 'spec_template_id', length: 36, nullable: true })
  specTemplateId?: string

  @Column({ comment: '品牌', length: 50, nullable: true })
  brand?: string

  @Column({ comment: '型号/货号', length: 100, nullable: true })
  model?: string

  @Column({ comment: '规格值JSON', name: 'spec_values', type: 'json', nullable: true })
  specValues?: Record<string, any>

  @Column({ comment: 'standard ID', name: 'standard_id', length: 36, nullable: true })
  standardId?: string

  @Column('decimal', { comment: '价格', precision: 10, scale: 2, default: 0 })
  price: number

  @Column({ comment: '成本价', name: 'cost_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  costPrice: number

  @Column({ comment: '单位', length: 20, default: '副' })
  unit: string

  @Column({ comment: '库存数量', default: 0 })
  stock: number

  @Column({ comment: '图片列表JSON', type: 'json', nullable: true })
  images?: string[]

  @Column({ comment: '排序序号', name: 'sort_order', default: 0 })
  sortOrder: number

  @Column({ comment: '是否启用', name: 'is_active', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @ManyToOne(() => SubSkuCategory)
  @JoinColumn({ name: 'category_id' })
  category?: SubSkuCategory
}
