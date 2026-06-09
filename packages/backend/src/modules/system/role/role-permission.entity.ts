import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

/**
 * 角色-权限关联表（多对多）
 */
@Entity('sys_role_permission')
export class RolePermission {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id: number

  @Column({ comment: '角色ID',  name: 'role_id', length: 36 })
  roleId: string

  @Column({ comment: '权限ID',  name: 'permission_id', length: 36 })
  permissionId: string
}
