<template>
 <div class="erdl-playground">
 <!-- 自然语言 → ERDL 生成区域 -->
 <el-card shadow="hover" class="nl-generate-card">
 <template #header>
 <div class="card-header">
 <span> 自然语言 → ERDL</span>
 <el-tag type="warning" size="small">Beta</el-tag>
 </div>
 </template>
 <div class="nl-input-row">
 <el-input
 v-model="nlPrompt"
 placeholder="用自然语言描述你的业务需求，如：VIP 会员打 8 折，满 500 元包邮，低于成本价不能卖..."
 clearable
 @keyup.enter="generateERDL"
 >
 <template #prefix>
 <span style="color:#909399;font-size:13px;"></span>
 </template>
 </el-input>
 <el-button
 type="primary"
 @click="generateERDL"
 :loading="generating"
 :disabled="!nlPrompt.trim()"
 >
 生成 ERDL
 </el-button>
 </div>
 <div v-if="nlHint" class="nl-hint">
 <el-text type="info" size="small">
 试试说：{{ randomHint }}
 </el-text>
 </div>
 </el-card>

 <el-row :gutter="16" style="margin-top:16px">
 <!-- 左侧：ERDL 编辑器 -->
 <el-col :span="14">
 <el-card shadow="hover">
 <template #header>
 <div class="card-header">
 <span> ERDL 编辑器</span>
 <div>
 <el-button @click="loadSample" size="small">加载示例</el-button>
 <el-button @click="clearEditor" size="small">清空</el-button>
 </div>
 </div>
 </template>

 <el-input
 v-model="yamlCode"
 type="textarea"
 :rows="22"
 placeholder="在此编写 ERDL 定义...\n\n或者在上方用自然语言描述需求，AI 自动生成！"
 class="erdl-editor"
 />

 <div class="toolbar">
 <el-button type="primary" @click="validateYaml" :loading="validating">
 校验语法
 </el-button>
 <el-button type="success" @click="loadYaml" :loading="loading">
 加载到系统
 </el-button>
 <el-button
 v-if="yamlCode"
 type="warning"
 @click="loadGeneratedYaml"
 text
 :disabled="!generatedValid"
 >
 加载生成结果
 </el-button>
 </div>
 </el-card>
 </el-col>

 <!-- 右侧：解析结果 -->
 <el-col :span="10">
 <el-card shadow="hover" class="result-panel">
 <template #header>
 <div class="card-header">
 <span> 解析结果</span>
 <el-tag v-if="stats" type="info" size="small">
 {{ stats.entities }} Entity · {{ stats.rules }} 规则 · {{ stats.agents }} Agent
 </el-tag>
 </div>
 </template>

 <!-- 生成状态 -->
 <el-alert
 v-if="generatedYaml && !errors.length"
 type="info"
 :closable="false"
 show-icon
 class="mb-3"
 >
 <template #title> AI 已生成 ERDL YAML（{{ generatedValid ? '语法正确' : '需手动调整' }}）</template>
 </el-alert>

 <!-- 错误提示 -->
 <el-alert
 v-if="errors.length"
 type="error"
 :closable="false"
 show-icon
 class="mb-3"
 >
 <template #title>语法错误</template>
 <div v-for="(err, i) in errors" :key="i" class="error-item">{{ err }}</div>
 </el-alert>

 <!-- 校验成功 -->
 <el-alert
 v-else-if="validated && !loading"
 type="success"
 :closable="false"
 show-icon
 class="mb-3"
 >
 <template #title> 语法校验通过</template>
 </el-alert>

 <!-- Entity 列表 -->
 <div v-if="parsedEntities.length" class="section">
 <h4> Entities</h4>
 <el-tag v-for="e in parsedEntities" :key="e" type="success" class="tag-item">{{ e }}</el-tag>
 </div>

 <!-- Rules 列表 -->
 <div v-if="parsedRules.length" class="section">
 <h4> Rules</h4>
 <el-tag v-for="r in parsedRules" :key="r" type="warning" class="tag-item">{{ r }}</el-tag>
 </div>

 <!-- Agents 列表 -->
 <div v-if="parsedAgents.length" class="section">
 <h4> Agents</h4>
 <el-tag v-for="a in parsedAgents" :key="a" type="info" class="tag-item">{{ a }}</el-tag>
 </div>

 <!-- 知识库列表 -->
 <div v-if="parsedKBs.length" class="section">
 <h4> Knowledge Bases</h4>
 <el-tag v-for="kb in parsedKBs" :key="kb" class="tag-item">{{ kb }}</el-tag>
 </div>

 <!-- 空状态 -->
 <el-empty
 v-if="!errors.length && !parsedEntities.length && !generatedYaml"
 description="在左侧编写 ERDL 或用上方自然语言生成"
 />
 </el-card>
 </el-col>
 </el-row>
 </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
 validatePlaygroundYaml,
 loadPlaygroundYaml,
 generateERDLFromPrompt,
 getERDLStats,
 type ERDLStats,
} from '@/api/erdl'

