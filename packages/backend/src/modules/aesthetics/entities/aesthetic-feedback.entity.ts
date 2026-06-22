/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

@Entity('aesthetic_feedback')
export class AestheticFeedback {
  @PrimaryGeneratedColumn('uuid', { name: 'feedback_id' })
  feedbackId: string

  @Column({ name: 'rule_code', length: 32 })
  @Index()
  ruleCode: string

  @Column({ length: 16, nullable: true })
  @Index()
  action: string

  @Column({ comment: 'SKU上下文JSON',  name: 'sku_context', type: 'json', nullable: true })
  skuContext: any

  @Column({ comment: 'SPU上下文JSON',  name: 'spu_context', type: 'json', nullable: true })
  spuContext: any

  @Column({ comment: '操作备注',  name: 'operator_note', type: 'text', nullable: true })
  operatorNote: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
