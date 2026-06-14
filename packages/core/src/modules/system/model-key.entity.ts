import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

/** Provider 级别 API Key（AES-256-GCM 加密） */
@Entity('sys_model_key')
export class ModelKey {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string

  @Column({ type: 'varchar', length: 32, name: 'provider_code' })
  providerCode: string

  @Column({ type: 'varchar', length: 64, default: 'global', name: 'agent_code' })
  agentCode: string

  @Column({ type: 'varchar', length: 64, nullable: true })
  label: string

  @Column({ type: 'text', comment: 'AES-256-GCM 密文', name: 'api_key_enc' })
  apiKeyEnc: string

  @Column({ type: 'varchar', length: 48 })
  iv: string

  @Column({ type: 'varchar', length: 48, name: 'auth_tag' })
  authTag: string

  @Column({ type: 'varchar', length: 256, nullable: true, comment: '覆盖 provider 默认 baseUrl', name: 'base_url' })
  baseUrl: string

  @Column({ type: 'tinyint', default: 1, name: 'is_enabled' })
  isEnabled: number

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date
}