// ============================================
// 自然语言生成
// ============================================

const nlPrompt = ref('')
const generating = ref(false)
const generatedYaml = ref('')
const generatedValid = ref(false)
const nlHint = ref(true)

const nlHints = [
 'VIP 会员打 8 折，SVIP 打 7 折',
 '消费满 500 元免运费，满 1000 元再打 95 折',
 '低于成本价的价格不允许销售',
 '新增黄金会员等级，年消费 10000 以上自动升级',
 '根据客户类型计算价格：零售原价，批发 85 折',
]

const arr = new Uint32Array(1); crypto.getRandomValues(arr);
const randomHint = ref(nlHints[arr[0] % nlHints.length])

// ============================================
// 编辑器
// ============================================

const yamlCode = ref('')
const errors = ref<string[]>([])
const validated = ref(false)
const validating = ref(false)
const loading = ref(false)
const stats = ref<ERDLStats | null>(null)

const parsedEntities = ref<string[]>([])
const parsedRules = ref<string[]>([])
const parsedAgents = ref<string[]>([])
const parsedKBs = ref<string[]>([])

const SAMPLE_YAML = `namespace: com.miaojing.eyewear

module:
 version: "1.0.0"

entities:
 ProductSpu:
 properties:
 id: { type: "UUID", required: true }
 spuCode: { type: "String", required: true, maxLength: 32 }
 frameShape:
 type: "Enum"
 enum: ["Round", "Square", "CatEye", "Aviator", "Oval", "Rectangle"]
 required: true
 retailPrice: { type: "Money(CNY)", required: true }
 metadata:
 knowledge: "product-knowledge"
 category: "product"

rulesets:
 PricingRules:
 policies:
 - name: "VIP 折扣"
 priority: 1
 trigger: "Product.price.calculate"
 tier: policy
 entity: ProductSku
 condition:
 logic: AND
 conditions:
 - field: "customer.tier"
 operator: eq
 value: "VIP"
 actions:
 - type: calculate
 params:
 formula: "retailPrice * 0.8"
`

// ============================================
// 方法 — 自然语言生成
// ============================================

async function generateERDL() {
 if (!nlPrompt.value.trim()) {
 ElMessage.warning('请先描述你的需求')
 return
 }

 generating.value = true
 nlHint.value = false
 errors.value = []
 generatedYaml.value = ''

 try {
 const res: any = await generateERDLFromPrompt(nlPrompt.value)
 generatedYaml.value = res.yaml
 generatedValid.value = res.valid
 yamlCode.value = res.yaml

 if (res.valid) {
 ElMessage.success(' ERDL 生成成功，语法正确！点击「加载到系统」立即生效')
 } else {
 ElMessage.warning(` 已生成 YAML，但存在 ${res.errors.length} 个语法问题，请手动调整`)
 errors.value = res.errors
 }
 } catch {
 ElMessage.error('生成失败，请检查 LLM 服务配置（DASHSCOPE_API_KEY）')
 } finally {
 generating.value = false
 }
}

