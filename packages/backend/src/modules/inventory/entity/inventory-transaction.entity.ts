import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

export enum TransactionType {
  STOCK_IN = 'stock_in',     // Phase A: 通用入库
  STOCK_OUT = 'stock_out',   // Phase A: 通用出库
  PURCHASE_IN = 'purchase_in',
  SALE_OUT = 'sale_out',
  RETURN_IN = 'return_in',
  RETURN_OUT = 'return_out',
  ADJUST = 'adjust',
  TRANSFER = 'transfer',
  INITIAL = 'initial',
  LOCK = 'lock',
  UNLOCK = 'unlock',
  SAMPLE_OUT = 'sample_out',
  SAMPLE_IN = 'sample_in',
  WRITE_OFF = 'write_off',
  BORROW_OUT = 'borrow_out',
  BORROW_IN = 'borrow_in',
  REPAIR_OUT = 'repair_out',
  REPAIR_IN = 'repair_in',
}

@Entity('inventory_transaction')
@Index('idx_sku_id', ['skuId'])
@Index('idx_type', ['transactionType'])
@Index('idx_reference', ['referenceType', 'referenceId'])
export class InventoryTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ comment: '关联SKU ID',  name: 'sku_id', length: 36 })
  skuId: string

  @Column({ comment: 'SKU编码',  name: 'sku_code', length: 128 })
  skuCode: string

  @Column({ comment: '结构标准编码',  name: 'structure_standard_code', length: 64, nullable: true })
  structureStandardCode: string

  @Column({ comment: 'warehouse 编码',  name: 'warehouse_code', length: 32, default: 'WH-MAIN' })
  warehouseCode: string

  @Column({ comment: 'transaction 类型',  name: 'transaction_type', length: 32 })
  transactionType: TransactionType

  @Column({ comment: '数量',  type: 'int' })
  quantity: number

  @Column({ comment: '变更前数量',  name: 'quantity_before', type: 'int' })
  quantityBefore: number

  @Column({ comment: '变更后数量',  name: 'quantity_after', type: 'int' })
  quantityAfter: number

  @Column({ comment: 'reference 类型',  name: 'reference_type', type: 'varchar', length: 32, nullable: true })
  referenceType: string

  @Column({ comment: 'reference ID',  name: 'reference_id', type: 'varchar', length: 36, nullable: true })
  referenceId: string

  @Column({ comment: '操作人ID',  name: 'operator_id', type: 'varchar', length: 36, nullable: true })
  operatorId: string

  @Column({ comment: '备注',  type: 'varchar', length: 512, nullable: true })
  remark: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
