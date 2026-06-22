/**
 * 通用草稿池 Entity
 *
 * 定位：任何还没定稿的工作单元。文本/图文/视频/结构化数据均可存储。
 * 替代 draft_spu 专属表。
 *
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-18
 */

import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm'

export type DraftStatus = 'editing' | 'ready' | 'published' | 'archived'
export type DraftType = 'spu' | 'content' | 'report' | 'note' | 'mixed'
export type PublishAction = 'insert' | 'update' | 'replace' | 'export' | 'post' | 'merge'
export type DeliveryChannel = 'system' | 'local_file'

export interface ContentBlock {
  index: number
  blockType: 'text' | 'image' | 'video' | 'table'
  text?: string
  markdown?: string
  imageUrl?: string
  imageWidth?: number
  imageHeight?: number
  imageAlt?: string
  previousUrl?: string
  videoUrl?: string
  videoCover?: string
  videoDuration?: number
  tableHeaders?: string[]
  tableRows?: string[][]
  caption?: string
  layout?: 'full' | 'left' | 'right' | 'center'
  localPath?: string
}

export interface DraftAttachment {
  name: string
  url: string
  type: 'image' | 'video' | 'file'
  tags?: string[]
  size?: number
}

export interface PublishTarget {
  id?: string
  type: string
  name: string
  field?: string
  old?: unknown
  new?: unknown
}

export interface PublishRecord {
  action: PublishAction
  entity: string
  targets: PublishTarget[]
  snapshot_before?: Record<string, unknown>
  executed_by: 'agent' | 'human'
  executed_at: string
}

@Entity('draft')
export class Draft {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 36 })
  id!: string

  @Column({ comment: '草稿编号', name: 'draft_no', type: 'varchar', length: 20, unique: true })
  draftNo!: string

  // ── 内容 ──
  @Column({ name: 'title', type: 'varchar', length: 200, nullable: true })
  title?: string

  @Column({ comment: '草稿类型', name: 'draft_type', type: 'varchar', length: 30, nullable: true })
  draftType?: DraftType

  @Column({ comment: '状态', name: 'status', type: 'varchar', length: 20, default: 'editing' })
  status!: DraftStatus

  @Column({ comment: '正文内容', name: 'body_text', type: 'text', nullable: true })
  bodyText?: string

  @Column({ comment: '结构化内容JSON', name: 'body_json', type: 'json', nullable: true })
  bodyJson?: Record<string, unknown>

  @Column({ comment: '附件列表', name: 'attachments', type: 'json', nullable: true })
  attachments?: DraftAttachment[]

  // ── Block-based 内容（V2）──
  @Column({ name: 'blocks', type: 'json', nullable: true })
  blocks?: ContentBlock[]

  // ── 交付渠道 ──
  @Column({
    comment: '交付渠道(wechat/miniapp/email)',
    name: 'delivery_channel',
    type: 'varchar',
    length: 20,
    default: 'system',
  })
  deliveryChannel!: DeliveryChannel

  @Column({ comment: '本地文件路径', name: 'local_base_path', type: 'varchar', length: 500, nullable: true })
  localBasePath?: string

  @Column({ comment: '标签列表', name: 'tags', type: 'json', nullable: true })
  tags?: string[]

  // ── Agent/LLM 追溯 ──
  @Column({ comment: 'sourceTask ID', name: 'source_task_id', type: 'varchar', length: 36, nullable: true })
  sourceTaskId?: string

  @Column({ comment: '来源会话ID', name: 'source_session_id', type: 'varchar', length: 36, nullable: true })
  sourceSessionId?: string

  @Column({ comment: '来源Agent', name: 'source_agent', type: 'varchar', length: 50, nullable: true })
  sourceAgent?: string

  @Column({ comment: '来源模型', name: 'source_model', type: 'varchar', length: 50, nullable: true })
  sourceModel?: string

  @Column({ comment: '来源Prompt', name: 'source_prompt', type: 'text', nullable: true })
  sourcePrompt?: string

  // ── 发布关联 ──
  @Column({ name: 'publish_action', type: 'json', nullable: true })
  publishAction?: PublishRecord

  @Column({ comment: '发布快照JSON', name: 'publish_snapshot', type: 'text', nullable: true })
  publishSnapshot?: string

  // ── 时间戳 ──
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date

  @Column({ comment: '发布时间', name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt?: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date
}
