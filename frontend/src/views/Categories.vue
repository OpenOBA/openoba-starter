<template>
  <div class="categories-page">
    <div class="layout">
      <!-- 左侧：树形导航 -->
      <div class="tree-panel">
        <div class="tree-toolbar">
          <span class="tree-title">分类树</span>
          <el-button size="small" type="primary" @click="handleAddRoot">+ 新增顶级</el-button>
          <el-button size="small" @click="expandAll">{{ allExpanded ? '收起' : '展开' }}</el-button>
        </div>
        <div class="tree-body">
          <el-tree
            ref="treeRef"
            :data="treeData"
            :props="{ label: 'categoryName', children: 'children' }"
            node-key="categoryId"
            :expand-on-click-node="false"
            :default-expand-all="allExpanded"
            highlight-current
            draggable
            @node-click="handleNodeClick"
            @node-drag-end="handleDragEnd"
          >
            <template #default="{ data }">
              <span class="tree-node" :class="{ active: selectedId === data.categoryId }">
                <span class="node-icon">{{ data.icon || '' }}</span>
                <span class="node-label">{{ data.categoryName }}</span>
                <span v-if="!data.isActive" class="node-disabled-tag">禁用</span>
              </span>
            </template>
          </el-tree>
        </div>
      </div>

      <!-- 右侧：节点详情 -->
      <div class="detail-panel">
        <template v-if="selectedId">
          <div class="detail-header">
            <span class="detail-title">{{ isNewNode ? '新增分类' : '编辑分类' }}</span>
            <span v-if="!isNewNode" class="detail-code">{{ form.categoryCode }}</span>
          </div>
          <el-form :model="form" label-width="80px" class="detail-form">
            <el-form-item label="名称">
              <el-input v-model="form.categoryName" placeholder="分类名称" />
            </el-form-item>
            <el-form-item label="编码">
              <el-input v-model="form.categoryCode" :disabled="!!form.categoryId" placeholder="留空自动生成" />
            </el-form-item>
            <el-form-item label="图标">
              <el-input v-model="form.icon" placeholder="Emoji 或图标名" />
            </el-form-item>
            <el-form-item label="描述">
              <el-input v-model="form.description" type="textarea" :rows="3" placeholder="分类描述" />
            </el-form-item>
            <el-form-item label="层级">
              <span class="info-text">{{ form.level || 1 }}</span>
            </el-form-item>
            <el-form-item label="排序">
              <el-input-number v-model="form.sortOrder" :min="0" size="small" />
            </el-form-item>
            <el-form-item label="状态">
              <el-switch v-model="form.isActive" active-text="启用" inactive-text="禁用" />
            </el-form-item>
          </el-form>

          <div class="detail-actions">
            <el-button type="primary" :disabled="!form.categoryName" @click="handleSave">
              {{ isNewNode ? '创建' : '保存' }}
            </el-button>
            <el-button v-if="isNewNode" @click="handleCancelNew">取消</el-button>
          </div>

          <el-divider />

          <div class="node-operations">
            <el-button size="small" @click="handleAddChild">+ 子分类</el-button>
            <el-button size="small" @click="handleAddSibling">+ 同级</el-button>
            <el-popconfirm title="确认删除？有子分类时无法删除" @confirm="handleDelete">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </template>

        <template v-else>
          <div class="empty-state">
            <div class="empty-icon"></div>
            <div class="empty-text">选择一个分类节点查看详情</div>
            <div class="empty-hint">或点击左上角「新增顶级」创建根分类</div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import type { ElTree } from 'element-plus'
import { getCategoriesTree, createCategory, updateCategory, deleteCategory } from '@/api/category'

interface CategoryNode {
  categoryId: string
  categoryCode: string
  categoryName: string
  parentId: string | null
  level: number
  sortOrder: number
  isActive: boolean
  icon: string | null
  description: string | null
  isRecommended: number
  children: CategoryNode[]
}

// === 状态 ===
const treeRef = ref<InstanceType<typeof ElTree>>()
const treeData = ref<CategoryNode[]>([])
const allExpanded = ref(true)
const selectedId = ref('')
const isNewNode = ref(false)
const newParentId = ref<string | null>(null)

const form = reactive({
  categoryId: '',
  categoryCode: '',
  categoryName: '',
  parentId: null as string | null,
  level: 1,
  sortOrder: 0,
  isActive: true,
  icon: '' as string | null,
  description: '' as string | null,
  isRecommended: 0,
})

// === 数据加载 ===
async function loadTree() {
  try {
    const data = await getCategoriesTree()
    treeData.value = Array.isArray(data) ? (data as CategoryNode[]) : []
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    ElMessage.error(err)
  }
}

// === 节点点击 ===
function handleNodeClick(data: CategoryNode) {
  isNewNode.value = false
  newParentId.value = null
  selectedId.value = data.categoryId
  form.categoryId = data.categoryId
  form.categoryCode = data.categoryCode
  form.categoryName = data.categoryName
  form.parentId = data.parentId
  form.level = data.level
  form.sortOrder = data.sortOrder
  form.isActive = data.isActive
  form.icon = data.icon
  form.description = data.description
  form.isRecommended = data.isRecommended
}

