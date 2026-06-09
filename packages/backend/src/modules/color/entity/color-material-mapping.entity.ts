import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm'

@Entity('color_material_mapping')
@Index(['materialCode'])
@Index(['colorCode'])
@Index(['materialCode', 'colorCode'], { unique: true })
export class ColorMaterialMapping {
  @PrimaryColumn({ name: 'mapping_id', length: 36 })
  mappingId: string

  @Column({ comment: '材质编码',  name: 'material_code', length: 16 })
  materialCode: string

  @Column({ comment: '颜色编码',  name: 'color_code', length: 32 })
  colorCode: string

  @Column({ comment: '可行性',  name: 'feasibility', length: 16, default: 'feasible' })
  feasibility: string

  @Column({ comment: '工艺说明',  name: 'craft_process', length: 64, nullable: true })
  craftProcess: string

  @Column({ comment: '备注',  name: 'notes', length: 512, nullable: true })
  notes: string

  @Column({ comment: '是否启用',  name: 'is_active', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
