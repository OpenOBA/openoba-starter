import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

/** 模型提供方 */
@Entity('sys_model_provider')
export class ModelProvider {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string

  @Column({ type: 'varchar', length: 32, unique: true, comment: 'deepseek|qwen|openai|kling|custom-xxx|openoba' })
  providerCode: string

  @Column({ type: 'varchar', length: 64, comment: '显示名' })
  providerName: string

  @Column({ type: 'varchar', length: 256, comment: 'API endpoint' })
  baseUrl: string

  @Column({ type: 'varchar', length: 20, default: 'openai', comment: 'openai-completions|openai-images|custom' })
  apiType: string

  @Column({ type: 'varchar', length: 256, nullable: true })
  description: string

  @Column({ type: 'varchar', length: 256, nullable: true })
  iconUrl: string

  @Column({ type: 'tinyint', default: 0, comment: '0=自定义 1=内置' })
  isBuiltin: number

  @Column({ type: 'tinyint', default: 1 })
  isEnabled: number

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date
}
