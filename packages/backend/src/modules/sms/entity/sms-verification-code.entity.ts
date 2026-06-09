import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm'

@Entity('sms_verification_code')
@Index('idx_phone_purpose', ['phone', 'purpose'])
@Index('idx_expires', ['expiresAt'])
export class SmsVerificationCode {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string

  @Column({ comment: '电话',  type: 'varchar', length: 11 })
  phone: string

  @Column({ comment: '验证码',  type: 'varchar', length: 6 })
  code: string

  @Column({ comment: '用途(login/register/reset)',  type: 'varchar', length: 20, default: 'login' })
  purpose: string

  @Column({ comment: '过期时间',  type: 'datetime', name: 'expires_at' })
  expiresAt: Date

  @Column({ comment: '是否已使用',  type: 'boolean', default: false })
  used: boolean

  @Column({ comment: '请求IP',  type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
  ipAddress: string | null

  @Column({ comment: 'sent 时间',  type: 'datetime', nullable: true, name: 'sent_at' })
  sentAt: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
