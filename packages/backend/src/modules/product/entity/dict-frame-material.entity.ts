import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('dict_frame_material')
export class DictFrameMaterial {
  @PrimaryColumn({ name: 'material_code', length: 32 })
  materialCode: string

  @Column({ comment: '材质名称',  name: 'material_name', length: 50 })
  materialName: string

  @Column({ comment: '材质英文名',  name: 'material_en', length: 50, nullable: true })
  materialEn?: string

  @Column({ comment: '材质分类',  name: 'material_category', length: 20, nullable: true })
  materialCategory?: string

  @Column({ comment: '描述',  name: 'description', type: 'text', nullable: true })
  description?: string

  @Column({ comment: '是否启用',  name: 'is_active', type: 'tinyint', default: 1 })
  isActive: number

  @Column({ comment: '排序序号',  name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number

  @Column({ comment: '扩展数据JSON',  name: 'extra', type: 'json', nullable: true })
  extra?: Record<string, any>

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
