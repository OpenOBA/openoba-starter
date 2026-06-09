// @openoba/types — 售后层接口
// 来源：after-sales.entity.ts
// V1.4-b M1 Step 4

import { AfterSalesStatus, AfterSalesType, AfterSalesReason, RefundMethod, ApplicantType } from '../enums/after-sales.enum'

export interface IAfterSales {
  /** UUID 主键 */
  id: string
  /** 售后单号（唯一） */
  afterSalesNo: string
  /** 关联订单 ID */
  orderId: string
  /** 订单号 */
  orderNo: string | null
  /** 客户 ID */
  customerId: string | null
  /** 客户姓名 */
  customerName: string | null
  /** 售后类型 */
  afterSalesType: AfterSalesType
  /** 售后原因类型 */
  reasonType: AfterSalesReason
  /** 详细原因描述 */
  reasonDetail: string | null
  /** 凭证图片 URL 列表 */
  evidenceUrls: string[]
  /** 退款金额 */
  refundAmount: string
  /** 实际退款金额 */
  actualRefundAmount: string | null
  /** 退款方式 */
  refundMethod: RefundMethod
  /** 申请人类型 */
  applicantType: ApplicantType
  /** 售后状态 */
  status: AfterSalesStatus
  /** 处理人 */
  handler: string | null
  /** 处理时间 */
  handledAt: Date | null
  /** 备注 */
  remark?: string
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
}
