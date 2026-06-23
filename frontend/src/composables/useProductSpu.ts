/**
 * useProductSpu.ts — SPU 管理
 *
 * SPU CRUD + 搜索 + Dialog 管理
 */
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { getSpus, deleteSpu } from '@/api/product'
import type { ProductSpu } from '@/types'

export function useProductSpu(spuEditRow: ReturnType<typeof ref<ProductSpu | null>>) {
  const spuList = ref<ProductSpu[]>([])
  const spuLoading = ref(false)
  const spuSearch = reactive({ keyword: '', gender: '', status: '', productTier: '' })
  const spuDialogVisible = ref(false)

  const loadSpus = async () => {
    spuLoading.value = true
    try {
      const res = await getSpus({ pageSize: 999, ...spuSearch })
      if (Array.isArray(res)) {
        spuList.value = res as unknown as ProductSpu[]
      } else if (res && typeof res === 'object' && Array.isArray(res.items)) {
        spuList.value = res.items as unknown as ProductSpu[]
      } else {
        spuList.value = []
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e)
      ElMessage.error(err)
    } finally {
      spuLoading.value = false
    }
  }

  const openSpuDialog = (row?: Record<string, unknown>) => {
    spuEditRow.value = (row as unknown as ProductSpu) || null
    spuDialogVisible.value = true
  }

  const handleDeleteSpu = async (id: string) => {
    try {
      await deleteSpu(id)
      ElMessage.success('已删除')
      loadSpus()
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e)
      ElMessage.error(err)
    }
  }

  return {
    spuList,
    spuLoading,
    spuSearch,
    spuDialogVisible,
    loadSpus,
    openSpuDialog,
    handleDeleteSpu,
  }
}
