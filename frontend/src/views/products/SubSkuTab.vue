<template>
  <div class="sub-sku-container">
    <!-- 左侧分类树 -->
    <div class="left-panel">
      <div class="panel-header">
        <span>副品分类</span>
        <el-button type="primary" size="small" @click="showCategoryDialog()">新增</el-button>
      </div>
      <el-tree
        :data="categoryTree"
        :props="{ children: 'children', label: 'name' }"
        node-key="id"
        default-expand-all
        highlight-current
        @node-click="onCategoryClick"
      >
        <template #default="{ data }">
          <span class="tree-node">
            <span>{{ data.name }}</span>
            <span class="tree-actions">
              <el-button link size="small" @click.stop="showCategoryDialog(data)">编辑</el-button>
              <el-popconfirm title="确定删除此分类？" @confirm="deleteCategory(data.id)" @click.stop>
                <template #reference>
                  <el-button link size="small" type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </span>
          </span>
        </template>
      </el-tree>
    </div>

    <!-- 右侧列表 -->
    <div class="right-panel">
      <div class="toolbar">
        <el-select v-model="filterCategoryId" placeholder="全部分类" clearable style="width: 200px" @change="loadList">
          <el-option v-for="cat in flatCategories" :key="cat.id" :label="cat.name" :value="cat.id" />
        </el-select>
        <el-input v-model="searchKeyword" placeholder="搜索名称/编码" clearable style="width: 220px; margin-left: 8px" @input="onSearchInput" />
        <el-button type="success" @click="showSkuDialog()">新增副品</el-button>
        <el-button type="primary" :disabled="subSkuSelection.length===0" @click="batchEditSubSkus()">编辑</el-button>
        <el-popconfirm title="确认批量下架？" @confirm="batchRemoveSubSkus" :disabled="subSkuSelection.length===0">
          <template #reference><el-button type="danger" :disabled="subSkuSelection.length===0">下架</el-button></template>
        </el-popconfirm>
        <el-popconfirm title="确认批量删除？此操作不可恢复" @confirm="batchDeleteSubSkus" :disabled="subSkuSelection.length===0">
          <template #reference><el-button type="danger" plain :disabled="subSkuSelection.length===0">删除</el-button></template>
        </el-popconfirm>
      </div>

      <el-table :data="list" stripe border style="width: 100%; margin-top: 12px" v-loading="loading" @selection-change="subSkuSelection=$event" @row-dblclick="showSkuDialog">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="code" label="编码" width="170" />
        <el-table-column label="品牌" width="80">
          <template #default="{ row }">{{ getSpecLabel(row, 'brand') }}</template>
        </el-table-column>
        <el-table-column prop="name" label="产品名称" min-width="260" />
        <el-table-column label="型号" width="120">
          <template #default="{ row }">{{ getSpecLabel(row, 'model') || row.code?.slice(-6) }}</template>
        </el-table-column>
        <el-table-column label="分类" width="110">
          <template #default="{ row }">{{ row.category?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="售价" width="100" align="right">
          <template #default="{ row }">¥{{ Number(row.price).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="55" />
        <el-table-column prop="stock" label="库存" width="80" align="right" />
        <el-table-column label="状态" width="70">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
              {{ row.isActive ? '在售' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="排序" width="55" prop="sortOrder" />
      </el-table>
    </div>

    <!-- 分类对话框 -->
    <el-dialog v-model="categoryDialogVisible" :title="categoryForm.id ? '编辑分类' : '新增分类'" width="480px">
      <el-form :model="categoryForm" label-width="100px">
        <el-form-item label="分类编码">
          <el-input v-model="categoryForm.code" placeholder="如 LENS_SINGLE_VISION" />
        </el-form-item>
        <el-form-item label="分类名称">
          <el-input v-model="categoryForm.name" placeholder="如 单光镜片" />
        </el-form-item>
        <el-form-item label="父级分类">
          <el-tree-select v-model="categoryForm.parentId" :data="categoryTree" :props="{ children: 'children', label: 'name', value: 'id' }" placeholder="无（一级分类）" clearable check-strictly style="width: 100%" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="categoryForm.sortOrder" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCategory">保存</el-button>
      </template>
    </el-dialog>

    <!-- S-SKU 对话框 -->
    <el-dialog v-model="skuDialogVisible" :title="skuForm.id ? '编辑副品' : '新增副品'" width="780px" top="3vh">
      <el-form :model="skuForm" label-width="100px">
        <!-- 供应链三要素：品牌 + 产品名称 + 型号 -->
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="品牌">
              <el-select v-model="skuForm.brand" placeholder="品牌" filterable style="width: 100%">
                <el-option v-for="b in dictOptions.brand" :key="b.code" :label="b.display_name" :value="b.name" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="型号">
              <el-input v-model="skuForm.model" placeholder="型号/货号" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="分类" required>
              <el-tree-select v-model="skuForm.categoryId" :data="categoryTree" :props="{ children: 'children', label: 'name', value: 'id' }" placeholder="选择分类" check-strictly style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">规格参数</el-divider>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="折射率">
              <el-select v-model="specValues.refractive_index" placeholder="选择" style="width: 100%" @change="updateDisplayName">
                <el-option v-for="ri in dictOptions.refractive_index" :key="ri.code" :label="ri.display_name" :value="ri.code" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="功能">
              <el-select v-model="specValues.lens_function" placeholder="选择" style="width: 100%" @change="updateDisplayName">
                <el-option v-for="fn in dictOptions.lens_function" :key="fn.code" :label="fn.display_name" :value="fn.code" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="膜层">
              <el-select v-model="specValues.coating" placeholder="选择" style="width: 100%" @change="updateDisplayName">
                <el-option v-for="ct in dictOptions.lens_coating" :key="ct.code" :label="ct.display_name" :value="ct.code" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="材质">
              <el-select v-model="specValues.material" placeholder="选择" style="width: 100%" @change="updateDisplayName">
                <el-option v-for="mt in dictOptions.lens_material" :key="mt.code" :label="mt.display_name" :value="mt.code" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="结构标准">
              <el-select v-model="skuForm.standardId" placeholder="可选" clearable style="width: 100%">
                <el-option v-for="st in structureStandards" :key="st.structureId" :label="st.externalCode + ' - ' + st.internalCode" :value="st.structureId" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="编码">
              <el-input v-model="skuForm.code" placeholder="系统编号" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">展示名</el-divider>

        <el-form-item label="展示名">
          <el-input v-model="skuForm.name" placeholder="格式：品牌 - 功能 - 膜层 - 折射率俗称镜片">
            <template #append>
              <el-button @click="updateDisplayName">自动生成</el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-divider content-position="left">价格与库存</el-divider>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="售价" label-width="80px">
              <el-input-number v-model="skuForm.price" :min="0" :precision="2" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="成本价" label-width="80px">
              <el-input-number v-model="skuForm.costPrice" :min="0" :precision="2" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="单位" label-width="80px">
              <el-select v-model="skuForm.unit" style="width: 100%">
                <el-option v-for="u in dictOptions.unit" :key="u.code" :label="u.display_name" :value="u.name" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排序" label-width="80px">
              <el-input-number v-model="skuForm.sortOrder" :min="0" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态" label-width="80px">
              <el-switch v-model="skuForm.isActive" active-text="上架" inactive-text="下架" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="skuDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSku" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getSubSkus, createSubSku, updateSubSku, deleteSubSku,
  getSubSkuCategories, getSubSkuCategoryTree, createSubSkuCategory, updateSubSkuCategory, deleteSubSkuCategory,
  getSubSkuDicts,
} from '@/api/product'
import { getStructureList } from '@/api/structure'
import request from '@/api/request'

// ============ 状态 ============
const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const subSkuSelection = ref<any[]>([])
const categoryTree = ref<any[]>([])
const flatCategories = ref<any[]>([])
const filterCategoryId = ref('')
const searchKeyword = ref('')
const structureStandards = ref<any[]>([])

const dictOptions = reactive({
  refractive_index: [] as any[],
  lens_function: [] as any[],
  lens_coating: [] as any[],
  lens_material: [] as any[],
  unit: [] as any[],
  brand: [] as any[],
})

// ============ 分类对话框 ============
const categoryDialogVisible = ref(false)
const categoryForm = reactive<any>({ id: '', code: '', name: '', parentId: '', sortOrder: 0 })

const showCategoryDialog = (data?: Record<string, unknown>) => {
  if (data?.id) {
    Object.assign(categoryForm, { id: data.id, code: data.code, name: data.name, parentId: data.parentId || '', sortOrder: data.sortOrder || 0 })
  } else {
    Object.assign(categoryForm, { id: '', code: '', name: '', parentId: '', sortOrder: 0 })
  }
  categoryDialogVisible.value = true
}

const saveCategory = async () => {
  saving.value = true
  try {
    if (categoryForm.id) {
      await updateSubSkuCategory(categoryForm.id, { code: categoryForm.code, name: categoryForm.name, parentId: categoryForm.parentId || undefined, sortOrder: categoryForm.sortOrder })
    } else {
      await createSubSkuCategory({ code: categoryForm.code, name: categoryForm.name, parentId: categoryForm.parentId || undefined, sortOrder: categoryForm.sortOrder })
    }
    ElMessage.success('保存成功')
    categoryDialogVisible.value = false
    loadCategories()
  } catch (e: unknown) {
    ElMessage.error((e as any)?.message || '操作失败')
  } finally { saving.value = false }
}

const deleteCategory = async (id: string) => {
  try {
    // 检查是否有子分类（在扁平列表中查找 parentId 匹配）
    const hasChildren = flatCategories.value.some((n: any) => n.parentId === id)
    if (hasChildren) {
      ElMessage.warning('该分类下存在子分类，请先删除子分类')
      return
    }
    await deleteSubSkuCategory(id)
    ElMessage.success('已删除')
    loadCategories()
  } catch (e: unknown) {
    const msg = (e as any)?.message || '删除失败'
    ElMessage.error(msg)
  }
}

// ============ S-SKU 对话框 ============
const skuDialogVisible = ref(false)
const skuForm = reactive<any>({
  id: '', code: '', name: '', brand: '秒镜', model: '', categoryId: '',
  specTemplateId: '', standardId: '',
  price: 0, costPrice: 0, unit: '副', stock: 0,
  sortOrder: 0, isActive: true,
})
const specValues = reactive<any>({ refractive_index: '', lens_function: '', coating: '', material: '' })

const onCategoryClick = (data: Record<string, unknown>) => {
  filterCategoryId.value = data?.id || ''
  loadList()
}

const showSkuDialog = (row?: Record<string, unknown>) => {
  if (row?.id) {
    const sv = (row.specValues || {}) as Record<string, string>
    Object.assign(skuForm, {
      id: row.id, code: row.code, name: row.name,
      brand: (sv.brand || row.brand || '秒镜') as string, model: (sv.model || row.model || '') as string,
      categoryId: row.categoryId, specTemplateId: row.specTemplateId || '',
      standardId: row.standardId || '',
      price: Number(row.price) || 0, costPrice: Number(row.costPrice) || 0,
      unit: row.unit || '副', stock: row.stock || 0,
      sortOrder: row.sortOrder || 0, isActive: row.isActive !== false,
    })
    Object.assign(specValues, { refractive_index: sv.refractive_index || '', lens_function: sv.lens_function || '', coating: sv.coating || '', material: sv.material || '' })
  } else {
    Object.assign(skuForm, { id: '', code: '', name: '', brand: '秒镜', model: '', categoryId: '', specTemplateId: '', standardId: '', price: 0, costPrice: 0, unit: '副', stock: 0, sortOrder: 0, isActive: true })
    Object.assign(specValues, { refractive_index: '', lens_function: '', coating: '', material: '' })
  }
  skuDialogVisible.value = true
}

const updateDisplayName = () => {
  const brand = skuForm.brand || '秒镜'
  const fn = dictOptions.lens_function.find(d => d.code === specValues.lens_function)
  const ct = dictOptions.lens_coating.find(d => d.code === specValues.coating)
  const ri = dictOptions.refractive_index.find(d => d.code === specValues.refractive_index)
  const parts = [brand]
  if (fn) parts.push(fn.display_name)
  if (ct) parts.push(ct.display_name)
  if (ri) parts.push(ri.display_name + '镜片')
  if (skuForm.model) parts.push(skuForm.model)
  skuForm.name = parts.join(' - ')
}

const getSpecLabel = (row: Record<string, unknown>, field: string): string => {
  let sv: Record<string, unknown> | null = null
  const raw = row.specValues
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    sv = raw as Record<string, unknown>
  } else if (typeof raw === 'string') {
    try { sv = JSON.parse(raw) } catch { sv = null }
  }
  if (field === 'brand') return (sv?.brand as string) || (row.brand as string) || '秒镜'
  if (field === 'model') return (sv?.model as string) || (row.model as string) || ''
  return ''
}

