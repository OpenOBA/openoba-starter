import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique, Index } from 'typeorm'

@Entity('inventory')
@Unique('uk_sku_warehouse', ['skuId', 'warehouseCode'])
@Index('idx_available', ['availableQuantity'])
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ comment: '关联SKU ID', name: 'sku_id', length: 36 })
  skuId: string

  @Column({ comment: 'SKU编码', name: 'sku_code', length: 128 })
  skuCode: string

  @Column({ comment: '结构标准编码', name: 'structure_standard_code', length: 64, nullable: true })
  structureStandardCode: string

  @Column({ comment: 'warehouse 编码', name: 'warehouse_code', length: 32, default: 'WH-MAIN' })
  warehouseCode: string

  @Column({ comment: '当前数量', name: 'current_quantity', default: 0 })
  currentQuantity: number

  @Column({ comment: '可用数量', name: 'available_quantity', default: 0 })
  availableQuantity: number

  @Column({ comment: '锁定数量', name: 'locked_quantity', default: 0 })
  lockedQuantity: number

  @Column({ comment: '预警数量', name: 'warning_quantity', default: 10 })
  warningQuantity: number

  @Column({ comment: 'last_stock_check 时间', name: 'last_stock_check_at', type: 'datetime', nullable: true })
  lastStockCheckAt: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
