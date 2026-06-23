import { ref, computed, type Ref, type ComputedRef } from 'vue'
import request from '@/api/request'

// ============================================================
// 通用字典加载 composable — 两种用法
// ============================================================

// 用法一：批量加载（兼容旧代码）
//   const { dicts, loadDicts } = useDict()
//   onMounted(() => loadDicts({
//     customerTypes: 'dict_customer_type',
//     customerLevels: 'dict_customer_level',
//   }))
//   模板: <el-option v-for="d in dicts.customerTypes" :key="d.code" :label="d.name" :value="d.code" />

// 用法二：单字典加载（新推荐）
//   const { items, labels, byKey, loading, load } = useDict('order_status')
//   模板: <el-option v-for="d in items" :key="d.code" :label="d.name" :value="d.code" />
//         {{ labels['pending'] }}  → "待确认"
//         {{ byKey['pending'] }}  → 完整字典项对象

// ============================================================

export interface DictItem {
  code: string
  name: string
  sort_order: number
  is_active: number
  color?: string
}

// ---------- 全局缓存：跨组件共享已加载的字典 ----------
const globalCache = new Map<string, DictItem[]>()
const globalLoading = new Map<string, Promise<DictItem[]>>()

async function fetchDict(tableName: string): Promise<DictItem[]> {
  if (globalCache.has(tableName)) {
    const cached = globalCache.get(tableName)!
    console.log(`[useDict] ${tableName} 从缓存返回:`, cached.length, '条')
    return cached
  }
  if (globalLoading.has(tableName)) {
    console.log(`[useDict] ${tableName} 已有加载中的请求，等待`)
    return globalLoading.get(tableName)!
  }

  const promise = (async () => {
    console.log(`[useDict] 开始加载字典: ${tableName}`)
    try {
      const res = await request.get(`/dict/${tableName}`)
      console.log(`[useDict] ${tableName} API 响应:`, res)

      // 信任拦截器的解包逻辑，res 应当已经是数组
      const items: DictItem[] = Array.isArray(res) ? (res as DictItem[]) : []

      console.log(`[useDict] ${tableName} 解析到 ${items.length} 条数据`)

      // 过滤激活项（is_active !== 0 且 !== false）
      const active = items.filter((item) => {
        if (!item) return false
        const isActive = item.is_active
        return isActive === undefined || isActive === 1 || Number(isActive) === 1
      })

      console.log(`[useDict] ${tableName}: 原始 ${items.length} 条, 激活 ${active.length} 条`)

      if (active.length > 0) {
        console.log(
          `[useDict] ${tableName} 激活项示例:`,
          active.slice(0, 3).map((r) => ({
            code: r.code,
            name: r.name,
            is_active: r.is_active,
          })),
        )
      }

      globalCache.set(tableName, active)
      return active
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e)
      console.error(`[useDict] 加载 ${tableName} 失败:`, err || e)
      // 不缓存空结果，允许下次重试
      return []
    } finally {
      globalLoading.delete(tableName)
      console.log(`[useDict] ${tableName} 加载完成，清理加载状态`)
    }
  })()

  globalLoading.set(tableName, promise)
  return promise
}

// ---------- 用法二：单字典 composable（新推荐） ----------
export interface UseDictReturn {
  items: Ref<DictItem[]>
  labels: ComputedRef<Record<string, string>>
  byKey: ComputedRef<Record<string, DictItem>>
  loading: Ref<boolean>
  error: Ref<Error | null>
  load: () => Promise<void>
  forceReload: () => Promise<void>
}

export function useDict(tableName: string): UseDictReturn {
  const items = ref<DictItem[]>(globalCache.get(tableName) || ([] as DictItem[]))
  const loading = ref<boolean>(false)
  const error = ref<Error | null>(null)

  console.log(`[useDict] 初始化 ${tableName}，缓存数据:`, items.value.length, '条')

  const labels = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const item of items.value) {
      map[item.code] = item.name
    }
    console.log(`[useDict] ${tableName} labels 计算完成，共 ${Object.keys(map).length} 个标签`)
    return map
  })

  const byKey = computed<Record<string, DictItem>>(() => {
    const map: Record<string, DictItem> = {}
    for (const item of items.value) {
      map[item.code] = item
    }
    return map
  })

  async function load() {
    console.log(`[useDict] 手动触发加载 ${tableName}`)
    // 如果缓存有有效数据，直接使用
    if (globalCache.has(tableName)) {
      const cached = globalCache.get(tableName)!
      if (cached.length > 0) {
        console.log(`[useDict] ${tableName} 从缓存加载:`, cached.length, '条')
        items.value = cached
        return
      }
      // 缓存为空（之前失败留下的），清除后重新请求
      globalCache.delete(tableName)
      console.log(`[useDict] ${tableName} 缓存为空，清除后重新请求`)
    }
    loading.value = true
    error.value = null
    try {
      const result = await fetchDict(tableName)
      items.value = result
      console.log(`[useDict] ${tableName} 加载完成，设置 items:`, result.length, '条')
    } catch (e: unknown) {
      error.value = e instanceof Error ? e : new Error(String(e))
      console.error(`[useDict] ${tableName} 加载失败:`, e)
    } finally {
      loading.value = false
    }
  }

  // 自动加载（如果缓存中还没有）
  if (items.value.length === 0) {
    console.log(`[useDict] ${tableName} 缓存为空，触发自动加载`)
    load()
  } else {
    console.log(`[useDict] ${tableName} 已有缓存数据，跳过自动加载`)
  }

  /** 强制重新加载：无视缓存，直接从 API 请求 */
  async function forceReload() {
    console.log(`[useDict] 强制重新加载 ${tableName}，清除旧缓存`)
    globalCache.delete(tableName)
    globalLoading.delete(tableName)
    loading.value = true
    error.value = null
    try {
      const result = await fetchDict(tableName)
      items.value = result
      console.log(`[useDict] ${tableName} 强制加载完成，共 ${result.length} 条`)
      if (result.length > 0) {
        console.log(`[useDict] ${tableName} 数据示例:`, result.slice(0, 3))
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e : new Error(String(e))
      console.error(`[useDict] ${tableName} 强制加载失败:`, e)
    } finally {
      loading.value = false
    }
  }

  return { items, labels, byKey, loading, error, load, forceReload }
}

// ---------- 用法一：批量加载（兼容旧代码） ----------
export function useDictBatch() {
  const dicts = ref<Record<string, DictItem[]>>({})

  async function loadDict(key: string, tableName: string) {
    try {
      const items = await fetchDict(tableName)
      dicts.value[key] = items
    } catch (e: unknown) {
      console.error(`[useDict] 加载 ${tableName} 失败:`, e)
      dicts.value[key] = []
    }
  }

  async function loadDicts(mapping: Record<string, string>) {
    await Promise.all(Object.entries(mapping).map(([key, tableName]) => loadDict(key, tableName)))
  }

  return { dicts, loadDict, loadDicts }
}
