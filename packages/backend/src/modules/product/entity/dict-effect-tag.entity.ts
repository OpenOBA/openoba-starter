import { Entity, PrimaryColumn, Column } from 'typeorm'

@Entity('dict_effect_tag')
export class DictEffectTag {
  @PrimaryColumn({ name: 'effect_code', length: 32 })
  effectCode: string

  @Column({ comment: '效果类型', name: 'effect_type', length: 16 })
  effectType: string

  @Column({ comment: '效果名称', name: 'effect_name', length: 32 })
  effectName: string

  @Column({ comment: '目标值', name: 'target_value', length: 32 })
  targetValue: string

  @Column({ comment: '推荐颜色JSON', name: 'recommended_colors', type: 'json', nullable: true })
  recommendedColors?: string[]

  @Column({ comment: '描述', type: 'text', nullable: true })
  description?: string

  @Column({ comment: '是否启用', name: 'is_active', default: true })
  isActive: boolean

  @Column({ comment: '排序序号', name: 'sort_order', default: 0 })
  sortOrder: number
}
