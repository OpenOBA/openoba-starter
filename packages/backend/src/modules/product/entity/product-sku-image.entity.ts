import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { ProductSku } from './product-sku.entity'

@Entity('product_sku_image')
@Index('idx_sku_type', ['skuId', 'imageType', 'sortOrder'])
@Index('idx_sku_primary', ['skuId', 'isPrimary'])
@Index('idx_sku_active', ['skuId', 'isActive', 'isDeleted'])
@Index('idx_type_active', ['imageType', 'isActive'])
export class ProductSkuImage {
  @PrimaryGeneratedColumn('uuid', { name: 'image_id' })
  imageId: string

  @Column({ comment: '关联SKU ID', name: 'sku_id', length: 36 })
  skuId: string

  // 图片 URL（必填）
  @Column({ name: 'image_url', length: 512, comment: '图片URL（CDN/对象存储地址）' })
  imageUrl: string

  // 图片类型分类
  @Column({
    name: 'image_type',
    length: 32,
    default: 'gallery',
    comment: 'main(主图)/gallery(图集)/detail(详情)/lifestyle(场景)/360view(360度)/website_banner(官网横幅)',
  })
  imageType: string

  // 排序与展示控制
  @Column({ name: 'sort_order', default: 0, comment: '同类型内排序（越小越靠前）' })
  sortOrder: number

  @Column({ name: 'is_primary', default: false, comment: '是否为主图' })
  isPrimary: boolean

  @Column({ name: 'is_active', default: true, comment: '是否启用' })
  isActive: boolean

  // 图片元数据
  @Column({ name: 'alt_text', length: 256, nullable: true, comment: 'SEO/无障碍替代文本' })
  altText?: string

  @Column({ nullable: true, comment: '图片宽度（px）' })
  width?: number

  @Column({ nullable: true, comment: '图片高度（px）' })
  height?: number

  @Column({ name: 'file_size', nullable: true, comment: '文件大小（bytes）' })
  fileSize?: number

  // 审计
  @Column({ comment: '创建人', name: 'created_by', length: 36, nullable: true })
  createdBy?: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  // 关联
  @ManyToOne(() => ProductSku, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sku_id' })
  sku: ProductSku
}
