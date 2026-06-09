import request from './request';

// ===== 分类管理 =====

/** 获取树形结构 */
export function getCategoriesTree() {
  return request.get('/categories');
}

/** 获取扁平列表（供下拉选择等场景） */
export function getCategoriesFlat() {
  return request.get('/categories/flat');
}

/** 获取单个分类 */
export function getCategory(id: string) {
  return request.get(`/categories/${id}`);
}

/** 创建分类 */
export function createCategory(data: Record<string, unknown>) {
  return request.post('/categories', data);
}

/** 更新分类 */
export function updateCategory(id: string, data: Record<string, unknown>) {
  return request.put(`/categories/${id}`, data);
}

/** 删除分类 */
export function deleteCategory(id: string) {
  return request.delete(`/categories/${id}`);
}

/** 批量排序 */
export function batchSortCategories(orderedIds: string[]) {
  return request.post('/categories/sort', { orderedIds });
}