const saveSku = async () => {
  saving.value = true
  try {
    const sv = { ...specValues, brand: skuForm.brand, model: skuForm.model }
    const payload: Record<string, unknown> = {
      code: skuForm.code, name: skuForm.name,
      brand: skuForm.brand, model: skuForm.model,
      categoryId: skuForm.categoryId,
      specTemplateId: skuForm.specTemplateId || undefined,
      specValues: sv,
      standardId: skuForm.standardId || undefined,
      price: skuForm.price, costPrice: skuForm.costPrice,
      unit: skuForm.unit, stock: skuForm.stock,
      sortOrder: skuForm.sortOrder, isActive: skuForm.isActive,
    }
    if (skuForm.id) {
      await updateSubSku(skuForm.id, payload)
    } else {
      await createSubSku(payload)
    }
    ElMessage.success(skuForm.id ? '更新成功' : '新增成功')
    skuDialogVisible.value = false
    loadList()
  } catch (e: unknown) {
    ElMessage.error((e as any)?.message || '操作失败')
  } finally { saving.value = false }
}
const batchEditSubSkus = () => { if(subSkuSelection.value.length===1) showSkuDialog(subSkuSelection.value[0]); else if(subSkuSelection.value.length>1) ElMessage.warning('暂仅支持单条编辑'); };
const batchRemoveSubSkus = async () => { try { for(const r of subSkuSelection.value) await deleteSubSku(r.id); ElMessage.success(subSkuSelection.value.length+' 条已下架'); subSkuSelection.value=[]; loadList(); } catch { ElMessage.error('操作失败'); } };

