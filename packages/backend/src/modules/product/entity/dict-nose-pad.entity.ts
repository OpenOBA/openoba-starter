/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('dict_nose_pad')
export class DictNosePad {
  @PrimaryColumn({ name: 'pad_code', length: 32 })
  padCode: string

  @Column({ comment: 'pad 名称', name: 'pad_name', length: 50 })
  padName: string

  @Column({ comment: '鼻托英文名', name: 'pad_en', length: 50, nullable: true })
  padEn?: string

  @Column({ comment: '是否Adjustable', name: 'is_adjustable', type: 'tinyint', default: 0 })
  isAdjustable: number

  @Column({ comment: '描述', name: 'description', type: 'text', nullable: true })
  description?: string

  @Column({ comment: '是否启用', name: 'is_active', type: 'tinyint', default: 1 })
  isActive: number

  @Column({ comment: '排序序号', name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number

  @Column({ comment: '扩展数据JSON', name: 'extra', type: 'json', nullable: true })
  extra?: Record<string, unknown>

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
