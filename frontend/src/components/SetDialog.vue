<!--
  SetDialog.vue — P1-3c 前端重构
  Products.vue 的套装编辑弹窗独立组件
  Props: visible + editRow + skuListForSelect + categoryList
  Emits: close + saved
-->
<template>
  <el-dialog v-model="internalVisible" :title="setForm.setId ? '编辑套装' : '新增套装'" width="760px" destroy-on-close @closed="emit('close')">
    <el-form :model="setForm" label-width="110px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="套装编码">
            <el-input v-model="setForm.setCode" :disabled="!!setForm.setId" placeholder="新建时自动生成" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="套装名称">
            <el-input v-model="setForm.setName" placeholder="如：职场通勤套装" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="商品品类">
            <el-select v-model="setForm.categoryId" placeholder="选择品类" clearable filterable>
              <el-option v-for="c in categoryList" :key="c.categoryId" :label="c.categoryName" :value="c.categoryId" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态">
            <el-select v-model="setForm.status">
              <el-option label="草稿" value="draft" />
              <el-option label="在售" value="on_sale" />
              <el-option label="下架" value="off_sale" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="选择 SKU">
        <el-select v-model="selectedSkuIds" multiple filterable collapse-tags collapse-tags-tooltip placeholder="搜索并勾选 SKU" style="width:100%" @change="onSkuSelectionChange">
          <el-option v-for="s in skuListForSelect" :key="s.skuId" :label="`${s.skuCode} - ${s.skuName || s.colorCode || ''}`" :value="s.skuId">
            <span style="float:left">{{ s.skuCode }} - {{ s.skuName || s.colorCode || '-' }}</span>
            <span style="float:right;color:#e6a23c">¥{{ Number(s.retailPrice || 0).toFixed(2) }}</span>
          </el-option>
        </el-select>
      </el-form-item>
      <div v-if="selectedSkuRows.length" class="selected-sku-section">
        <div class="selected-sku-header">已选 SKU（{{ selectedSkuRows.length }} 件）</div>
        <div class="selected-sku-list">
          <div v-for="s in selectedSkuRows" :key="(s.skuId as string)" class="selected-sku-item">
            <span class="sku-code">{{ s.skuCode }}</span>
            <span class="sku-name">{{ s.skuName || s.colorCode || '-' }}</span>
            <span class="sku-retail">¥{{ Number((s as Record<string, unknown>).retailPrice || 0).toFixed(2) }}</span>
            <el-button link type="danger" size="small" @click="removeSku(s.skuId as string)">×</el-button>
          </div>
        </div>
        <div class="selected-sku-total">
          <span>原价（{{ selectedSkuRows.length }} 件商品）</span>
          <span class="total-price">¥{{ totalRetailPrice.toFixed(2) }}</span>
        </div>
      </div>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="折扣率">
            <el-input-number v-model="setForm.discountRate" :precision="2" :min="0" :max="1" :step="0.05" style="width:100%" @change="onDiscountRateChange" />
            <span style="margin-left:6px;font-size:13px;color:#909399">{{ discountRatePercent }}</span>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="套装价">
            <el-input-number v-model="setForm.setPrice" :precision="2" :min="0" style="width:100%" @change="onSetPriceChange" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="描述">
        <el-input v-model="setForm.description" type="textarea" :rows="2" placeholder="套装描述、适合场景等" />
      </el-form-item>
      <el-form-item v-if="setForm.mainImage || setForm.setId" label="主图 URL">
        <el-input v-model="setForm.mainImage" placeholder="可选" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="internalVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSaveSet">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/api/request'

