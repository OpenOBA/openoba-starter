<template>
 <div class="skill-page">
 <div class="page-header">
 <h2>SKILL 管理</h2>
 <el-button type="primary" size="small" :loading="refreshing" @click="handleRefresh"> 重新扫描</el-button>
 </div>

 <div v-if="skills.length > 0" class="stats-bar">
 <el-tag v-for="cat in categories" :key="cat.name" :type="cat.active ? 'primary' : 'info'" size="small" style="margin:2px;cursor:pointer" @click="filterCat = filterCat === cat.name ? '' : cat.name">
 {{ cat.label }} {{ cat.count }}
 </el-tag>
 </div>

 <el-table v-loading="loading" :data="filteredSkills" stripe border size="small">
 <el-table-column prop="displayName" label="名称" min-width="160">
 <template #default="{ row }">
 <span>{{ row.displayName }}</span>
 <el-tag size="small" style="margin-left:6px" :type="row.category === 'core' ? '' : row.category === 'industry' ? 'success' : 'warning'">
 {{ ({core:'核心',industry:'行业',platform:'平台',community:'社区'} as Record<string,string>)[row.category] || row.category }}
 </el-tag>
 </template>
 </el-table-column>
 <el-table-column prop="skillName" label="标识" width="180" />
 <el-table-column prop="version" label="版本" width="80" />
 <el-table-column prop="author" label="作者" width="100" />
 <el-table-column label="定价" width="120">
 <template #default="{ row }">
 <span v-if="row.pricingModel === 'free'" style="color:#67c23a">免费</span>
 <span v-else>¥{{ row.pricingAmount }}/{{ row.pricingPeriod === 'month' ? '月' : row.pricingPeriod === 'year' ? '年' : '次' }}</span>
 </template>
 </el-table-column>
 <el-table-column label="状态" width="90">
 <template #default="{ row }">
 <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">{{ row.status === 'active' ? '运行中' : row.status }}</el-tag>
 </template>
 </el-table-column>
 <el-table-column label="调用" width="100">
 <template #default="{ row }">{{ row.runCount }} / {{ row.errorCount }}错</template>
 </el-table-column>
 <el-table-column label="操作" width="120" fixed="right">
 <template #default="{ row }">
 <el-button size="small" @click="showKeys(row)"> Key</el-button>
 </template>
 </el-table-column>
 </el-table>

 <!-- Key 管理对话框 -->
 <el-dialog v-model="showKeyDialog" :title="` ${currentSkill?.displayName} · API Key`" width="500px" destroy-on-close>
 <el-table v-if="skillKeys.length > 0" :data="skillKeys" stripe border size="small">
 <el-table-column prop="keyLabel" label="名称" width="160" />
 <el-table-column prop="keyName" label="变量名" width="160" />
 <el-table-column label="必填" width="60">
 <template #default="{ row }">{{ row.isRequired ? '' : '○' }}</template>
 </el-table-column>
 <el-table-column label="值">
 <template #default="{ row }">
 <el-input v-model="row._value" size="small" :type="row.isMasked ? 'password' : 'text'" show-password placeholder="输入Key值" @blur="saveKey(row)" />
 </template>
 </el-table-column>
 </el-table>
 <div v-else style="text-align:center;color:#999;padding:20px">该 SKILL 无需 API Key</div>
 </el-dialog>
 </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getSkills, refreshSkills, getSkillKeys, setSkillKey } from '@/api/skill'
import type { SkillItem, SkillKey } from '@/api/skill'

const loading = ref(false)
const refreshing = ref(false)
const skills = ref<SkillItem[]>([])
const filterCat = ref('')
const showKeyDialog = ref(false)
const currentSkill = ref<SkillItem | null>(null)
const skillKeys = ref<(SkillKey & { _value?: string })[]>([])

const categories = computed(() => {
 const map: Record<string, { name: string; label: string; count: number; active: boolean }> = {}
 for (const s of skills.value) {
 if (!map[s.category]) {
 map[s.category] = {
 name: s.category,
 label: { core: ' 核心', industry: ' 行业', platform: ' 平台', community: ' 社区' }[s.category] || s.category,
 count: 0,
 active: filterCat.value === s.category,
 }
 }
 map[s.category].count++
 map[s.category].active = filterCat.value === s.category
 }
 return Object.values(map)
})

const filteredSkills = computed(() => {
 if (!filterCat.value) return skills.value
 return skills.value.filter(s => s.category === filterCat.value)
})

async function fetchSkills() {
 loading.value = true
 try {
 skills.value = await getSkills()
 } catch { /* ignore */ }
 finally { loading.value = false }
}

async function handleRefresh() {
 refreshing.value = true
 try {
 const r = await refreshSkills()
 ElMessage.success(`已刷新，${r.refreshed} 个 SKILL`)
 await fetchSkills()
 } catch (e: unknown) { const err = e instanceof Error ? e.message : String(e); ElMessage.error(err || '刷新失败') }
 finally { refreshing.value = false }
}

async function showKeys(row: SkillItem) {
 currentSkill.value = row
 try {
 const keys = await getSkillKeys(row.skillName)
 skillKeys.value = keys.map(k => ({ ...k, _value: k.encryptedValue || '' }))
 } catch { skillKeys.value = [] }
 showKeyDialog.value = true
}

async function saveKey(row: SkillKey & { _value?: string }) {
 if (!currentSkill.value || !row._value) return
 try {
 await setSkillKey(currentSkill.value.skillName, row.keyName, row._value)
 ElMessage.success('已保存')
 } catch (e: unknown) { const err = e instanceof Error ? e.message : String(e); ElMessage.error(err || '保存失败') }
}

onMounted(() => { fetchSkills() })
</script>

<style scoped>
.skill-page { padding: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 18px; }
.stats-bar { margin-bottom: 12px; }
</style>
