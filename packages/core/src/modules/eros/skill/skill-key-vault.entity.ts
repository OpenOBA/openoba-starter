/**
 * SKILL API Key Vault Entity
 */
import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('skill_key_vault')
export class SkillKeyVault {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 36 })
  id!: string

  @Column({ comment: 'SKILL名称',  name: 'skill_name', type: 'varchar', length: 100 })
  skillName!: string

  @Column({ comment: 'Key名称',  name: 'key_name', type: 'varchar', length: 100 })
  keyName!: string

  @Column({ comment: 'Key标签',  name: 'key_label', type: 'varchar', length: 200 })
  keyLabel!: string

  @Column({ comment: '加密值',  name: 'encrypted_value', type: 'text', nullable: true })
  encryptedValue?: string

  @Column({ comment: '是否必填',  name: 'is_required', type: 'tinyint', default: 0, transformer: { to: (v: boolean) => v ? 1 : 0, from: (v: number) => v === 1 } })
  isRequired!: boolean

  @Column({ comment: '是否掩码',  name: 'is_masked', type: 'tinyint', default: 0, transformer: { to: (v: boolean) => v ? 1 : 0, from: (v: number) => v === 1 } })
  isMasked!: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
