/**
 * product-utils.ts — Product Management Utility Functions
 *
 * Pure functions, no Vue reactivity dependency.
 * Use in Products.vue, SkuDialog.vue, SpuDialog.vue, and anywhere else.
 */

// ===== 产品级别映射（静态 fallback，Schema 优先）=====
export const TIER_MAP: Record<string, { name: string; color: string }> = {
  color: { name: '色彩级', color: '#4CAF50' },
  style: { name: '风格级', color: '#2196F3' },
  texture: { name: '质感级', color: '#FF9800' },
  'light-luxury': { name: '轻奢级', color: '#E91E63' },
  smart: { name: '智能级', color: '#9C27B0' },
  luxury: { name: '奢华级', color: '#1a1a1a' },
};

/**
 * 脸型 code → 中文标签
 */
export function getFaceShapeLabel(code: string): string {
  if (!code) return '-';
  const map: Record<string, string> = {
    round: '圆脸', oval: '椭圆脸', square: '方脸',
    diamond: '菱形脸', heart: '心形脸', oblong: '长脸',
  };
  return map[code] || code;
}

/**
 * 内部条码生成（与后端算法一致）
 */
export function generateInternalBarcode(skuCode: string, lensCode: string, qty: number = 1, tierCode?: string): string {
  const prefix = tierCode ? `${tierCode}_` : '';
  return `${prefix}${skuCode}/${lensCode}/${qty}`;
}

/**
 * 过渡期 EAN-13 条码生成（与后端一致）
 */
export function generateTransitionalEAN13(skuCode: string): string {
  let hash = 0;
  const prime = 31;
  for (let i = 0; i < skuCode.length; i++) {
    hash = (hash * prime + skuCode.charCodeAt(i)) % 100000000000;
  }
  const body = hash.toString().padStart(11, '0').slice(-11);
  const prefix = '2';
  const base12 = prefix + body;
  const digits = base12.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return base12 + checkDigit;
}
