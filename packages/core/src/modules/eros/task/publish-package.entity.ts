/**
 * ER-OS Publish Package — 多平台发布包 Entity
 * 
 * 管理 ER-OS 任务产出的多平台发布材料（小红书/淘宝/京东等）
 */

import { Entity, Column, PrimaryColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export type PublishStatus = 'draft' | 'ready' | 'partial_published' | 'published'

export interface PlatformMaterial {
  platform: string
  title: string
  content: string
  tags?: string[]
  images?: string[]
  status: string
}

@Entity('publish_package')
export class PublishPackage {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 36 })
  id!: string

  @Index()
  @Column({ comment: '任务ID',  name: 'task_id', type: 'varchar', length: 36, nullable: true })
  taskId!: string | null

  @Column({ comment: '发布包编号',  name: 'package_no', type: 'varchar', length: 50, unique: true })
  packageNo!: string

  @Column({ comment: '标题',  name: 'title', type: 'varchar', length: 200 })
  title!: string

  @Column({ comment: '商品ID列表',  name: 'product_ids', type: 'json', nullable: true })
  productIds!: string[] | null

  @Column({ comment: '目标平台列表',  name: 'platforms', type: 'json', nullable: true })
  platforms!: PlatformMaterial[] | null

  @Index()
  @Column({ comment: '状态',  name: 'status', type: 'enum', enum: ['draft', 'ready', 'partial_published', 'published'], default: 'draft' })
  status!: PublishStatus

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
