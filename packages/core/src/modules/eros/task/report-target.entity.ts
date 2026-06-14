/**
 * ER-OS Report Target — 汇报对象 Entity
 *
 * @file ReportTarget Entity
 * @author 唐浩然
 * @since 2026-05-04
 */

import { Entity, Column, PrimaryColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export type TargetLevel = 'L0' | 'L1' | 'L2'

@Entity('report_target')
export class ReportTarget {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 36 })
  id!: string

  @Column({ comment: '名称',  name: 'name', type: 'varchar', length: 100 })
  name!: string

  @Column({ comment: '角色',  name: 'role', type: 'varchar', length: 100 })
  role!: string

  @Index()
  @Column({ comment: '等级',  name: 'level', type: 'enum', enum: ['L0', 'L1', 'L2'] })
  level!: TargetLevel

  @Column({ comment: '范围(user/team/global)',  name: 'scope', type: 'json', nullable: true })
  scope!: string[] | null

  @Column({ comment: '父级ID',  name: 'parent_id', type: 'varchar', length: 36, nullable: true })
  parentId!: string | null

  @Column({ comment: '是否启用',  name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
