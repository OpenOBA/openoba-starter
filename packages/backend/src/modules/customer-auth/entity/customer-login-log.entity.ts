import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm'

export const LOGIN_METHODS = ['sms_code', 'password', 'admin_create'] as const
export const LOGIN_RESULTS = [
  'success',
  'failed_wrong_code',
  'failed_expired',
  'failed_no_account',
  'failed_suspended',
] as const

@Entity('customer_login_log')
@Index('idx_customer', ['customerId'])
@Index('idx_phone', ['phone'])
@Index('idx_created', ['createdAt'])
export class CustomerLoginLog {
  @PrimaryColumn('varchar', { name: 'log_id', length: 36 })
  logId: string

  @Column('varchar', { name: 'customer_id', length: 36, nullable: true, comment: '关联客户ID（登录成功时才有）' })
  customerId: string | null

  @Column('varchar', { length: 16, comment: '手机号' })
  phone: string

  @Column('varchar', { name: 'login_method', length: 16, comment: '登录方式：sms_code/password/admin_create' })
  loginMethod: string

  @Column('varchar', { name: 'login_result', length: 24, comment: '登录结果' })
  loginResult: string

  @Column('varchar', { name: 'ip_address', length: 48, nullable: true, comment: 'IP 地址' })
  ipAddress: string | null

  @Column('varchar', { name: 'user_agent', length: 512, nullable: true, comment: '用户代理' })
  userAgent: string | null

  @Column('varchar', { length: 64, nullable: true, comment: '设备标识' })
  deviceId: string | null

  @Column('varchar', { name: 'fail_reason', length: 128, nullable: true, comment: '失败原因' })
  failReason: string | null

  @CreateDateColumn({ name: 'created_at', comment: '登录时间' })
  createdAt: Date
}
