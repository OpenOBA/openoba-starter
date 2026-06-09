<template>
 <div class="erdl-management">
 <!-- 顶部统计卡片 -->
 <el-row :gutter="16" class="stats-row">
 <el-col :span="4">
 <el-card shadow="hover" class="stat-card">
 <div class="stat-icon"></div>
 <div class="stat-value">{{ stats.entities }}</div>
 <div class="stat-label">Entity</div>
 </el-card>
 </el-col>
 <el-col :span="4">
 <el-card shadow="hover" class="stat-card">
 <div class="stat-icon"></div>
 <div class="stat-value">{{ stats.rules }}</div>
 <div class="stat-label">规则</div>
 </el-card>
 </el-col>
 <el-col :span="4">
 <el-card shadow="hover" class="stat-card">
 <div class="stat-icon"></div>
 <div class="stat-value">{{ stats.agents }}</div>
 <div class="stat-label">Agent</div>
 </el-card>
 </el-col>
 <el-col :span="4">
 <el-card shadow="hover" class="stat-card">
 <div class="stat-icon"></div>
 <div class="stat-value">{{ stats.knowledgeBases }}</div>
 <div class="stat-label">知识库</div>
 </el-card>
 </el-col>
 <el-col :span="4">
 <el-card shadow="hover" class="stat-card">
 <div class="stat-icon"></div>
 <div class="stat-value">{{ stats.files }}</div>
 <div class="stat-label">ERDL 文件</div>
 </el-card>
 </el-col>
 <el-col :span="4">
 <el-card shadow="hover" class="stat-card clickable" @click="goToPlayground">
 <div class="stat-icon"></div>
 <div class="stat-label" style="margin-top:8px">进入 Playground</div>
 </el-card>
 </el-col>
 </el-row>

 <!-- Tab 区域 -->
 <el-card class="main-card">
 <el-tabs v-model="activeTab">
 <!-- Entity 管理 -->
 <el-tab-pane label=" Entity 管理" name="entities">
 <el-table :data="entities" stripe v-loading="loading">
 <el-table-column prop="namespace" label="命名空间" width="220" />
 <el-table-column prop="name" label="Entity" width="180" />
 <el-table-column label="属性" width="100">
 <template #default="{ row }">
 {{ Object.keys(row.properties || {}).length }}
 </template>
 </el-table-column>
 <el-table-column prop="sourceFile" label="来源文件" min-width="200" />
 <el-table-column prop="loadedAt" label="加载时间" width="180" />
 <el-table-column label="操作" width="120" fixed="right">
 <template #default="{ row }">
 <el-button type="primary" link size="small" @click="viewSchema(row)">
 Schema
 </el-button>
 </template>
 </el-table-column>
 </el-table>
 </el-tab-pane>

 <!-- 规则管理 -->
 <el-tab-pane label=" 规则管理" name="rules">
 <div class="filter-bar">
 <el-button type="primary" @click="openCreateDialog"> 新建规则</el-button>
 <el-input v-model="ruleFilter" placeholder="按触发器筛选..." prefix-icon="Search" clearable style="width:300px;margin-left:12px" />
 </div>
 <el-table :data="filteredRules" stripe v-loading="loading">
 <el-table-column prop="name" label="规则名" width="180" />
 <el-table-column prop="trigger" label="触发器" width="200" />
 <el-table-column prop="entity" label="目标 Entity" width="140" />
 <el-table-column prop="tier" label="层级" width="100">
 <template #default="{ row }">
 <el-tag :type="tierType(row.tier)" size="small">{{ row.tier }}</el-tag>
 </template>
 </el-table-column>
 <el-table-column prop="priority" label="优先级" width="80" />
 <el-table-column label="启用" width="80">
 <template #default="{ row }">
 <el-switch
 v-model="row.isActive"
 :loading="row._toggling"
 @change="handleToggle(row)"
 />
 </template>
 </el-table-column>
 <el-table-column prop="version" label="版本" width="70" />
 <el-table-column prop="createdAt" label="创建时间" width="170" />
 <el-table-column label="操作" width="140" fixed="right">
 <template #default="{ row }">
 <el-button type="primary" link size="small" @click="openEditDialog(row)">
 编辑
 </el-button>
 <el-button type="danger" link size="small" @click="handleDelete(row)">
 删除
 </el-button>
 </template>
 </el-table-column>
 </el-table>
 </el-tab-pane>

 <!-- Schema 查看器 -->
 <el-tab-pane label=" Schema 查看器" name="schemas">
 <el-select v-model="selectedSchema" placeholder="选择 Entity 查看 Schema" style="width:400px;margin-bottom:16px" @change="onSchemaChange">
 <el-option
 v-for="s in schemas"
 :key="s.entity"
 :label="`${s.namespace}.${s.entity} (${s.fields.length} 字段)`"
 :value="s"
 />
 </el-select>
 <el-table :data="selectedSchema?.fields || []" stripe v-if="selectedSchema">
 <el-table-column prop="field" label="字段名" width="180" />
 <el-table-column prop="label" label="显示名称" width="140" />
 <el-table-column prop="type" label="类型" width="120">
 <template #default="{ row }">
 <el-tag size="small">{{ row.type }}</el-tag>
 </template>
 </el-table-column>
 <el-table-column prop="required" label="必填" width="70">
 <template #default="{ row }">
 <el-icon v-if="row.required" style="color:#67c23a"><Check /></el-icon>
 </template>
 </el-table-column>
 <el-table-column label="验证" min-width="200">
 <template #default="{ row }">
 <span v-if="row.validation" class="validation-text">
 {{ formatValidation(row.validation) }}
 </span>
 </template>
 </el-table-column>
 </el-table>
 <el-empty v-else description="请选择一个 Entity 查看 Schema" />
 </el-tab-pane>

 <!-- 智能推荐 -->
 <el-tab-pane label=" 智能推荐" name="recommend">
 <AIRecommendDialog v-model="showRecommend" />
 <el-button type="primary" size="large" @click="showRecommend = true">
 打开智能推荐
 </el-button>
 </el-tab-pane>

 <!-- 知识库 -->
 <el-tab-pane label=" 知识库" name="knowledge">
 <el-table :data="knowledgeBases" stripe v-loading="loading">
 <el-table-column prop="name" label="知识库名称" width="200" />
 <el-table-column prop="namespace" label="命名空间" width="220" />
 <el-table-column prop="description" label="描述" min-width="250" />
 <el-table-column label="关联实体" width="180">
 <template #default="{ row }">
 <el-tag v-for="et in row.entityTypes" :key="et" size="small" style="margin-right:4px">
 {{ et }}
 </el-tag>
 <span v-if="!row.entityTypes || row.entityTypes.length === 0" class="text-muted">—</span>
 </template>
 </el-table-column>
 <el-table-column prop="sourceFile" label="来源文件" width="180" />
 <el-table-column prop="loadedAt" label="加载时间" width="180" />
 </el-table>
 <el-empty v-if="knowledgeBases.length === 0" description="暂无知识库" />
 </el-tab-pane>
 </el-tabs>
 </el-card>

 <!-- Schema 弹窗 -->
 <el-dialog v-model="schemaDialogVisible" :title="`Schema: ${currentEntity}`" width="720px">
 <el-descriptions :column="2" border>
 <el-descriptions-item label="命名空间">{{ currentSchema?.namespace }}</el-descriptions-item>
 <el-descriptions-item label="字段数">{{ currentSchema?.fields?.length }}</el-descriptions-item>
 </el-descriptions>
 <el-table :data="currentSchema?.fields || []" stripe style="margin-top:16px">
 <el-table-column prop="field" label="字段" width="160" />
 <el-table-column prop="label" label="标签" width="120" />
 <el-table-column prop="type" label="类型" width="100" />
 <el-table-column prop="required" label="必填" width="60" />
 </el-table>
 </el-dialog>

 <!-- 新建/编辑规则弹窗 -->
 <el-dialog
 v-model="ruleDialogVisible"
 :title="isEditMode ? '编辑规则' : '新建规则'"
 width="720px"
 :close-on-click-modal="false"
 >
 <el-form :model="ruleForm" label-width="100px" label-position="right">
 <el-row :gutter="16">
 <el-col :span="12">
 <el-form-item label="规则名称" required>
 <el-input v-model="ruleForm.name" placeholder="如：VIP折扣规则" />
 </el-form-item>
 </el-col>
 <el-col :span="12">
 <el-form-item label="触发器" required>
 <el-input v-model="ruleForm.trigger" placeholder="如：Product.price.calculate" />
 </el-form-item>
 </el-col>
 </el-row>
 <el-row :gutter="16">
 <el-col :span="12">
 <el-form-item label="命名空间" required>
 <el-input v-model="ruleForm.namespace" placeholder="如：com.miaojing.eyewear" />
 </el-form-item>
 </el-col>
 <el-col :span="12">
 <el-form-item label="目标实体" required>
 <el-input v-model="ruleForm.entity" placeholder="如：ProductSku" />
 </el-form-item>
 </el-col>
 </el-row>
 <el-row :gutter="16">
 <el-col :span="8">
 <el-form-item label="层级" required>
 <el-select v-model="ruleForm.tier" style="width:100%">
 <el-option label="policy" value="policy" />
 <el-option label="validation" value="validation" />
 <el-option label="computed" value="computed" />
 </el-select>
 </el-form-item>
 </el-col>
 <el-col :span="8">
 <el-form-item label="优先级">
 <el-input-number v-model="ruleForm.priority" :min="0" :max="100" style="width:100%" />
 </el-form-item>
 </el-col>
 <el-col :span="8">
 <el-form-item label="启用状态">
 <el-switch v-model="ruleForm.isActive" />
 </el-form-item>
 </el-col>
 </el-row>
 <el-form-item label="条件 (JSON)">
 <el-input
 v-model="ruleForm.conditionJson"
 type="textarea"
 :rows="5"
 placeholder='{"logic":"AND","conditions":[]}'
 />
 </el-form-item>
 <el-form-item label="动作 (JSON)">
 <el-input
 v-model="ruleForm.actionsJson"
 type="textarea"
 :rows="5"
 placeholder='[{"type":"calculate","params":{"formula":"retailPrice * 0.8"}}]'
 />
 </el-form-item>
 </el-form>
 <template #footer>
 <el-button @click="ruleDialogVisible = false">取消</el-button>
 <el-button type="primary" @click="handleSaveRule" :loading="ruleSaving">
 {{ isEditMode ? '保存' : '创建' }}
 </el-button>
 </template>
 </el-dialog>
 </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import {
 getERDLStats,
 getERDLEntities,
 getERDLRules,
 getAllFormSchemas,
 createRule,
 updateRule,
 deleteRule,
 toggleRule,
 getKnowledgeBases,
 type ERDLStats,
 type ERDLEntity,
 type ERDLRule,
 type FormSchema,
 type KnowledgeBase,
} from '@/api/erdl'
import AIRecommendDialog from '@/components/erdl/AIRecommendDialog.vue'

