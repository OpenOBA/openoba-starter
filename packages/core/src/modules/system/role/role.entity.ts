import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from 'typeorm'
import { Permission } from '../permission/permission.entity'
import { ROLE_STATUS } from '../../../common/system-status'

@Entity('sys_role')
export class Role {
  @PrimaryGeneratedColumn('uuid', { name: 'role_id' })
  roleId: string

  @Column({ comment: 'role 编码',  name: 'role_code', unique: true, length: 64 })
  roleCode: string

  @Column({ comment: 'role 名称',  name: 'role_name', length: 128 })
  roleName: string

  @Column({ comment: '描述',  length: 512, nullable: true })
  description?: string

  @Column({ comment: '状态',  length: 32, default: 'active' }) // @see ROLE_STATUS
  status: string

  @Column({ comment: '是否系统角色', name: 'is_system', default: false })
  isSystem: boolean

  @Column({ comment: '排序', name: 'sort_order', default: 0 })
  sortOrder: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @ManyToMany(() => Permission, { cascade: true })
  @JoinTable({
    name: 'sys_role_permission',
    joinColumn: { name: 'role_id', referencedColumnName: 'roleId' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'permissionId' },
  })
  permissions: Permission[]
}
