/**
 * ER-OS Knowledge Entry — 知识条目实体
 * 
 * 标签驱动，极简设计。知识库为 Agent 服务。
 */

import { Entity, Column, PrimaryColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export type KnowledgeType = 'DOCUMENT' | 'EXPERIENCE' | 'CASE' | 'DATA' | 'FAQ' | 'POLICY' | 'STRATEGY'
export type KnowledgeVisibility = 'public' | 'private'
export type KnowledgeStatus = 'active' | 'archived'

@Entity('knowledge_entry')
export class KnowledgeEntry {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 36 })
  id!: string

  @Column({ comment: '标题',  name: 'title', type: 'varchar', length: 255 })
  title!: string

  @Index()
  @Column({ comment: '可见性(public/internal/private)',  name: 'visibility', type: 'enum', enum: ['public', 'private'], default: 'public' })
  visibility!: KnowledgeVisibility

  @Index()
  @Column({ comment: '类型',  name: 'type', type: 'enum', enum: ['DOCUMENT', 'EXPERIENCE', 'CASE', 'DATA', 'FAQ', 'POLICY', 'STRATEGY'], default: 'EXPERIENCE' })
  type!: KnowledgeType

  @Column({ comment: '标签列表',  name: 'tags', type: 'json' })
  tags!: string[]

  @Column({ comment: '内容',  name: 'content', type: 'text' })
  content!: string

  @Column({ comment: '权重',  name: 'weight', type: 'float', default: 0.3 })
  weight!: number

  @Index()
  @Column({ comment: '状态',  name: 'status', type: 'enum', enum: ['active', 'archived'], default: 'active' })
  status!: KnowledgeStatus

  @Column({ comment: '附件列表',  name: 'attachments', type: 'json', nullable: true })
  attachments!: Array<{ name: string; type: string; url: string; size?: number }> | null

  @Column({ comment: '贡献者',  name: 'contributor', type: 'varchar', length: 100, nullable: true })
  contributor!: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