// ============================================
// 响应式数据
// ============================================

const router = useRouter()
const loading = ref(false)
const activeTab = ref('entities')
const ruleFilter = ref('')
const showRecommend = ref(false)
const schemaDialogVisible = ref(false)
const currentEntity = ref('')
const currentSchema = ref<FormSchema | null>(null)
const knowledgeBases = ref<KnowledgeBase[]>([])

const stats = ref<ERDLStats>({
 entities: 0,
 rules: 0,
 agents: 0,
 knowledgeBases: 0,
 files: 0,
})

const entities = ref<ERDLEntity[]>([])
const rules = ref<ERDLRule[]>([])
const schemas = ref<FormSchema[]>([])
const selectedSchema = ref<FormSchema | null>(null)

const filteredRules = computed(() => {
 if (!ruleFilter.value) return rules.value
 const f = ruleFilter.value.toLowerCase()
 return rules.value.filter(r => r.trigger?.toLowerCase().includes(f))
})

// ============================================
// 规则 CRUD 状态
// ============================================

const ruleDialogVisible = ref(false)
const isEditMode = ref(false)
const ruleSaving = ref(false)
const editingRuleId = ref('')

interface RuleFormState {
 name: string
 trigger: string
 namespace: string
 entity: string
 tier: 'policy' | 'validation' | 'computed'
 priority: number
 isActive: boolean
 conditionJson: string
 actionsJson: string
}

