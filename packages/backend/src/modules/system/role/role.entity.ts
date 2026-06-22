import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany } from 'typeorm'
import { Permission } from '../permission/permission.entity'
import { ROLE_STATUS } from '../../../common/system-status'

@Entity('sys_role')
export class Role {
  @PrimaryGeneratedColumn('uuid', { name: 'role_id' })
  roleId: string

  @Column({ comment: 'role 编码', name: 'role_code', unique: true, length: 64 })
  roleCode: string

  @Column({ comment: 'role 名称', name: 'role_name', length: 128 })
  roleName: string

  @Column({ comment: '描述', length: 512, nullable: true })
  description?: string

  @Column({ comment: '状态', length: 32, default: 'active' }) // @see ROLE_STATUS
  status: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @ManyToMany(() => Permission)
  permissions: Permission[]
}