// 下架

const batchDeleteSubSkus = async () => { try { for(const r of subSkuSelection.value) await deleteSubSku(r.id); ElMessage.success(subSkuSelection.value.length+' 条已删除'); subSkuSelection.value=[]; loadList(); } catch { ElMessage.error('删除失败'); } };

// ============ 数据加载 ============
const loadCategories = async () => {
  try {
    const [treeRes, flatRes] = await Promise.all([
      getSubSkuCategoryTree(),
      getSubSkuCategories(),
    ])
    categoryTree.value = Array.isArray(treeRes) ? treeRes : []
    flatCategories.value = Array.isArray(flatRes) ? flatRes.filter((c: Record<string, unknown>) => c.isActive) : []
  } catch (e: unknown) {
    console.error('加载分类失败', e)
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadList(), 300)
}

const loadList = async () => {
  loading.value = true
  try {
    const params: Record<string, string | number> = { page: 1, pageSize: 500 }
    if (filterCategoryId.value) params.categoryId = filterCategoryId.value
    if (searchKeyword.value) params.keyword = searchKeyword.value
    const res = await getSubSkus(params)
    list.value = Array.isArray(res) ? res : []
  } catch (e: unknown) {
    console.error('加载列表失败', e)
    list.value = []
  } finally { loading.value = false }
}

