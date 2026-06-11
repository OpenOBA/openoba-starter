import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { Inventory } from './entity/inventory.entity'
import { InventoryTransaction, TransactionType } from './entity/inventory-transaction.entity'

/**
 * 搴撳瓨浜嬪姟鍐呭瓙 Service
 *
 * 璐熻矗锛氬湪澶栭儴浜嬪姟涓璋冪敤鐨勫簱瀛樻搷浣滄柟娉? * 杩欎簺鏂规硶鐨?manager 鍙傛暟鐢辫皟鐢ㄦ柟锛圤rderService锛変紶鍏ワ紝
 * 纭繚涓庤皟鐢ㄦ柟浜嬪姟鍏变韩鍚屼竴涓繛鎺ワ紝瀹炵幇涓€鑷存€? *
 * 鈿狅笍 鍏抽敭绾︽潫锛氳繖浜涙柟娉曚笉鍒涘缓鐙珛浜嬪姟锛屼笉鍦?NestJS DI 涓敞鍏?Repository
 * 鎵€鏈夋暟鎹搷浣滈€氳繃璋冪敤鏂逛紶鍏ョ殑 manager 浠ｇ悊
 */
@Injectable()
export class InventoryTxService {
  /**
   * P0-2淇锛氬凡鍙戣揣璁㈠崟鍙栨秷鏃跺洖婊氬簱瀛橈紙stockIn锛屽湪澶栭儴浜嬪姟鍐咃級
   */
  async rollbackStockInTransaction(
    manager: any,
    dto: { skuId: string; orderId: string; quantity: number },
    operatorId?: string,
  ) {
    const inv = await manager.findOne(Inventory, {
      where: { skuId: dto.skuId, warehouseCode: 'WH-MAIN' },
      lock: { mode: 'pessimistic_write' },
    })
    if (!inv) throw new NotFoundException('搴撳瓨璁板綍涓嶅瓨鍦?)

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
      remark: `宸插彂璐ц鍗曞彇娑堝簱瀛樺洖婊?${dto.quantity} 浠禶,
    })
  }

  /**
   * C7-P0淇锛氬湪澶栭儴浜嬪姟涓В閿佸簱瀛橈紙鐢辫皟鐢ㄦ柟绠＄悊浜嬪姟锛?   */
  async unlockInTransaction(
    manager: any,
    dto: { skuId: string; orderId: string; quantity: number },
    operatorId?: string,
  ) {
    const inv = await manager.findOne(Inventory, {
      where: { skuId: dto.skuId, warehouseCode: 'WH-MAIN' },
      lock: { mode: 'pessimistic_write' },
    })
    if (!inv) throw new NotFoundException('搴撳瓨璁板綍涓嶅瓨鍦?)

    if (inv.lockedQuantity < dto.quantity) {
      throw new BadRequestException(`閿佸畾搴撳瓨涓嶈冻锛堥攣瀹?${inv.lockedQuantity}锛岄渶瑕佽В閿?${dto.quantity}锛塦)
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
      remark: '鍙栨秷璁㈠崟搴撳瓨閲婃斁锛堜簨鍔″唴锛?,
    })
  }

  /**
   * R7-P0淇锛氬湪澶栭儴浜嬪姟涓攣瀹氬簱瀛橈紙鏀粯鏃朵娇鐢級
   * 澶辫触 鈫?璋冪敤鏂逛簨鍔″洖婊氾紝闃叉瓒呭崠
   */
  async lockInTransaction(
    manager: any,
    dto: { skuId: string; orderId: string; quantity: number },
    operatorId?: string,
  ) {
    const inv = await manager.findOne(Inventory, {
      where: { skuId: dto.skuId, warehouseCode: 'WH-MAIN' },
      lock: { mode: 'pessimistic_write' },
    })
    if (!inv) throw new NotFoundException('搴撳瓨璁板綍涓嶅瓨鍦?)

    if (inv.availableQuantity < dto.quantity) {
      throw new BadRequestException(`鍙敤搴撳瓨涓嶈冻锛堝彲鐢?${inv.availableQuantity}锛岄渶瑕侀攣瀹?${dto.quantity}锛塦)
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
      remark: `璁㈠崟閿佸畾 ${dto.quantity} 浠禶,
    })
  }

  /**
   * R7-P0淇锛氬湪澶栭儴浜嬪姟涓嚭搴撴墸鍑忥紙鍙戣揣鏃朵娇鐢級
   * 澶辫触 鈫?璋冪敤鏂逛簨鍔″洖婊氾紝闃叉搴撳瓨涓嶄竴鑷?   */
  async stockOutInTransaction(
    manager: any,
    dto: {
      skuId: string
      quantity: number
      transactionType: string
      referenceType?: string
      referenceId?: string
      remark?: string
    },
    operatorId?: string,
  ) {
    const inv = await manager.findOne(Inventory, {
      where: { skuId: dto.skuId, warehouseCode: 'WH-MAIN' },
      lock: { mode: 'pessimistic_write' },
    })
    if (!inv) throw new NotFoundException('搴撳瓨璁板綍涓嶅瓨鍦?)

    if (inv.availableQuantity < dto.quantity) {
      throw new BadRequestException(`鍙敤搴撳瓨涓嶈冻锛堝彲鐢?${inv.availableQuantity}锛岄渶瑕?${dto.quantity}锛塦)
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
}
