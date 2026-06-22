/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('review')
export class Review {
  @PrimaryGeneratedColumn('uuid', { name: 'review_id' })
  reviewId: string

  @Column({ comment: '订单ID', name: 'order_id', length: 36 })
  orderId: string

  @Column({ comment: 'orderItem ID', name: 'order_item_id', length: 36, nullable: true })
  orderItemId: string

  @Column({ comment: '客户ID', name: 'customer_id', length: 36 })
  customerId: string

  @Column({ comment: '客户名称', name: 'customer_name', length: 128, nullable: true })
  customerName: string

  @Column({ comment: '关联SPU ID', name: 'spu_id', length: 36 })
  spuId: string

  @Column({ comment: '关联SKU ID', name: 'sku_id', length: 36, nullable: true })
  skuId: string

  // 多维度评分
  @Column({ comment: '评分', name: 'overall_score' })
  overallScore: number

  @Column({ comment: '质量评分', name: 'quality_score', nullable: true })
  qualityScore: number

  @Column({ comment: '舒适度评分', name: 'comfort_score', nullable: true })
  comfortScore: number

  @Column({ comment: '款式评分', name: 'style_score', nullable: true })
  styleScore: number

  @Column({ comment: '性价比评分', name: 'value_score', nullable: true })
  valueScore: number

  // 内容
  @Column({ comment: '内容', type: 'text', nullable: true })
  content: string

  @Column({ comment: '是否Anonymous', name: 'is_anonymous', default: false })
  isAnonymous: boolean

  // 状态
  @Column({ comment: '状态', length: 16, default: 'pending' })
  status: string

  // 图片
  @Column({ comment: '图片列表JSON', type: 'json', nullable: true })
  images: string[]

  // 商家回复
  @Column({ name: 'reply_content', type: 'text', nullable: true })
  replyContent: string

  @Column({ comment: '回复人', name: 'reply_by', length: 36, nullable: true })
  replyBy: string

  @Column({ comment: 'reply 时间', name: 'reply_at', type: 'timestamp', nullable: true })
  replyAt: Date

  // 标签
  @Column({ comment: '标签列表', type: 'json', nullable: true })
  tags: string[]

  // 有用性
  @Column({ comment: 'helpful 数量', name: 'helpful_count', default: 0 })
  helpfulCount: number

  @Column({ comment: '元数据JSON', type: 'json', nullable: true })
  metadata: Record<string, any>

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
