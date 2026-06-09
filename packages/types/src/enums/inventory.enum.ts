// @openoba/types — 库存层枚举
// 来源：inventory-transaction.entity.ts + inventory-document.entity.ts
// V1.4-b M1 Step 3

/** 库存交易类型 */
export enum TransactionType {
  STOCK_IN = 'stock_in',
  STOCK_OUT = 'stock_out',
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

/** 库存单据类型 */
export const DOCUMENT_TYPE = ['stock_in', 'stock_out', 'transfer', 'adjustment'] as const
export type DocumentType = (typeof DOCUMENT_TYPE)[number]

/** 库存单据来源 */
export const DOCUMENT_SOURCE = ['agent', 'manual', 'platform', 'ocr'] as const
export type DocumentSource = (typeof DOCUMENT_SOURCE)[number]

/** 库存单据状态 */
export const DOCUMENT_STATUS = ['draft', 'pending', 'confirmed', 'executed', 'rejected'] as const
export type DocumentStatus = (typeof DOCUMENT_STATUS)[number]
