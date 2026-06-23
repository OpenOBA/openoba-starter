/**
 * useProductCategory.ts — 产品分类管理
 *
 * Category CRUD + Dialog + 品类筛选
 * Updated: now uses /category API from independent Category module
 */
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { getCategoriesFlat, createCategory, updateCategory, deleteCategory } from '@/api/category'
import type { ProductCategory } from '@/types'

export function useProductCategory() {
  const categoryList = ref<ProductCategory[]>([])
  const categoryLoading = ref(false)
  const categoryDialogVisible = ref(false)
  const categoryForm = reactive<Record<string, unknown>>({
    categoryId: '',
    categoryCode: '',
    categoryName: '',
    categoryType: '',
    level: 1,
    sortOrder: 0,
    isActive: true,
  })
  const categorySearchType = ref('')

  const loadCategories = async () => {
    categoryLoading.value = true
    try {
      const type = categorySearchType.value || undefined
      const flat = (await getCategoriesFlat()) as unknown as ProductCategory[]
      categoryList.value = type ? flat.filter((c) => c.categoryType === type) : flat
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e)
      ElMessage.error(err)
    } finally {
      categoryLoading.value = false
    }
  }

  const openCategoryDialog = (row?: Record<string, unknown>) => {
    if (row) {
      categoryForm.categoryId = row.categoryId || ''
      categoryForm.categoryCode = row.categoryCode || ''
      categoryForm.categoryName = row.categoryName || ''
      categoryForm.categoryType = row.categoryType || ''
      categoryForm.level = row.level ?? 1
      categoryForm.sortOrder = row.sortOrder ?? 0
      categoryForm.isActive = row.isActive ?? true
    } else {
      Object.assign(categoryForm, {
        categoryId: '',
        categoryCode: '',
        categoryName: '',
        categoryType: '',
        level: 1,
        sortOrder: 0,
        isActive: true,
      })
    }
    categoryDialogVisible.value = true
  }

  const handleSaveCategory = async () => {
    const payload: Record<string, unknown> = {
      categoryName: categoryForm.categoryName,
      categoryCode: categoryForm.categoryCode,
      categoryType: categoryForm.categoryType,
      level: categoryForm.level,
      sortOrder: categoryForm.sortOrder,
      isActive: categoryForm.isActive,
    }
    try {
      if (categoryForm.categoryId) {
        await updateCategory(categoryForm.categoryId as string, payload)
        ElMessage.success('分类已更新')
      } else {
        await createCategory(payload)
        ElMessage.success('分类已创建')
      }
      categoryDialogVisible.value = false
      loadCategories()
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e)
      ElMessage.error(err)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id)
      ElMessage.success('分类已删除')
      loadCategories()
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e)
      ElMessage.error(err)
    }
  }

  return {
    categoryList,
    categoryLoading,
    categoryDialogVisible,
    categoryForm,
    categorySearchType,
    loadCategories,
    openCategoryDialog,
    handleSaveCategory,
    handleDeleteCategory,
  }
}
