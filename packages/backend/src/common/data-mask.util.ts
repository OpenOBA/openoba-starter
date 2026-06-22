/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
/**
 * 数据脱敏工具类
 *
 * 在数据通过外网出口时，自动对敏感字段进行脱敏处理。
 * 不阻止 Agent 的行为，但确保 PII 数据不以明文形式流出。
 *
 * @author 唐浩然
 * @since 2026-05-02
 */

export type MaskRule = 'phone' | 'email' | 'idCard' | 'address' | 'name'

/**
 * 脱敏规则配置
 */
const MASK_RULES: Record<MaskRule, { pattern: RegExp; mask: (match: string) => string }> = {
  phone: {
    // 中国大陆手机号：13812345678 → 138****5678
    pattern: /1[3-9]\d{9}/g,
    mask: (s: string) => s.slice(0, 3) + '****' + s.slice(7),
  },
  email: {
    // 邮箱：henry@miaojing.com → h***@miaojing.com
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    mask: (s: string) => {
      const atIdx = s.indexOf('@')
      return s.charAt(0) + '***' + s.slice(atIdx)
    },
  },
  idCard: {
    // 身份证：440101199001011234 → 440101********1234
    pattern: /\d{17}[\dXx]/g,
    mask: (s: string) => s.slice(0, 6) + '********' + s.slice(14),
  },
  address: {
    // 地址：保留省市区，隐去详细门牌号
    pattern: /((?:[\u4e00-\u9fa5]{2,}省)?(?:[\u4e00-\u9fa5]{2,}市)?(?:[\u4e00-\u9fa5]{2,}(?:区|县|镇)))([\S\s]*)/g,
    mask: (s: string) => {
      const m = s.match(/((?:[\u4e00-\u9fa5]{2,}省)?(?:[\u4e00-\u9fa5]{2,}市)?(?:[\u4e00-\u9fa5]{2,}(?:区|县|镇)))/)
      return m ? m[1] + '***' : s.slice(0, 6) + '***'
    },
  },
  name: {
    // 姓名：张三 → 张*
    pattern: /(?:姓名[:：]\s*)([\u4e00-\u9fa5]{2,4})/g,
    mask: (s: string) => {
      const m = s.match(/([\u4e00-\u9fa5]{2,4})/)
      if (!m) return s
      const name = m[1]
      return '姓名：' + name.charAt(0) + (name.length > 2 ? '*' + name.charAt(name.length - 1) : '*')
    },
  },
}

/**
 * 对值按指定规则脱敏
 */
export function maskValue(value: string, rule: MaskRule): string {
  const config = MASK_RULES[rule]
  if (!config) return value

  let result = value
  // 重置 lastIndex（因为正则使用了 g 标志）
  config.pattern.lastIndex = 0
  result = result.replace(config.pattern, config.mask as any)
  return result
}

/**
 * 对对象中的敏感字段进行批量脱敏
 *
 * @param obj 原始对象
 * @param sensitiveFields 敏感字段映射 { fieldPath: maskRule }
 * @returns 脱敏后的新对象（不修改原对象）
 *
 * @example
 * ```typescript
 * const data = { phone: '13812345678', name: '张三' }
 * const masked = maskObject(data, { phone: 'phone', name: 'name' })
 * // { phone: '138****5678', name: '张*' }
 * ```
 */
export function maskObject(
  obj: Record<string, unknown>,
  sensitiveFields: Record<string, MaskRule>,
): Record<string, unknown> {
  const result = { ...obj }
  for (const [field, rule] of Object.entries(sensitiveFields)) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = maskValue(result[field] as string, rule)
    }
  }
  return result
}

/**
 * 自动检测并脱敏 JSON 字符串中的所有敏感字段
 *
 * 遍历 JSON 对象的所有键，匹配已知的敏感字段名并自动脱敏。
 *
 * @param jsonStr JSON 字符串
 * @returns 脱敏后的 JSON 字符串
 */
export function autoMask(jsonStr: string): string {
  // 常见的敏感字段名映射
  const AUTO_MASK_FIELDS: Record<string, MaskRule> = {
    phone: 'phone',
    mobile: 'phone',
    phoneNumber: 'phone',
    telephone: 'phone',
    email: 'email',
    mail: 'email',
    emailAddress: 'email',
    idCard: 'idCard',
    idNumber: 'idCard',
    identityCard: 'idCard',
    ssn: 'idCard',
    address: 'address',
    detailedAddress: 'address',
    name: 'name',
    realName: 'name',
    fullName: 'name',
  }

  try {
    const obj = JSON.parse(jsonStr)
    const masked = maskObject(obj, AUTO_MASK_FIELDS)
    return JSON.stringify(masked)
  } catch {
    // 如果不是 JSON，尝试正则匹配脱敏
    let result = jsonStr
    result = maskValue(result, 'phone')
    result = maskValue(result, 'email')
    result = maskValue(result, 'idCard')
    return result
  }
}
