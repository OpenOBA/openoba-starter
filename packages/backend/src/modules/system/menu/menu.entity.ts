import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('sys_menu')
export class Menu {
  @PrimaryGeneratedColumn('uuid', { name: 'menu_id' })
  menuId: string

  @Column({ comment: 'menu 编码',  name: 'menu_code', unique: true, length: 64 })
  menuCode: string

  @Column({ comment: 'menu 名称',  name: 'menu_name', length: 128 })
  menuName: string

  @Column({ comment: '父级ID',  name: 'parent_id', length: 36, nullable: true, type: 'varchar' })
  parentId: string | null

  @Column({ comment: 'menu 类型',  name: 'menu_type', length: 32, default: 'menu' })
  menuType: string

  @Column({ comment: '路径',  length: 256, nullable: true })
  path: string

  @Column({ comment: '图标',  length: 64, nullable: true })
  icon: string

  @Column({ comment: '排序序号',  name: 'sort_order', default: 0 })
  sortOrder: number

  @Column({ comment: 'permission 编码',  name: 'permission_code', length: 128, nullable: true })
  permissionCode: string

  @Column({ comment: '是否Visible',  name: 'is_visible', default: true })
  isVisible: boolean

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
