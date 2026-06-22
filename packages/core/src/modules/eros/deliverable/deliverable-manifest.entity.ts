import { Entity, PrimaryColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export type DeliverableStatus = 'draft' | 'approved' | 'published' | 'archived'
export type DeliverableUserType = 'operator' | 'developer' | 'maintainer'

@Entity('deliverable_manifest')
@Index('idx_task_id', ['taskId'])
@Index('idx_task_version', ['taskId', 'version'])
@Index('idx_status', ['status'])
export class DeliverableManifest {
  @PrimaryColumn('varchar', { length: 36 })
  id: string

  @Column('varchar', { name: 'task_id', length: 36, comment: '关联任务 ID' })
  taskId: string

  @Column('varchar', { name: 'task_title', length: 200, comment: '任务标题' })
  taskTitle: string

  @Column('int', { default: 1, comment: '版本号' })
  version: number

  @Column('varchar', { name: 'user_type', length: 20, default: 'operator', comment: '用户类型' })
  userType: DeliverableUserType

  @Column('varchar', { length: 20, default: 'draft', comment: '状态' })
  status: DeliverableStatus

  @Column('varchar', { name: 'created_by', length: 64, comment: '创建者' })
  createdBy: string

  @Column('varchar', { name: 'approved_by', length: 64, nullable: true, comment: '审批者' })
  approvedBy?: string

  @Column('text', { nullable: true, comment: '变更说明' })
  changelog?: string

  @Column('int', { name: 'parent_version', nullable: true, comment: '父版本号' })
  parentVersion?: number

  @Column('int', { name: 'file_count', default: 0, comment: '文件数量' })
  fileCount: number

  @Column('bigint', { name: 'total_size', default: 0, comment: '总大小（字节）' })
  totalSize: number

  @Column('varchar', { name: 'dir_path', length: 512, comment: '版本目录相对路径' })
  dirPath: string

  @Column('json', { nullable: true, comment: '扩展信息' })
  extra?: Record<string, unknown>

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