const defaultRuleForm = (): RuleFormState => ({
 name: '',
 trigger: '',
 namespace: 'com.miaojing.eyewear',
 entity: '',
 tier: 'policy',
 priority: 10,
 isActive: true,
 conditionJson: '{\n "logic": "AND",\n "conditions": []\n}',
 actionsJson: '[\n {\n "type": "calculate",\n "params": {}\n }\n]',
})

const ruleForm = ref<RuleFormState>(defaultRuleForm())

// ============================================
// 方法
// ============================================

function tierType(tier: string) {
 const map: Record<string, string> = { policy: 'warning', validation: 'danger', computed: 'info' }
 return map[tier] || ''
}

function formatValidation(v: { min?: number; max?: number; pattern?: string; message?: string }) {
 const parts: string[] = []
 if (v.min !== undefined) parts.push(`≥${v.min}`)
 if (v.max !== undefined) parts.push(`≤${v.max}`)
 if (v.pattern) parts.push(`pattern: ${v.pattern}`)
 if (v.message) parts.push(v.message)
 return parts.join(', ')
}

function viewSchema(entity: ERDLEntity) {
 currentEntity.value = entity.name
 const s = schemas.value.find(s => s.entity === entity.name)
 currentSchema.value = s || null
 schemaDialogVisible.value = true
}

function onSchemaChange(s: FormSchema) {
 // selectedSchema already updated by v-model
}

function goToPlayground() {
 router.push('/erdl/playground')
}

// ---- Rule CRUD ----

function openCreateDialog() {
 isEditMode.value = false
 ruleForm.value = defaultRuleForm()
 ruleDialogVisible.value = true
}

