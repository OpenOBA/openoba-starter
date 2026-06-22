import { Entity, PrimaryColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm'
import { ColorSeasonalPalette } from './color-seasonal-palette.entity'

@Entity('color_palette_item')
@Index(['paletteId'])
export class ColorPaletteItem {
  @PrimaryColumn({ name: 'item_id', length: 36 })
  itemId: string

  @Column({ comment: '色盘ID', name: 'palette_id', length: 36 })
  paletteId: string

  @Column({ comment: '颜色编码', name: 'color_code', length: 32 })
  colorCode: string

  @Column({ comment: '色盘中角色', name: 'role_in_palette', length: 32, default: 'primary' })
  roleInPalette: string

  @Column({ comment: '排序序号', name: 'sort_order', default: 0 })
  sortOrder: number

  @Column({ comment: '备注', name: 'notes', length: 256, nullable: true })
  notes: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @ManyToOne(() => ColorSeasonalPalette, (palette) => palette.items)
  @JoinColumn({ name: 'palette_id' })
  palette: ColorSeasonalPalette
}
