import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

@Entity('after_sales_log')
@Index('idx_log_after_sales', ['afterSalesId'])
export class AfterSalesLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'after_sales_id', length: 36, comment: '售后单ID' })
  afterSalesId: string

  @Column({ name: 'action', length: 50, comment: '操作动作' })
  action: string

  @Column({ name: 'from_status', type: 'varchar', length: 30, nullable: true, comment: '变更前状态' })
  fromStatus: string | null

  @Column({ name: 'to_status', type: 'varchar', length: 30, nullable: true, comment: '变更后状态' })
  toStatus: string | null

  @Column({ name: 'operator_id', length: 36, nullable: true, comment: '操作人ID' })
  operatorId: string

  @Column({ name: 'operator_name', length: 100, nullable: true, comment: '操作人姓名' })
  operatorName: string

  @Column({ name: 'note', type: 'text', nullable: true, comment: '操作备注' })
  note: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
