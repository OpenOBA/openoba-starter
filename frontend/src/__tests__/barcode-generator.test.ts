/**
 * 秒镜 ERP — 条码生成器单元测试
 */
import { describe, it, expect } from 'vitest'

// ===========================================
// 复制 barcode.generator.ts 纯函数逻辑
// ===========================================

function generateInternalBarcode(skuCode: string, lensCode: string, qty: number = 1, tierCode?: string): string {
  const prefix = tierCode ? `${tierCode}_` : ''
  return `${prefix}${skuCode}/${lensCode}/${qty}`
}

function generateSpuBarcode(spuCode: string, lensCode: string): string {
  return `${spuCode}/${lensCode}/SPU`
}

function generateTransitionalEAN13(skuCode: string): string {
  let hash = 0
  const prime = 31
  for (let i = 0; i < skuCode.length; i++) {
    hash = (hash * prime + skuCode.charCodeAt(i)) % 100000000000
  }
  const body = hash.toString().padStart(11, '0').slice(-11)
  const prefix = '2'
  const base12 = prefix + body
  const digits = base12.split('').map(Number)
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3)
  }
  const checkDigit = (10 - (sum % 10)) % 10
  return base12 + checkDigit
}

// ===========================================
// 测试
// ===========================================

describe('Barcode Generator — 内部条码', () => {
  it('标准格式：tierCode_skuCode/lensCode/qty', () => {
    const barcode = generateInternalBarcode('MJS5447-001', '5147', 1, 'color')
    expect(barcode).toBe('color_MJS5447-001/5147/1')
  })

  it('无 tierCode 时省略前缀', () => {
    const barcode = generateInternalBarcode('MJS5447-001', '5147')
    expect(barcode).toBe('MJS5447-001/5147/1')
  })

  it('批量数量 > 1', () => {
    const barcode = generateInternalBarcode('MJS5447-001', '5147', 5)
    expect(barcode).toBe('MJS5447-001/5147/5')
  })
})

describe('Barcode Generator — SPU 条码', () => {
  it('格式：spuCode/lensCode/SPU', () => {
    const barcode = generateSpuBarcode('MJS5447', '5147')
    expect(barcode).toBe('MJS5447/5147/SPU')
  })
})

describe('Barcode Generator — EAN-13 过渡期', () => {
  it('生成 13 位 EAN-13 条码', () => {
    const ean = generateTransitionalEAN13('MJS5447-001')
    expect(ean).toHaveLength(13)
    expect(ean).toMatch(/^2\d{12}$/) // 以 2 开头（秒镜保留码段）
  })

  it('同一 SKU 多次生成结果一致（确定性 hash）', () => {
    const e1 = generateTransitionalEAN13('MJS5447-001')
    const e2 = generateTransitionalEAN13('MJS5447-001')
    expect(e1).toBe(e2)
  })

  it('不同 SKU 生成不同条码', () => {
    const e1 = generateTransitionalEAN13('MJS5447-001')
    const e2 = generateTransitionalEAN13('MJS5447-002')
    expect(e1).not.toBe(e2)
  })

  it('校验位正确（自定义验证）', () => {
    const ean = generateTransitionalEAN13('MJS5447-001')
    // EAN-13 校验：奇数位加权1，偶数位加权3，和模10的补数为校验位
    const digits = ean.slice(0, 12).split('').map(Number)
    let sum = 0
    for (let i = 0; i < digits.length; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 3)
    }
    const expectedCheck = (10 - (sum % 10)) % 10
    expect(Number(ean[12])).toBe(expectedCheck)
  })
})
