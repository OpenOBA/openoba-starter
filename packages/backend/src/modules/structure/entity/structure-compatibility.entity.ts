import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'
import { StructureStandard } from './structure-standard.entity'

@Entity('structure_compatibility')
@Index('idx_structure_standard', ['structureStandardCode'])
@Index('idx_sku', ['productSkuId'])
export class StructureCompatibility {
  @PrimaryColumn('varchar', { name: 'compat_id', length: 36 })
  compatId: string

  @Column({ name: 'structure_standard_code', length: 64, comment: '结构标准锚点（统一使用external_code）' })
  structureStandardCode: string

  @ManyToOne(() => StructureStandard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'structure_standard_code', referencedColumnName: 'externalCode' })
  structure: StructureStandard

  @Column({ name: 'product_sku_id', length: 32, comment: '关联镜框SKU' })
  productSkuId: string

  @Column({ name: 'compatibility_level', length: 16, comment: 'color/style/texture/smart' })
  compatibilityLevel: string

  @Column({ comment: '备注',  type: 'varchar', length: 512, nullable: true })
  notes: string | null

  @Column({ comment: '是否启用',  name: 'is_active', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
