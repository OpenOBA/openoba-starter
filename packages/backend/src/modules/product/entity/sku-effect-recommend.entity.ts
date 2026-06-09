import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('sku_effect_recommend')
export class SkuEffectRecommend {
  @PrimaryGeneratedColumn('uuid', { name: 'rec_id' })
  recId: string

  @Column({ comment: '颜色编码',  name: 'color_code', length: 64 })
  colorCode: string

  @Column({ comment: '肤色效果词',  name: 'skin_tone_effect', length: 32 })
  skinToneEffect: string

  @Column({ comment: '脸型效果词',  name: 'face_shape_effect', length: 32 })
  faceShapeEffect: string

  @Column({ comment: '是否Primary',  name: 'is_primary', default: true })
  isPrimary: boolean

  @Column({ comment: '排序序号',  name: 'sort_order', default: 0 })
  sortOrder: number
}
