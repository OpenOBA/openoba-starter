import request from './request'

/** 获取字典项列表 */
export function getDict(table: string) {
  return request.get<any[]>(`/dict/${table}`)
}

/** 新增字典项 */
export function addDict(table: string, data: Record<string, unknown>) {
  return request.post(`/dict/${table}`, data)
}

/** 更新字典项 */
export function updateDict(table: string, key: string, data: Record<string, unknown>) {
  return request.put(`/dict/${table}/${key}`, data)
}

/** 删除字典项 */
export function deleteDict(table: string, key: string) {
  return request.delete(`/dict/${table}/${key}`)
}
