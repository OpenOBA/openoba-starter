/**
 * URL 安全校验工具
 *
 * 防止 SSRF（Server-Side Request Forgery）：校验用户输入的 URL
 * 不指向内网/IPv6 回环/链路本地。
 *
 * 用于：LLM 连接测试、web_fetch 工具、任何用户可控 URL 的地方
 */

/**
 * 校验 URL 是否安全（允许外网访问，拦截内网地址）
 * @returns null 表示安全，string 表示错误信息
 */
export function validateFetchUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return `❌ 不支持的协议: ${parsed.protocol}`
    }
    const h = parsed.hostname.toLowerCase()
    // IPv4 内网 + IPv6 回环 + IPv6 映射 + 链路本地
    if (
      /^((127\.|10\.|192\.168\.|169\.254\.)\d+\.\d+(\.\d+)?|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|localhost|0\.0\.0\.0)$/.test(
        h,
      )
    ) {
      return `❌ 禁止访问内网地址: ${h}`
    }
    if (
      h === '::1' ||
      h.startsWith('fc') ||
      h.startsWith('fe80') ||
      h.startsWith('::ffff:')
    ) {
      return `❌ 禁止访问内网/IPv6映射地址: ${h}`
    }
    return null
  } catch {
    return `❌ 无效URL: ${url}`
  }
}
