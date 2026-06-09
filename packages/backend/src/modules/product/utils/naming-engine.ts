/**
 * 秒镜 SPU/SKU 命名引擎 V2.0
 *
 * 职责：根据数据按公式生成 SPU/SKU 展示名称
 * 设计原则：
 *   - 纯函数逻辑，不依赖数据库连接
 *   - 所有外部数据通过参数传入，引擎只做拼装
 *   - 字段顺序严格按 V2.0 规范，不可随意打乱
 *
 * SPU 命名公式：秒镜 S{对外编号} · {造型}{系列}系列
 * SKU 命名公式：秒镜 S{对外编号} · {肤色效果} · {脸型效果} · {色彩} · {造型}{系列}系列 · {款式}
 */

// ========================================
// 常量定义
// ========================================

/** 造型代码 → 展示名映射（与数据库 structure_shape 表对齐） */
const SHAPE_DISPLAY_MAP: Record<string, string> = {
  SQR: '方框',
  RND: '圆框',
  REC: '矩形框',
  OVL: '椭圆框',
  WEL: '威灵顿框',
  CAT: '猫眼',
  AVT: '飞行员框',
  HEX: '六角框',
  BRC: '眉线框',
}

/** 系列编码 → 中文名映射（与数据库 structure_series 表对齐） */
const SERIES_DISPLAY_MAP: Record<string, string> = {
  CLS: '经典',
  FSH: '时尚',
  BUS: '商务',
  SPT: '运动',
}

/** 款式 gender → 展示名映射 */
const GENDER_LABELS: Record<string, string> = {
  female: '女款',
  male: '男款',
  unisex: '中性',
  limited: '限量',
}

/** 默认兜底值 */
const FALLBACK = {
  shapeName: '',
  seriesName: '',
  colorName: '未知色',
  skinEffect: '中性百搭',
  faceEffect: '鹅蛋脸万能',
  genderLabel: '中性',
}

// ========================================
// 数据类型定义
// ========================================

/** SPU 命名所需的最小数据集 */
export interface SpuNameInput {
  /** 结构标准内部编号，如 S5440-159-18-200c */
  structureStandardCode: string
  /** 系列编码，如 CLS */
  seriesCode?: string
  /** 结构标准对外编号（4位数字），如 5440 */
  externalCode: string
  /** 造型代码，如 SQR */
  shapeCode?: string
  /** 系列中文名（不含"系列"后缀），如 "经典" */
  seriesChineseName?: string
}

/** SKU 命名所需的最小数据集 */
export interface SkuNameInput {
  /** 从 SPU 继承的基础数据 */
  spuName: string
  /** 结构标准对外编号（4位数字），如 5440 */
  externalCode: string
  /** 造型名称，如 "方框" */
  shapeName: string
  /** 系列中文名（不含"系列"后缀），如 "经典" */
  seriesChineseName: string
  /** 款式 gender 值 */
  gender?: string
  /** 色彩中文名 */
  colorName: string
  /** 肤色效果词 */
  skinToneEffect?: string
  /** 脸型效果词 */
  faceShapeEffect?: string
}

// ========================================
// 命名引擎
// ========================================

export class NamingEngine {
  /**
   * 生成 SPU 展示名
   *
   * 公式：秒镜 S{对外编号} · {造型}{系列}系列
   * 示例：秒镜 S5440 · 方框经典系列
   */
  static generateSpuName(input: SpuNameInput): string {
    const externalCode = input.externalCode || '???'
    const shapeName = this.getShapeName(input.shapeCode)
    const seriesName = input.seriesChineseName || ''

    // 字段顺序（V2.0 规范）：品牌+锚点 → 造型 → 系列
    return `秒镜 S${externalCode} · ${shapeName}${seriesName}系列`
  }

  /**
   * 生成 SKU 展示名（V3.0 简化四段式）
   *
   * 公式：{效果} · {色彩} · {造型}{系列}系列 · {款式}
   * 示例：圆脸显瘦 · 马卡龙粉 · 方框经典系列 · 女款
   *
   * ⚠️ 字段顺序：
   *   1. 效果（脸型或肤色，取其一）
   *   2. 色彩（中文颜色名）
   *   3. 造型+系列（方框经典系列）
   *   4. 款式（女款/男款/中性/限量）
   */
  static generateSkuName(input: SkuNameInput): string {
    // 1维效果：取脸型或肤色，哪个有值取哪个
    const effect = input.faceShapeEffect || input.skinToneEffect || FALLBACK.skinEffect
    const colorName = input.colorName || FALLBACK.colorName
    const shapeName = input.shapeName || FALLBACK.shapeName
    const seriesName = input.seriesChineseName || FALLBACK.seriesName
    const genderLabel = input.gender ? GENDER_LABELS[input.gender] || FALLBACK.genderLabel : FALLBACK.genderLabel

    return `${effect} · ${colorName} · ${shapeName}${seriesName}系列 · ${genderLabel}`
  }

  /**
   * 通过造型代码获取展示用中文造型名称
   * 使用硬编码映射表，不查数据库
   */
  static getShapeName(shapeCode?: string): string {
    if (!shapeCode) return FALLBACK.shapeName
    return SHAPE_DISPLAY_MAP[shapeCode] || FALLBACK.shapeName
  }

  /**
   * 通过系列编码获取中文系列名称（不含"系列"后缀）
   * 使用硬编码映射表，不查数据库
   */
  static getSeriesChineseName(seriesCode?: string): string {
    if (!seriesCode) return ''
    return SERIES_DISPLAY_MAP[seriesCode] || ''
  }
}
