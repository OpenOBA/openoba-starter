<template>
  <el-dialog v-model="dialogVisible" title="🤖 AI 智能推荐镜框" width="640px" :close-on-click-modal="false">
    <el-form :model="form" label-width="100px">
      <el-form-item label="脸型">
        <el-select v-model="form.faceShape" placeholder="选择你的脸型" clearable style="width: 100%">
          <el-option label="圆脸" value="round" />
          <el-option label="方脸" value="square" />
          <el-option label="长脸" value="long" />
          <el-option label="鹅蛋脸" value="oval" />
          <el-option label="心形脸" value="heart" />
        </el-select>
      </el-form-item>

      <el-form-item label="肤色">
        <el-select v-model="form.skinTone" placeholder="选择你的肤色" clearable style="width: 100%">
          <el-option label="白皙" value="fair" />
          <el-option label="自然" value="natural" />
          <el-option label="小麦色" value="wheat" />
          <el-option label="偏黑" value="dark" />
        </el-select>
      </el-form-item>

      <el-form-item label="使用场景">
        <el-select v-model="form.scenario" placeholder="主要使用场景" clearable style="width: 100%">
          <el-option label="通勤" value="commute" />
          <el-option label="约会" value="date" />
          <el-option label="运动" value="sports" />
          <el-option label="商务" value="business" />
        </el-select>
      </el-form-item>

      <el-form-item label="风格偏好">
        <el-input v-model="form.stylePreference" placeholder="如：简约、复古、时尚..." />
      </el-form-item>
    </el-form>

    <div class="action-bar">
      <el-button type="primary" :loading="loading" size="large" @click="getRecommend"> 🤖 获取推荐 </el-button>
    </div>

    <!-- 推荐结果 -->
    <div v-if="result" class="result-section">
      <el-divider>推荐结果</el-divider>
      <div class="recommendation-text">
        {{ result.recommendation }}
      </div>
      <div class="reasoning-text">
        <el-tag type="info" size="small">推理依据</el-tag>
        {{ result.reasoning }}
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { recommendGlasses, type RecommendParams, type RecommendResult } from '@/api/erdl'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const form = ref<RecommendParams>({
  faceShape: '',
  skinTone: '',
  scenario: '',
  stylePreference: '',
})

const loading = ref(false)
const result = ref<RecommendResult | null>(null)

async function getRecommend() {
  loading.value = true
  result.value = null

  try {
    const res = await recommendGlasses(form.value)
    result.value = res
    ElMessage.success('推荐完成')
  } catch {
    ElMessage.error('推荐请求失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.action-bar {
  text-align: center;
  margin: 16px 0;
}

.result-section {
  margin-top: 8px;
}

.recommendation-text {
  line-height: 1.8;
  font-size: 14px;
  color: #303133;
  white-space: pre-wrap;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.reasoning-text {
  margin-top: 12px;
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
