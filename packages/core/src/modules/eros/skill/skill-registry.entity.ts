/**
 * SKILL 注册表 Entity
 */
import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('skill_registry')
export class SkillRegistry {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 36 })
  id!: string

  @Column({ comment: 'SKILL名称',  name: 'skill_name', type: 'varchar', length: 100, unique: true })
  skillName!: string

  @Column({ comment: '展示名称',  name: 'display_name', type: 'varchar', length: 200 })
  displayName!: string

  @Column({ comment: '版本号',  name: 'version', type: 'varchar', length: 20, default: '1.0.0' })
  version!: string

  @Column({ comment: '分类',  name: 'category', type: 'varchar', length: 30 })
  category!: string

  @Column({ comment: '作者',  name: 'author', type: 'varchar', length: 100 })
  author!: string

  @Column({ comment: '描述',  name: 'description', type: 'text', nullable: true })
  description?: string

  @Column({ comment: '图标',  name: 'icon', type: 'varchar', length: 500, nullable: true })
  icon?: string

  @Column({ comment: '入口路径',  name: 'entrypoint', type: 'varchar', length: 200 })
  entrypoint!: string

  @Column({ comment: '运行时',  name: 'runtime', type: 'varchar', length: 20, default: 'node18' })
  runtime!: string

  @Column({ comment: '定价模式',  name: 'pricing_model', type: 'varchar', length: 20, default: 'free' })
  pricingModel!: string

  @Column({ comment: '定价金额',  name: 'pricing_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  pricingAmount!: number

  @Column({ comment: '定价周期',  name: 'pricing_period', type: 'varchar', length: 10, nullable: true })
  pricingPeriod?: string

  @Column({ comment: '知识库引用',  name: 'kb_refs', type: 'json', nullable: true })
  kbRefs?: string[]

  @Column({ comment: '元镜引用 V2.0',  name: 'mirror_refs', type: 'json', nullable: true })
  mirrorRefs?: { entities?: string[]; apis?: string[]; rules?: string[]; conventions?: string[] }

  @Column({ comment: '权限列表',  name: 'permissions', type: 'json' })
  permissions!: Record<string, unknown>

  @Column({ comment: '依赖JSON',  name: 'dependencies', type: 'json', nullable: true })
  dependencies?: Record<string, unknown>

  @Column({ comment: '状态',  name: 'status', type: 'varchar', length: 20, default: 'active' })
  status!: string

  @Column({ comment: '自动升级',  name: 'auto_upgrade', type: 'varchar', length: 10, default: 'prompt' })
  autoUpgrade!: string

  @CreateDateColumn({ name: 'installed_at' })
  installedAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date

  @Column({ comment: '最后运行时间',  name: 'last_run_at', type: 'timestamp', nullable: true })
  lastRunAt?: Date

  @Column({ comment: '运行次数',  name: 'run_count', type: 'int', default: 0 })
  runCount!: number

  @Column({ comment: '错误次数',  name: 'error_count', type: 'int', default: 0 })
  errorCount!: number
}
