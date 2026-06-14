import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

/** 模型注册中心（纯元数据，不含 Key） */
@Entity('sys_model_registry')
@Index(['providerCode'])
@Index(['category'])
export class ModelRegistry {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string

  @Column({ type: 'varchar', length: 32, comment: 'FK → sys_model_provider.provider_code', name: 'provider_code' })
  providerCode: string

  @Column({ type: 'varchar', length: 64, comment: 'deepseek-v4-pro|qwen-plus|dall-e-3', name: 'model_code' })
  modelCode: string

  @Column({ type: 'varchar', length: 64, comment: '显示名', name: 'model_name' })
  modelName: string

  @Column({ type: 'enum', enum: ['TEXT', 'VISION', 'IMAGE', 'VIDEO'], comment: '模型类别' })
  category: string

  // 能力参数
  @Column({ type: 'int', default: 0, name: 'context_window' })
  contextWindow: number

  @Column({ type: 'int', default: 0, name: 'max_tokens' })
  maxTokens: number

  @Column({ type: 'tinyint', default: 0, name: 'supports_reasoning' })
  supportsReasoning: number

  @Column({ type: 'tinyint', default: 1, name: 'supports_streaming' })
  supportsStreaming: number

  @Column({ type: 'tinyint', default: 1, name: 'supports_tools' })
  supportsTools: number

  // 计费
  @Column({ type: 'decimal', precision: 12, scale: 6, default: 0, comment: '每百万token input成本', name: 'cost_input' })
  costInput: number

  @Column({ type: 'decimal', precision: 12, scale: 6, default: 0, name: 'cost_output' })
  costOutput: number

  @Column({ type: 'varchar', length: 10, default: '1M', comment: '1M|per_image|per_second', name: 'cost_unit' })
  costUnit: string

  @Column({ type: 'tinyint', default: 0, comment: '是否该 provider 的默认模型', name: 'is_default' })
  isDefault: number

  @Column({ type: 'tinyint', default: 1, name: 'is_enabled' })
  isEnabled: number

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date
}
