/**
 * 通用查询参数类型 — 宽松索引签名，兼容 NestJS @Query() 装饰器
 * 运行时来自 HTTP query string，值均为 string 或 undefined
 */
export type QueryParams = Record<string, string | number | boolean | undefined>
