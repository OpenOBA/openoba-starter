import { Entity, PrimaryColumn, Column, Index, CreateDateColumn } from 'typeorm'

@Entity('member_level_log')
@Index('idx_customer', ['customerId'])
@Index('idx_time', ['createdAt'])
export class MemberLevelLog {
  @PrimaryColumn('varchar', { name: 'log_id', length: 36 })
  logId: string

  @Column('varchar', {comment: 'customer ID',  name: 'customer_id', length: 36 })
  customerId: string

  @Column('varchar', {comment: '旧等级',  name: 'old_level', length: 32 })
  oldLevel: string

  @Column('varchar', {comment: '新等级',  name: 'new_level', length: 32 })
  newLevel: string

  @Column('varchar', { name: 'trigger_type', length: 32, comment: 'upgrade/downgrade/manual' })
  triggerType: string

  @Column('varchar', {comment: '变更原因',  name: 'trigger_reason', length: 256, nullable: true })
  triggerReason: string | null

  @Column('varchar', { name: 'order_id', length: 36, nullable: true, comment: '触发升级的订单' })
  orderId: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
