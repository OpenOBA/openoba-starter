import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { StructureStandard } from './structure-standard.entity'

@Entity('structure_standard_attachment')
export class StructureStandardAttachment {
  @PrimaryColumn('varchar', { name: 'attachment_id', length: 36 })
  attachmentId: string

  @Column({ comment: 'structure ID', name: 'structure_id', length: 36 })
  structureId: string

  @ManyToOne(() => StructureStandard, (s) => s.attachments)
  @JoinColumn({ name: 'structure_id' })
  structure: StructureStandard

  @Column({ name: 'file_type', length: 16, comment: 'image/pdf/dwg/3d' })
  fileType: string

  @Column({ comment: 'file 名称', name: 'file_name', length: 256 })
  fileName: string

  @Column({ comment: '文件URL', name: 'file_url', length: 512 })
  fileUrl: string

  @Column({ comment: '文件大小', name: 'file_size', type: 'int', nullable: true })
  fileSize: number | null

  @Column({ comment: 'mime 类型', name: 'mime_type', type: 'varchar', length: 128, nullable: true })
  mimeType: string | null

  @Column({ name: 'description', type: 'text', nullable: true, comment: '附件说明/备注' })
  description: string | null

  @Column({ name: 'is_public', default: false, comment: '是否公开' })
  isPublic: boolean

  @Column({ comment: '排序序号', name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
