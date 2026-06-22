/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Injectable, OnModuleInit, Logger, BadRequestException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { DictionaryService } from '../modules/dictionary/dict.service'

/** 允许查询的数据库表名白名单（防止 SQL 注入） */
const ALLOWED_TABLES = new Set([
  'dict_customer_type',
  'dict_customer_level',
  'dict_order_status',
  'dict_payment_method',
  'dict_payment_status',
  'dict_payment_scene',
  'dict_logistics_company',
  'dict_logistics_status',
  'dict_logistics_trace_type',
  'dict_after_sale_status',
  'dict_review_status',
  'dict_after_sale_reason',
  'dict_review_tag',
  'dict_product_type',
  'dict_product_tier',
  'dict_frame_material',
  'dict_frame_type',
  'dict_nose_pad',
  'dict_hinge',
  'dict_surface_treatment',
  'dict_compatibility_level',
  'dict_audit_status',
  'structure_shape',
  'structure_series',
  'structure_material',
  'dict_product_status',
  'dict_promotion_status',
  'dict_sku_status',
  'dict_customer_status',
  'dict_referral_source',
  'dict_subscription_status',
  'dict_contact_role',
  'dict_effect_tag',
  'dict_sku_color',
  'dict_refractive_index',
  'dict_lens_function',
  'dict_lens_coating',
  'dict_lens_material',
  'dict_unit',
  'dict_brand',
])

/**
 * 后端字典常量缓存模块
 *
 * 在应用启动时从数据库加载所有已注册字典表的数据到内存缓存，
 * 为后续硬编码替换提供单一事实来源。
 *
 * 用法：
 *   // 在 service 中注入
 *   constructor(private dictConstants: DictConstantsService) {}
 *
 *   // 获取字典项
 *   const items = this.dictConstants.getDict('dict_order_status');
 *   // 按 code 快速查找
 *   const pending = this.dictConstants.getByKey('dict_order_status', 'pending');
 */

export interface DictItem {
  code: string
  name: string
  sort_order: number
  is_active: number
  [key: string]: any
}

@Injectable()
export class DictConstantsService implements OnModuleInit {
  private readonly logger = new Logger(DictConstantsService.name)
  private cache = new Map<string, DictItem[]>()
  private ready = false

  constructor(
    private dictService: DictionaryService,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.loadAll()
  }

  /** 加载所有已注册字典表到缓存 */
  async loadAll() {
    const tables = this.dictService.getAllTableMappings()
    const keys = Object.keys(tables)

    await Promise.all(
      keys.map(async (key) => {
        try {
          const tableName = tables[key]
          // 白名单校验：防止 SQL 注入
          if (!ALLOWED_TABLES.has(tableName)) {
            throw new BadRequestException(`字典表白名单校验失败: ${tableName}`)
          }
          const rows = await this.dataSource.query(`SELECT * FROM ${tableName} ORDER BY sort_order ASC`)
          const items = rows.filter((r: any) => r.is_active !== 0 && r.is_active !== false)
          this.cache.set(key, items as DictItem[])
        } catch (err) {
          this.logger.warn(`字典表 ${key} 加载失败: ${(err as Error).message}`)
          this.cache.set(key, [])
        }
      }),
    )

    this.ready = true
    this.logger.log(`字典常量缓存加载完成，共 ${keys.length} 个字典表`)
  }

  /** 获取字典项列表 */
  getDict(key: string): DictItem[] {
    return this.cache.get(key) || []
  }

  /** 按 code 获取单个字典项 */
  getByKey(key: string, code: string): DictItem | undefined {
    const items = this.cache.get(key)
    if (!items) return undefined
    return items.find((item) => item.code === code)
  }

  /** 获取所有 code 值的集合（用于校验） */
  getCodes(key: string): Set<string> {
    const items = this.cache.get(key)
    if (!items) return new Set()
    return new Set(items.map((item) => item.code))
  }

  /** 获取 { code: name } 映射 */
  getLabels(key: string): Record<string, string> {
    const items = this.cache.get(key)
    if (!items) return {}
    const labels: Record<string, string> = {}
    for (const item of items) {
      labels[item.code] = item.name
    }
    return labels
  }

  /** 是否已就绪 */
  isReady(): boolean {
    return this.ready
  }
}