// === 新增顶级 ===
function handleAddRoot() {
  isNewNode.value = true
  selectedId.value = '__new__'
  newParentId.value = null
  form.categoryId = ''
  form.categoryCode = ''
  form.categoryName = ''
  form.parentId = null
  form.level = 1
  form.sortOrder = 0
  form.isActive = true
  form.icon = null
  form.description = null
  form.isRecommended = 0
}

// === 新增子节点 ===
function handleAddChild() {
  isNewNode.value = true
  const parentId = form.categoryId || selectedId.value
  newParentId.value = parentId
  form.categoryId = ''
  form.categoryCode = ''
  form.categoryName = ''
  form.parentId = parentId
  form.level = (form.level || 1) + 1
  form.sortOrder = 0
  form.isActive = true
  form.icon = null
  form.description = null
  form.isRecommended = 0
  selectedId.value = '__new__'
}

// === 新增同级 ===
function handleAddSibling() {
  isNewNode.value = true
  newParentId.value = form.parentId
  form.categoryId = ''
  form.categoryCode = ''
  form.categoryName = ''
  form.level = form.level || 1
  form.sortOrder = (form.sortOrder || 0) + 1
  form.isActive = true
  form.icon = null
  form.description = null
  form.isRecommended = 0
  selectedId.value = '__new__'
}

// === 取消新增 ===
function handleCancelNew() {
  isNewNode.value = false
  selectedId.value = ''
}

// === 保存 ===
async function handleSave() {
  if (!form.categoryName) {
    ElMessage.warning('请输入分类名称')
    return
  }
  const payload: Record<string, unknown> = {
    categoryName: form.categoryName,
    categoryCode: form.categoryCode || undefined,
    parentId: form.parentId,
    level: form.level,
    sortOrder: form.sortOrder,
    isActive: form.isActive,
    icon: form.icon || undefined,
    description: form.description || undefined,
    isRecommended: form.isRecommended ? 1 : 0,
  }
  try {
    if (form.categoryId) {
      await updateCategory(form.categoryId, payload)
      ElMessage.success('分类已更新')
    } else {
      const result = (await createCategory(payload)) as Record<string, unknown>
      ElMessage.success('分类已创建')
      if (result?.categoryId) {
        selectedId.value = String(result.categoryId ?? '')
        form.categoryId = String(result.categoryId ?? '')
        form.categoryCode = String(result.categoryCode ?? form.categoryCode)
      }
    }
    isNewNode.value = false
    await loadTree()
    // 恢复选中
    nextTick(() => {
      if (form.categoryId && treeRef.value) {
        treeRef.value.setCurrentKey(form.categoryId)
      }
    })
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    ElMessage.error(err)
  }
}

// === 删除 ===
async function handleDelete() {
  try {
    await deleteCategory(selectedId.value)
    ElMessage.success('已删除')
    selectedId.value = ''
    loadTree()
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    ElMessage.error(err)
  }
}

// === 拖拽 ===
async function handleDragEnd(
  draggingNode: { data: CategoryNode },
  dropNode: { data: CategoryNode },
  dropType: 'before' | 'after' | 'inner',
) {
  const dragData: CategoryNode = draggingNode.data
  const dropData: CategoryNode = dropNode.data

  let newParentId: string | null = null
  if (dropType === 'inner') {
    newParentId = dropData.categoryId
  } else {
    newParentId = dropData.parentId
  }

  // 调用后端更新 parentId
  try {
    await updateCategory(dragData.categoryId, { parentId: newParentId })
    ElMessage.success('已移动')
    loadTree()
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    ElMessage.error(err)
    loadTree() // 回滚显示
  }
}

// === 展开/收起 ===
function expandAll() {
  allExpanded.value = !allExpanded.value
}

onMounted(() => {
  loadTree()
})
</script>

<style scoped>
.categories-page {
  height: calc(100vh - 100px);
  padding: 0;
}
.layout {
  display: flex;
  height: 100%;
  gap: 0;
}
/* 左侧树面板 */
.tree-panel {
  width: 300px;
  min-width: 260px;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  background: #fafafa;
}
.tree-toolbar {
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tree-title {
  font-weight: 600;
  font-size: 14px;
  margin-right: auto;
}
.tree-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  font-size: 14px;
  padding: 2px 0;
}
.tree-node.active {
  color: #409eff;
  font-weight: 600;
}
.node-icon {
  font-size: 16px;
}
.node-label {
  flex: 1;
}
.node-disabled-tag {
  font-size: 11px;
  color: #f56c6c;
  background: #fef0f0;
  padding: 0 4px;
  border-radius: 2px;
}

/* 右侧详情面板 */
.detail-panel {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: #fff;
}
.detail-header {
  margin-bottom: 20px;
}
.detail-title {
  font-size: 18px;
  font-weight: 600;
}
.detail-code {
  font-size: 12px;
  color: #909399;
  margin-left: 12px;
  font-family: monospace;
}
.detail-form {
  max-width: 480px;
}
.info-text {
  color: #909399;
}
.detail-actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
}
.node-operations {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}
.empty-text {
  font-size: 16px;
  margin-bottom: 8px;
}
.empty-hint {
  font-size: 13px;
}
</style>
