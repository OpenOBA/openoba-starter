import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from 'typeorm'
import { Role } from '../role/role.entity'
import { USER_STATUS } from '../../../common/system-status'

@Entity('sys_user')
export class User {
  @PrimaryGeneratedColumn('uuid', { name: 'user_id' })
  userId: string

  @Column({ comment: '用户名',  unique: true, length: 64 })
  username: string

  @Column({ comment: '密码哈希(bcrypt)',  name: 'password_hash', length: 256 })
  passwordHash: string

  @Column({ comment: '真实姓名',  name: 'real_name', length: 128, nullable: true })
  realName?: string

  @Column({ comment: '邮箱',  length: 32, nullable: true })
  email?: string

  @Column({ comment: '电话',  length: 32, nullable: true })
  phone?: string

  @Column({ comment: '状态',  length: 32, default: 'active' }) // @see USER_STATUS
  status: string

  @Column({ comment: 'last_login 时间',  name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt?: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @ManyToMany(() => Role, { cascade: true })
  @JoinTable({
    name: 'sys_user_role',
    joinColumn: { name: 'user_id', referencedColumnName: 'userId' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'roleId' },
  })
  roles: Role[]
}
