import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Inventory } from './entity/inventory.entity'
import { InventoryTransaction, TransactionType } from './entity/inventory-transaction.entity'
import { InventoryDocument } from './entity/inventory-document.entity'
import {
  CreateInventoryDto,
  UpdateInventoryDto,
  StockInDto,
  StockOutDto,
  LockStockDto,
  UnlockStockDto,
  AdjustStockDto,
  QueryInventoryDto,
  QueryTransactionDto,
} from './dto/inventory.dto'

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name)

  constructor(
    @InjectRepository(Inventory)
    private inventoryRepo: Repository<Inventory>,
    @InjectRepository(InventoryTransaction)
    private transactionRepo: Repository<InventoryTransaction>,
    @InjectRepository(InventoryDocument)
    private documentRepo: Repository<InventoryDocument>,
    private dataSource: DataSource,
  ) {}

  // ===== 库存查询 =====

  async findAll(dto: QueryInventoryDto) {
    const page = dto.page || 1
    const pageSize = dto.pageSize || 20
    const qb = this.inventoryRepo.createQueryBuilder('inv')

    if (dto.skuCode) qb.andWhere('inv.skuCode LIKE :skuCode', { skuCode: `%${dto.skuCode}%` })
    if (dto.structureStandardCode) qb.andWhere('inv.structureStandardCode = :ssc', { ssc: dto.structureStandardCode })
    if (dto.warehouseCode) qb.andWhere('inv.warehouseCode = :wc', { wc: dto.warehouseCode })
    if (dto.warningOnly === 'true') qb.andWhere('inv.availableQuantity <= inv.warningQuantity')

    qb.orderBy('inv.updatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [items, total] = await qb.getManyAndCount()
    return { items, total, page, pageSize }
  }

  async findBySku(skuId: string, warehouseCode = 'WH-MAIN') {
    const inv = await this.inventoryRepo.findOne({
      where: { skuId, warehouseCode },
    })
    if (!inv) throw new NotFoundException('库存记录不存在')
    return inv
  }

  async findBySkuCode(skuCode: string, warehouseCode = 'WH-MAIN') {
    const inv = await this.inventoryRepo.findOne({
      where: { skuCode, warehouseCode },
    })
    if (!inv) throw new NotFoundException('库存记录不存在')
    return inv
  }

  // ===== 流水查询 =====

  async findTransactions(dto: QueryTransactionDto) {
    const page = dto.page || 1
    const pageSize = dto.pageSize || 20
    const qb = this.transactionRepo.createQueryBuilder('t')

    if (dto.skuId) qb.andWhere('t.skuId = :skuId', { skuId: dto.skuId })
    if (dto.skuCode) qb.andWhere('t.skuCode LIKE :skuCode', { skuCode: `%${dto.skuCode}%` })
    if (dto.structureStandardCode) qb.andWhere('t.structureStandardCode = :lsc', { lsc: dto.structureStandardCode })
    if (dto.transactionType) qb.andWhere('t.transactionType = :type', { type: dto.transactionType })
    if (dto.referenceType) qb.andWhere('t.referenceType = :rt', { rt: dto.referenceType })
    if (dto.referenceId) qb.andWhere('t.referenceId = :rid', { rid: dto.referenceId })

    qb.orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [items, total] = await qb.getManyAndCount()
    return { items, total, page, pageSize }
  }

  // ===== 创建库存记录 =====

  async create(dto: CreateInventoryDto, operatorId?: string) {
    const warehouseCode = dto.warehouseCode || 'WH-MAIN'

    // H08修复：检查+创建在同一事务中，并添加悲观锁防并发
    return this.dataSource.transaction(async (manager) => {
    const existing = await manager.findOne(Inventory, {
      where: { skuId: dto.skuId, warehouseCode },
      lock: { mode: 'pessimistic_write' },
    })
    if (existing) throw new BadRequestException('该 SKU 的库存记录已存在')

    const currentQty = dto.currentQuantity || 0
    const inv = this.inventoryRepo.create({
      id: crypto.randomUUID(),
      skuId: dto.skuId,
      skuCode: dto.skuCode,
      structureStandardCode: dto.structureStandardCode ?? undefined,
      warehouseCode,
      currentQuantity: currentQty,
      availableQuantity: currentQty,
      lockedQuantity: 0,
      warningQuantity: dto.warningQuantity || 10,
    })

    await manager.save(Inventory, inv)
    if (currentQty > 0) {
      await manager.save(InventoryTransaction, {
        id: crypto.randomUUID(),
        skuId: dto.skuId, skuCode: dto.skuCode,
        structureStandardCode: dto.structureStandardCode ?? undefined,
        warehouseCode,
        transactionType: TransactionType.INITIAL,
        quantity: currentQty,
        quantityBefore: 0,
        quantityAfter: currentQty,
        referenceType: 'initial',
        operatorId: operatorId ?? undefined,
        remark: '期初导入',
      })
    }
    return inv
    })
  }

  // ===== 更新预警阈值 =====

  async update(id: string, dto: UpdateInventoryDto) {
    const inv = await this.inventoryRepo.findOne({ where: { id } })
    if (!inv) throw new NotFoundException('库存记录不存在')

    if (dto.warningQuantity !== undefined) inv.warningQuantity = dto.warningQuantity
    return this.inventoryRepo.save(inv)
  }

  // ===== 入库 =====

  async stockIn(dto: StockInDto, operatorId?: string) {
    return this.dataSource.transaction(async (manager) => {
      const inv = await manager.findOne(Inventory, {
        where: { skuId: dto.skuId, warehouseCode: 'WH-MAIN' },
        lock: { mode: 'pessimistic_write' },
      })
      if (!inv) throw new NotFoundException('库存记录不存在')

      const before = inv.currentQuantity
      inv.currentQuantity += dto.quantity
      inv.availableQuantity += dto.quantity
      inv.updatedAt = new Date()

      await manager.save(Inventory, inv)
      await manager.save(InventoryTransaction, {
        id: crypto.randomUUID(),
        skuId: dto.skuId,
        skuCode: inv.skuCode,
        structureStandardCode: dto.structureStandardCode ?? inv.structureStandardCode,
        warehouseCode: 'WH-MAIN',
        transactionType: dto.transactionType,
        quantity: dto.quantity,
        quantityBefore: before,
        quantityAfter: inv.currentQuantity,
        referenceType: dto.referenceType ?? undefined,
        referenceId: dto.referenceId ?? undefined,
        operatorId: operatorId ?? undefined,
        remark: dto.remark ?? undefined,
      })

      return inv
    })
  }

  // ===== 出库 =====

  async stockOut(dto: StockOutDto, operatorId?: string) {
    return this.dataSource.transaction(async (manager) => {
      const inv = await manager.findOne(Inventory, {
        where: { skuId: dto.skuId, warehouseCode: 'WH-MAIN' },
        lock: { mode: 'pessimistic_write' },
      })
      if (!inv) throw new NotFoundException('库存记录不存在')

      if (inv.availableQuantity < dto.quantity) {
        throw new BadRequestException(`可用库存不足（可用 ${inv.availableQuantity}，需要 ${dto.quantity}）`)
      }

      const before = inv.currentQuantity
      inv.currentQuantity -= dto.quantity
      inv.availableQuantity -= dto.quantity
      inv.updatedAt = new Date()

      await manager.save(Inventory, inv)
      await manager.save(InventoryTransaction, {
        id: crypto.randomUUID(),
        skuId: dto.skuId,
        skuCode: inv.skuCode,
        structureStandardCode: dto.structureStandardCode ?? inv.structureStandardCode,
        warehouseCode: 'WH-MAIN',
        transactionType: dto.transactionType,
        quantity: -dto.quantity,
        quantityBefore: before,
        quantityAfter: inv.currentQuantity,
        referenceType: dto.referenceType ?? undefined,
        referenceId: dto.referenceId ?? undefined,
        operatorId: operatorId ?? undefined,
        remark: dto.remark ?? undefined,
      })

      return inv
    })
  }

  // ===== 锁定库存（下单） =====

  async lock(dto: LockStockDto, operatorId?: string) {
    return this.dataSource.transaction(async (manager) => {
      const inv = await manager.findOne(Inventory, {
        where: { skuId: dto.skuId, warehouseCode: 'WH-MAIN' },
        lock: { mode: 'pessimistic_write' },
      })
      if (!inv) throw new NotFoundException('库存记录不存在')

      if (inv.availableQuantity < dto.quantity) {
        throw new BadRequestException(`可用库存不足（可用 ${inv.availableQuantity}，需要锁定 ${dto.quantity}）`)
      }

      inv.availableQuantity -= dto.quantity
      inv.lockedQuantity += dto.quantity
      inv.updatedAt = new Date()

      await manager.save(Inventory, inv)
      await manager.save(InventoryTransaction, {
        id: crypto.randomUUID(),
        skuId: dto.skuId,
        skuCode: inv.skuCode,
        structureStandardCode: inv.structureStandardCode,
        warehouseCode: 'WH-MAIN',
        transactionType: TransactionType.LOCK,
        quantity: 0, // 锁定不改变总库存
        quantityBefore: inv.availableQuantity + dto.quantity,
        quantityAfter: inv.availableQuantity,
        referenceType: 'order',
        referenceId: dto.orderId,
        operatorId: operatorId ?? undefined,
        remark: `订单锁定 ${dto.quantity} 件`,
      })

      return inv
    })
  }

  // ===== 解锁库存（取消订单） =====

  /**
   * P0-2修复：已发货订单取消时回滚库存（stockIn，在外部事务内）
   */
  async rollbackStockInTransaction(manager: any, dto: { skuId: string; orderId: string; quantity: number }, operatorId?: string) {
    const inv = await manager.findOne(Inventory, {
      where: { skuId: dto.skuId, warehouseCode: 'WH-MAIN' },
      lock: { mode: 'pessimistic_write' },
    })
    if (!inv) throw new NotFoundException('库存记录不存在')

    const before = inv.currentQuantity
    inv.currentQuantity += dto.quantity
    inv.availableQuantity += dto.quantity
    inv.updatedAt = new Date()

    await manager.save(Inventory, inv)
    await manager.save(InventoryTransaction, {
      id: crypto.randomUUID(),
      skuId: dto.skuId,
      skuCode: inv.skuCode,
      structureStandardCode: inv.structureStandardCode,
      warehouseCode: 'WH-MAIN',
      transactionType: TransactionType.RETURN_IN,
      quantity: dto.quantity,
      quantityBefore: before,
      quantityAfter: inv.currentQuantity,
      referenceType: 'order_cancel',
      referenceId: dto.orderId,
      operatorId: operatorId ?? undefined,
      remark: `已发货订单取消库存回滚 ${dto.quantity} 件`,
    })
  }

  /**
   * C7-P0修复：在外部事务中解锁库存（由调用方管理事务）
   */
  async unlockInTransaction(manager: any, dto: { skuId: string; orderId: string; quantity: number }, operatorId?: string) {
    const inv = await manager.findOne(Inventory, {
      where: { skuId: dto.skuId, warehouseCode: 'WH-MAIN' },
      lock: { mode: 'pessimistic_write' },
    })
    if (!inv) throw new NotFoundException('库存记录不存在')

    if (inv.lockedQuantity < dto.quantity) {
      throw new BadRequestException(`锁定库存不足（锁定 ${inv.lockedQuantity}，需要解锁 ${dto.quantity}）`)
    }

    inv.availableQuantity += dto.quantity
    inv.lockedQuantity -= dto.quantity
    inv.updatedAt = new Date()

    await manager.save(Inventory, inv)
    await manager.save(InventoryTransaction, {
      id: crypto.randomUUID(),
      skuId: dto.skuId,
      skuCode: inv.skuCode,
      structureStandardCode: inv.structureStandardCode,
      warehouseCode: 'WH-MAIN',
      transactionType: TransactionType.UNLOCK,
      quantity: 0,
      quantityBefore: inv.availableQuantity - dto.quantity,
      quantityAfter: inv.availableQuantity,
      referenceType: 'order',
      referenceId: dto.orderId,
      operatorId: operatorId ?? undefined,
      remark: '取消订单库存释放（事务内）',
    })
  }

  /**
   * R7-P0修复：在外部事务中锁定库存（支付时使用）
   * 失败 → 调用方事务回滚，防止超卖
   */
  async lockInTransaction(manager: any, dto: { skuId: string; orderId: string; quantity: number }, operatorId?: string) {
    const inv = await manager.findOne(Inventory, {
      where: { skuId: dto.skuId, warehouseCode: 'WH-MAIN' },
      lock: { mode: 'pessimistic_write' },
    })
    if (!inv) throw new NotFoundException('库存记录不存在')

    if (inv.availableQuantity < dto.quantity) {
      throw new BadRequestException(`可用库存不足（可用 ${inv.availableQuantity}，需要锁定 ${dto.quantity}）`)
    }

    const beforeAvailable = inv.availableQuantity
    inv.availableQuantity -= dto.quantity
    inv.lockedQuantity += dto.quantity
    inv.updatedAt = new Date()

    await manager.save(Inventory, inv)
    await manager.save(InventoryTransaction, {
      id: crypto.randomUUID(),
      skuId: dto.skuId,
      skuCode: inv.skuCode,
      structureStandardCode: inv.structureStandardCode,
      warehouseCode: 'WH-MAIN',
      transactionType: TransactionType.LOCK,
      quantity: 0,
      quantityBefore: beforeAvailable,
      quantityAfter: inv.availableQuantity,
      referenceType: 'order',
      referenceId: dto.orderId,
      operatorId: operatorId ?? undefined,
      remark: `订单锁定 ${dto.quantity} 件`,
    })
  }

  /**
   * R7-P0修复：在外部事务中出库扣减（发货时使用）
   * 失败 → 调用方事务回滚，防止库存不一致
   */
  async stockOutInTransaction(manager: any, dto: { skuId: string; quantity: number; transactionType: string; referenceType?: string; referenceId?: string; remark?: string }, operatorId?: string) {
    const inv = await manager.findOne(Inventory, {
      where: { skuId: dto.skuId, warehouseCode: 'WH-MAIN' },
      lock: { mode: 'pessimistic_write' },
    })
    if (!inv) throw new NotFoundException('库存记录不存在')

    if (inv.availableQuantity < dto.quantity) {
      throw new BadRequestException(`可用库存不足（可用 ${inv.availableQuantity}，需要 ${dto.quantity}）`)
    }

    const before = inv.currentQuantity
    inv.currentQuantity -= dto.quantity
    inv.availableQuantity -= dto.quantity
    inv.updatedAt = new Date()

    await manager.save(Inventory, inv)
    await manager.save(InventoryTransaction, {
      id: crypto.randomUUID(),
      skuId: dto.skuId,
      skuCode: inv.skuCode,
      structureStandardCode: inv.structureStandardCode,
      warehouseCode: 'WH-MAIN',
      transactionType: dto.transactionType,
      quantity: -dto.quantity,
      quantityBefore: before,
      quantityAfter: inv.currentQuantity,
      referenceType: dto.referenceType ?? undefined,
      referenceId: dto.referenceId ?? undefined,
      operatorId: operatorId ?? undefined,
      remark: dto.remark ?? undefined,
    })
  }

  async unlock(dto: UnlockStockDto, operatorId?: string) {
    return this.dataSource.transaction(async (manager) => {
      const inv = await manager.findOne(Inventory, {
        where: { skuId: dto.skuId, warehouseCode: 'WH-MAIN' },
        lock: { mode: 'pessimistic_write' },
      })
      if (!inv) throw new NotFoundException('库存记录不存在')

      if (inv.lockedQuantity < dto.quantity) {
        throw new BadRequestException(`锁定库存不足（锁定 ${inv.lockedQuantity}，需要解锁 ${dto.quantity}）`)
      }

      inv.availableQuantity += dto.quantity
      inv.lockedQuantity -= dto.quantity
      inv.updatedAt = new Date()

      await manager.save(Inventory, inv)
      await manager.save(InventoryTransaction, {
        id: crypto.randomUUID(),
        skuId: dto.skuId,
        skuCode: inv.skuCode,
        structureStandardCode: inv.structureStandardCode,
        warehouseCode: 'WH-MAIN',
        transactionType: TransactionType.UNLOCK,
        quantity: 0,
        quantityBefore: inv.availableQuantity - dto.quantity,
        quantityAfter: inv.availableQuantity,
        referenceType: 'order',
        referenceId: dto.orderId,
        operatorId: operatorId ?? undefined,
        remark: `订单解锁 ${dto.quantity} 件`,
      })

      return inv
    })
  }

  // ===== 盘点调整 =====

  async adjust(dto: AdjustStockDto, operatorId?: string) {
    return this.dataSource.transaction(async (manager) => {
      const inv = await manager.findOne(Inventory, {
        where: { skuId: dto.skuId, warehouseCode: 'WH-MAIN' },
        lock: { mode: 'pessimistic_write' },
      })
      if (!inv) throw new NotFoundException('库存记录不存在')

      const diff = dto.newQuantity - inv.currentQuantity
      const before = inv.currentQuantity

      inv.currentQuantity = dto.newQuantity
      inv.availableQuantity = Math.max(0, dto.newQuantity - inv.lockedQuantity)
      inv.lastStockCheckAt = new Date()
      inv.updatedAt = new Date()

      await manager.save(Inventory, inv)
      await manager.save(InventoryTransaction, {
        id: crypto.randomUUID(),
        skuId: dto.skuId,
        skuCode: inv.skuCode,
        structureStandardCode: inv.structureStandardCode,
        warehouseCode: 'WH-MAIN',
        transactionType: TransactionType.ADJUST,
        quantity: diff,
        quantityBefore: before,
        quantityAfter: dto.newQuantity,
        referenceType: 'adjust',
        operatorId: operatorId ?? undefined,
        remark: dto.remark || `盘点调整：${before} → ${dto.newQuantity}`,
      })

      return inv
    })
  }

  // ===== 统计 =====

  async getStats() {
    const total = await this.inventoryRepo.count()
    const lowStock = await this.inventoryRepo.createQueryBuilder('inv').where('inv.availableQuantity < inv.warningQuantity').getCount()
    const zeroStock = await this.inventoryRepo.count({
      where: { availableQuantity: 0 },
    })

    return { total, lowStock, zeroStock }
  }

  // ===== 清理 =====

  async cleanOldTransactions(days = 90) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const result = await this.transactionRepo.createQueryBuilder().delete().where('created_at < :cutoff', { cutoff }).execute()
    return { deleted: result.affected || 0 }
  }

  // ═══════════════════════════════════════════
  // Phase A: 库存统一 — 单据执行引擎 + 同步钩子
  // ═══════════════════════════════════════════

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
      for (const item of doc.items) {
        const sku = await manager.findOne(Inventory, {
          where: { skuCode: item.skuCode, warehouseCode: item.warehouseCode || 'WH-MAIN' },
          lock: { mode: 'pessimistic_write' },
        })
        if (!sku) throw new NotFoundException(`SKU ${item.skuCode} 无库存记录，请先初始化`)

        const before = sku.currentQuantity
        const txType = doc.docType === 'stock_in' ? TransactionType.STOCK_IN
          : doc.docType === 'stock_out' ? TransactionType.STOCK_OUT
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

        // 写入流水
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

        // H6修复：同步回写product_sku.stock_quantity = currentQuantity（物理库存）
        await manager.query(
          'UPDATE product_sku SET stock_quantity = ? WHERE sku_code = ?',
          [sku.currentQuantity, sku.skuCode],
        )
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
   * 确认单据（pending → confirmed）
   */
  async confirmDocument(docId: string, operatorId?: string): Promise<InventoryDocument> {
    // H14修复：状态更新+执行在同一事务中，执行失败则回滚状态
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

  // 4R05修复：直接使用外部事务manager，消除嵌套事务
  private async executeDocumentInTx(manager: any, docId: string, operatorId?: string): Promise<void> {
    const doc = await manager.findOne(InventoryDocument, { where: { id: docId } })
    if (!doc || doc.status !== 'confirmed') return

    for (const item of doc.items || []) {
      // Same logic as executeDocument but using external manager
      const sku = await manager.findOne(Inventory, {
        where: { skuCode: item.skuCode, warehouseCode: item.warehouseCode || 'WH-MAIN' },
        lock: { mode: 'pessimistic_write' },
      })
      if (!sku) throw new NotFoundException(`SKU ${item.skuCode} 无库存记录`)

      const before = sku.currentQuantity
      const txType = doc.docType === 'stock_in' ? TransactionType.STOCK_IN : TransactionType.STOCK_OUT
      const qty = doc.docType === 'stock_out' ? -item.quantity : item.quantity
      if (doc.docType === 'stock_in') { sku.currentQuantity += item.quantity; sku.availableQuantity += item.quantity }
      else {
        if (sku.availableQuantity < item.quantity) throw new BadRequestException(`${item.skuCode} 可用库存不足`)
        sku.currentQuantity -= item.quantity; sku.availableQuantity -= item.quantity
      }
      sku.updatedAt = new Date()
      await manager.save(Inventory, sku)
      await manager.save(InventoryTransaction, {
        id: crypto.randomUUID(), skuId: sku.skuId, skuCode: sku.skuCode, warehouseCode: sku.warehouseCode,
        transactionType: txType, quantity: qty, quantityBefore: before, quantityAfter: sku.currentQuantity,
        referenceType: 'document', referenceId: doc.id, operatorId: operatorId ?? undefined,
        remark: `单据执行: ${doc.docNo}`,
      })
      await manager.query('UPDATE product_sku SET stock_quantity = ? WHERE sku_code = ?', [sku.currentQuantity, sku.skuCode])
    }
  }

  /**
   * 获取所有单据
   */
  async findDocuments(params: { status?: string; docType?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const qb = this.documentRepo.createQueryBuilder('d')

    if (params.status) qb.andWhere('d.status = :status', { status: params.status })
    if (params.docType) qb.andWhere('d.docType = :docType', { docType: params.docType })

    qb.orderBy('d.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize)
    const [items, total] = await qb.getManyAndCount()
    return { items, total, page, pageSize }
  }
}
