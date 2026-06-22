import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('external_barcode_mapping')
export class ExternalBarcodeMapping {
  @PrimaryColumn({ name: 'mapping_id', length: 36, comment: 'UUID主键' })
  mappingId: string

  @Column({ name: 'sku_id', length: 36, nullable: true, comment: '关联产品SKU' })
  skuId?: string

  @Column({ comment: '外部条码', name: 'external_barcode', length: 64, unique: false })
  externalBarcode: string

  @Column({ comment: '外部品牌', name: 'external_brand', length: 64, nullable: true })
  externalBrand?: string

  @Column({ comment: '外部商品名', name: 'external_product', length: 256, nullable: true })
  externalProduct?: string

  @Column({ name: 'structure_standard_code', length: 64, nullable: true, comment: '关联结构标准' })
  structureStandardCode?: string

  @Column({ name: 'inventory_sku_id', length: 36, nullable: true, comment: '关联库存SKU' })
  inventorySkuId?: string

  @Column({ comment: '成本单价', name: 'unit_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitCost?: number

  @Column({ length: 32, nullable: true, comment: '来源(供应商/平台/手动)' })
  source?: string

  @Column({ comment: '状态', length: 16, default: 'active' }) // @see STRUCT_STATUS
  status: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