function loadGeneratedYaml() {
 if (generatedYaml.value) {
 yamlCode.value = generatedYaml.value
 ElMessage.info('已加载生成的 ERDL 到编辑器')
 }
}

// ============================================
// 方法 — 编辑器
// ============================================

async function validateYaml() {
 if (!yamlCode.value.trim()) {
 ElMessage.warning('请先输入 ERDL 内容')
 return
 }

 validating.value = true
 errors.value = []
 validated.value = false

 try {
 const res: any = await validatePlaygroundYaml(yamlCode.value)
 errors.value = res.errors || []
 if (res.valid) {
 validated.value = true
 ElMessage.success(' ERDL 语法校验通过')
 } else {
 ElMessage.error(` 发现 ${errors.value.length} 个语法错误`)
 }
 } catch {
 ElMessage.error('校验请求失败')
 } finally {
 validating.value = false
 }
}

async function loadYaml() {
 if (!yamlCode.value.trim()) {
 ElMessage.warning('请先输入 ERDL 内容')
 return
 }

 loading.value = true
 errors.value = []

 try {
 const res: any = await loadPlaygroundYaml(yamlCode.value)
 parsedEntities.value = res.entities || []
 parsedRules.value = res.rulesets || []
 parsedAgents.value = res.agents || []
 parsedKBs.value = res.knowledgeBases || []
 stats.value = res.stats || null
 validated.value = true
 ElMessage.success(` 加载成功！${parsedEntities.value.length} Entity, ${parsedRules.value.length} Rules`)
 } catch {
 ElMessage.error('加载失败，请检查语法')
 } finally {
 loading.value = false
 }
}

function loadSample() {
 yamlCode.value = SAMPLE_YAML
 generatedYaml.value = ''
 errors.value = []
 validated.value = false
 parsedEntities.value = []
 parsedRules.value = []
 parsedAgents.value = []
 parsedKBs.value = []
 ElMessage.info('已加载示例 ERDL，点击「校验语法」或「加载到系统」')
}

function clearEditor() {
 yamlCode.value = ''
 generatedYaml.value = ''
 errors.value = []
 validated.value = false
 parsedEntities.value = []
 parsedRules.value = []
 parsedAgents.value = []
 parsedKBs.value = []
}

onMounted(async () => {
 try {
 stats.value = await getERDLStats() as any
 } catch {
 // 初次加载可能无数据
 }
})
</script>

<style scoped>
.erdl-playground { padding: 16px; }

.nl-generate-card { border: 1px solid #d3d4e6; }
.nl-generate-card :deep(.el-card__header) { padding: 12px 16px; background: linear-gradient(135deg, #f5f7fa 0%, #e8eaed 100%); }

.nl-input-row { display: flex; gap: 12px; align-items: center; }
.nl-input-row .el-input { flex: 1; }

.nl-hint { margin-top: 10px; }

.card-header { display: flex; justify-content: space-between; align-items: center; }

.erdl-editor { font-family: 'Fira Code', 'Consolas', monospace; font-size: 13px; line-height: 1.6; }
.erdl-editor :deep(.el-textarea__inner) {
 background-color: #1e1e1e;
 color: #d4d4d4;
 border: 1px solid #3c3c3c;
 font-family: 'Fira Code', 'Consolas', monospace;
}

.toolbar { margin-top: 16px; display: flex; gap: 8px; }

.result-panel { height: fit-content; }

.section { margin-bottom: 16px; }
.section h4 { margin: 0 0 8px 0; font-size: 14px; color: #606266; }

.tag-item { margin: 4px; }

.error-item { margin: 4px 0; font-family: monospace; font-size: 12px; }

.mb-3 { margin-bottom: 12px; }
</style>
