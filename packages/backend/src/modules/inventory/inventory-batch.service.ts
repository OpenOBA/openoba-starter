/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource, EntityManager } from 'typeorm'
import { Inventory } from './entity/inventory.entity'
import { InventoryTransaction, TransactionType } from './entity/inventory-transaction.entity'
import { InventoryDocument } from './entity/inventory-document.entity'

/**
 * 库存批量处理子 Service
 *
 * 负责: 单据执行引擎（多行批量出入库）
 *       批量出入库、FIFO/LIFO 批次分配
 *
 * Agent 调用链路：
 *   erdl_crud create InventoryDocument → pending
 *   → 人工确认/自动确认 → confirmed
 *   → executeDocument() → stock_in/stock_out → executed
 */


@Injectable()
export class InventoryBatchService {
  private readonly logger = new Logger(InventoryBatchService.name)

  constructor(
    @InjectRepository(Inventory)
    private inventoryRepo: Repository<Inventory>,
    @InjectRepository(InventoryTransaction)
    private transactionRepo: Repository<InventoryTransaction>,
    @InjectRepository(InventoryDocument)
    private documentRepo: Repository<InventoryDocument>,
    private dataSource: DataSource,
  ) {}

  // ============================================================
  // 单据执行引擎（多行批量处理）
  // ============================================================

  /**
   * 执行库存单据（Agent 创建单据 → 确认后执行 → 入账）
   */
  async executeDocument(docId: string, operatorId?: string): Promise<InventoryDocument> {
    const doc = await this.documentRepo.findOne({ where: { id: docId } })
    if (!doc) throw new NotFoundException('单据不存在')
    if (doc.status !== 'confirmed') throw new BadRequestException('只能执行已确认的单据')

    await this.dataSource.transaction(async (manager) => {
      for (const item of doc.items) {
        await this.executeItem(manager, doc, item, operatorId)
      }

      doc.status = 'executed'
      doc.executedAt = new Date()
      doc.confirmedBy = operatorId || 'system'
      await manager.save(InventoryDocument, doc)
    })

    this.logger.log(`[Inventory] 单据 ${doc.docNo} 执行完成`)
    return doc
  }

