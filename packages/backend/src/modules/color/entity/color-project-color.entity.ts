import { Entity, PrimaryColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm'
import { ColorDesignProject } from './color-design-project.entity'

@Entity('color_project_color')
@Index(['projectId'])
export class ColorProjectColor {
  @PrimaryColumn({ name: 'project_color_id', length: 36 })
  projectColorId: string

  @Column({ comment: 'project ID', name: 'project_id', length: 36 })
  projectId: string

  @Column({ comment: '颜色编码', name: 'color_code', length: 32 })
  colorCode: string

  @Column({ comment: '材质编码', name: 'material_code', length: 16, nullable: true })
  materialCode: string

  @Column({ comment: '是否Primary', name: 'is_primary', default: false })
  isPrimary: boolean

  @Column({ comment: '排序序号', name: 'sort_order', default: 0 })
  sortOrder: number

  @Column({ comment: '备注', name: 'notes', length: 256, nullable: true })
  notes: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @ManyToOne(() => ColorDesignProject, (project) => project.colors)
  @JoinColumn({ name: 'project_id' })
  project: ColorDesignProject
}
