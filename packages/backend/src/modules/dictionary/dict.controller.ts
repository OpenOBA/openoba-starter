import { Controller, Get, Post, Put, Delete, Param, Body, BadRequestException, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger'
import { DictionaryService } from './dict.service'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import * as crypto from 'crypto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('字典管理')
@UseGuards(JwtAuthGuard)
@Controller('dict')
export class DictController {
  constructor(
    private dictService: DictionaryService,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取所有字典表名' })
  listTables() {
    return this.dictService.getAllTables()
  }

  /**
   * 写入列名映射：前端标准字段名 → 数据库实际列名
   * 读取时 columnAlias 把实际列名 AS 为标准列名，写入时需要反向映射
   */
  private readonly writeColumnAlias: Record<string, Record<string, string>> = {
    dict_frame_type: {
      code: 'type_code',
      name: 'type_name',
      description: 'description',
      is_active: 'is_active',
      sort_order: 'sort_order',
      extra: 'extra',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
    dict_frame_material: {
      code: 'material_code',
      name: 'material_name',
      description: 'description',
      material_category: 'material_category',
      is_active: 'is_active',
      sort_order: 'sort_order',
      extra: 'extra',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
    dict_product_tier: {
      code: 'tier_code',
      name: 'tier_name',
      description: 'tier_desc',
      sort_order: 'sort_order',
      icon_color: 'icon_color',
      is_active: 'is_active',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
    dict_customer_status: {
      code: 'code',
      name: 'name',
      description: 'description',
      color: 'color',
      is_active: 'is_active',
      sort_order: 'sort_order',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
    dict_referral_source: {
      code: 'code',
      name: 'name',
      description: 'description',
      channel_group: 'channel_group',
      is_active: 'is_active',
      sort_order: 'sort_order',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
    dict_subscription_status: {
      code: 'code',
      name: 'name',
      description: 'description',
      color: 'color',
      is_active: 'is_active',
      sort_order: 'sort_order',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
    dict_contact_role: {
      code: 'code',
      name: 'name',
      description: 'description',
      is_default: 'is_default',
      is_active: 'is_active',
      sort_order: 'sort_order',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
    dict_hinge: {
      code: 'hinge_code',
      name: 'hinge_name',
      description: 'description',
      hinge_en: 'hinge_en',
      features: 'features',
      is_active: 'is_active',
      sort_order: 'sort_order',
      extra: 'extra',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
    dict_nose_pad: {
      code: 'pad_code',
      name: 'pad_name',
      description: 'description',
      pad_en: 'pad_en',
      is_adjustable: 'is_adjustable',
      is_active: 'is_active',
      sort_order: 'sort_order',
      extra: 'extra',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
    dict_surface_treatment: {
      code: 'treatment_code',
      name: 'treatment_name',
      description: 'description',
      treatment_en: 'treatment_en',
      is_active: 'is_active',
      sort_order: 'sort_order',
      extra: 'extra',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
    structure_shape: {
      code: 'shape_code',
      name: 'shape_name',
      name_en: 'shape_name_en',
      icon: 'icon',
      description: 'description',
      sort_order: 'sort_order',
      is_active: 'is_active',
    },
    structure_series: {
      code: 'series_code',
      name: 'series_name',
      name_en: 'series_name_en',
      description: 'description',
      sort_order: 'sort_order',
      is_active: 'is_active',
    },
    structure_material: {
      code: 'material_code',
      name: 'material_name',
      name_en: 'material_name_en',
      category: 'category',
      description: 'description',
      sort_order: 'sort_order',
      is_active: 'is_active',
    },
    dict_effect_tag: {
      code: 'effect_code',
      name: 'effect_name',
      description: 'description',
      effect_type: 'effect_type',
      target_value: 'target_value',
      recommended_colors: 'recommended_colors',
      sort_order: 'sort_order',
      is_active: 'is_active',
    },
    dict_sku_color: {
      code: 'color_code',
      name: 'color_name',
      name_en: 'color_name_en',
      description: 'description',
      color_family: 'color_family',
      color_type: 'color_type',
      hex_value: 'hex_value',
      pinyin_name: 'pinyin_name',
      pinyin_initial: 'pinyin_initial',
      pantone_ref: 'pantone_ref',
      preview_image: 'preview_image',
      trend_score: 'trend_score',
      sort_order: 'sort_order',
      is_active: 'is_active',
      created_at: 'created_at',
      updated_at: 'updated_at',
    },
  }

  /** 列名转换：前端标准字段 → 数据库实际列名 */
  private translateColumns(table: string, body: Record<string, any>): Record<string, any> {
    const alias = this.writeColumnAlias[table]
    if (!alias) return body
    const result: Record<string, any> = {}
    for (const [key, val] of Object.entries(body)) {
      result[alias[key] ?? key] = val
    }
    return result
  }

  /**
   * 非标列名映射表：表名 → SQL 列名标准化表达式
   * 把各表的主键列和名称列统一映射为 code / name，前端 useDict 只认这两个字段
   */
  private readonly columnAlias: Record<string, string> = {
    // 标准列名 (code, name) 的表不需要映射，直接 SELECT *
    // 非标列名的表：把实际列名 AS 为标准列名
    dict_frame_type: 'type_code AS code, type_name AS name, type_en, description, is_active, sort_order, extra, created_at, updated_at',
    dict_frame_material:
      'material_code AS code, material_name AS name, material_en AS material_en, material_category, description, is_active, sort_order, extra, created_at, updated_at',
    dict_product_tier:
      'tier_code AS code, tier_name AS name, tier_desc AS description, sort_order, icon_color, is_active, created_at, updated_at',
    dict_hinge:
      'hinge_code AS code, hinge_name AS name, hinge_en, features, description, is_active, sort_order, extra, created_at, updated_at',
    dict_nose_pad:
      'pad_code AS code, pad_name AS name, pad_en, is_adjustable, description, is_active, sort_order, extra, created_at, updated_at',
    dict_surface_treatment:
      'treatment_code AS code, treatment_name AS name, treatment_en, description, is_active, sort_order, extra, created_at, updated_at',
    structure_shape: 'shape_code AS code, shape_name AS name, shape_name_en AS name_en, icon, description, sort_order, is_active',
    structure_series: 'series_code AS code, series_name AS name, series_name_en AS name_en, description, sort_order, is_active',
    structure_material:
      'material_code AS code, material_name AS name, material_name_en AS name_en, category, description, sort_order, is_active',
    dict_effect_tag:
      'effect_code AS code, effect_name AS name, effect_type, target_value, recommended_colors, description, sort_order, is_active',
    dict_sku_color:
      'color_code AS code, color_name AS name, color_name_en AS name_en, pinyin_name, pinyin_initial, color_family, color_type, hex_value, pantone_ref, preview_image, description, trend_score, sort_order, is_active, created_at, updated_at',
  }

  @Get(':table')
  @ApiOperation({ summary: '查询字典列表' })
  @ApiParam({ name: 'table', description: '字典表名' })
  async getDict(@Param('table') table: string) {
    const tableName = this.dictService.getTableName(table)
    if (!tableName) {
      throw new BadRequestException(`无效的字典表: ${table}`)
    }
    // 如果有列名映射，使用 AS 标准化；否则 SELECT *
    const selectClause = this.columnAlias[tableName] || '*'
    const rows = await this.dataSource.query(`SELECT ${selectClause} FROM ${tableName} ORDER BY sort_order ASC`)
    return rows
  }

  /** 需要生成 dict_id (UUID) 作为主键的字典表 */
  private readonly dictIdTables = new Set([
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
    'dict_compatibility_level',
    'dict_audit_status',
  ])

  @Post(':table')
  @ApiOperation({ summary: '新增字典项' })
  @ApiParam({ name: 'table', description: '字典表名' })
  async addDict(@Param('table') table: string, @Body() body: Record<string, unknown>) {
    const tableName = this.dictService.getTableName(table)
    if (!tableName) {
      throw new BadRequestException(`无效的字典表: ${table}`)
    }
    // 列名转换：前端标准字段 → 数据库实际列名
    const translated = this.translateColumns(tableName, body)
    // 生成主键 UUID
    if (this.dictIdTables.has(tableName) && (!translated['dict_id'] || translated['dict_id'] === '')) {
      translated['dict_id'] = this.generateUUID()
    }
    // 查询表的实际列名，过滤掉不存在的列
    const cols = await this.getTableColumns(tableName)
    const validTranslated: Record<string, any> = {}
    for (const [key, val] of Object.entries(translated)) {
      if (cols.has(key)) {
        validTranslated[key] = val
      }
    }
    // 排除主键和唯一键列（避免 ON DUPLICATE KEY UPDATE 冲突）
    const pkFields = ['dict_id', 'id']
    const uniqueFields = [
      'code',
      'type_code',
      'material_code',
      'shape_code',
      'series_code',
      'color_code',
      'tier_code',
      'hinge_code',
      'pad_code',
      'treatment_code',
      'effect_code',
      'color_code',
      'color_id',
    ]
    const skipFields = new Set([...pkFields, ...uniqueFields, 'created_at'])
    const updateFields = Object.keys(validTranslated).filter((c) => !skipFields.has(c))
    const columns = Object.keys(validTranslated)
    const values = Object.values(validTranslated)
    const placeholders = values.map(() => '?').join(', ')
    const setClause = updateFields.length > 0 ? updateFields.map((c) => `${c} = VALUES(${c})`).join(', ') : 'sort_order = sort_order'
    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${setClause}`
    await this.dataSource.query(sql, values)
    return { message: '新增成功' }
  }

  /** 缓存表列名，避免重复查询 */
  private tableColumnsCache = new Map<string, Set<string>>()

  private async getTableColumns(tableName: string): Promise<Set<string>> {
    if (this.tableColumnsCache.has(tableName)) {
      return this.tableColumnsCache.get(tableName)!
    }
    const rows = (await this.dataSource.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tableName],
    )) as Array<{ COLUMN_NAME: string }>
    const cols = new Set<string>(rows.map((r) => r.COLUMN_NAME))
    this.tableColumnsCache.set(tableName, cols)
    return cols
  }

  @Put(':table/:key')
  @ApiOperation({ summary: '更新字典项' })
  @ApiParam({ name: 'table', description: '字典表名' })
  @ApiParam({ name: 'key', description: '主键值' })
  async updateDict(@Param('table') table: string, @Param('key') key: string, @Body() body: Record<string, unknown>) {
    const tableName = this.dictService.getTableName(table)
    if (!tableName) {
      throw new BadRequestException(`无效的字典表: ${table}`)
    }
    // 列名转换：前端标准字段 → 数据库实际列名
    const translated = this.translateColumns(tableName, body)
    // 查询表的实际列名，只尝试存在的列
    const cols = await this.getTableColumns(tableName)
    const keyFields = [
      'code',
      'material_code',
      'type_code',
      'shape_code',
      'series_code',
      'color_code',
      'color_id',
      'dict_id',
      'tier_code',
      'effect_code',
      'id',
    ]
    const availableKeys = keyFields.filter((kf) => cols.has(kf))
    let foundField = ''
    let actualKey = key
    for (const kf of availableKeys) {
      const rows = await this.dataSource.query(`SELECT ${kf} FROM ${tableName} WHERE ${kf} = ? LIMIT 1`, [key])
      if (rows.length > 0) {
        foundField = kf
        actualKey = rows[0][kf]
        break
      }
    }
    if (!foundField) {
      throw new BadRequestException(`未找到主键字段，无法更新`)
    }
    // 过滤掉主键字段和时间字段，避免唯一键冲突和 datetime 格式问题
    const updateFields = Object.keys(translated).filter((c) => c !== foundField && c !== 'created_at' && c !== 'updated_at')
    if (updateFields.length === 0) {
      return { message: '无需更新' }
    }
    const setClause = updateFields.map((c) => `${c} = ?`).join(', ')
    const values = updateFields.map((c) => translated[c])
    await this.dataSource.query(`UPDATE ${tableName} SET ${setClause} WHERE ${foundField} = ?`, [...values, actualKey])
    return { message: '更新成功' }
  }

  @Delete(':table/:key')
  @ApiOperation({ summary: '删除字典项' })
  @ApiParam({ name: 'table', description: '字典表名' })
  @ApiParam({ name: 'key', description: '主键值' })
  async deleteDict(@Param('table') table: string, @Param('key') key: string) {
    const tableName = this.dictService.getTableName(table)
    if (!tableName) {
      throw new BadRequestException(`无效的字典表: ${table}`)
    }
    // 查询表的实际列名，只尝试存在的列
    const cols = await this.getTableColumns(tableName)
    const keyFields = [
      'code',
      'material_code',
      'type_code',
      'shape_code',
      'series_code',
      'color_code',
      'color_id',
      'dict_id',
      'tier_code',
      'effect_code',
      'id',
    ]
    const availableKeys = keyFields.filter((kf) => cols.has(kf))
    // 优先软删除（如果有 is_active 字段）
    if (cols.has('is_active')) {
      for (const kf of availableKeys) {
        const rows = await this.dataSource.query(`SELECT ${kf} FROM ${tableName} WHERE ${kf} = ? LIMIT 1`, [key])
        if (rows.length > 0) {
          await this.dataSource.query(`UPDATE ${tableName} SET is_active = 0 WHERE ${kf} = ?`, [key])
          return { message: '已软删' }
        }
      }
    }
    // 否则硬删除
    for (const kf of availableKeys) {
      const rows = await this.dataSource.query(`SELECT ${kf} FROM ${tableName} WHERE ${kf} = ? LIMIT 1`, [key])
      if (rows.length > 0) {
        await this.dataSource.query(`DELETE FROM ${tableName} WHERE ${kf} = ?`, [key])
        return { message: '删除成功' }
      }
    }
    throw new BadRequestException('未找到该记录')
  }

  // V1.4-a #13: UUID 使用 crypto.randomUUID()（密码学安全）
  private generateUUID(): string {
    return crypto.randomUUID()
  }

  private async hasColumn(tableName: string, columnName: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [tableName, columnName],
    )
    return rows.length > 0
  }
}
