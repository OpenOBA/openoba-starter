// 字典缓存工具 - 供各视图共用
// 从 API 加载字典表到内存，避免重复请求

import request from '../api/request'

const cache: Record<string, Record<string, unknown>[]> = {}

export async function getDictCache(tableName: string): Promise<Record<string, unknown>[]> {
  if (!cache[tableName]) {
    const res = await request.get<Record<string, unknown>[]>(`/dictionary/${tableName}`)
    cache[tableName] = res
  }
  return cache[tableName]
}

export function clearDictCache(tableName?: string) {
  if (tableName) delete cache[tableName]
  else Object.keys(cache).forEach((k) => delete cache[k])
}
