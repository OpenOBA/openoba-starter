import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm'
import { ColorSeasonalPalette } from './color-seasonal-palette.entity'
import { ColorProjectColor } from './color-project-color.entity'

@Entity('color_design_project')
@Index(['projectCode'], { unique: true })
@Index(['status'])
@Index(['targetSeason'])
@Index(['paletteId'])
export class ColorDesignProject {
  @PrimaryColumn({ name: 'project_id', length: 36 })
  projectId: string

  @Column({ comment: '项目编码',  name: 'project_code', length: 32, unique: true })
  projectCode: string

  @Column({ comment: '项目名称',  name: 'project_name', length: 128 })
  projectName: string

  @Column({ comment: '描述',  name: 'description', type: 'text', nullable: true })
  description: string

  @Column({ comment: '色盘ID',  name: 'palette_id', length: 36, nullable: true })
  paletteId: string

  @Column({ comment: '目标季节',  name: 'target_season', length: 16, nullable: true })
  targetSeason: string

  @Column({ comment: '目标上市日期',  name: 'target_launch_date', type: 'date', nullable: true })
  targetLaunchDate: Date

  /** @see ColorStatus */
  @Column({ comment: '状态',  name: 'status', length: 16, default: 'draft' })
  status: string

  @Column({ comment: '优先级',  name: 'priority', length: 8, default: 'normal' })
  priority: string

  @Column({ comment: '负责人',  name: 'assigned_to', length: 64, nullable: true })
  assignedTo: string

  @Column({ comment: 'AI评估分数',  name: 'ai_evaluation_score', type: 'decimal', precision: 3, scale: 1, nullable: true })
  aiEvaluationScore: number

  @Column({ comment: 'AI评估备注',  name: 'ai_evaluation_notes', type: 'text', nullable: true })
  aiEvaluationNotes: string

  @Column({ comment: '销量预测',  name: 'sales_forecast', nullable: true })
  salesForecast: number

  @Column({ comment: '预测置信度',  name: 'forecast_confidence', type: 'decimal', precision: 3, scale: 1, nullable: true })
  forecastConfidence: number

  @Column({ comment: '创建人',  name: 'created_by', length: 36, nullable: true })
  createdBy: string

  @Column({ comment: '审批人',  name: 'approved_by', length: 36, nullable: true })
  approvedBy: string

  @Column({ comment: '审批时间',  name: 'approved_at', nullable: true })
  approvedAt: Date

  @Column({ comment: '备注',  name: 'notes', type: 'text', nullable: true })
  notes: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @ManyToOne(() => ColorSeasonalPalette, { nullable: true })
  @JoinColumn({ name: 'palette_id' })
  palette: ColorSeasonalPalette

  @OneToMany(() => ColorProjectColor, (cpc) => cpc.project)
  colors: ColorProjectColor[]
}
