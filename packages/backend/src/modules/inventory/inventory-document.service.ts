import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Inventory } from './entity/inventory.entity'
import { InventoryTransaction, TransactionType } from './entity/inventory-transaction.entity'
import { InventoryDocument } from './entity/inventory-document.entity'

/**
 * 搴撳瓨鍗曟嵁瀛?Service
 *
 * 璐熻矗锛欰gent 鍒涘缓鐨勫崟鎹墽琛屽紩鎿? * 閾捐矾锛歱ending 鈫?confirmed 鈫?executed
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
   * 纭鍗曟嵁锛坧ending 鈫?confirmed锛?   * H14淇锛氱姸鎬佹洿鏂?鎵ц鍦ㄥ悓涓€浜嬪姟涓紝鎵ц澶辫触鍒欏洖婊氱姸鎬?   */
  async confirmDocument(docId: string, operatorId?: string): Promise<InventoryDocument> {
    return this.dataSource.transaction(async (manager) => {
      const doc = await manager.findOne(InventoryDocument, { where: { id: docId } })
      if (!doc) throw new NotFoundException('鍗曟嵁涓嶅瓨鍦?)
      if (doc.status !== 'pending') throw new BadRequestException('鍙兘纭寰呭鐞嗙殑鍗曟嵁')

      doc.status = 'confirmed'
      doc.confirmedBy = operatorId || 'system'
      await manager.save(InventoryDocument, doc)

      await this.executeDocumentInTx(manager, docId, operatorId)
      return doc
    })
  }

  /**
   * 鎵ц搴撳瓨鍗曟嵁锛圓gent 鍒涘缓鍗曟嵁 鈫?纭鍚庢墽琛?鈫?鍏ヨ处锛?   *
   * Agent 璋冪敤閾捐矾锛?   *   erdl_crud create InventoryDocument 鈫?pending
   *   鈫?浜哄伐纭/鑷姩纭 鈫?confirmed
   *   鈫?executeDocument() 鈫?stock_in/stock_out 鈫?executed
   */
  async executeDocument(docId: string, operatorId?: string): Promise<InventoryDocument> {
    const doc = await this.documentRepo.findOne({ where: { id: docId } })
    if (!doc) throw new NotFoundException('鍗曟嵁涓嶅瓨鍦?)
    if (doc.status !== 'confirmed') throw new BadRequestException('鍙兘鎵ц宸茬‘璁ょ殑鍗曟嵁')

    await this.dataSource.transaction(async (manager) => {
      await this.executeDocumentInTx(manager, docId, operatorId)
    })

    const updated = await this.documentRepo.findOne({ where: { id: docId } })
    if (!updated) throw new NotFoundException('鍗曟嵁涓嶅瓨鍦?)
    this.logger.log(`[Inventory] 鍗曟嵁 ${updated.docNo} 鎵ц瀹屾垚`)
    return updated
  }

  /**
   * 鍗曟嵁鎵ц鏍稿績閫昏緫锛堝湪澶栭儴浜嬪姟涓繍琛岋級
   * 4R05淇锛氱洿鎺ヤ娇鐢ㄥ閮ㄤ簨鍔anager锛屾秷闄ゅ祵濂椾簨鍔?   */
  private async executeDocumentInTx(manager: any, docId: string, operatorId?: string): Promise<void> {
    const doc = await manager.findOne(InventoryDocument, { where: { id: docId } })
    if (!doc || doc.status !== 'confirmed') return

    for (const item of doc.items || []) {
      const sku = await manager.findOne(Inventory, {
        where: { skuCode: item.skuCode, warehouseCode: item.warehouseCode || 'WH-MAIN' },
        lock: { mode: 'pessimistic_write' },
      })
      if (!sku) throw new NotFoundException(`SKU ${item.skuCode} 鏃犲簱瀛樿褰曪紝璇峰厛鍒濆鍖朻)

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
          throw new BadRequestException(`${item.skuCode} 鍙敤搴撳瓨涓嶈冻锛堝彲鐢?{sku.availableQuantity}锛岄渶瑕?{item.quantity}锛塦)
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
        remark: `鍗曟嵁鎵ц: ${doc.docNo} (${doc.docType})`,
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
