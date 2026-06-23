import { ref, onMounted } from 'vue'
import request from '@/api/request'
import { ElMessage } from 'element-plus'

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
      {
        key: 'channel_group',
        label: '渠道分组',
        type: 'input',
        placeholder: 'social/video/search/offline/partner/other',
      },
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
  structure_shape: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'name_en', label: '英文名称', type: 'input' },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  structure_series: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'name_en', label: '英文名称', type: 'input' },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  structure_material: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'name_en', label: '英文名称', type: 'input' },
      { key: 'description', label: '描述', type: 'textarea' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_effect_tag: {
    keyField: 'effect_code',
    labelField: 'effect_name',
    fields: [
      { key: 'effect_code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'effect_name', label: '名称', type: 'input', required: true },
      {
        key: 'effect_type',
        label: '类型',
        type: 'select',
        required: true,
        options: [
          { label: '肤色', value: 'skin_tone' },
          { label: '脸型', value: 'face_shape' },
        ],
      },
      { key: 'target_value', label: '目标值', type: 'input' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_sku_color: {
    keyField: 'color_code',
    labelField: 'color_name',
    fields: [
      { key: 'color_code', label: '色号', type: 'input', required: true },
      { key: 'color_name', label: '名称', type: 'input', required: true },
      { key: 'color_name_en', label: '英文名', type: 'input' },
      { key: 'color_family', label: '色系', type: 'input' },
      { key: 'hex_value', label: '色值', type: 'input', placeholder: '#FF0000' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_refractive_index: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'value', label: '折射率值', type: 'input' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_lens_function: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'name_en', label: '英文名称', type: 'input' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_lens_coating: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'name_en', label: '英文名称', type: 'input' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_lens_material: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'name_en', label: '英文名称', type: 'input' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_unit: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'name_en', label: '英文名称', type: 'input' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
  dict_brand: {
    keyField: 'code',
    labelField: 'name',
    fields: [
      { key: 'code', label: '编码', type: 'input', required: true, disabled: true },
      { key: 'name', label: '名称', type: 'input', required: true },
      { key: 'name_en', label: '英文名称', type: 'input' },
      { key: 'sort_order', label: '排序', type: 'number' },
      { key: 'is_active', label: '启用', type: 'switch' },
    ],
  },
}

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
  dict_product_status: '商品状态',
  dict_promotion_status: '促销状态',
  dict_sku_status: 'SKU状态',
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

export function useDictionary() {
  const loading = ref(false)
  const dataLoading = ref(false)
  const dictList = ref<Record<string, unknown>[]>([])
  const selectedDict = ref<Record<string, unknown> | null>(null)
  const dictData = ref<Record<string, unknown>[]>([])
  const dictSelection = ref<Record<string, unknown>[]>([])
  const dictColumns = ref<
    Array<{
      prop: string
      key?: string
      label: string
      type?: string
      width?: number
      required?: boolean
      placeholder?: string
      disabled?: boolean
      options?: Record<string, unknown>[]
    }>
  >([])
  const dialogVisible = ref(false)
  const dialogTitle = ref('新增')
  const form = ref<Record<string, unknown>>({})
  const formFields = ref<
    Array<{
      prop: string
      key: string
      label: string
      type?: string
      width?: number
      required?: boolean
      placeholder?: string
      disabled?: boolean
      options?: Record<string, unknown>[]
    }>
  >([])
  const saving = ref(false)
  const editMode = ref<'add' | 'edit'>('add')

  function getFormConfig(tableName: string) {
    return dictFieldConfigs[tableName] || null
  }

  async function loadDictList() {
    loading.value = true
    try {
      const res = (await request.get('/dict')) as string[]
      const tables: string[] = res || []
      dictList.value = tables.map((name: string, index: number) => ({
        index: index + 1,
        tableName: name,
        displayName: displayNameMap[name] || name,
      }))
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e)
      ElMessage.error('加载字典列表失败: ' + (err || ''))
    } finally {
      loading.value = false
    }
  }

  async function onSelectDict(row: Record<string, unknown>) {
    if (!row) return
    selectedDict.value = row
    dataLoading.value = true
    try {
      const res = (await request.get(`/dict/${row.tableName}`)) as unknown as { data?: Record<string, unknown>[] }
      const items = (res.data || res || []) as Record<string, unknown>[]
      dictData.value = Array.isArray(items) ? items : []
      const config = dictFieldConfigs[String(row.tableName ?? '')]
      if (config) {
        dictColumns.value = config.fields.map((f: Record<string, unknown>) => ({
          prop: String(f.key ?? ''),
          label: String(f.label ?? ''),
          width: f.key === 'sort_order' ? 80 : undefined,
        }))
      } else if (dictData.value.length > 0) {
        const allKeys = Object.keys(dictData.value[0])
        dictColumns.value = allKeys
          .filter((k) => !['id', 'created_at', 'updated_at', 'deleted_at'].includes(k))
          .map((k) => ({ prop: k, label: k }))
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e)
      dictData.value = []
      dictColumns.value = []
      ElMessage.error(err || '加载字典数据失败')
    } finally {
      dataLoading.value = false
    }
  }

  function openAdd() {
    if (!selectedDict.value) return
    const config = getFormConfig(selectedDict.value.tableName as string)
    if (!config) {
      ElMessage.warning('该字典表暂不支持在线编辑')
      return
    }
    editMode.value = 'add'
    dialogTitle.value = '新增字典项'
    formFields.value = config.fields as typeof formFields.value
    form.value = {}
    config.fields.forEach((f: Record<string, unknown>) => {
      const k = String(f.key ?? '')
      if (f.type === 'switch') form.value[k] = true
      else if (f.type === 'number') form.value[k] = 0
      else form.value[k] = ''
    })
    dialogVisible.value = true
  }

  function openEdit(row: Record<string, unknown>) {
    if (!selectedDict.value) return
    const config = getFormConfig(selectedDict.value.tableName as string)
    if (!config) {
      ElMessage.warning('该字典表暂不支持在线编辑')
      return
    }
    editMode.value = 'edit'
    dialogTitle.value = '编辑字典项'
    formFields.value = config.fields as typeof formFields.value
    form.value = { ...row }
    config.fields.forEach((f: Record<string, unknown>) => {
      const k = String(f.key ?? '')
      if (f.type === 'switch' && typeof form.value[k] === 'number') form.value[k] = form.value[k] === 1
    })
    dialogVisible.value = true
  }

  async function onSave() {
    if (!selectedDict.value) return
    const config = getFormConfig(selectedDict.value.tableName as string)
    if (!config) return
    for (const f of config.fields) {
      const k = String(f.key ?? '')
      if (f.required && !form.value[k]) {
        ElMessage.warning(`${f.label} 不能为空`)
        return
      }
    }
    saving.value = true
    try {
      const payload = { ...form.value }
      config.fields.forEach((f: Record<string, unknown>) => {
        const k = String(f.key ?? '')
        if (f.type === 'switch') payload[k] = payload[k] === true || payload[k] === 1 ? 1 : 0
      })
      if (editMode.value === 'add') {
        await request.post(`/dict/${selectedDict.value!.tableName}`, payload)
        ElMessage.success('新增成功')
      } else {
        const keyVal = payload[config.keyField]
        await request.put(`/dict/${selectedDict.value!.tableName}/${encodeURIComponent(String(keyVal))}`, payload)
        ElMessage.success('保存成功')
      }
      dialogVisible.value = false
      await onSelectDict(selectedDict.value)
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e)
      ElMessage.error(err || '保存失败')
    } finally {
      saving.value = false
    }
  }

  function onBatchEdit() {
    if (dictSelection.value.length === 1) openEdit(dictSelection.value[0])
    else if (dictSelection.value.length > 1) ElMessage.warning('暂仅支持单条编辑')
  }
  async function onBatchDelete() {
    try {
      if (!selectedDict.value) return
      const config = getFormConfig(selectedDict.value.tableName as string)
      const keyField = config?.keyField ?? ''
      for (const r of dictSelection.value)
        await request.delete(
          `/dict/${selectedDict.value!.tableName}/${encodeURIComponent(String((r as Record<string, unknown>)[keyField] ?? ''))}`,
        )
      dictSelection.value = []
      await onSelectDict(selectedDict.value! as unknown as Record<string, unknown>)
      ElMessage.success('批量删除成功')
    } catch {
      ElMessage.error('删除失败')
    }
  }

  onMounted(() => {
    loadDictList()
  })

  return {
    loading,
    dataLoading,
    dictList,
    selectedDict,
    dictData,
    dictSelection,
    dictColumns,
    dialogVisible,
    dialogTitle,
    form,
    formFields,
    saving,
    editMode,
    getFormConfig,
    onSelectDict,
    openAdd,
    openEdit,
    onSave,
    onBatchEdit,
    onBatchDelete,
  }
}