function openEditDialog(row: ERDLRule) {
 isEditMode.value = true
 editingRuleId.value = row.id
 ruleForm.value = {
 name: row.name,
 trigger: row.trigger || '',
 namespace: row.namespace,
 entity: row.entity,
 tier: (row.tier as 'policy' | 'validation' | 'computed') || 'policy',
 priority: row.priority,
 isActive: row.isActive,
 conditionJson: '{\n "logic": "AND",\n "conditions": []\n}',
 actionsJson: '[\n {\n "type": "calculate",\n "params": {}\n }\n]',
 }
 ruleDialogVisible.value = true
}

async function handleSaveRule() {
 // 校验必填
 if (!ruleForm.value.name || !ruleForm.value.trigger || !ruleForm.value.namespace || !ruleForm.value.entity) {
 ElMessage.warning('请填写规则名称、触发器、命名空间和目标实体')
 return
 }

 // 解析 JSON
 let condition: Record<string, unknown>
 let actions: Record<string, unknown>[]
 try {
 condition = JSON.parse(ruleForm.value.conditionJson)
 } catch {
 ElMessage.error('条件 JSON 格式错误')
 return
 }
 try {
 actions = JSON.parse(ruleForm.value.actionsJson)
 } catch {
 ElMessage.error('动作 JSON 格式错误')
 return
 }

 ruleSaving.value = true
 try {
 if (isEditMode.value) {
 await updateRule(editingRuleId.value, {
 name: ruleForm.value.name,
 trigger: ruleForm.value.trigger,
 namespace: ruleForm.value.namespace,
 entity: ruleForm.value.entity,
 tier: ruleForm.value.tier,
 priority: ruleForm.value.priority,
 isActive: ruleForm.value.isActive,
 condition,
 actions,
 })
 ElMessage.success('规则更新成功')
 } else {
 await createRule({
 name: ruleForm.value.name,
 trigger: ruleForm.value.trigger,
 namespace: ruleForm.value.namespace,
 entity: ruleForm.value.entity,
 tier: ruleForm.value.tier,
 priority: ruleForm.value.priority,
 isActive: ruleForm.value.isActive,
 condition,
 actions,
 })
 ElMessage.success('规则创建成功')
 }
 ruleDialogVisible.value = false
 await loadAll()
 } catch (err: unknown) {
 const msg = err instanceof Error ? err.message : '操作失败'
 ElMessage.error(msg)
 } finally {
 ruleSaving.value = false
 }
}

async function handleToggle(row: ERDLRule) {
 row._toggling = true
 try {
 await toggleRule(row.id)
 ElMessage.success(`规则已${row.isActive ? '启用' : '禁用'}`)
 await loadAll()
 } catch (err: unknown) {
 row.isActive = !row.isActive
 const msg = err instanceof Error ? err.message : '切换失败'
 ElMessage.error(msg)
 } finally {
 row._toggling = false
 }
}

async function handleDelete(row: ERDLRule) {
 try {
 await ElMessageBox.confirm(`确定要删除规则「${row.name}」吗？此操作可恢复。`, '删除确认', {
 confirmButtonText: '删除',
 cancelButtonText: '取消',
 type: 'warning',
 })
 await deleteRule(row.id)
 ElMessage.success('规则已删除')
 await loadAll()
 } catch (err: unknown) {
 if (err !== 'cancel' && err !== 'close') {
 const msg = err instanceof Error ? err.message : '删除失败'
 ElMessage.error(msg)
 }
 }
}

// ============================================
// 数据加载
// ============================================

async function loadAll() {
 loading.value = true
 try {
 const [s, e, r, sc, kb] = await Promise.all([
 getERDLStats(),
 getERDLEntities(),
 getERDLRules(),
 getAllFormSchemas(),
 getKnowledgeBases().catch(() => []),
 ])
 stats.value = s
 entities.value = e
 rules.value = r
 schemas.value = sc
 knowledgeBases.value = kb
 } catch {
 ElMessage.error('加载 ERDL 数据失败')
 } finally {
 loading.value = false
 }
}

onMounted(loadAll)
</script>

<style scoped>
.erdl-management { padding: 16px; }
.stats-row { margin-bottom: 16px; }
.stat-card { text-align: center; padding: 8px 0; }
.stat-icon { font-size: 28px; }
.stat-value { font-size: 28px; font-weight: bold; color: #303133; margin: 4px 0; }
.stat-label { font-size: 12px; color: #909399; }
.stat-card.clickable { cursor: pointer; transition: transform 0.2s; }
.stat-card.clickable:hover { transform: translateY(-2px); }
.main-card { margin-bottom: 16px; }
.filter-bar { margin-bottom: 16px; display: flex; align-items: center; }
.validation-text { font-size: 12px; color: #909399; font-family: monospace; }
.text-muted { color: #c0c4cc; font-size: 12px; }
</style>
