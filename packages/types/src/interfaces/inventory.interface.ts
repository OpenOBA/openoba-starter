// @openoba/types — 库存层接口
// 来源：inventory.entity.ts, inventory-transaction.entity.ts
// V1.4-b M1 Step 4

import { TransactionType } from '../enums/inventory.enum'

export interface IInventory {
  /** UUID 主键 */
  id: string
  /** 关联 SKU ID */
  skuId: string
  /** SKU 编码 */
  skuCode: string
  /** 结构标准编码 */
  structureStandardCode: string | null
  /** 仓库编码 */
  warehouseCode: string
  /** 当前数量 */
  currentQuantity: number
  /** 可用数量 */
  availableQuantity: number
  /** 锁定数量 */
  lockedQuantity: number
  /** 预警数量 */
  warningQuantity: number
  /** 最后盘点时间 */
  lastStockCheckAt: Date
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
}

export interface IInventoryTransaction {
  /** UUID 主键 */
  id: string
  /** 关联 SKU ID */
  skuId: string
  /** SKU 编码 */
  skuCode: string
  /** 结构标准编码 */
  structureStandardCode: string | null
  /** 仓库编码 */
  warehouseCode: string
  /** 交易类型 */
  transactionType: TransactionType
  /** 数量 */
  quantity: number
  /** 变更前数量 */
  quantityBefore: number
  /** 变更后数量 */
  quantityAfter: number
  /** 关联类型 */
  referenceType: string
  /** 关联 ID */
  referenceId: string
  /** 操作人 */
  operator: string
  /** 备注 */
  remark?: string
  /** 创建时间 */
  createdAt: Date
}
