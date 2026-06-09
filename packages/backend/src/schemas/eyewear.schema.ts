// ============================================
// 眼镜行业 Schema — AI-BOS V2.0
// 行业代码: eyewear
// V1.1 — 覆盖 Products.vue 所有表单字段
// ============================================

import { IndustrySchema } from './types'

export const eyewearSchema: IndustrySchema = {
  industry: 'eyewear',
  version: '1.2',

  config: {
    sceneTags: ['通勤', '职场', '约会', '拍照', '运动', '旅行', '休闲', '派对'],

    genderOptions: [
      { value: 'female', label: '女款', tagType: 'danger' },
      { value: 'male', label: '男款', tagType: 'primary' },
      { value: 'unisex', label: '中性', tagType: 'info' },
      { value: 'limited', label: '限量', tagType: 'warning' },
    ],

    statusOptions: [
      { value: 'on_sale', label: '在售', tagType: 'success' },
      { value: 'draft', label: '草稿', tagType: 'info' },
      { value: 'off_sale', label: '下架', tagType: 'danger' },
    ],

    shapeLabels: {
      SQR: '方框',
      RND: '圆框',
      REC: '矩形框',
      OVL: '椭圆框',
      WEL: '威灵顿框',
      CAT: '猫眼',
      AVT: '飞行员框',
      HEX: '六角框',
      BRC: '眉线框',
    },

    seriesLabels: {
      CLS: '经典',
      FSH: '时尚',
      BUS: '商务',
      SPT: '运动',
    },

    faceShapeLabels: {
      round: '圆脸',
      oval: '鹅蛋脸',
      square: '方脸',
      diamond: '菱形脸',
      heart: '心形脸',
      oblong: '长脸',
    },

    uvProtectionOptions: [
      { value: 'UV400', label: 'UV400' },
      { value: 'UV380', label: 'UV380' },
      { value: 'None', label: '无' },
    ],

    tierLabels: {
      color: { name: 'Color 色彩', color: '#409eff' },
      style: { name: 'Style 风格', color: '#67c23a' },
      texture: { name: 'Texture 质感', color: '#e6a23c' },
      'light-luxury': { name: 'Light Luxury 轻奢', color: '#b37feb' },
      smart: { name: 'Smart 智能', color: '#36cfc9' },
      luxury: { name: 'Luxury 臻品', color: '#f759ab' },
    },
  },

  // === 商品层 ===
  product: {
    spuAttributes: [
      { key: 'spuCode', label: 'SPU 编码', type: 'text', required: false },
      { key: 'spuName', label: 'SPU 名称', type: 'text', required: false },
      { key: 'structureStandardCode', label: '结构标准', type: 'dict', dictTable: 'structure_standard', required: true },
      {
        key: 'productTier',
        label: '产品级别',
        type: 'enum',
        values: ['color', 'style', 'texture', 'light-luxury', 'smart', 'luxury'],
        required: true,
      },
      { key: 'seriesCode', label: '系列', type: 'dict', dictTable: 'lens_series' },
      { key: 'gender', label: '款式', type: 'enum', values: ['female', 'male', 'unisex', 'limited'], required: true },
      { key: 'sceneTags', label: '场景标签', type: 'enum', values: ['通勤', '职场', '约会', '拍照', '运动', '旅行', '休闲', '派对'] },
      { key: 'description', label: '描述', type: 'text' },
      { key: 'status', label: '状态', type: 'enum', values: ['on_sale', 'draft', 'off_sale'], required: true },
    ],
    skuAttributes: [
      { key: 'skuCode', label: 'SKU 编码', type: 'text', required: false },
      { key: 'skuName', label: 'SKU 名称', type: 'text', required: false },
      { key: 'colorCode', label: '色彩', type: 'dict', dictTable: 'dict_sku_color', required: true },
      { key: 'skinToneEffect', label: '肤色效果', type: 'computed' },
      { key: 'faceShapeEffect', label: '脸型效果', type: 'computed' },
      { key: 'productTier', label: '产品级别', type: 'enum', values: ['', 'color', 'style', 'texture', 'light-luxury', 'smart', 'luxury'] },
      { key: 'structureStandardCode', label: '结构标准', type: 'dict', dictTable: 'structure_standard' },
      { key: 'retailPrice', label: '统一零售价', type: 'number', required: true },
      { key: 'costPrice', label: '成本价', type: 'number' },
      { key: 'minPrice', label: '最低售价', type: 'number' },
      { key: 'stockQuantity', label: '库存', type: 'number' },
      { key: 'ean13', label: 'EAN-13', type: 'text' },
      { key: 'skuBarcode', label: '内部条码', type: 'text' },
      // Phase 8B: 技术参数
      { key: 'templeLength', label: '镜腿长度', type: 'number' },
      { key: 'frameMaterial', label: '镜框材质', type: 'dict', dictTable: 'dict_frame_material' },
      { key: 'templeMaterial', label: '镜腿材质', type: 'dict', dictTable: 'dict_frame_material' },
      { key: 'frameType', label: '镜框类型', type: 'dict', dictTable: 'dict_frame_type' },
      { key: 'surfaceTreatment', label: '表面处理', type: 'dict', dictTable: 'dict_surface_treatment' },
      { key: 'nosePadType', label: '鼻托类型', type: 'dict', dictTable: 'dict_nose_pad' },
      { key: 'hingeType', label: '铰链类型', type: 'dict', dictTable: 'dict_hinge' },
      { key: 'weightG', label: '重量(g)', type: 'number' },
      { key: 'suitableFaceShapes', label: '适合脸型', type: 'enum', values: ['round', 'oval', 'square', 'diamond', 'heart', 'oblong'] },
      { key: 'hasBlueLightFilter', label: '防蓝光', type: 'boolean' },
      { key: 'hasPhotochromic', label: '变色', type: 'boolean' },
      { key: 'hasPolarized', label: '偏光', type: 'boolean' },
      { key: 'uvProtection', label: 'UV 防护', type: 'enum', values: ['UV400', 'UV380', 'None'] },
    ],
    namingTemplate:
      '秒镜{spu.structure_standard} · {sku.skin_effect} · {sku.face_effect} · {sku.color} · {spu.shape}{spu.series} · {sku.style}',
    namingExample: '秒镜 S5447 · 黄皮肤增白 · 圆脸显瘦 · 马卡龙粉 · 圆框时尚系列 · 女款',
  },

  // === 客户层 ===
  customer: {
    tags: ['脸型', '肤色', '风格偏好', '消费能力', '复购周期'],
    memberTiers: [
      { level: '普通会员', threshold: 0 },
      { level: '银卡会员', threshold: 300 },
      { level: '金卡会员', threshold: 1000 },
      { level: '钻石会员', threshold: 3000 },
    ],
    lensRecommend: true,
  },

  // === 定价层 ===
  pricing: {
    rules: [
      { name: '结构标准阶梯', field: 'structure_standard', type: 'tiered' },
      { name: '色彩溢价', field: 'color', type: 'flat_add' },
      { name: '限量加价', condition: 'style == "限量款"', type: 'multiplier', multiplier: 1.3 },
    ],
  },

  // === 效果词库 ===
  effectThesaurus: {
    skinEffects: ['黄皮肤增白', '黄皮肤提亮', '冷白皮提气', '冷白皮显嫩', '暖皮提亮', '暖皮显气质', '中性百搭'],
    faceEffects: ['圆脸显瘦', '圆脸立体', '方脸柔和', '方脸修饰', '心形脸平衡', '长脸缩短', '菱形脸修饰', '鹅蛋脸万能'],
    colorEffectMapping: {
      马卡龙粉: { skin: '黄皮肤增白', face: '圆脸显瘦' },
      雾霾蓝: { skin: '冷白皮提气', face: '方脸柔和' },
      经典黑: { skin: '中性百搭', face: '鹅蛋脸万能' },
    },
  },
}
