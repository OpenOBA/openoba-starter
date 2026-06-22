import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { PERMISSION_STATUS } from '../../../common/system-status'

@Entity('sys_permission')
export class Permission {
  @PrimaryGeneratedColumn('uuid', { name: 'permission_id' })
  permissionId: string

  @Column({ comment: 'permission 编码', name: 'permission_code', unique: true, length: 128 })
  permissionCode: string

  @Column({ comment: 'permission 名称', name: 'permission_name', length: 128 })
  permissionName: string

  @Column({ comment: 'resource 类型', name: 'resource_type', length: 32, nullable: true })
  resourceType: string

  @Column({ comment: '资源路径(pattern)', name: 'resource_path', length: 256, nullable: true })
  resourcePath: string

  @Column({ comment: '描述', length: 512, nullable: true })
  description: string

  @Column({ comment: '父级ID', name: 'parent_id', length: 32, nullable: true })
  parentId: string

  @Column({ comment: '排序序号', name: 'sort_order', default: 0 })
  sortOrder: number

  @Column({ comment: '状态', length: 32, default: 'active' }) // @see PERMISSION_STATUS
  status: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean
}
