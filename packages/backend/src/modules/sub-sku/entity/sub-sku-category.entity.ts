import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'

@Entity('sub_sku_category')
export class SubSkuCategory {
  @PrimaryColumn({ length: 36 })
  id: string

  @Column({ comment: '验证码', unique: true, length: 50 })
  code: string

  @Column({ comment: '名称', length: 100 })
  name: string

  @Column({ comment: '父级ID', name: 'parent_id', length: 36, nullable: true })
  parentId?: string

  @Column({ comment: '排序序号', name: 'sort_order', default: 0 })
  sortOrder: number

  @Column({ comment: '是否启用', name: 'is_active', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @ManyToOne(() => SubSkuCategory, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: SubSkuCategory
}
