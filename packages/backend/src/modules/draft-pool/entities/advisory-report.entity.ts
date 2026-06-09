import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('advisory_report')
export class AdvisoryReport {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 36 })
  id: string

  @Column({ comment: '报告名称',  name: 'report_name', type: 'varchar', length: 200 })
  reportName: string

  @Column({ comment: 'report 类型',  name: 'report_type', type: 'varchar', length: 30 })
  reportType: string // color_trend | shape_trend | market_analysis | product_audit

  @Column({ comment: '查询上下文JSON',  name: 'query_context', type: 'text', nullable: true })
  queryContext: string

  @Column({ comment: '摘要',  name: 'summary', type: 'text', nullable: true })
  summary: string

  @Column({ comment: '推荐建议JSON',  name: 'recommendations', type: 'json', nullable: true })
  recommendations: any

  @Column({ comment: '状态',  name: 'status', type: 'varchar', length: 20, default: 'pending' })
  status: string // pending | generating | completed | failed

  @Column({ comment: '错误信息JSON',  name: 'error_info', type: 'text', nullable: true })
  errorInfo: string

  @Column({ comment: '完成时间',  name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