const props = defineProps<{
  visible: boolean
  editRow?: Record<string, unknown> | null
  skuListForSelect: Record<string, unknown>[]
  categoryList: Record<string, unknown>[]
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const internalVisible = ref(false)

// ===== 套装表单 =====
const setForm = reactive<Record<string, unknown>>({
  setId: '', setCode: '', setName: '', setPrice: 0, originalTotalPrice: 0,
  categoryId: '', discountRate: 0.9, description: '', mainImage: '', status: 'draft',
})

const selectedSkuIds = ref<string[]>([])

const selectedSkuRows = computed(() =>
  props.skuListForSelect.filter((s: Record<string, unknown>) => selectedSkuIds.value.includes(s.skuId as string))
)

const totalRetailPrice = computed(() =>
  selectedSkuRows.value.reduce((sum: number, s) => sum + Number((s as Record<string, unknown>).retailPrice || 0), 0)
)

const discountRatePercent = computed(() => {
  if (!setForm.setPrice || totalRetailPrice.value === 0) return ''
  const pct = (((setForm.setPrice as number) / totalRetailPrice.value) * 100).toFixed(0)
  return `${pct}% Off`
})

function onSkuSelectionChange() {
  const total = totalRetailPrice.value
  setForm.originalTotalPrice = total
  if (!setForm.setPrice || setForm.setPrice === 0) {
    setForm.setPrice = Math.round(total * ((setForm.discountRate as number) || 0.9) * 100) / 100
  }
}

function removeSku(skuId: string) {
  selectedSkuIds.value = selectedSkuIds.value.filter(id => id !== skuId)
  const total = totalRetailPrice.value
  setForm.originalTotalPrice = total
}

function onDiscountRateChange(val: number | undefined) {
  if (val !== undefined && val > 0 && totalRetailPrice.value > 0) {
    setForm.setPrice = Math.round(totalRetailPrice.value * val * 100) / 100
  }
}

function onSetPriceChange(val: number | undefined) {
  if (val !== undefined && val > 0 && totalRetailPrice.value > 0) {
    const rate = val / totalRetailPrice.value
    setForm.discountRate = Math.round(rate * 100) / 100
  }
}

function generateSetCode(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = crypto.randomUUID().replace(/-/g, '').substring(0, 4).toUpperCase()
  return `OC-SET-${ts}-${rand}`
}

// ===== 保存 =====
async function handleSaveSet() {
  if (!(setForm.setName as string).trim()) return ElMessage.warning('请输入套装名称')
  if (selectedSkuIds.value.length === 0) return ElMessage.warning('请选择至少一个 SKU')

  if (!setForm.setId && !setForm.setCode) {
    setForm.setCode = generateSetCode()
  }

  try {
    if (setForm.setId) {
      await request.put(`/product-sets/${setForm.setId}`, {
        ...setForm,
        skuIds: selectedSkuIds.value,
      })
      ElMessage.success('套装已更新')
    } else {
      await request.post('/product-sets', {
        ...setForm,
        skuIds: selectedSkuIds.value,
      })
      ElMessage.success('套装已创建')
    }
    emit('saved')
    internalVisible.value = false
  } catch (e: unknown) {
    ElMessage.error((e as Error).message || '保存失败')
  }
}

// ===== 打开/编辑 =====
function resetForm() {
  setForm.setId = ''
  setForm.setCode = ''
  setForm.setName = ''
  setForm.setPrice = 0
  setForm.originalTotalPrice = 0
  setForm.categoryId = ''
  setForm.discountRate = 0.9
  setForm.description = ''
  setForm.mainImage = ''
  setForm.status = 'draft'
  selectedSkuIds.value = []
}

function populateForm(row: Record<string, unknown>) {
  setForm.setId = row.setId as string || ''
  setForm.setCode = row.setCode as string || ''
  setForm.setName = row.setName as string || ''
  setForm.setPrice = Number(row.setPrice || 0)
  setForm.originalTotalPrice = Number(row.originalTotalPrice || 0)
  setForm.categoryId = row.categoryId as string || ''
  setForm.discountRate = Number(row.discountRate || 0.9)
  setForm.description = row.description as string || ''
  setForm.mainImage = row.mainImage as string || ''
  setForm.status = row.status as string || 'draft'
  selectedSkuIds.value = (row.skuIds as string[]) || []
}

watch(() => props.visible, (val) => {
  internalVisible.value = val
  if (val) {
    if (props.editRow) {
      populateForm(props.editRow)
    } else {
      resetForm()
    }
  }
})
</script>

<style scoped>
.selected-sku-section {
  margin-bottom: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 0;
  overflow: hidden;
}
.selected-sku-header {
  background: #f5f7fa;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}
.selected-sku-list {
  max-height: 200px;
  overflow-y: auto;
}
.selected-sku-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid #f0f0f0;
}
.selected-sku-item:last-child { border-bottom: none; }
.sku-code { width: 120px; font-weight: 600; font-size: 12px; }
.sku-name { flex: 1; font-size: 13px; color: #606266; }
.sku-retail { color: #e6a23c; font-size: 13px; }
.selected-sku-total {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: #fdf6ec;
  font-size: 13px;
}
.total-price { font-weight: 700; color: #e6a23c; }
</style>
