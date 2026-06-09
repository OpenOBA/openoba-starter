/**
 * 秒镜条码生成工具
 * 依据：秒镜产品命名与编号规范 V1.1 + 附录 A/B V2.0
 */

/**
 * 内部条码格式：{tier_code}_{sku_code}/{lens_code}/{qty}
 * 例：style_MJ-CLS-001-TB/5147/1
 */
export function generateInternalBarcode(skuCode: string, lensCode: string, qty: number = 1, tierCode?: string): string {
  const prefix = tierCode ? `${tierCode}_` : ''
  return `${prefix}${skuCode}/${lensCode}/${qty}`
}

/**
 * SPU 条码格式：{spu_code}/{lens_code}/SPU
 * 例：MJ-CLS-001/5147/SPU
 */
export function generateSpuBarcode(spuCode: string, lensCode: string): string {
  return `${spuCode}/${lensCode}/SPU`
}

/**
 * EAN-13 过渡期自编
 * 前缀 2 + SKU 编码 hash（取 10 位数字）+ 校验位 = 13 位
 * 企业内部保留码段 200-299，不注册 GS1
 */
export function generateTransitionalEAN13(skuCode: string): string {
  // 稳定 hash：使用 31 进制累加（避免 32 位溢出产生负数）
  let hash = 0
  const prime = 31
  for (let i = 0; i < skuCode.length; i++) {
    hash = (hash * prime + skuCode.charCodeAt(i)) % 100000000000 // 保持在 11 位以内
  }
  // 取 11 位数字（prefix 1 位 + body 11 位 + 校验位 1 位 = EAN-13）
  const body = hash.toString().padStart(11, '0').slice(-11)
  const prefix = '2'
  const base12 = prefix + body
  // EAN-13 校验位计算
  const digits = base12.split('').map(Number)
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3)
  }
  const checkDigit = (10 - (sum % 10)) % 10
  return base12 + checkDigit
}

/**
 * 验证 EAN-13 校验位
 */
export function validateEAN13(ean13: string): boolean {
  if (!/^\d{13}$/.test(ean13)) return false
  const digits = ean13.split('').map(Number)
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3)
  }
  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === digits[12]
}
