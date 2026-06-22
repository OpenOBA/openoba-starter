/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('dict_surface_treatment')
export class DictSurfaceTreatment {
  @PrimaryColumn({ name: 'treatment_code', length: 32 })
  treatmentCode: string

  @Column({ comment: 'treatment 名称',  name: 'treatment_name', length: 50 })
  treatmentName: string

  @Column({ comment: '表面处理英文名',  name: 'treatment_en', length: 50, nullable: true })
  treatmentEn?: string

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
