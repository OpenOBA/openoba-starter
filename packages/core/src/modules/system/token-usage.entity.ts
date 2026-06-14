import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from 'typeorm'

/** Token 用量追踪 */
@Entity('sys_token_usage')
@Index(['agentCode', 'createdAt'])
@Index(['providerCode', 'createdAt'])
export class TokenUsage {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string

  @Column({ type: 'varchar', length: 64 })
  agentCode: string

  @Column({ type: 'varchar', length: 64 })
  modelCode: string

  @Column({ type: 'varchar', length: 32 })
  providerCode: string

  @Column({ type: 'int', default: 0 })
  inputTokens: number

  @Column({ type: 'int', default: 0 })
  outputTokens: number

  @Column({ type: 'int', default: 0 })
  totalTokens: number

  @Column({ type: 'decimal', precision: 12, scale: 6, default: 0 })
  costInput: number

  @Column({ type: 'decimal', precision: 12, scale: 6, default: 0 })
  costOutput: number

  @Column({ type: 'decimal', precision: 12, scale: 6, default: 0 })
  costTotal: number

  @Column({ type: 'varchar', length: 36, nullable: true })
  taskId: string

  @Column({ type: 'varchar', length: 36, nullable: true })
  chatSessionId: string

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date
}
