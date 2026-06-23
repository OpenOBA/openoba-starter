<template>
  <el-form :model="formData" label-width="140px" size="default">
    <el-row :gutter="16">
      <el-col v-for="field in schema.fields" :key="field.field" :span="field.type === 'textarea' ? 24 : 12">
        <el-form-item :label="field.label" :required="field.required">
          <!-- 文本输入 -->
          <el-input
            v-if="field.type === 'text'"
            v-model="formData[field.field]"
            :maxlength="field.validation?.max"
            :placeholder="`请输入${field.label}`"
          />

          <!-- 数字输入 -->
          <el-input-number
            v-else-if="field.type === 'number'"
            v-model="formData[field.field]"
            :min="field.validation?.min"
            :max="field.validation?.max"
            :controls="false"
            style="width: 100%"
          />

          <!-- 金额输入 -->
          <el-input-number
            v-else-if="field.type === 'money'"
            v-model="formData[field.field]"
            :precision="2"
            :step="10"
            :controls="false"
            style="width: 100%"
          >
            <template #prefix>¥</template>
          </el-input-number>

          <!-- 下拉选择 -->
          <el-select
            v-else-if="field.type === 'select'"
            v-model="formData[field.field]"
            :placeholder="`请选择${field.label}`"
            clearable
            style="width: 100%"
          >
            <el-option v-for="opt in field.options" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>

          <!-- 多行文本 -->
          <el-input
            v-else-if="field.type === 'textarea'"
            v-model="formData[field.field]"
            type="textarea"
            :rows="4"
            :maxlength="field.validation?.max"
            :placeholder="`请输入${field.label}`"
          />

          <!-- 布尔开关 -->
          <el-switch
            v-else-if="field.type === 'boolean'"
            v-model="formData[field.field]"
            :active-text="`是`"
            :inactive-text="`否`"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-form-item>
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="onReset">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getFormSchema, type FormSchema, type FormFieldSchema } from '@/api/erdl'

const props = defineProps<{
  /** 命名空间 */
  namespace: string
  /** Entity 名称 */
  entity: string
}>()

const emit = defineEmits<{
  (e: 'submit', data: Record<string, unknown>): void
}>()

const schema = ref<FormSchema>({
  entity: props.entity,
  namespace: props.namespace,
  fields: [],
})

const formData = ref<Record<string, unknown>>({})

// ============================================
// 初始化
// ============================================

onMounted(async () => {
  try {
    const res = await getFormSchema(props.namespace, props.entity)
    if (res) {
      schema.value = res
      // 初始化表单数据
      schema.value.fields.forEach((f: FormFieldSchema) => {
        formData.value[f.field] = undefined
      })
    } else {
      ElMessage.warning(`未找到 Entity "${props.entity}" 的 Schema 定义`)
    }
  } catch {
    ElMessage.error('加载 Schema 失败')
  }
})

// ============================================
// 方法
// ============================================

function onSubmit() {
  emit('submit', { ...formData.value })
}

function onReset() {
  schema.value.fields.forEach((f: FormFieldSchema) => {
    formData.value[f.field] = undefined
  })
}
</script>