  /**
   * 确认单据（pending → confirmed → executed，在同一事务中）
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
   * 查询单据列表
   */
  async findDocuments(params: { status?: string; docType?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const qb = this.documentRepo.createQueryBuilder('d')

    if (params.status) qb.andWhere('d.status = :status', { status: params.status })
    if (params.docType) qb.andWhere('d.docType = :docType', { docType: params.docType })

    qb.orderBy('d.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
    const [items, total] = await qb.getManyAndCount()
    return { items, total, page, pageSize }
  }

  // ============================================================
  // FIFO/LIFO 批次分配
  // ============================================================

  /**
   * FIFO 分配 — 按入库时间最早的批次优先扣减
   */
  async allocateFIFO(
    skuCode: string,
    quantity: number,
    warehouseCode = 'WH-MAIN',
  ): Promise<{ skuCode: string; quantity: number; batches: { batchId: string; quantity: number }[] }> {
    const transactions = await this.transactionRepo
      .createQueryBuilder('t')
      .where('t.skuCode = :skuCode', { skuCode })
      .andWhere('t.warehouseCode = :wc', { wc: warehouseCode })
      .andWhere('t.transactionType IN (:...types)', {
        types: [TransactionType.STOCK_IN, TransactionType.INITIAL, TransactionType.RETURN_IN],
      })
      .andWhere('t.quantity > 0')
      .orderBy('t.createdAt', 'ASC') // FIFO: 最早入库优先
      .getMany()

    return this.allocateFromBatches(transactions, quantity)
  }

  /**
   * LIFO 分配 — 按入库时间最晚的批次优先扣减
   */
  async allocateLIFO(
    skuCode: string,
    quantity: number,
    warehouseCode = 'WH-MAIN',
  ): Promise<{ skuCode: string; quantity: number; batches: { batchId: string; quantity: number }[] }> {
    const transactions = await this.transactionRepo
      .createQueryBuilder('t')
      .where('t.skuCode = :skuCode', { skuCode })
      .andWhere('t.warehouseCode = :wc', { wc: warehouseCode })
      .andWhere('t.transactionType IN (:...types)', {
        types: [TransactionType.STOCK_IN, TransactionType.INITIAL, TransactionType.RETURN_IN],
      })
      .andWhere('t.quantity > 0')
      .orderBy('t.createdAt', 'DESC') // LIFO: 最晚入库优先
      .getMany()

    return this.allocateFromBatches(transactions, quantity)
  }

  /**
   * 批次分配核心逻辑
   */
  private allocateFromBatches(
    transactions: InventoryTransaction[],
    quantity: number,
  ): { skuCode: string; quantity: number; batches: { batchId: string; quantity: number }[] } {
    let remaining = quantity
    const batches: { batchId: string; quantity: number }[] = []

    for (const tx of transactions) {
      if (remaining <= 0) break
      const canAllocate = Math.min(remaining, tx.quantity)
      batches.push({ batchId: tx.id, quantity: canAllocate })
      remaining -= canAllocate
    }

    if (remaining > 0) {
      throw new BadRequestException(`批次库存不足（需要 ${quantity}，可用 ${quantity - remaining}）`)
    }

    return { skuCode: transactions[0]?.skuCode || '', quantity, batches }
  }

  // ============================================================
  // SN（序列号）追踪
  // ============================================================

  /**
   * 查询 SKU 的序列号追踪记录
   */
  async traceSN(skuCode: string, warehouseCode = 'WH-MAIN') {
    const transactions = await this.transactionRepo
      .createQueryBuilder('t')
      .where('t.skuCode = :skuCode', { skuCode })
      .andWhere('t.warehouseCode = :wc', { wc: warehouseCode })
      .orderBy('t.createdAt', 'DESC')
      .getMany()

    return transactions.map((t) => ({
      transactionId: t.id,
      transactionType: t.transactionType,
      quantity: t.quantity,
      quantityBefore: t.quantityBefore,
      quantityAfter: t.quantityAfter,
      referenceType: t.referenceType,
      referenceId: t.referenceId,
      operatorId: t.operatorId,
      remark: t.remark,
      createdAt: t.createdAt,
    }))
  }

  // ============================================================
  // 内部事务执行方法
  // ============================================================

  /**
   * 在外部事务中执行单据（消除嵌套事务）
   * 4R05修复：直接使用外部事务manager
   */
  async executeDocumentInTx(manager: EntityManager, docId: string, operatorId?: string): Promise<void> {
    const doc = await manager.findOne(InventoryDocument, { where: { id: docId } })
    if (!doc || doc.status !== 'confirmed') return

    for (const item of doc.items || []) {
      await this.executeItem(manager, doc, item, operatorId)
    }
  }

  /**
   * 执行单据中的单个行项目
   */
  private async executeItem(manager: EntityManager, doc: InventoryDocument, item: Record<string, unknown>, operatorId?: string): Promise<void> {
    const qty = item.quantity as number
    const sku = await manager.findOne(Inventory, {
      where: { skuCode: item.skuCode as string, warehouseCode: (item.warehouseCode as string) || 'WH-MAIN' },
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
      sku.currentQuantity += qty
      sku.availableQuantity += qty
    } else if (doc.docType === 'stock_out') {
      if (sku.availableQuantity < qty) {
        throw new BadRequestException(
          `${item.skuCode} 可用库存不足（可用${sku.availableQuantity}，需要${qty}）`,
        )
      }
      sku.currentQuantity -= qty
      sku.availableQuantity -= qty
    }
    sku.updatedAt = new Date()
    await manager.save(Inventory, sku)

    await manager.save(InventoryTransaction, {
      id: crypto.randomUUID(),
      skuId: sku.skuId,
      skuCode: sku.skuCode,
      warehouseCode: sku.warehouseCode,
      transactionType: txType,
      quantity: doc.docType === 'stock_out' ? -qty : qty,
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
}
