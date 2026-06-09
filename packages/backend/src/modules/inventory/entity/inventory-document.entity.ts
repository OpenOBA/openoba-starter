import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

/**
 * 库存单据 Entity — Agent 通过创建单据驱动库存变更
 * 
 * Agent 可 CREATE/READ，不可直接改 inventory 表
 * 执行引擎确认后自动写入 inventory + inventory_transaction
 */
@Entity('inventory_document')
@Index('idx_status', ['status'])
@Index('idx_created_at', ['createdAt'])
export class InventoryDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ comment: '单据编号',  name: 'doc_no', length: 64, unique: true })
  docNo: string

  @Column({ comment: 'doc 类型',  name: 'doc_type', type: 'enum', enum: ['stock_in', 'stock_out', 'transfer', 'adjustment'] })
  docType: string

  @Column({ comment: '商品明细JSON',  name: 'items', type: 'json' })
  items: Array<{ skuCode: string; quantity: number; warehouseCode: string }>

  @Column({ comment: '总数量',  name: 'total_quantity', default: 0 })
  totalQuantity: number

  @Column({ comment: '来源',  name: 'source', type: 'enum', enum: ['agent', 'manual', 'platform', 'ocr'], default: 'agent' })
  source: string

  @Column({ comment: '来源单据号',  name: 'source_ref', length: 256, nullable: true })
  sourceRef: string

  @Column({ comment: '状态',  name: 'status', type: 'enum', enum: ['draft', 'pending', 'confirmed', 'executed', 'rejected'], default: 'pending' })
  status: string

  @Column({ comment: '创建人',  name: 'created_by', length: 100, nullable: true })
  createdBy: string

  @Column({ comment: '确认人',  name: 'confirmed_by', length: 100, nullable: true })
  confirmedBy: string

  @Column({ comment: '备注',  name: 'remark', type: 'text', nullable: true })
  remark: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @Column({ comment: 'executed 时间',  name: 'executed_at', type: 'datetime', nullable: true })
  executedAt: Date
}
