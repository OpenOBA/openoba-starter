<template>
  <el-card>
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>字典管理</span>
        <div v-if="selectedDict">
          <el-button type="success" size="small" @click="openAdd">新增</el-button>
          <el-button type="primary" size="small" :disabled="dictSelection.length===0" @click="onBatchEdit">编辑</el-button>
          <el-popconfirm title="确认批量删除所选数据？" @confirm="onBatchDelete" :disabled="dictSelection.length===0">
            <template #reference><el-button type="danger" size="small" :disabled="dictSelection.length===0">删除</el-button></template>
          </el-popconfirm>
        </div>
      </div>
    </template>

    <el-row :gutter="16">
      <!-- 左侧：字典表列表 -->
      <el-col :span="8">
        <el-table :data="dictList" stripe border v-loading="loading" highlight-current-row @current-change="onSelectDict" style="cursor: pointer">
          <el-table-column prop="index" label="#" width="50" />
          <el-table-column prop="displayName" label="字典名称" />
          <el-table-column prop="tableName" label="表名" show-overflow-tooltip />
        </el-table>
      </el-col>

      <!-- 右侧：字典数据 -->
      <el-col :span="16">
        <div v-if="!selectedDict" class="empty-hint">
          <el-empty description="点击左侧字典表查看数据" />
        </div>
        <div v-else>
          <h4>{{ selectedDict.displayName }} <el-tag size="small">{{ selectedDict.tableName }}</el-tag></h4>
          <el-table :data="dictData" stripe border v-loading="dataLoading" size="small" max-height="450" @selection-change="dictSelection=$event" @row-dblclick="openEdit">
            <el-table-column type="selection" width="50" />
            <el-table-column v-for="col in dictColumns" :key="col.prop" :prop="col.prop" :label="col.label" :min-width="col.width || 120" show-overflow-tooltip />
          </el-table>
          <div v-if="dictData.length === 0 && !dataLoading" class="empty-hint">
            <el-empty description="暂无数据" :image-size="80" />
          </div>
        </div>
      </el-col>
    </el-row>
  </el-card>

  <!-- 新增/编辑对话框 -->
  <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px">
    <el-form :model="form" label-width="100px" label-position="right">
      <el-form-item v-for="field in formFields" :key="field.key" :label="field.label" :required="field.required">
        <el-input v-if="field.type === 'input'" v-model="form[field.key]" :placeholder="field.placeholder" :disabled="field.disabled && !(editMode === 'add' && field.key === 'code')" />
        <el-input-number v-else-if="field.type === 'number'" v-model="form[field.key]" :min="0" :max="9999" />
        <el-switch v-else-if="field.type === 'switch'" v-model="form[field.key]" active-text="是" inactive-text="否" />
        <el-select v-else-if="field.type === 'select'" v-model="form[field.key]" style="width: 100%">
          <el-option v-for="opt in field.options" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-input v-else-if="field.type === 'textarea'" v-model="form[field.key]" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="onSave" :loading="saving">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/api/request'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const dataLoading = ref(false)
const dictList = ref<any[]>([])
const selectedDict = ref<any>(null)
const dictData = ref<any[]>([])
const dictSelection = ref<any[]>([])
const dictColumns = ref<any[]>([])

