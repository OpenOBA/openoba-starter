<!--
  SchemaFormRenderer.vue — AI-BOS V2.0
  根据行业 Schema 属性定义动态渲染表单字段
  支持类型: dict → el-select, enum → el-select, computed → readonly el-input
-->
<template>
  <div class="schema-form-renderer">
    <el-row v-for="attr in visibleAttrs" :key="attr.key" :gutter="gutter">
      <el-col :span="colSpan">
        <el-form-item :label="attr.label" :required="attr.required">
          <!-- dict 类型 → el-select (从字典加载选项) -->
          <el-select
            v-if="attr.type === 'dict'"
            v-model="model[attr.key]"
            :placeholder="`选择${attr.label}`"
            filterable
            clearable
            :disabled="disabled"
            style="width: 100%"
            @change="handleChange(attr.key, $event)"
          >
            <el-option
              v-for="opt in getDictOptions(attr)"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>

          <!-- enum 类型 → el-select (固定选项) -->
          <el-select
            v-else-if="attr.type === 'enum'"
            v-model="model[attr.key]"
            :placeholder="`选择${attr.label}`"
            clearable
            :disabled="disabled"
            style="width: 100%"
            @change="handleChange(attr.key, $event)"
          >
            <el-option
              v-for="v in (attr.values || [])"
              :key="v"
              :label="v"
              :value="v"
            />
          </el-select>

          <!-- computed 类型 → readonly el-input (由系统计算) -->
          <el-input
            v-else-if="attr.type === 'computed'"
            :model-value="(computedValues as Record<string,unknown>)[attr.key] || '(自动计算)'"
            readonly
            disabled
          />

          <!-- text 类型 → el-input -->
          <el-input
            v-else-if="attr.type === 'text'"
            v-model="model[attr.key]"
            :placeholder="`输入${attr.label}`"
            :disabled="disabled"
          />

          <!-- number 类型 → el-input-number -->
          <el-input-number
            v-else-if="attr.type === 'number'"
            v-model="model[attr.key]"
            :disabled="disabled"
            style="width: 100%"
          />

          <!-- boolean 类型 → el-switch -->
          <el-switch
            v-else-if="attr.type === 'boolean'"
            v-model="model[attr.key]"
            :disabled="disabled"
          />

          <!-- fallback → el-input -->
          <el-input
            v-else
            v-model="model[attr.key]"
            :placeholder="`输入${attr.label}`"
            :disabled="disabled"
          />
        </el-form-item>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { SchemaAttribute } from '@/api/schema'
import request from '@/api/request'

const props = defineProps<{
  attributes: SchemaAttribute[]
  model: Record<string, any>
  /** 字段可见性控制（隐藏某些字段） */
  hiddenKeys?: string[]
  /** 额外选项覆盖（用于替代 dict 默认值） */
  dictOverrides?: Record<string, { label: string; value: string }[]>
  /** 计算字段值映射 */
  computedValues?: Record<string, string>
  /** 列跨度（默认 24 = 全宽, 12 = 半宽） */
  colSpan?: number
  /** 行间距 */
  gutter?: number
  /** 是否禁用 */
  disabled?: boolean
  /** 变化回调 */
  onChange?: (key: string, value: any) => void
}>()

const dictCache = ref<Record<string, { label: string; value: string }[]>>({})

const visibleAttrs = computed(() => {
  const hidden = new Set(props.hiddenKeys || [])
  return props.attributes.filter(a => !hidden.has(a.key))
})

/** 获取字典选项 */
function getDictOptions(attr: SchemaAttribute): { label: string; value: string }[] {
  // 优先使用覆盖
  if (props.dictOverrides?.[attr.key]) {
    return props.dictOverrides[attr.key]
  }
  // 使用缓存
  if (attr.dictTable && dictCache.value[attr.dictTable]) {
    return dictCache.value[attr.dictTable]
  }
  return []
}

/** 加载字典数据 */
async function loadDicts() {
  const dictTables = new Set(
    props.attributes
      .filter(a => a.type === 'dict' && a.dictTable && !props.dictOverrides?.[a.key])
      .map(a => a.dictTable!)
  )

  for (const table of dictTables) {
    try {
      const res = await request.get(`/dict/${table}`) as Record<string,any>
      const items = res.data?.items || res.data || []
      dictCache.value[table] = items.map((item: Record<string, unknown>) => ({
        label: item.name || item.label || item.code || '',
        value: item.code || item.value || item.key || '',
      }))
    } catch (e) {
      console.warn(`Failed to load dict: ${table}`, e)
      dictCache.value[table] = []
    }
  }
}

function handleChange(key: string, value: any) {
  props.onChange?.(key, value)
}

onMounted(() => { loadDicts() })
</script>

<style scoped>
.schema-form-renderer .el-form-item {
  margin-bottom: 16px;
}
</style>
