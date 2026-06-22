import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

/**
 * 用户-角色关联表（多对多）
 */
@Entity('sys_user_role')
export class UserRole {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id: number

  @Column({ comment: '用户ID', name: 'user_id', length: 36 })
  userId: string

  @Column({ comment: '角色ID', name: 'role_id', length: 36 })
  roleId: string
}
