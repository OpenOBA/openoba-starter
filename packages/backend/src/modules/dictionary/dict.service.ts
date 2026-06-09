import { Injectable } from '@nestjs/common'

@Injectable()
export class DictionaryService {
  // 字典表映射 — 前端 key → 数据库实际表名
  private readonly dictTables: Record<string, string> = {
    // 客户相关
    dict_customer_type: 'dict_customer_type',
    dict_customer_level: 'dict_customer_level',
    // 订单相关
    dict_order_status: 'dict_order_status',
    dict_payment_method: 'dict_payment_method',
    dict_payment_status: 'dict_payment_status',
    dict_payment_scene: 'dict_payment_scene',
    // 物流相关
    dict_logistics_company: 'dict_logistics_company',
    dict_logistics_status: 'dict_logistics_status',
    dict_logistics_trace_type: 'dict_logistics_trace_type',
    // 售后/评价
    dict_after_sale_status: 'dict_after_sale_status',
    dict_review_status: 'dict_review_status',
    dict_after_sale_reason: 'dict_after_sale_reason',
    dict_review_tag: 'dict_review_tag',
    // 产品相关
    dict_product_type: 'dict_product_type',
    dict_product_tier: 'dict_product_tier',
    // 技术参数（Phase 8B）
    dict_frame_material: 'dict_frame_material',
    dict_frame_type: 'dict_frame_type',
    dict_nose_pad: 'dict_nose_pad',
    dict_hinge: 'dict_hinge',
    dict_surface_treatment: 'dict_surface_treatment',
    // 兼容性/审核
    dict_compatibility_level: 'dict_compatibility_level',
    dict_audit_status: 'dict_audit_status',
    // 结构标准库（非 dict_ 前缀表，但通过字典 API 查询）
    structure_shape: 'structure_shape',
    structure_series: 'structure_series',
    structure_material: 'structure_material',
    // 日常运营字典表（TASK-013 Batch 1 新增）
    dict_product_status: 'dict_product_status',
    dict_promotion_status: 'dict_promotion_status',
    dict_sku_status: 'dict_sku_status',
    // 客户管理运营字典（TASK-013 Batch 2）
    dict_customer_status: 'dict_customer_status',
    dict_referral_source: 'dict_referral_source',
    dict_subscription_status: 'dict_subscription_status',
    dict_contact_role: 'dict_contact_role',
    // 美学效果 & 商品颜色
    dict_effect_tag: 'dict_effect_tag',
    dict_sku_color: 'dict_sku_color',
    // S-SKU 字典表
    dict_refractive_index: 'dict_refractive_index',
    dict_lens_function: 'dict_lens_function',
    dict_lens_coating: 'dict_lens_coating',
    dict_lens_material: 'dict_lens_material',
    dict_unit: 'dict_unit',
    dict_brand: 'dict_brand',
  }

  getTableName(tableKey: string): string | null {
    return this.dictTables[tableKey] || null
  }

  getAllTables(): string[] {
    return Object.keys(this.dictTables)
  }

  // 获取所有已注册的字典表（含真实表名，用于编辑时校验）
  getAllTableMappings(): Record<string, string> {
    return { ...this.dictTables }
  }
}
