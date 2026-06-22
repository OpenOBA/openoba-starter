/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('dict_frame_type')
export class DictFrameType {
  @PrimaryColumn({ name: 'type_code', length: 20 })
  typeCode: string

  @Column({ comment: 'type 名称', name: 'type_name', length: 50 })
  typeName: string

  @Column({ comment: '类型英文名', name: 'type_en', length: 50, nullable: true })
  typeEn?: string

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
