import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm'
import { ProductSpu } from './product-spu.entity'

@Entity('product_category')
export class ProductCategory {
  @PrimaryGeneratedColumn('uuid', { name: 'category_id' })
  categoryId: string

  @Column({ comment: 'category 编码',  name: 'category_code', unique: true, length: 64 })
  categoryCode: string

  @Column({ comment: 'category 名称',  name: 'category_name', length: 128 })
  categoryName: string

  @Column({ comment: '父级ID',  name: 'parent_id', length: 36, nullable: true })
  parentId?: string

  @Column({ comment: '等级',  default: 1 })
  level: number

  @Column({ comment: '排序序号',  name: 'sort_order', default: 0 })
  sortOrder: number

  @Column({ comment: '是否启用',  name: 'is_active', default: true })
  isActive: boolean

  @Column({ length: 64, nullable: true, comment: '图标' })
  icon?: string

  @Column({ length: 256, nullable: true, comment: '分类描述' })
  description?: string

  @Column({ name: 'is_recommended', type: 'tinyint', default: 0, comment: '是否推荐' })
  isRecommended?: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date

  @OneToMany(() => ProductSpu, (spu) => spu.category)
  spus: ProductSpu[]
}