const loadDicts = async () => {
  const dictKeys = ['refractive_index', 'lens_function', 'lens_coating', 'lens_material', 'unit', 'brand'] as const
  try {
    const [ri, fn, ct, mt, un, br] = await getSubSkuDicts()
    const results = [ri, fn, ct, mt, un, br]
    dictKeys.forEach((key, i) => {
      (dictOptions as any)[key] = Array.isArray(results[i]) ? results[i] : []
    })
  } catch (e: unknown) {
    // 降级：逐个请求，单个失败不影响其他
    console.warn('批量加载字典失败，尝试逐个加载...', e)
    const fallbackLoaders: Record<string, () => Promise<any>> = {
      refractive_index: () => request.get('/dict/dict_refractive_index'),
      lens_function: () => request.get('/dict/dict_lens_function'),
      lens_coating: () => request.get('/dict/dict_lens_coating'),
      lens_material: () => request.get('/dict/dict_lens_material'),
      unit: () => request.get('/dict/dict_unit'),
      brand: () => request.get('/dict/dict_brand'),
    }
    for (const key of dictKeys) {
      try {
        const res = await fallbackLoaders[key]()
        ;(dictOptions as any)[key] = Array.isArray(res) ? res : []
      } catch (err) {
        console.error(`字典 ${key} 加载失败`, err)
        ;(dictOptions as any)[key] = []
      }
    }
  }
}

const loadStructureStandards = async () => {
  try {
    const res = await getStructureList({ page: 1, pageSize: 500 })
    structureStandards.value = Array.isArray(res) ? res.filter((s: Record<string, unknown>) => s.status === 'active') : []
  } catch (e: unknown) {
    console.error('加载结构标准失败', e)
  }
}

onMounted(async () => {
  await loadCategories()
  await Promise.all([loadDicts(), loadStructureStandards()])
  loadList()
})

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<style scoped>
.sub-sku-container {
  display: flex;
  height: calc(100vh - 160px);
  gap: 16px;
}
.left-panel {
  width: 260px; min-width: 260px;
  border: 1px solid #e4e7ed; border-radius: 6px;
  padding: 12px; overflow-y: auto; background: #fff;
}
.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px; font-weight: 600;
}
.right-panel { flex: 1; overflow-y: auto; }
.toolbar { display: flex; align-items: center; }
.tree-node {
  display: flex; justify-content: space-between; align-items: center;
  width: 100%; padding-right: 4px;
}
.tree-actions { opacity: 0; transition: opacity .2s; }
.tree-node:hover .tree-actions { opacity: 1; }

/* 价格/库存输入框拉宽 */
:deep(.el-input-number) { width: 100% !important; }
:deep(.el-input-number .el-input__inner) { text-align: left; }
</style>
