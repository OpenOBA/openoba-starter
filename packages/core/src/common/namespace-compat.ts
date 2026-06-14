/**
 * ER-OS 命名空间兼容层
 *
 * 将旧的 com.miaojing / com.miaojing.eyewear 命名空间
 * 映射到新的 industry.eyewear 规范命名空间。
 *
 * @author 唐浩然
 * @since 2026-05-04
 */

/** 旧→新命名空间映射 */
const NAMESPACE_COMPAT: Record<string, string> = {
  'com.miaojing': 'industry.eyewear',
  'com.miaojing.eyewear': 'industry.eyewear',
}

/** 解析命名空间（兼容旧命名） */
export function resolveNamespace(ns: string): string {
  return NAMESPACE_COMPAT[ns] || ns
}

/** 检查是否为旧命名空间 */
export function isLegacyNamespace(ns: string): boolean {
  return ns in NAMESPACE_COMPAT
}

/** 获取所有需要迁移的旧命名空间 */
export function getLegacyNamespaces(): string[] {
  return Object.keys(NAMESPACE_COMPAT)
}
