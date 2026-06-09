import { Entity, PrimaryColumn, Column, Index, CreateDateColumn } from 'typeorm'

@Entity('points_transaction')
@Index('idx_customer', ['customerId'])
@Index('idx_type', ['type'])
export class PointsTransaction {
  @PrimaryColumn('varchar', { name: 'txn_id', length: 36 })
  txnId: string

  @Column('varchar', {comment: 'customer ID',  name: 'customer_id', length: 36 })
  customerId: string

  @Column('int', { comment: '正数=获得，负数=消耗' })
  points: number

  @Column('int', { name: 'balance_after', comment: '变更后余额' })
  balanceAfter: number

  @Column('varchar', { length: 32, comment: 'order_earn/order_burn/manual/expire' })
  type: string

  @Column('varchar', { name: 'ref_id', length: 36, nullable: true, comment: '关联订单号' })
  refId: string | null

  @Column('varchar', { length: 256, nullable: true })
  description: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
