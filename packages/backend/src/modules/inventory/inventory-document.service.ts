/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Inventory } from './entity/inventory.entity'
import { InventoryTransaction, TransactionType } from './entity/inventory-transaction.entity'
import { InventoryDocument } from './entity/inventory-document.entity'

/**
 * 库存单据子 Service
 *
 * 负责：Agent 创建的单据执行引擎
 * 链路：pending → confirmed → executed
 */
@Injectable()
export class InventoryDocumentService {
  private readonly logger = new Logger(InventoryDocumentService.name)

  constructor(
    @InjectRepository(InventoryDocument)
    private documentRepo: Repository<InventoryDocument>,
    private dataSource: DataSource,
  ) {}

  /**
   * 确认单据（pending → confirmed）
   * H14修复：状态更新+执行在同一事务中，执行失败则回滚状态
   */
  async confirmDocument(docId: string, operatorId?: string): Promise<InventoryDocument> {
    return this.dataSource.transaction(async (manager) => {
      const doc = await manager.findOne(InventoryDocument, { where: { id: docId } })
      if (!doc) throw new NotFoundException('单据不存在')
      if (doc.status !== 'pending') throw new BadRequestException('只能确认待处理的单据')

      doc.status = 'confirmed'
      doc.confirmedBy = operatorId || 'system'
      await manager.save(InventoryDocument, doc)

      await this.executeDocumentInTx(manager, docId, operatorId)
      return doc
    })
  }

  /**
   * 执行库存单据（Agent 创建单据 → 确认后执行 → 入账）
   *
   * Agent 调用链路：
   *   erdl_crud create InventoryDocument → pending
   *   → 人工确认/自动确认 → confirmed
   *   → executeDocument() → stock_in/stock_out → executed
   */
  async executeDocument(docId: string, operatorId?: string): Promise<InventoryDocument> {
    const doc = await this.documentRepo.findOne({ where: { id: docId } })
    if (!doc) throw new NotFoundException('单据不存在')
    if (doc.status !== 'confirmed') throw new BadRequestException('只能执行已确认的单据')

    await this.dataSource.transaction(async (manager) => {
      await this.executeDocumentInTx(manager, docId, operatorId)
    })

    const updated = await this.documentRepo.findOne({ where: { id: docId } })
    if (!updated) throw new NotFoundException('单据不存在')
    this.logger.log(`[Inventory] 单据 ${updated.docNo} 执行完成`)
    return updated
  }

  /**
   * 单据执行核心逻辑（在外部事务中运行）
   * 4R05修复：直接使用外部事务manager，消除嵌套事务
   */
  private async executeDocumentInTx(manager: any, docId: string, operatorId?: string): Promise<void> {
    const doc = await manager.findOne(InventoryDocument, { where: { id: docId } })
    if (!doc || doc.status !== 'confirmed') return

    for (const item of doc.items || []) {
      const sku = await manager.findOne(Inventory, {
        where: { skuCode: item.skuCode, warehouseCode: item.warehouseCode || 'WH-MAIN' },
        lock: { mode: 'pessimistic_write' },
      })
      if (!sku) throw new NotFoundException(`SKU ${item.skuCode} 无库存记录，请先初始化`)

      const before = sku.currentQuantity
      const txType =
        doc.docType === 'stock_in'
          ? TransactionType.STOCK_IN
          : doc.docType === 'stock_out'
            ? TransactionType.STOCK_OUT
            : TransactionType.ADJUST

      if (doc.docType === 'stock_in' || doc.docType === 'adjustment') {
        sku.currentQuantity += item.quantity
        sku.availableQuantity += item.quantity
      } else if (doc.docType === 'stock_out') {
        if (sku.availableQuantity < item.quantity) {
          throw new BadRequestException(`${item.skuCode} 可用库存不足（可用${sku.availableQuantity}，需要${item.quantity}）`)
        }
        sku.currentQuantity -= item.quantity
        sku.availableQuantity -= item.quantity
      }
      sku.updatedAt = new Date()
      await manager.save(Inventory, sku)

      await manager.save(InventoryTransaction, {
        id: crypto.randomUUID(),
        skuId: sku.skuId,
        skuCode: sku.skuCode,
        warehouseCode: sku.warehouseCode,
        transactionType: txType,
        quantity: doc.docType === 'stock_out' ? -item.quantity : item.quantity,
        quantityBefore: before,
        quantityAfter: sku.currentQuantity,
        referenceType: 'document',
        referenceId: doc.id,
        operatorId: operatorId ?? undefined,
        remark: `单据执行: ${doc.docNo} (${doc.docType})`,
      })

      await manager.query('UPDATE product_sku SET stock_quantity = ? WHERE sku_code = ?', [
        sku.currentQuantity,
        sku.skuCode,
      ])
    }

    doc.status = 'executed'
    doc.executedAt = new Date()
    doc.confirmedBy = operatorId || 'system'
    await manager.save(InventoryDocument, doc)
  }
}
