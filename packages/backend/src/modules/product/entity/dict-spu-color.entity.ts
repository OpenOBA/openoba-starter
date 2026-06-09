import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm'
import { ProductSku } from './product-sku.entity'

@Entity('dict_sku_color')
export class DictSkuColor {
  @PrimaryGeneratedColumn('uuid', { name: 'color_id' })
  colorId: string

  @Column({ comment: '颜色编码',  name: 'color_code', unique: true, length: 64 })
  colorCode: string

  @Column({ comment: '颜色名称',  name: 'color_name', length: 128 })
  colorName: string

  @Column({ comment: '颜色英文名',  name: 'color_name_en', length: 128, nullable: true })
  colorNameEn?: string

  @Column({ comment: 'pinyin 名称',  name: 'pinyin_name', length: 128, nullable: true })
  pinyinName?: string

  @Column({ comment: '拼音首字母',  name: 'pinyin_initial', length: 16, nullable: true })
  pinyinInitial?: string

  @Column({ comment: '色系',  name: 'color_family', length: 32, nullable: true })
  colorFamily?: string

  @Column({ comment: 'color 类型',  name: 'color_type', length: 32, default: 'solid' })
  colorType: string

  @Column({ comment: '十六进制色值',  name: 'hex_value', length: 32, nullable: true })
  hexValue?: string

  @Column({ comment: 'Pantone色卡参考',  name: 'pantone_ref', length: 32, nullable: true })
  pantoneRef?: string

  @Column({ comment: '颜色预览图',  name: 'preview_image', length: 512, nullable: true })
  previewImage?: string

  @Column({ comment: '描述',  type: 'text', nullable: true })
  description?: string

  @Column({ comment: '趋势分',  name: 'trend_score', default: 50 })
  trendScore: number

  @Column({ comment: '是否启用',  name: 'is_active', default: true })
  isActive: boolean

  @Column({ comment: '排序序号',  name: 'sort_order', default: 0 })
  sortOrder: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  // P1-6: Color -> SKU relationship (FK is on product_sku.color_code)
  @OneToMany(() => ProductSku, (sku) => sku.color)
  skus: ProductSku[]
}
