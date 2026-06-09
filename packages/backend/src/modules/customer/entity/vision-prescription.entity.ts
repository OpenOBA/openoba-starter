import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'
import { Customer } from './customer.entity'

@Entity('vision_prescription')
@Index('idx_customer', ['customerId'])
@Index('idx_expire', ['expireDate'])
export class VisionPrescription {
  @PrimaryColumn('varchar', { name: 'prescription_id', length: 36 })
  prescriptionId: string

  @Column('varchar', {comment: 'customer ID',  name: 'customer_id', length: 36 })
  customerId: string

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer

  @Column('varchar', { length: 64, nullable: true, comment: '处方标签，如"我的处方-2026"' })
  label: string | null

  // 右眼数据
  @Column('decimal', { name: 'od_sphere', precision: 4, scale: 2, nullable: true, comment: '右眼球镜' })
  odSphere: number | null

  @Column('decimal', { name: 'od_cylinder', precision: 4, scale: 2, nullable: true, comment: '右眼柱镜' })
  odCylinder: number | null

  @Column('int', { name: 'od_axis', nullable: true, comment: '右眼轴位' })
  odAxis: number | null

  @Column('decimal', { name: 'od_add', precision: 4, scale: 2, nullable: true, comment: '右眼ADD' })
  odAdd: number | null

  // 左眼数据
  @Column('decimal', { name: 'os_sphere', precision: 4, scale: 2, nullable: true, comment: '左眼球镜' })
  osSphere: number | null

  @Column('decimal', { name: 'os_cylinder', precision: 4, scale: 2, nullable: true, comment: '左眼柱镜' })
  osCylinder: number | null

  @Column('int', { name: 'os_axis', nullable: true, comment: '左眼轴位' })
  osAxis: number | null

  @Column('decimal', { name: 'os_add', precision: 4, scale: 2, nullable: true, comment: '左眼ADD' })
  osAdd: number | null

  // 瞳距
  @Column('decimal', { name: 'pd_value', precision: 4, scale: 1, nullable: true, comment: '瞳距' })
  pdValue: number | null

  // 处方来源
  @Column('varchar', { name: 'source_type', length: 32, nullable: true, comment: 'manual_upload / ocr / api_optometry' })
  sourceType: string | null

  // 日期
  @Column('date', { name: 'prescription_date', nullable: true, comment: '处方日期' })
  prescriptionDate: Date | null

  @Column('date', { name: 'expire_date', nullable: true, comment: '过期日期' })
  expireDate: Date | null

  // OCR
  @Column('decimal', { name: 'ocr_confidence', precision: 5, scale: 2, nullable: true })
  ocrConfidence: number | null

  @Column({ name: 'ocr_verified', default: false, comment: 'OCR是否已验证' })
  ocrVerified: boolean

  // 图片
  @Column({ type: 'json', name: 'prescription_images', nullable: true, comment: '处方图片URL数组' })
  prescriptionImages: string[] | null

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