// 字段解析规则：不同字典表有不同的主键和字段结构
const dictFieldConfigs: Record<string, { keyField: string; labelField: string; fields: Record<string, unknown>[] }> = {
  dict_customer_type: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true, placeholder: '编辑时不可修改' },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_customer_level: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_order_status: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_payment_method: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_payment_status: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_payment_scene: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_logistics_company: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_logistics_status: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_logistics_trace_type: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_after_sale_status: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_review_status: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_after_sale_reason: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_review_tag: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_product_type: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_product_tier: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '等级名称', type: 'input', required: true },
      { key: 'description', label: '说明', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_compatibility_level: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_audit_status: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  // 技术参数字典
  dict_frame_material: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '材质编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '材质名称', type: 'input', required: true },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_frame_type: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '框型名称', type: 'input', required: true },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_nose_pad: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_hinge: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_surface_treatment: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  // 结构标准库字典（支持编辑）
  lens_shape: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '造型编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '造型名称', type: 'input', required: true },
      { key: 'name_en', label: '英文名称', type: 'input' },
      { key: 'icon', label: '图标', type: 'input' },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  lens_series: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '系列编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '系列名称', type: 'input', required: true },
      { key: 'name_en', label: '英文名称', type: 'input' },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  lens_material: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '材质编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '材质名称', type: 'input', required: true },
      { key: 'name_en', label: '英文名称', type: 'input' },
      { key: 'category', label: '分类', type: 'input' },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  // TASK-013 Batch 1 新增
  dict_product_status: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_promotion_status: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_sku_status: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  // TASK-013 Batch 2: 客户管理运营字典
  dict_customer_status: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'color', label: '标签颜色', type: 'input', placeholder: 'success/warning/danger/info' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_referral_source: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'channel_group', label: '渠道分组', type: 'input', placeholder: 'social/video/search/offline/partner/other' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_subscription_status: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'color', label: '标签颜色', type: 'input', placeholder: 'success/warning/danger/info' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_contact_role: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'is_default', label: '默认角色', type: 'switch' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },

  // ===== 通用字典（标准 code+name+sort_order+is_active） =====
  structure_shape: { keyField: 'code', labelField: 'name', fields: [
    { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
    { key: 'name', label: '名称', type: 'input', required: true },
    { key: 'name_en', label: '英文名称', type: 'input' },
    { key: 'description', label: '描述', type: 'textarea' },
    { key: 'sort_order', label: '排序', type: 'number' },
    { key: 'is_active', label: '启用', type: 'switch' },
  ]},
  structure_series: { keyField: 'code', labelField: 'name', fields: [
    { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
    { key: 'name', label: '名称', type: 'input', required: true },
    { key: 'name_en', label: '英文名称', type: 'input' },
    { key: 'description', label: '描述', type: 'textarea' },
    { key: 'sort_order', label: '排序', type: 'number' },
    { key: 'is_active', label: '启用', type: 'switch' },
  ]},
  structure_material: { keyField: 'code', labelField: 'name', fields: [
    { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
    { key: 'name', label: '名称', type: 'input', required: true },
    { key: 'name_en', label: '英文名称', type: 'input' },
    { key: 'description', label: '描述', type: 'textarea' },
    { key: 'sort_order', label: '排序', type: 'number' },
    { key: 'is_active', label: '启用', type: 'switch' },
  ]},
  dict_effect_tag: { keyField: 'effect_code', labelField: 'effect_name', fields: [
    { key: 'effect_code', label: '编码', type: 'input', required: true, disabled: true },
    { key: 'effect_name', label: '名称', type: 'input', required: true },
    { key: 'effect_type', label: '类型', type: 'select', required: true, options: [{label:'肤色',value:'skin_tone'},{label:'脸型',value:'face_shape'}] },
    { key: 'target_value', label: '目标值', type: 'input' },
    { key: 'sort_order', label: '排序', type: 'number' },
    { key: 'is_active', label: '启用', type: 'switch' },
  ]},
  dict_sku_color: { keyField: 'color_code', labelField: 'color_name', fields: [
    { key: 'color_code', label: '色号', type: 'input', required: true },
    { key: 'color_name', label: '名称', type: 'input', required: true },
    { key: 'color_name_en', label: '英文名', type: 'input' },
    { key: 'color_family', label: '色系', type: 'input' },
    { key: 'hex_value', label: '色值', type: 'input', placeholder: '#FF0000' },
    { key: 'sort_order', label: '排序', type: 'number' },
    { key: 'is_active', label: '启用', type: 'switch' },
  ]},
  dict_refractive_index: { keyField: 'code', labelField: 'name', fields: [
    { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
    { key: 'name', label: '名称', type: 'input', required: true },
    { key: 'value', label: '折射率值', type: 'input' },
    { key: 'sort_order', label: '排序', type: 'number' },
    { key: 'is_active', label: '启用', type: 'switch' },
  ]},
  dict_lens_function: { keyField: 'code', labelField: 'name', fields: [
    { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
    { key: 'name', label: '名称', type: 'input', required: true },
    { key: 'name_en', label: '英文名称', type: 'input' },
    { key: 'sort_order', label: '排序', type: 'number' },
    { key: 'is_active', label: '启用', type: 'switch' },
  ]},
  dict_lens_coating: { keyField: 'code', labelField: 'name', fields: [
    { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
    { key: 'name', label: '名称', type: 'input', required: true },
    { key: 'name_en', label: '英文名称', type: 'input' },
    { key: 'sort_order', label: '排序', type: 'number' },
    { key: 'is_active', label: '启用', type: 'switch' },
  ]},
  dict_lens_material: { keyField: 'code', labelField: 'name', fields: [
    { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
    { key: 'name', label: '名称', type: 'input', required: true },
    { key: 'name_en', label: '英文名称', type: 'input' },
    { key: 'sort_order', label: '排序', type: 'number' },
    { key: 'is_active', label: '启用', type: 'switch' },
  ]},
  dict_unit: { keyField: 'code', labelField: 'name', fields: [
    { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
    { key: 'name', label: '名称', type: 'input', required: true },
    { key: 'name_en', label: '英文名称', type: 'input' },
    { key: 'sort_order', label: '排序', type: 'number' },
    { key: 'is_active', label: '启用', type: 'switch' },
  ]},
  dict_brand: { keyField: 'code', labelField: 'name', fields: [
    { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
    { key: 'name', label: '名称', type: 'input', required: true },
    { key: 'name_en', label: '英文名称', type: 'input' },
    { key: 'sort_order', label: '排序', type: 'number' },
    { key: 'is_active', label: '启用', type: 'switch' },
  ]},
};

// 展示名称映射
const displayNameMap: Record<string, string> = {
  dict_customer_type: '客户类型',
  dict_customer_level: '客户等级',
  dict_order_status: '订单状态',
  dict_payment_method: '支付方式',
  dict_payment_status: '支付状态',
  dict_payment_scene: '支付场景',
  dict_logistics_company: '物流公司',
  dict_logistics_status: '物流状态',
  dict_logistics_trace_type: '物流追踪类型',
  dict_after_sale_status: '售后状态',
  dict_review_status: '评价状态',
  dict_after_sale_reason: '售后原因',
  dict_review_tag: '评价标签',
  dict_product_type: '商品类别',
  dict_product_tier: '产品等级',
  dict_frame_material: '镜框材质',
  dict_frame_type: '镜框框型',
  dict_nose_pad: '鼻托类型',
  dict_hinge: '铰链类型',
  dict_surface_treatment: '表面处理',
  dict_compatibility_level: '兼容等级',
  dict_audit_status: '审核状态',
  structure_shape: '造型字典',
  structure_series: '系列字典',
  structure_material: '材质字典',
  // TASK-013 Batch 1 新增
  dict_product_status: '商品状态',
  dict_promotion_status: '促销状态',
  dict_sku_status: 'SKU状态',
  // TASK-013 Batch 2: 客户管理运营字典
  dict_customer_status: '客户状态',
  dict_referral_source: '来源渠道',
  dict_subscription_status: '订阅状态',
  dict_contact_role: '联系人角色',
  dict_effect_tag: '效果标签',
  dict_sku_color: 'SKU色彩',
  dict_refractive_index: '折射率',
  dict_lens_function: '镜片功能',
  dict_lens_coating: '镜片膜层',
  dict_lens_material: '镜片材质',
  dict_unit: '计量单位',
  dict_brand: '品牌',
}

onMounted(async () => {
  loading.value = true
  try {
    const res: any = await request.get('/dict')
    const tables: string[] = res.data || res || []
    dictList.value = tables
      .map((name: string, index: number) => ({
        index: index + 1,
        tableName: name,
        displayName: displayNameMap[name] || name,
      }))
  } catch (e: unknown) {
    ElMessage.error('加载字典列表失败: ' + (e.message || ''))
  } finally {
    loading.value = false
  }
})

async function onSelectDict(row: Record<string, unknown>) {
  if (!row) return
  selectedDict.value = row
  dataLoading.value = true
  try {
    const res: any = await request.get(`/dict/${row.tableName}`)
    const items = res.data || res || []
    dictData.value = Array.isArray(items) ? items : []
    // 构建列配置
    const config = dictFieldConfigs[row.tableName]
    if (config) {
      dictColumns.value = config.fields.map(f => ({
        prop: f.key,
        label: f.label,
        width: f.key === 'sort_order' ? 80 : undefined,
      }))
    } else if (dictData.value.length > 0) {
      const allKeys = Object.keys(dictData.value[0])
      dictColumns.value = allKeys
        .filter(k => !['id', 'created_at', 'updated_at', 'deleted_at'].includes(k))
        .map(k => ({ prop: k, label: k }))
    }
  } catch (e: unknown) {
    dictData.value = []
    dictColumns.value = []
    ElMessage.error(e.message || '加载字典数据失败')
  } finally {
    dataLoading.value = false
  }
}

// ---- 编辑/新增/删除 ----
const dialogVisible = ref(false)
const dialogTitle = ref('新增')
const form = ref<Record<string, any>>({})
const formFields = ref<any[]>([])
const saving = ref(false)
const editMode = ref<'add' | 'edit'>('add')

function getFormConfig(tableName: string) {
  return dictFieldConfigs[tableName] || null
}

function openAdd() {
  const config = getFormConfig(selectedDict.value.tableName)
  if (!config) {
    ElMessage.warning('该字典表暂不支持在线编辑')
    return
  }
  editMode.value = 'add'
  dialogTitle.value = '新增字典项'
  formFields.value = config.fields
  form.value = {}
  config.fields.forEach(f => {
    if (f.type === 'switch') form.value[f.key] = true
    else if (f.type === 'number') form.value[f.key] = 0
    else form.value[f.key] = ''
  })
  dialogVisible.value = true
}

function openEdit(row: Record<string, unknown>) {
  const config = getFormConfig(selectedDict.value.tableName)
  if (!config) {
    ElMessage.warning('该字典表暂不支持在线编辑')
    return
  }
  editMode.value = 'edit'
  dialogTitle.value = '编辑字典项'
  formFields.value = config.fields
  form.value = { ...row }
  // 数字 0/1 → 布尔，适配 el-switch
  config.fields.forEach(f => {
    if (f.type === 'switch' && typeof form.value[f.key] === 'number') {
      form.value[f.key] = form.value[f.key] === 1
    }
  })
  dialogVisible.value = true
}

async function onSave() {
  const config = getFormConfig(selectedDict.value.tableName)
  if (!config) return

  // 校验必填
  for (const f of config.fields) {
    if (f.required && !form.value[f.key]) {
      ElMessage.warning(`${f.label} 不能为空`)
      return
    }
  }

  saving.value = true
  try {
    const payload = { ...form.value }
    // 开关字段统一转为 0/1
    config.fields.forEach(f => {
      if (f.type === 'switch') {
        const v = payload[f.key]
        payload[f.key] = (v === true || v === 1) ? 1 : 0
      }
    })

    if (editMode.value === 'add') {
      await request.post(`/dict/${selectedDict.value.tableName}`, payload)
      ElMessage.success('新增成功')
    } else {
      const keyVal = payload[config.keyField]
      await request.put(`/dict/${selectedDict.value.tableName}/${encodeURIComponent(keyVal)}`, payload)
      ElMessage.success('保存成功')
    }
    dialogVisible.value = false
    // 刷新数据
    await onSelectDict(selectedDict.value)
  } catch (e: unknown) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function onBatchEdit() { if(dictSelection.value.length===1) openEdit(dictSelection.value[0]); else if(dictSelection.value.length>1) ElMessage.warning('暂仅支持单条编辑'); }
async function onBatchDelete() { try { for(const r of dictSelection.value) await request.delete(`/dict/${selectedDict.value.tableName}/${encodeURIComponent(r[getFormConfig(selectedDict.value.tableName).keyField])}`); dictSelection.value=[]; await onSelectDict(selectedDict.value); ElMessage.success('批量删除成功'); } catch { ElMessage.error('删除失败'); } }

async function onDelete(row: Record<string, unknown>) {
  const config = getFormConfig(selectedDict.value.tableName)
  if (!config) return

  try {
    await ElMessageBox.confirm('确定删除该字典项？', '确认删除', { type: 'warning' })
    const keyVal = row[config.keyField]
    await request.delete(`/dict/${selectedDict.value.tableName}/${encodeURIComponent(keyVal)}`)
    ElMessage.success('删除成功')
    await onSelectDict(selectedDict.value)
  } catch (e: unknown) {
    if (e !== 'cancel') ElMessage.error(e.message || '删除失败')
  }
}
</script>

<style scoped>
.empty-hint { display: flex; align-items: center; justify-content: center; min-height: 300px; }
h4 { margin: 0 0 12px; font-size: 16px; color: #303133; }
</style>
