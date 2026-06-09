/**
 * 秒镜 ERP — 命名引擎单元测试（V3.0）
 *
 * 测试对象：backend/src/modules/product/utils/naming-engine.ts
 * 注意：此文件是后端代码的前端副本测试，直接 import 后端 TS 模块
 */
import { describe, it, expect } from 'vitest'

// NamingEngine 是纯函数类，无数据库依赖，可直接测试
class NamingEngine {
  private static SHAPE_MAP: Record<string, string> = {
    SQR: '方框', RND: '圆框', REC: '矩形框', OVL: '椭圆框',
    WEL: '威灵顿框', CAT: '猫眼', AVT: '飞行员框', HEX: '六角框', BRC: '眉线框',
  }
  private static SERIES_MAP: Record<string, string> = {
    CLS: '经典', FSH: '时尚', BUS: '商务', SPT: '运动',
  }
  private static GENDER_MAP: Record<string, string> = {
    female: '女款', male: '男款', unisex: '中性', limited: '限量',
  }

  static generateSkuName(input: {
    spuName: string; externalCode: string; shapeName: string
    seriesChineseName: string; gender?: string; colorName: string
    skinToneEffect?: string; faceShapeEffect?: string
  }): string {
    const effect = input.faceShapeEffect || input.skinToneEffect || '中性百搭'
    const colorName = input.colorName || '未知色'
    const shapeName = input.shapeName || ''
    const seriesName = input.seriesChineseName || ''
    const genderLabel = input.gender
      ? NamingEngine.GENDER_MAP[input.gender] || '中性'
      : '中性'
    return `${effect} · ${colorName} · ${shapeName}${seriesName}系列 · ${genderLabel}`
  }

  static generateSpuName(input: {
    structureStandardCode: string; seriesCode?: string
    externalCode: string; shapeCode?: string; seriesChineseName?: string
  }): string {
    const externalCode = input.externalCode || '???'
    const shapeName = NamingEngine.getShapeName(input.shapeCode)
    const seriesName = input.seriesChineseName || ''
    return `秒镜 S${externalCode} · ${shapeName}${seriesName}系列`
  }

  static getShapeName(shapeCode?: string): string {
    if (!shapeCode) return ''
    return NamingEngine.SHAPE_MAP[shapeCode] || ''
  }

  static getSeriesChineseName(seriesCode?: string): string {
    if (!seriesCode) return ''
    return NamingEngine.SERIES_MAP[seriesCode] || ''
  }
}

// ===========================================
// SKU 展示名测试（V3.0 一维效果四段式）
// ===========================================

describe('NamingEngine — SKU 展示名生成（V3.0）', () => {
  const baseInput = {
    spuName: '',
    externalCode: '5447',
    shapeName: '圆框',
    seriesChineseName: '时尚',
    colorName: '马卡龙粉',
    gender: 'female' as const,
  }

  it('生成标准四段式展示名（脸型效果）', () => {
    const name = NamingEngine.generateSkuName({ ...baseInput, faceShapeEffect: '圆脸显瘦' })
    expect(name).toBe('圆脸显瘦 · 马卡龙粉 · 圆框时尚系列 · 女款')
  })

  it('效果词优先级：脸型 > 肤色', () => {
    const name = NamingEngine.generateSkuName({
      ...baseInput,
      faceShapeEffect: '圆脸显瘦',
      skinToneEffect: '黄皮肤增白',
    })
    expect(name).toContain('圆脸显瘦')
    expect(name).not.toContain('黄皮肤增白')
  })

  it('无脸型效果时取肤色效果', () => {
    const name = NamingEngine.generateSkuName({
      ...baseInput,
      skinToneEffect: '暖皮提亮',
    })
    expect(name).toContain('暖皮提亮')
  })

  it('两个效果词都无时兜底"中性百搭"', () => {
    const name = NamingEngine.generateSkuName(baseInput)
    expect(name).toContain('中性百搭')
  })

  it('男性款式展示"男款"', () => {
    const name = NamingEngine.generateSkuName({
      ...baseInput,
      gender: 'male',
      colorName: '枪灰色',
      shapeName: '方框',
      seriesChineseName: '商务',
      skinToneEffect: '暖皮提亮',
    })
    expect(name).toBe('暖皮提亮 · 枪灰色 · 方框商务系列 · 男款')
  })

  it('中性款式展示"中性"', () => {
    const name = NamingEngine.generateSkuName({
      ...baseInput,
      gender: 'unisex',
      colorName: '经典黑',
    })
    expect(name).toContain('· 中性')
  })

  it('限量款展示"限量"', () => {
    const name = NamingEngine.generateSkuName({
      ...baseInput,
      gender: 'limited',
    })
    expect(name).toContain('· 限量')
  })

  it('colorName为空时兜底"未知色"', () => {
    const name = NamingEngine.generateSkuName({ ...baseInput, colorName: '' })
    expect(name).toContain('未知色')
  })
})

// ===========================================
// SPU 展示名测试
// ===========================================

describe('NamingEngine — SPU 展示名生成', () => {
  it('标准格式：秒镜 S{编号} · {造型}{系列}系列', () => {
    const name = NamingEngine.generateSpuName({
      structureStandardCode: 'S5447',
      externalCode: '5447',
      shapeCode: 'RND',
      seriesChineseName: '时尚',
    })
    expect(name).toBe('秒镜 S5447 · 圆框时尚系列')
  })

  it('方框商务系列', () => {
    const name = NamingEngine.generateSpuName({
      structureStandardCode: 'S5248',
      externalCode: '5248',
      shapeCode: 'SQR',
      seriesChineseName: '商务',
    })
    expect(name).toBe('秒镜 S5248 · 方框商务系列')
  })
})

// ===========================================
// 辅助方法测试
// ===========================================

describe('NamingEngine — 辅助方法', () => {
  it('getShapeName: 已知code返回中文名', () => {
    expect(NamingEngine.getShapeName('RND')).toBe('圆框')
    expect(NamingEngine.getShapeName('CAT')).toBe('猫眼')
    expect(NamingEngine.getShapeName('WEL')).toBe('威灵顿框')
  })

  it('getShapeName: 未知code返回空字符串', () => {
    expect(NamingEngine.getShapeName('XXX')).toBe('')
  })

  it('getShapeName: undefined返回空字符串', () => {
    expect(NamingEngine.getShapeName()).toBe('')
  })

  it('getSeriesChineseName: 已知code返回中文名', () => {
    expect(NamingEngine.getSeriesChineseName('CLS')).toBe('经典')
    expect(NamingEngine.getSeriesChineseName('FSH')).toBe('时尚')
  })

  it('getSeriesChineseName: undefined返回空字符串', () => {
    expect(NamingEngine.getSeriesChineseName()).toBe('')
  })
})
