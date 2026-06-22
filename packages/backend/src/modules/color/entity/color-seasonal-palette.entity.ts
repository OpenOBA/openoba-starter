import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm'
import { ColorPaletteItem } from './color-palette-item.entity'

@Entity('color_seasonal_palette')
@Index(['season'])
@Index(['status'])
export class ColorSeasonalPalette {
  @PrimaryColumn({ name: 'palette_id', length: 36 })
  paletteId: string

  @Column({ comment: '季节', name: 'season', length: 16 })
  season: string

  @Column({ comment: '色盘名称', name: 'palette_name', length: 64 })
  paletteName: string

  @Column({ comment: '主题', name: 'theme', length: 128, nullable: true })
  theme: string

  @Column({ comment: '目标人群', name: 'target_audience', length: 64, nullable: true })
  targetAudience: string

  @Column({ comment: '适用场景', name: 'scenario', length: 64, nullable: true })
  scenario: string

  @Column({ comment: '趋势来源', name: 'trend_source', length: 256, nullable: true })
  trendSource: string

  /** @see ColorStatus */
  @Column({ comment: '状态', name: 'status', length: 16, default: 'draft' })
  status: string

  @Column({ comment: '创建人', name: 'created_by', length: 36, nullable: true })
  createdBy: string

  @Column({ comment: '备注', name: 'notes', length: 512, nullable: true })
  notes: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @OneToMany(() => ColorPaletteItem, (item) => item.palette)
  items: ColorPaletteItem[]
}
