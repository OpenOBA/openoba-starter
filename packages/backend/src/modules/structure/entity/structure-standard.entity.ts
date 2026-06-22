import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm'
import { StructureStandardAttachment } from './structure-standard-attachment.entity'
import { StructureCompatibility } from './structure-compatibility.entity'
import { STRUCT_STATUS } from '../../../common/system-status'

@Entity('structure_standard')
@Index('idx_status', ['status'])
export class StructureStandard {
  @PrimaryGeneratedColumn('uuid', { name: 'structure_id' })
  structureId: string

  @Column({ name: 'external_code', length: 16, unique: true, comment: '对外编号' })
  externalCode: string

  @Column({ name: 'internal_code', type: 'varchar', length: 64, nullable: true, comment: '对内编号' })
  internalCode: string | null

  @Column({ name: 'shape_code', length: 8, comment: '造型代码' })
  shapeCode: string

  @Column({ name: 'series_code', length: 8, nullable: true, comment: '系列代码（可选，同一标准可用于不同系列）' })
  seriesCode?: string

  @Column({ type: 'decimal', precision: 5, scale: 1, comment: '宽度mm' })
  width: number

  @Column({ type: 'decimal', precision: 5, scale: 1, comment: '高度mm' })
  height: number

  @Column({ name: 'bridge_width', type: 'int', nullable: true, comment: '鼻梁宽度mm' })
  bridgeWidth: number | null

  @Column({ type: 'decimal', precision: 6, scale: 1, comment: '周长mm' })
  circumference: number

  @Column({ name: 'base_curve', type: 'int', nullable: true, comment: '基弧-曲率半径mm (BASE 200C = 200mm)' })
  baseCurve: number | null

  // 球面类型：多选，JSON 数组存储 ["ASP", "FRM"]
  @Column({ name: 'surface_types', type: 'json', comment: '球面类型（多选）' })
  surfaceTypes: string[]

  // 折射率：多选，JSON 数组存储 [1.56, 1.60, 1.67]
  @Column({ name: 'refractive_indexes', type: 'json', comment: '折射率（多选）' })
  refractiveIndexes: number[]

  @Column({ type: 'text', nullable: true, comment: '描述说明' })
  description: string | null

  @Column({ comment: '状态', length: 16, default: 'active' }) // @see STRUCT_STATUS
  status: string

  // P0-7: material FK
  @Column({ comment: '材质编码', name: 'material_code', length: 16, nullable: true })
  materialCode?: string

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @OneToMany(() => StructureStandardAttachment, (a) => a.structure)
  attachments: StructureStandardAttachment[]

  @OneToMany(() => StructureCompatibility, (c) => c.structure)
  compatibilities: StructureCompatibility[]
}
