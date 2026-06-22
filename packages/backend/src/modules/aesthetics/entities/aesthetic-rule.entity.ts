/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

@Entity('aesthetic_rules')
export class AestheticRule {
  @PrimaryGeneratedColumn('uuid', { name: 'rule_id' })
  ruleId: string

  @Column({ comment: 'rule 编码', name: 'rule_code', unique: true, length: 32 })
  ruleCode: string

  @Column({ comment: '规则名称', name: 'rule_name', length: 128 })
  ruleName: string

  @Column({ comment: '规则类型', name: 'rule_type', length: 16 })
  ruleType: string

  @Column({ name: 'rule_level', length: 8 })
  @Index()
  ruleLevel: string

  @Column({ comment: '描述', type: 'text', nullable: true })
  description: string

  @Column({ comment: '配置JSON', type: 'json', nullable: true })
  config: any

  @Column({ comment: '权重', type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  weight: number

  @Column({ length: 16, default: 'active' })
  @Index()
  status: string

  @Column({ comment: '版本号', length: 16, default: '1.0.0' })
  version: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
