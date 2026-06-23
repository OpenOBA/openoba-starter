/**
 * 条码生成工具 — 与后端算法一致
 * 供 Products.vue、SpuDialog.vue、SkuDialog.vue 共享使用
 */

/** 内部条码：{tierCode}skuCode/lensCode/qty */
export function generateInternalBarcode(skuCode: string, lensCode: string, qty: number = 1, tierCode?: string): string {
  const prefix = tierCode ? `${tierCode}_` : ''
  return `${prefix}${skuCode}/${lensCode}/${qty}`
}

/** 过渡性 EAN-13 条码（以 2 开头 + hash + 校验位） */
export function generateTransitionalEAN13(skuCode: string): string {
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
