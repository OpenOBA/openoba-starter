<template>
  <div class="products-page">
    <el-tabs v-model="activeTab" type="card">
      <!-- SPU -->
      <el-tab-pane label="SPU 管理" name="spu">
        <div class="tab-content">
          <div class="toolbar">
            <el-input v-model="spuSearch.keyword" placeholder="搜索 SPU 名称/编码" clearable style="width: 240px" @keyup.enter="loadSpus" />
            <el-select v-model="spuSearch.gender" placeholder="性别" clearable style="width: 100px">
              <el-option v-for="opt in genderOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
            <el-select v-model="spuSearch.status" placeholder="状态" clearable style="width: 100px">
              <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
            <el-select v-model="spuSearch.productTier" placeholder="级别" clearable style="width: 110px">
              <el-option v-for="t in tierList" :key="t.tier_code" :label="t.tier_name" :value="t.tier_code">
                <span>{{ t.tier_name }}</span>
                <span :style="{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: t.icon_color, marginLeft: '6px' }"></span>
              </el-option>
            </el-select>
            <el-button type="primary" @click="loadSpus">搜索</el-button>
            <el-button type="success" @click="openSpuDialog()">新增 SPU</el-button>
            <el-button type="primary" :disabled="spuSelection.length===0" @click="batchEditSpus()">编辑</el-button>
            <el-popconfirm title="确认批量删除所选SPU？" @confirm="batchDeleteSpus" :disabled="spuSelection.length===0">
              <template #reference><el-button type="danger" :disabled="spuSelection.length===0">删除</el-button></template>
            </el-popconfirm>
          </div>
          <el-table :data="spuList" v-loading="spuLoading" stripe @selection-change="spuSelection=$event" @row-dblclick="openSpuDialog">
            <el-table-column type="selection" width="50" />
            <el-table-column prop="spuCode" label="SPU 编码" width="160" />
            <el-table-column label="级别" width="100">
              <template #default="{ row }">
                <span v-if="row.productTier" :style="{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: getTierColor(row.productTier) + '18', color: getTierColor(row.productTier), fontSize: '12px', fontWeight: '600' }">
                  <span :style="{ width: '6px', height: '6px', borderRadius: '50%', background: getTierColor(row.productTier) }"></span>
                  {{ getTierName(row.productTier) }}
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="spuName" label="名称" min-width="180" />
            <el-table-column label="分类" width="120">
              <template #default="{ row }">{{ row.category?.categoryName || '-' }}</template>
            </el-table-column>
            <el-table-column label="性别" width="80">
              <template #default="{ row }">
                <el-tag :type="{ female: 'danger', male: 'primary', unisex: 'info', limited: 'warning' }[row.gender] || 'info'" size="small">
                  {{ { female: '女款', male: '男款', unisex: '通用', limited: '限量' }[row.gender] || row.gender || '-' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="场景" min-width="140">
              <template #default="{ row }">
                <template v-if="row.scene_tags && row.scene_tags.length">
                  <el-tag v-for="tag in row.scene_tags" :key="tag" size="small" style="margin-right: 4px">{{ tag }}</el-tag>
                </template>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'on_sale' ? 'success' : row.status === 'draft' ? 'info' : 'danger'" size="small">
                  {{ (statusOptions.find(o => o.value === row.status)?.label) || row.status || '-' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-if="spuTotal > spuPageSize"
            style="margin-top: 16px; justify-content: flex-end"
            v-model:current-page="spuPage"
            v-model:page-size="spuPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="spuTotal"
            layout="total, sizes, prev, pager, next"
            @size-change="loadSpus"
            @current-change="loadSpus"
          />
        </div>
      </el-tab-pane>

      <!-- SKU -->
      <el-tab-pane label="SKU 管理" name="sku">
        <div class="tab-content">
          <div class="toolbar">
            <el-input v-model="skuSearch.keyword" placeholder="搜索 SKU 名称/编码" clearable style="width: 220px" @keyup.enter="loadSkus" />
            <el-select v-model="skuSearch.spuId" placeholder="按 SPU 筛选" clearable filterable style="width: 200px" @change="loadSkus">
              <el-option v-for="s in spuListAll" :key="s.spuId" :label="`${s.spuCode} - ${s.spuName}`" :value="s.spuId" />
            </el-select>
            <el-select v-model="skuSearch.skinToneEffect" placeholder="肤色效果" clearable filterable style="width: 160px" @change="loadSkus">
              <el-option v-for="t in skinEffectTags" :key="'skin-'+t.effectCode" :label="t.effectName" :value="t.effectName" />
            </el-select>
            <el-select v-model="skuSearch.faceShapeEffect" placeholder="脸型效果" clearable filterable style="width: 160px" @change="loadSkus">
              <el-option v-for="t in faceEffectTags" :key="'face-'+t.effectCode" :label="t.effectName" :value="t.effectName" />
            </el-select>
            <el-button type="primary" @click="loadSkus">搜索</el-button>
            <el-button type="success" @click="openSkuDialog()">新增 SKU</el-button>
            <el-button type="primary" :disabled="skuSelection.length===0" @click="batchEditSkus()">编辑</el-button>
            <el-popconfirm title="确认批量删除所选SKU？" @confirm="batchDeleteSkus" :disabled="skuSelection.length===0">
              <template #reference><el-button type="danger" :disabled="skuSelection.length===0">删除</el-button></template>
            </el-popconfirm>
          </div>
          <el-table :data="skuList" v-loading="skuLoading" stripe row-key="skuId" @selection-change="skuSelection=$event" @row-dblclick="openSkuDialog">
            <el-table-column type="selection" width="50" />
            <el-table-column type="expand">
              <template #default="{ row }">
                <div class="tech-spec-row" style="padding: 12px 24px; background: #fafafa">
                  <table class="tech-table">
                    <tbody>
                    <tr><td class="tech-label">尺寸标注</td><td class="tech-value">{{ [row.lensWidth, row.bridgeWidth, row.templeLength].filter(v => v).join('□') || '-' }}</td><td class="tech-label">镜框材质</td><td class="tech-value">{{ getDictName('frameMaterials', row.frameMaterial) }}</td></tr>
                    <tr><td class="tech-label">镜框类型</td><td class="tech-value">{{ getDictName('frameTypes', row.frameType) }}</td><td class="tech-label">重量</td><td class="tech-value">{{ row.weightG != null ? row.weightG + 'g' : '-' }}</td></tr>
                    <tr><td class="tech-label">鼻托类型</td><td class="tech-value">{{ getDictName('nosePads', row.nosePadType) }}</td><td class="tech-label">铰链类型</td><td class="tech-value">{{ getDictName('hinges', row.hingeType) }}</td></tr>
                    <tr><td class="tech-label">镜框高度</td><td class="tech-value">{{ row.frameHeight != null ? row.frameHeight + 'mm' : '-' }}</td><td class="tech-label">表面处理</td><td class="tech-value">{{ getDictName('surfaceTreatments', row.surfaceTreatment) }}</td></tr>
                    <tr><td class="tech-label">适合脸型</td><td class="tech-value">
                      <template v-if="row.suitableFaceShapes && row.suitableFaceShapes.length">
                        <el-tag v-for="f in row.suitableFaceShapes" :key="f" size="small" style="margin-right: 4px">{{ getFaceShapeLabel(f) }}</el-tag>
                      </template><span v-else>-</span>
                    </td><td class="tech-label">功能</td><td class="tech-value">
                      <span v-if="row.hasBlueLightFilter" style="color: #409eff">防蓝光 </span>
                      <span v-if="row.hasPhotochromic" style="color: #67c23a">变色 </span>
                      <span v-if="row.hasPolarized" style="color: #e6a23c">偏光 </span>
                      <span v-if="row.uvProtection && row.uvProtection !== 'None'">{{ row.uvProtection }}</span>
                      <span v-if="!row.hasBlueLightFilter && !row.hasPhotochromic && !row.hasPolarized && (!row.uvProtection || row.uvProtection === 'None')">-</span>
                    </td></tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="skuCode" label="SKU 编码" width="170" />
            <el-table-column label="级别" width="100">
              <template #default="{ row }">
                <span v-if="row.productTier || row.spu?.productTier" :style="{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: getTierColor(row.productTier || row.spu?.productTier) + '18', color: getTierColor(row.productTier || row.spu?.productTier), fontSize: '12px', fontWeight: '600' }">
                  <span :style="{ width: '6px', height: '6px', borderRadius: '50%', background: getTierColor(row.productTier || row.spu?.productTier) }"></span>
                  {{ getTierName(row.productTier || row.spu?.productTier) }}
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="主图" width="80">
              <template #default="{ row }">
                <el-image v-if="row.primaryImage" :src="row.primaryImage.imageUrl" fit="cover" style="width: 40px; height: 40px; border-radius: 4px" />
              </template>
            </el-table-column>
            <el-table-column prop="skuName" label="名称" min-width="120" />
            <el-table-column label="关联 SPU" width="140">
              <template #default="{ row }">{{ row.spu?.spuCode || '-' }}</template>
            </el-table-column>
            <el-table-column prop="skuBarcode" label="内部条码" min-width="200" show-overflow-tooltip />
            <el-table-column prop="ean13" label="EAN-13" width="130" />
            <el-table-column prop="retailPrice" label="统一零售价" width="100" />
            <el-table-column prop="stockQuantity" label="库存" width="80" />
            </el-table>
          <el-pagination
            v-if="skuTotal > skuPageSize"
            style="margin-top: 16px; justify-content: flex-end"
            v-model:current-page="skuPage"
            v-model:page-size="skuPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="skuTotal"
            layout="total, sizes, prev, pager, next"
            @size-change="loadSkus"
            @current-change="loadSkus"
          />
        </div>
      </el-tab-pane>

      <!-- SKU 图片 -->
      <el-tab-pane label="SKU 图片" name="sku-image">
        <div class="tab-content">
          <div class="toolbar">
            <el-select v-model="imageSearch.skuId" placeholder="选择 SKU" clearable filterable style="width: 280px" @change="loadSkuImages" :loading="skuSelectLoading" :disabled="skuSelectLoading">
              <el-option v-for="s in skuListForSelect" :key="s.skuId" :label="`${s.skuCode} - ${s.skuName || '-'}`" :value="s.skuId" />
            </el-select>
            <el-button type="primary" @click="loadSkuImages">刷新</el-button>
            <el-button type="success" @click="openImageDialog()" :disabled="!imageSearch.skuId">+ 新增</el-button>
            <el-button type="warning" @click="openBatchDialog()" :disabled="!imageSearch.skuId">批量上传</el-button>
          </div>

          <div class="image-type-tabs">
            <el-radio-group v-model="imageSearch.imageType" @change="loadSkuImages">
              <el-radio-button label="">全部</el-radio-button>
              <el-radio-button label="main">主图</el-radio-button>
              <el-radio-button label="gallery">图集</el-radio-button>
              <el-radio-button label="detail">详情</el-radio-button>
              <el-radio-button label="lifestyle">场景</el-radio-button>
              <el-radio-button label="360view">360°</el-radio-button>
              <el-radio-button label="website_banner">横幅</el-radio-button>
            </el-radio-group>
          </div>

          <el-table :data="sortedImageList" v-loading="imageLoading" stripe row-key="imageId">
            <el-table-column label="" width="40">
              <template #default="{ $index }">
                <el-icon class="drag-handle" style="cursor: grab; color: #909399"><Rank /></el-icon>
              </template>
            </el-table-column>
            <el-table-column label="预览" width="100">
              <template #default="{ row }">
                <el-image :src="row.imageUrl" fit="cover" style="width: 60px; height: 60px; border-radius: 4px; cursor: pointer" @click="previewImage(row.imageUrl)" />
              </template>
            </el-table-column>
            <el-table-column prop="imageUrl" label="URL" min-width="200" show-overflow-tooltip />
            <el-table-column label="类型" width="90">
              <template #default="{ row }">
                <el-tag :type="{ main: 'danger', gallery: 'primary', detail: 'info', lifestyle: 'success', '360view': 'warning', website_banner: 'warning' }[row.imageType] || 'info'" size="small">
                  {{ { main: '主图', gallery: '图集', detail: '详情', lifestyle: '场景', '360view': '360°', website_banner: '横幅' }[row.imageType] || row.imageType }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="主图" width="60">
              <template #default="{ row }">
                <el-tag v-if="row.isPrimary" type="danger" size="small"></el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="70">
              <template #default="{ row }">
                <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">{{ row.isActive ? '启用' : '禁用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="altText" label="替代文本" min-width="120" show-overflow-tooltip />
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row, $index }">
                <el-button link type="info" size="small" @click="moveImage($index, -1)" :disabled="$index === 0" title="上移">↑</el-button>
                <el-button link type="info" size="small" @click="moveImage($index, 1)" :disabled="$index === sortedImageList.length - 1" title="下移">↓</el-button>
                <el-button link type="primary" @click="openImageDialog(row)">编辑</el-button>
                <el-popconfirm title="确认删除？" @confirm="handleDeleteImage(row.imageId)">
                  <template #reference><el-button link type="danger">删除</el-button></template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>

          <div v-if="hasReordered" class="save-order-bar">
            <el-button type="primary" @click="handleSaveOrder">保存排序</el-button>
            <el-button @click="cancelReorder">取消</el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- SKU 图片预览全屏层 -->
      <div v-if="previewVisible" class="fullscreen-preview" @click="previewVisible=false" @wheel.prevent="onPreviewWheel">
        <div class="preview-toolbar">
          <span class="preview-zoom">{{ Math.round(previewScale * 100) }}%</span>
          <el-button circle size="small" @click.stop="previewScale=Math.min(3, previewScale+0.25)">+</el-button>
          <el-button circle size="small" @click.stop="previewScale=Math.max(0.25, previewScale-0.25)">−</el-button>
          <el-button circle size="small" @click.stop="previewScale=1; previewVisible=false">✕</el-button>
        </div>
        <img :src="previewSrc" :style="{ transform: `scale(${previewScale})` }" @click.stop />
      </div>

      <!-- 套装 -->
      <el-tab-pane label="套装管理" name="set">
        <div class="tab-content">
          <div class="toolbar">
            <el-button type="success" @click="openSetDialog()">新增套装</el-button>
            <el-button type="primary" :disabled="setSelection.length===0" @click="batchEditSets()">编辑</el-button>
            <el-popconfirm title="确认批量删除所选套装？" @confirm="batchDeleteSets" :disabled="setSelection.length===0">
              <template #reference><el-button type="danger" :disabled="setSelection.length===0">删除</el-button></template>
            </el-popconfirm>
          </div>
          <el-table :data="setList" v-loading="setLoading" stripe @selection-change="setSelection=$event" @row-dblclick="openSetDialog">
            <el-table-column type="selection" width="50" />
            <el-table-column prop="setCode" label="编码" width="140" />
            <el-table-column prop="setName" label="名称" min-width="180" />
            <el-table-column label="SKU" width="50"><template #default="{ row }">{{ row.skuList ? row.skuList.length : 0 }}</template></el-table-column>
            <el-table-column label="统一零售价" width="100"><template #default="{ row }">¥{{ (Number(row.retailPrice)||0).toFixed(2) }}</template></el-table-column>
            <el-table-column label="套装价" width="80"><template #default="{ row }">¥{{ (Number(row.setPrice)||0).toFixed(2) }}</template></el-table-column>
            <el-table-column label="折扣" width="60"><template #default="{ row }">{{ row.discountRate ? (row.discountRate*10).toFixed(1)+"折" : "-" }}</template></el-table-column>
            <el-table-column prop="category?.categoryName" label="品类" width="80" />
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'on_sale' ? 'success' : row.status === 'draft' ? 'info' : 'danger'" size="small">
                  {{ row.status === 'on_sale' ? '在售' : row.status === 'off_sale' ? '下架' : '草稿' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- S-SKU 副品管理 -->
      <el-tab-pane label="S-SKU 副品" name="sub-sku">
        <SubSkuTab />
      </el-tab-pane>
    </el-tabs>

    <!-- SPU Dialog (AI-BOS V2.0) -->
    <SpuDialog
      v-model:visible="spuDialogVisible"
      :row="spuEditRow"
      :schema-config="schemaData?.config || null"
      :tier-list="tierList"
      :structure-standards="structureStandardList"
      :series-list="computedSeriesList"
      :scene-tags="sceneTagOptions"
      :gender-options="genderOptions"
      :status-options="statusOptions"
      :category-list="categoryList"
      @saved="onSpuDialogSaved"
    />

    <!-- SKU Dialog -->
        <!-- SKU Dialog (AI-BOS V2.0) -->
    <SkuDialog
      v-model:visible="skuDialogVisible"
      :row="skuEditRow"
      :schema-config="schemaData?.config || null"
      :spu-list="spuListAll"
      :tier-list="tierList"
      :structure-standards="structureStandardList"
      :skin-tags="skinEffectTags"
      :face-tags="faceEffectTags"
      :tech-dicts="techDictsData"
      @saved="onSkuDialogSaved"
    />

    <!-- Set Dialog -->
    <el-dialog v-model="setDialogVisible" :title="setForm.setId ? '编辑套装' : '新增套装'" width="760px">
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
        <!-- SKU 多选（带复选框） -->
        <el-form-item label="选择 SKU">
          <el-select v-model="selectedSkuIds" multiple filterable collapse-tags collapse-tags-tooltip placeholder="搜索并勾选 SKU" style="width:100%" @change="onSkuSelectionChange">
            <el-option v-for="s in skuListForSelect" :key="s.skuId" :label="`${s.skuCode} - ${s.skuName || s.colorCode || ''}`" :value="s.skuId">
              <span style="float:left">{{ s.skuCode }} - {{ s.skuName || s.colorCode || '-' }}</span>
              <span style="float:right;color:#e6a23c">¥{{ Number(s.retailPrice || 0).toFixed(2) }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <!-- 已选 SKU 列表明细 -->
        <div v-if="selectedSkuRows.length" class="selected-sku-section">
          <div class="selected-sku-header">已选 SKU（{{ selectedSkuRows.length }} 件）</div>
          <div class="selected-sku-list">
            <div v-for="s in selectedSkuRows" :key="s.skuId" class="selected-sku-item">
              <span class="sku-code">{{ s.skuCode }}</span>
              <span class="sku-name">{{ s.skuName || s.colorCode || '-' }}</span>
              <span class="sku-retail">¥{{ Number(s.retailPrice || 0).toFixed(2) }}</span>
              <el-button link type="danger" size="small" @click="removeSku(s.skuId)">×</el-button>
            </div>
          </div>
          <div class="selected-sku-total">
            <span>原价（{{ selectedSkuRows.length }} 件商品）</span>
            <span class="total-price">¥{{ totalRetailPrice.toFixed(2) }}</span>
          </div>
        </div>
        <!-- 折扣率 ↔ 套装价联动 -->
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
        <el-form-item label="主图 URL" v-if="setForm.mainImage || setForm.setId">
          <el-input v-model="setForm.mainImage" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="setDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveSet">保存</el-button>
      </template>
    </el-dialog>

    
    <!-- 批量上传 Dialog -->
    <el-dialog v-model="batchDialogVisible" title="批量上传图片" width="640px">
      <el-tabs v-model="batchTab">
        <!-- Tab 1: URL 批量 -->
        <el-tab-pane label="URL 输入" name="url">
          <el-alert title="每行一个图片 URL，格式：URL | 类型 | 排序 | 主图(Y/N) | 替代文本" type="info" :closable="false" style="margin-bottom: 12px" />
          <el-input v-model="batchText" type="textarea" :rows="10" placeholder="示例：
https://cdn.example.com/img1.jpg | main | 0 | Y | 马卡龙粉主图
https://cdn.example.com/img2.jpg | gallery | 1 | N | 侧面展示" />
          <div class="batch-hint">
            <p>类型可选：main / gallery / detail / lifestyle / 360view / website_banner</p>
          </div>
        </el-tab-pane>
        <!-- Tab 2: 本地文件批量上传 -->
        <el-tab-pane label="本地上传" name="local">
          <input type="file" ref="batchFileInput" accept="image/*" multiple style="display: none" @change="onBatchFileSelect" />
          <div style="margin-bottom: 12px">
            <el-button @click="triggerBatchFileSelect">选择多张图片</el-button>
            <span v-if="batchUploading" style="color: #409eff; margin-left: 12px">上传中... {{ batchUploadedCount }}/{{ batchFileList.length }}</span>
            <span v-else-if="batchUploadedCount > 0" style="color: #67c23a; margin-left: 12px">已上传 {{ batchUploadedCount }} 张</span>
          </div>
          <div v-if="batchFileList.length > 0" class="batch-file-list">
            <div v-for="(f, i) in batchFileList" :key="i" class="batch-file-item">
              <span>{{ i + 1 }}. {{ f.name }}</span>
              <el-tag v-if="f.status === 'uploading'" type="warning" size="small">上传中</el-tag>
              <el-tag v-else-if="f.status === 'success'" type="success" size="small">成功</el-tag>
              <el-tag v-else-if="f.status === 'error'" type="danger" size="small">失败</el-tag>
            </div>
          </div>
          <div class="batch-hint">
            <p>✅ 上传后将自动创建图集（gallery）类型图片，可在表格中调整顺序和类型</p>
          </div>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button v-if="batchTab === 'url'" type="primary" @click="handleBatchUpload">📤 开始上传</el-button>
        <el-button v-if="batchTab === 'local' && batchFileList.length > 0 && !batchUploading" type="primary" @click="startBatchFileUpload">📤 开始上传 ({{ batchFileList.length }} 张)</el-button>
      </template>
    </el-dialog>
    <!-- SKU Image Dialog -->
    <el-dialog v-model="imageDialogVisible" :title="imageForm.imageId ? '编辑图片' : '新增图片'" width="560px">
      <el-form :model="imageForm" label-width="100px">
        <!-- 本地上传 -->
        <el-form-item label="上传图片">
          <input type="file" ref="imageFileInput" accept="image/*" style="display: none" @change="onImageFileSelect" />
          <div style="display: flex; gap: 12px; align-items: center">
            <el-button @click="triggerImageFileSelect">📁 选择图片</el-button>
            <span v-if="imageUploading" style="color: #409eff">⏳ 上传中...</span>
            <span v-else-if="imageForm.imageUrl" style="color: #67c23a">✅ 已选择</span>
          </div>
          <div v-if="imageForm.imageUrl" style="margin-top: 8px">
            <el-image :src="imageForm.imageUrl" fit="contain" style="max-width: 200px; max-height: 150px; border-radius: 4px" />
          </div>
        </el-form-item>
        <!-- 图片 URL（上传后自动填充，也可手动输入） -->
        <el-form-item label="图片 URL">
          <el-input v-model="imageForm.imageUrl" placeholder="上传后自动填充，也可手动输入 CDN 地址" />
        </el-form-item>
        <el-form-item label="图片类型">
          <el-select v-model="imageForm.imageType">
            <el-option label="主图" value="main" />
            <el-option label="图集" value="gallery" />
            <el-option label="详情" value="detail" />
            <el-option label="场景" value="lifestyle" />
            <el-option label="360度" value="360view" />
            <el-option label="官网横幅" value="website_banner" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序"><el-input-number v-model="imageForm.sortOrder" :min="0" /></el-form-item>
        <el-form-item label="设为主图"><el-switch v-model="imageForm.isPrimary" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="imageForm.isActive" /></el-form-item>
        <el-form-item label="替代文本"><el-input v-model="imageForm.altText" placeholder="SEO/无障碍描述" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="imageDialogVisible = false">取消</el-button><el-button type="primary" @click="handleSaveImage">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Rank } from '@element-plus/icons-vue';
import {
  getSpus, createSpu, updateSpu, deleteSpu,
  getSkus, createSku, updateSku, deleteSku,
  getTierPricings,
  getSets, createSet, updateSet, deleteSet,
  getSkuImages, createSkuImage, batchCreateSkuImages, updateSkuImage, deleteSkuImage, reorderSkuImages,
  uploadImage,
  getFrameMaterials, getFrameTypes, getNosePads, getHinges, getSurfaceTreatments,
  getSeriesList, getEffectTags,
} from '@/api/product';
import { getCategoriesFlat } from '@/api/category';
import { getStructureList } from '@/api/structure';
import { getSchema, type IndustrySchema } from '@/api/schema';
import SpuDialog from '@/components/SpuDialog.vue';
import SkuDialog from '@/components/SkuDialog.vue';
import SubSkuTab from './products/SubSkuTab.vue';

// 产品级别映射
const TIER_MAP: Record<string, { name: string; color: string }> = {
  color: { name: '色彩级', color: '#4CAF50' },
  style: { name: '风格级', color: '#2196F3' },
  texture: { name: '质感级', color: '#FF9800' },
  'light-luxury': { name: '轻奢级', color: '#E91E63' },
  smart: { name: '智能级', color: '#9C27B0' },
  luxury: { name: '奢华级', color: '#1a1a1a' },
};
function getTierName(code: string): string {
  return activeTierMap.value[code]?.name || code || '-';
}
function getTierColor(code: string): string {
  return activeTierMap.value[code]?.color || '#999';
}
// ===== AI-BOS V2.0: Schema 驱动数据 =====
const schemaData = ref<IndustrySchema | null>(null);
const schemaLoading = ref(false);
const loadSchema = async () => { try { const [fullSchema] = await Promise.all([getSchema("eyewear")]); schemaData.value = fullSchema; console.log("[AI-BOS] Schema:", fullSchema.industry, "v" + fullSchema.version); } catch (e) { console.warn("[AI-BOS] Schema 加载失败", e); } finally { schemaLoading.value = false; } };
const schemaConfig = computed(() => schemaData.value?.config);
const sceneTagOptions = computed(() => schemaConfig.value?.sceneTags || ["通勤","职场","约会","拍照","运动","旅行","休闲","派对"]);
const genderOptions = computed(() => schemaConfig.value?.genderOptions || [{ value:"female",label:"女款"},{ value:"male",label:"男款"},{ value:"unisex",label:"中性"},{ value:"limited",label:"限量" }]);
const statusOptions = computed(() => schemaConfig.value?.statusOptions || [{ value:"on_sale",label:"在售"},{ value:"draft",label:"草稿"},{ value:"off_sale",label:"下架" }]);
const shapeLabels = computed(() => schemaConfig.value?.shapeLabels || {});
const seriesLabels = computed(() => schemaConfig.value?.seriesLabels || {});
const faceShapeLabelsConfig = computed(() => schemaConfig.value?.faceShapeLabels || {});
const tierLabelsConfig = computed(() => schemaConfig.value?.tierLabels || {});
const spuEditRow = ref<any>(null);
const skuEditRow = ref<any>(null);
function onSpuDialogSaved() { loadSpus(); spuEditRow.value = null; }
function onSkuDialogSaved() { loadSkus(); skuEditRow.value = null; }
const techDictsData = computed(() => ({ frameMaterials: frameMaterials.value, frameTypes: frameTypes.value, nosePads: nosePads.value, hinges: hinges.value, surfaceTreatments: surfaceTreatments.value }));
const activeTierMap = computed(() => tierLabelsConfig.value && Object.keys(tierLabelsConfig.value).length ? tierLabelsConfig.value : TIER_MAP);

// ===== 字典中文映射 =====
function getDictName(dictKey: string, code: string): string {
  if (!code) return '-';
  const dictMap: Record<string, any[]> = {
    frameMaterials: frameMaterials.value,
    frameTypes: frameTypes.value,
    nosePads: nosePads.value,
    hinges: hinges.value,
    surfaceTreatments: surfaceTreatments.value,
  };
  const items = dictMap[dictKey];
  if (!items || !items.length) return code;
  const found = items.find((d: Record<string, unknown>) => d.code === code);
  return found?.name || code;
}

function getFaceShapeLabel(code: string): string {
  if (!code) return '-';
  const map: Record<string, string> = {
    round: '圆脸', oval: '椭圆脸', square: '方脸',
    diamond: '菱形脸', heart: '心形脸', oblong: '长脸',
  };
  return map[code] || code;
}

const activeTab = ref('spu');

// ===== 产品级别字典 =====
const tierList = ref<any[]>([]);
const loadTiers = async () => {
  try {
    const res: any = await getTierPricings();
    const raw = res.data || res.items || res || [];
    // 规范化为模板所需的 snake_case 格式
    tierList.value = raw.map((t: any) => ({
      tier_code: t.tierCode || t.tier_code,
      tier_name: t.tierName || t.tier_name,
      icon_color: TIER_MAP[t.tierCode || t.tier_code]?.color || '#999',
      ...t,
    }));
  }
  catch (e: unknown) { console.warn('Failed to load tiers', e); }
};

// ===== Phase 8B: 技术参数字典 =====
const frameMaterials = ref<any[]>([]);
const frameTypes = ref<any[]>([]);
const nosePads = ref<any[]>([]);
const hinges = ref<any[]>([]);
const surfaceTreatments = ref<any[]>([]);
const faceShapeOptions = [
  { label: '圆脸', value: 'round' },
  { label: '椭圆脸', value: 'oval' },
  { label: '方脸', value: 'square' },
  { label: '菱形脸', value: 'diamond' },
  { label: '心形脸', value: 'heart' },
  { label: '长脸', value: 'oblong' },
];
const seriesList = ref<any[]>([]);
const computedSeriesList = computed(() => seriesList.value.map((s: Record<string, unknown>) => ({ code: s.code, name: s.name })));

const skinToneEffects = ref<any[]>([]);
const faceShapeEffects = ref<any[]>([]);
const skinEffectTags = computed(() => skinToneEffects.value);
const faceEffectTags = computed(() => faceShapeEffects.value);
const loadEffectTags = async () => {
  try {
    const [skin, face]: Record<string, unknown>[] = await Promise.all([getEffectTags('skin_tone'), getEffectTags('face_shape')]);
    skinToneEffects.value = Array.isArray(skin) ? skin : [];
    faceShapeEffects.value = Array.isArray(face) ? face : [];
  } catch (e) {}
};

const loadTechDicts = async () => {
  try {
    const [fm, ft, np, hg, st, sl]: Record<string, unknown>[] = await Promise.all([
      getFrameMaterials(), getFrameTypes(), getNosePads(), getHinges(), getSurfaceTreatments(), getSeriesList(),
    ]);
    seriesList.value = sl.data || sl.items || sl || [];
    frameMaterials.value = fm.data || fm.items || fm || [];
    frameTypes.value = ft.data || ft.items || ft || [];
    nosePads.value = np.data || np.items || np || [];
    hinges.value = hg.data || hg.items || hg || [];
    surfaceTreatments.value = st.data || st.items || st || [];
  } catch (e: unknown) { console.warn('Failed to load tech dicts', e); }
};

// ===== SPU =====
const spuList = ref<any[]>([]);
const spuSelection = ref<any[]>([]);
const setSelection = ref<any[]>([]);
const spuListAll = ref<any[]>([]);  // 全量 SPU 列表（下拉框用，不分页）
const spuLoading = ref(false);
const spuPage = ref(1);
const spuPageSize = ref(20);
const spuTotal = ref(0);
const spuSearch = reactive({ keyword: '', gender: '', status: '', productTier: '' });
const spuDialogVisible = ref(false);

const loadSpus = async () => {
  spuLoading.value = true;
  try {
    const res = await getSpus({ page: spuPage.value, pageSize: spuPageSize.value, ...spuSearch });
    if (Array.isArray(res)) {
      spuList.value = res
      spuTotal.value = res.length
    } else if (res && typeof res === 'object' && Array.isArray(res.items)) {
      spuList.value = res.items.map((i) => ({ ...i }))
      spuTotal.value = res.total || res.items.length
    } else {
      spuList.value = []
      spuTotal.value = 0
    }
  } catch (e: unknown) { ElMessage.error((e as any)?.message || '加载失败'); }
  finally { spuLoading.value = false; }
};
// 全量加载 SPU（下拉框用，不传分页参数）
const loadSpusAll = async () => {
  try {
    const res = await getSpus({ pageSize: 9999 });
    spuListAll.value = Array.isArray(res) ? res : (res as any)?.items || [];
  } catch { /* ignore */ }
};
const openSpuDialog = (row?: any) => {
    spuEditRow.value = row || null;
  spuDialogVisible.value = true;
};
const batchEditSpus = () => { if(spuSelection.value.length===1) openSpuDialog(spuSelection.value[0]); else if(spuSelection.value.length>1) ElMessage.warning('暂仅支持单条编辑'); };
const batchDeleteSpus = async () => { try { for(const r of spuSelection.value) await deleteSpu(r.spuId); ElMessage.success(spuSelection.value.length+' 条已删除'); spuSelection.value=[]; loadSpus(); } catch { ElMessage.error('删除失败'); } };
const handleDeleteSpu = async (id: string) => {
  try { await deleteSpu(id); ElMessage.success('已删除'); loadSpus(); } catch (e: unknown) { ElMessage.error((e as any)?.message || '删除失败'); }
};

// ===== SKU =====
const skuList = ref<any[]>([]);
const skuSelection = ref<any[]>([]);
const skuLoading = ref(false);
const skuPage = ref(1);
const skuPageSize = ref(20);
const skuTotal = ref(0);
const skuSearch = reactive({ keyword: '', spuId: '', skinToneEffect: '', faceShapeEffect: '' });
const skuDialogVisible = ref(false);// suitableFaceShapes 用独立 ref（避免 reactive 嵌套数组响应式断裂）

const loadSkus = async () => {
  skuLoading.value = true;
  try {
    const cleanSearch = Object.fromEntries(Object.entries(skuSearch).filter(([_,v]) => v !== undefined && v !== null && v !== ''));
    const res = await getSkus({ page: skuPage.value, pageSize: skuPageSize.value, ...cleanSearch });
    if (Array.isArray(res)) {
      skuList.value = res
      skuTotal.value = res.length
    } else if (res && typeof res === 'object' && Array.isArray(res.items)) {
      skuList.value = res.items.map((i) => ({ ...i }))
      skuTotal.value = res.total || res.items.length
    } else {
      skuList.value = []
      skuTotal.value = 0
    }
  } catch (e: unknown) { ElMessage.error((e as any)?.message || '加载失败'); }
  finally { skuLoading.value = false; }
};
const openSkuDialog = (row?: any) => {
  skuEditRow.value = row || null;
  skuDialogVisible.value = true;
};

// 全量加载 SKU（套装多选/图片下拉框用）
const loadSkusAll = async () => {
  try {
    const res = await getSkus({ pageSize: 9999 });
    skuListForSelect.value = Array.isArray(res) ? res : (res as any)?.items || [];
  } catch { /* ignore */ }
};

const batchEditSkus = () => { if(skuSelection.value.length===1) openSkuDialog(skuSelection.value[0]); else if(skuSelection.value.length>1) ElMessage.warning('暂仅支持单条编辑'); };
const batchDeleteSkus = async () => { try { for(const r of skuSelection.value) await deleteSku(r.skuId); ElMessage.success(skuSelection.value.length+' 条已删除'); skuSelection.value=[]; loadSkus(); } catch { ElMessage.error('删除失败'); } };
const handleDeleteSku = async (id: string) => {
  try {
    await deleteSku(id)
    ElMessage.success('SKU 已删除')
    loadSkus()
    skuEditRow.value = null
  } catch (e: unknown) {
    ElMessage.error((e as any)?.message || '删除失败')
  }
};

// ===== 结构标准 =====
const structureStandardList = ref<any[]>([]);
const loadStructureStandards = async () => {
  try {
    const res = await getStructureList({ page: 1, pageSize: 500 })
    // request.ts 拦截器已经解包
    if (Array.isArray(res)) {
      structureStandardList.value = res
    } else if (res && typeof res === 'object' && Array.isArray(res.items)) {
      structureStandardList.value = res.items
    } else if (res && typeof res === 'object' && res.data && Array.isArray(res.data.items)) {
      structureStandardList.value = res.data.items
    } else {
      structureStandardList.value = []
    }
  } catch {}
};

// ===== Category (供 SPU/SKU/Set 表单下拉选择) =====
const categoryList = ref<any[]>([]);
const loadCategoryList = async () => {
  try { categoryList.value = await getCategoriesFlat(); }
  catch { categoryList.value = []; }
};

// ===== Set =====
const setList = ref<any[]>([]);
const setLoading = ref(false);
const setDialogVisible = ref(false);
const setForm = reactive<any>({ setId: '', setCode: '', setName: '', setPrice: 0, originalTotalPrice: 0, discountRate: 0, retailPrice: 0, status: 'draft', categoryId: '', description: '', mainImage: '' });
const selectedSkuIds = ref<string[]>([]);
const selectedSkuRows = computed(() => skuListForSelect.value.filter((s: Record<string, unknown>) => selectedSkuIds.value.includes(s.skuId)));
// 统一零售价 = 所选 SKU 零售价自动累加（价格锚点 = 原价）
const totalRetailPrice = computed(() => selectedSkuRows.value.reduce((sum: number, s: any) => sum + (Number(s.retailPrice) || 0), 0));
const discountRatePercent = computed(() => {
  if (setForm.discountRate == null) return '-';
  return (setForm.discountRate * 100).toFixed(0) + '%';
});

// SKU 选择变化：自动设原价，按折扣率算套装价
const onSkuSelectionChange = () => {
  const retail = totalRetailPrice.value;
  setForm.retailPrice = retail;
  setForm.originalTotalPrice = retail; // 价格锚点 = 统一零售价 = 原价
  if (retail > 0 && !setForm.setId && setForm.discountRate > 0) {
    setForm.setPrice = parseFloat((retail * setForm.discountRate).toFixed(2));
  } else if (retail > 0 && !setForm.setId) {
    // 默认 75 折
    setForm.discountRate = 0.75;
    setForm.setPrice = parseFloat((retail * 0.75).toFixed(2));
  } else if (retail > 0 && setForm.setPrice > 0) {
    setForm.discountRate = parseFloat((setForm.setPrice / retail).toFixed(2));
  } else {
    setForm.setPrice = 0;
    setForm.discountRate = 0;
  }
};

// 删除已选 SKU
const removeSku = (skuId: string) => {
  selectedSkuIds.value = selectedSkuIds.value.filter(id => id !== skuId);
  onSkuSelectionChange();
};

// 改折扣率 → 自动算套装价（价格锚点 = 原价）
const onDiscountRateChange = (val: number | undefined) => {
  const retail = totalRetailPrice.value;
  if (retail > 0 && val && val > 0) {
    setForm.setPrice = parseFloat((retail * val).toFixed(2));
  }
};

// 改套装价 → 自动反推折扣率
const onSetPriceChange = (val: number | undefined) => {
  const retail = totalRetailPrice.value;
  if (retail > 0 && val && val > 0) {
    setForm.discountRate = parseFloat((val / retail).toFixed(2));
  }
};

// 套装编码生成
// 已废弃：setCode 现在由后端 createSet 自动生成（SET + 6位自增序号），不再前端随机
function generateSetCode(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const seq = Math.floor(Math.random() * 900 + 100);
  return `SET${y}${m}${d}${seq}`;
}

const loadSets = async () => {
  setLoading.value = true;
  try { const res = await getSets({}); setList.value = Array.isArray(res.items) ? res.items.map((i) => ({ ...i })) : (Array.isArray(res) ? res : []); }
  catch (e: unknown) { ElMessage.error((e as any)?.message || '加载失败'); }
  finally { setLoading.value = false; }
};
const openSetDialog = (row?: any) => {
  if (row) {
    // 白名单赋值，避免传 createdAt/updatedAt/isDeleted
    setForm.setId = row.setId || '';
    setForm.setCode = row.setCode || '';
    setForm.setName = row.setName || '';
    setForm.setPrice = Number(row.setPrice) || 0;
    setForm.originalTotalPrice = Number(row.originalTotalPrice) || 0;
    setForm.discountRate = Number(row.discountRate) || 0;
    setForm.retailPrice = Number(row.retailPrice) || 0;
    setForm.status = row.status || 'draft';
    setForm.categoryId = row.categoryId || '';
    setForm.description = row.description || '';
    setForm.mainImage = row.mainImage || '';
    selectedSkuIds.value = Array.isArray(row.skuList) ? [...row.skuList] : [];
  } else {
    setForm.setId = '';
    setForm.setCode = '';  // 后端自动生成 SET 编码，前端不再随机生成
    setForm.setName = '';
    setForm.setPrice = 0;
    setForm.originalTotalPrice = 0;
    setForm.discountRate = 0;
    setForm.retailPrice = 0;
    setForm.status = 'draft';
    setForm.categoryId = '';
    setForm.description = '';
    setForm.mainImage = '';
    selectedSkuIds.value = [];
  }
  setDialogVisible.value = true;
};
const handleSaveSet = async () => {
  // 白名单传参，避免传多余字段
  const payload: Record<string, unknown> = {
    setName: setForm.setName,
    skuList: selectedSkuIds.value,
    setPrice: setForm.setPrice,
    originalTotalPrice: setForm.originalTotalPrice,
    discountRate: setForm.discountRate,
    retailPrice: setForm.retailPrice,
  };
  if (setForm.categoryId) payload.categoryId = setForm.categoryId;
  if (setForm.description) payload.description = setForm.description;
  if (setForm.mainImage) payload.mainImage = setForm.mainImage;
  if (setForm.status) payload.status = setForm.status;
  if (!setForm.setId && setForm.setCode) payload.setCode = setForm.setCode;
  try {
    if (setForm.setId) await updateSet(setForm.setId, payload); else await createSet(payload);
    ElMessage.success('保存成功'); setDialogVisible.value = false; loadSets();
  } catch (e: unknown) { ElMessage.error((e as any)?.message || '保存失败'); }
};
const batchEditSets = () => { if(setSelection.value.length===1) openSetDialog(setSelection.value[0]); else if(setSelection.value.length>1) ElMessage.warning('暂仅支持单条编辑'); };
const batchDeleteSets = async () => { try { for(const r of setSelection.value) await deleteSet(r.setId); ElMessage.success(setSelection.value.length+' 条已删除'); setSelection.value=[]; loadSets(); } catch { ElMessage.error('删除失败'); } };
const handleDeleteSet = async (id: string) => {
  try { await deleteSet(id); ElMessage.success('已删除'); loadSets(); } catch (e: unknown) { ElMessage.error((e as any)?.message || '删除失败'); }
};

// ===== SKU 图片 =====
const skuImageList = ref<any[]>([]);
const imageLoading = ref(false);
const skuListForSelect = ref<any[]>([]);  // 图片Tab下拉用全量列表
const skuSelectLoading = ref(false);       // 图片Tab下拉独立loading
const imageSearch = reactive({ skuId: '', imageType: '' });
const imageDialogVisible = ref(false);
const imageForm = reactive<any>({ imageId: '', skuId: '', imageUrl: '', imageType: 'gallery', sortOrder: 0, isPrimary: false, isActive: true, altText: '', width: null, height: null });
const imageFileInput = ref<HTMLInputElement | null>(null);
const imageUploading = ref(false);

// 批量上传
const batchDialogVisible = ref(false);
const batchText = ref('');
const batchTab = ref('url');
const batchFileInput = ref<HTMLInputElement | null>(null);
const batchFileList = ref<any[]>([]);
const batchUploading = ref(false);
const batchUploadedCount = ref(0);

// 排序相关
const hasReordered = ref(false);
const originalOrder = ref<any[]>([]);

// 计算属性：按 sortOrder 排序的列表
const sortedImageList = computed(() => {
  return [...skuImageList.value].sort((a, b) => a.sortOrder - b.sortOrder);
});

const loadSkuImages = async () => {
  if (!imageSearch.skuId) { skuImageList.value = []; return; }
  imageLoading.value = true;
  hasReordered.value = false;
  try {
    const res = await getSkuImages({ skuId: imageSearch.skuId, imageType: imageSearch.imageType });
    skuImageList.value = Array.isArray(res) ? res : [];
    originalOrder.value = [...skuImageList.value];
  } catch (e: unknown) { ElMessage.error((e as any)?.message || '加载失败'); }
  finally { imageLoading.value = false; }
};
const openImageDialog = (row?: any) => {
  if (row) {
    // 白名单赋值，避免传 createdAt/updatedAt/isDeleted/createdBy
    imageForm.imageId = row.imageId || '';
    imageForm.skuId = row.skuId || '';
    imageForm.imageUrl = row.imageUrl || '';
    imageForm.imageType = row.imageType || 'gallery';
    imageForm.sortOrder = row.sortOrder != null ? row.sortOrder : 0;
    imageForm.isPrimary = row.isPrimary || false;
    imageForm.isActive = row.isActive != null ? row.isActive : true;
    imageForm.altText = row.altText || '';
    imageForm.width = row.width || null;
    imageForm.height = row.height || null;
  } else {
    imageForm.imageId = '';
    imageForm.skuId = imageSearch.skuId;
    imageForm.imageUrl = '';
    imageForm.imageType = 'gallery';
    imageForm.sortOrder = skuImageList.value.length;
    imageForm.isPrimary = false;
    imageForm.isActive = true;
    imageForm.altText = '';
    imageForm.width = null;
    imageForm.height = null;
  }
  imageDialogVisible.value = true;
};
const handleSaveImage = async () => {
  if (!imageForm.imageUrl?.trim()) { ElMessage.warning('请输入图片 URL'); return; }
  // 白名单传参
  const payload: Record<string, unknown> = {
    imageUrl: imageForm.imageUrl,
    imageType: imageForm.imageType || 'gallery',
    sortOrder: imageForm.sortOrder,
    isPrimary: imageForm.isPrimary || false,
    isActive: imageForm.isActive != null ? imageForm.isActive : true,
    altText: imageForm.altText || '',
    width: imageForm.width || null,
    height: imageForm.height || null,
  };
  if (!imageForm.imageId) payload.skuId = imageForm.skuId;
  try {
    if (imageForm.imageId) await updateSkuImage(imageForm.imageId, payload);
    else await createSkuImage(payload);
    ElMessage.success('保存成功'); imageDialogVisible.value = false; loadSkuImages();
  } catch (e: unknown) { ElMessage.error((e as any)?.message || '保存失败'); }
};
const handleDeleteImage = async (id: string) => {
  try { await deleteSkuImage(id); ElMessage.success('已删除'); loadSkuImages(); } catch (e: unknown) { ElMessage.error((e as any)?.message || '删除失败'); }
};

// 图片预览（替代 Element Plus image-viewer z-index 问题）
const previewSrc = ref('');
const previewVisible = ref(false);
const previewScale = ref(1);
const previewImage = (url: string) => { previewSrc.value = url; previewVisible.value = true; previewScale.value = 1; };
const onPreviewWheel = (e: WheelEvent) => { previewScale.value = Math.min(3, Math.max(0.25, previewScale.value + (e.deltaY < 0 ? 0.1 : -0.1))); };

// 文件上传相关
const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith('image/');
  const isLt10M = file.size / 1024 / 1024 < 10;
  if (!isImage) { ElMessage.error('只能上传图片文件!'); return false; }
  if (!isLt10M) { ElMessage.error('图片大小不能超过 10MB!'); return false; }
  return true;
};

// 简单文件选择（替代 el-upload）
const triggerImageFileSelect = () => { imageFileInput.value?.click(); };
const onImageFileSelect = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const isValid = beforeUpload(file);
  if (!isValid) return;
  imageUploading.value = true;
  try {
    const res = await uploadImage(file);
    if (res?.data?.url || res?.url) {
      imageForm.imageUrl = res.data?.url || res.url;
      ElMessage.success('上传成功');
    } else {
      ElMessage.error(res?.message || '上传失败');
    }
  } catch (e: unknown) {
    ElMessage.error((e as any)?.message || '上传失败');
  } finally {
    imageUploading.value = false;
    input.value = ''; // 重置，允许重新选同一文件
  }
};
// 批量上传
const openBatchDialog = () => { batchText.value = ''; batchTab.value = 'url'; batchFileList.value = []; batchUploadedCount.value = 0; batchUploading.value = false; batchDialogVisible.value = true; };
const handleBatchUpload = async () => {
  if (!batchText.value.trim()) { ElMessage.warning('请输入图片 URL'); return; }
  const lines = batchText.value.split('\n').filter(l => l.trim());
  const images: Record<string, unknown>[] = [];
  for (const line of lines) {
    const parts = line.split('|').map(p => p.trim());
    if (!parts[0]) continue;
    images.push({
      imageUrl: parts[0],
      imageType: parts[1] || 'gallery',
      sortOrder: parseInt(parts[2] || '0'),
      isPrimary: (parts[3] || 'N').toUpperCase() === 'Y',
      altText: parts[4] || '',
      isActive: true,
    });
  }
  if (images.length === 0) { ElMessage.warning('没有有效的图片数据'); return; }
  try {
    await batchCreateSkuImages({ skuId: imageSearch.skuId, images });
    ElMessage.success(`成功上传 ${images.length} 张图片`);
    batchDialogVisible.value = false; loadSkuImages();
  } catch (e: unknown) { ElMessage.error((e as any)?.message || '上传失败'); }
};

// 批量本地文件上传
const triggerBatchFileSelect = () => { batchFileInput.value?.click(); };
const onBatchFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = input.files;
  if (!files || files.length === 0) return;
  batchFileList.value = Array.from(files).map(f => ({ file: f, name: f.name, status: 'pending' }));
  batchUploadedCount.value = 0;
  input.value = ''; // 重置
};

const startBatchFileUpload = async () => {
  batchUploading.value = true;
  batchUploadedCount.value = 0;
  let successCount = 0;
  let failCount = 0;
  for (let i = 0; i < batchFileList.value.length; i++) {
    const item = batchFileList.value[i];
    item.status = 'uploading';
    try {
      const res = await uploadImage(item.file);
      const url = res?.data?.url || res?.url;
      if (url) {
        await createSkuImage({
          skuId: imageSearch.skuId,
          imageUrl: url,
          imageType: 'gallery',
          sortOrder: skuImageList.value.length + i + 1,
          isPrimary: false,
          isActive: true,
        });
        item.status = 'success';
        successCount++;
      } else {
        item.status = 'error';
        failCount++;
      }
    } catch (e: unknown) {
      item.status = 'error';
      failCount++;
    }
    batchUploadedCount.value = successCount;
  }
  batchUploading.value = false;
  if (successCount > 0) {
    ElMessage.success(`成功上传 ${successCount} 张图片${failCount > 0 ? `，${failCount} 张失败` : ''}`);
    batchDialogVisible.value = false;
    loadSkuImages();
  } else {
    ElMessage.error('所有图片上传失败');
  }
};

// 拖拽排序保存
const handleSaveOrder = async () => {
  const orderedIds = sortedImageList.value.map(img => img.imageId);
  try {
    await reorderSkuImages({ skuId: imageSearch.skuId, imageType: imageSearch.imageType || undefined, orderedIds });
    ElMessage.success('排序已保存');
    hasReordered.value = false;
    loadSkuImages();
  } catch (e: unknown) { ElMessage.error((e as any)?.message || '排序失败'); }
};
const cancelReorder = () => { hasReordered.value = false; skuImageList.value = [...originalOrder.value]; };

// 上下移动排序
const moveImage = (index: number, direction: number) => {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= sortedImageList.value.length) return;
  // 交换 sortOrder
  const a = sortedImageList.value[index];
  const b = sortedImageList.value[newIndex];
  const tempSort = a.sortOrder;
  a.sortOrder = b.sortOrder;
  b.sortOrder = tempSort;
  // 触发响应式更新
  skuImageList.value = [...skuImageList.value];
  hasReordered.value = true;
};

// 图片Tab：加载全量SKU列表用于下拉选择器
const loadSkusForSelect = async () => {
  skuSelectLoading.value = true;
  try {
    const res = await getSkus({ pageSize: 99999 });
    if (Array.isArray(res)) skuListForSelect.value = res;
    else if (res?.items) skuListForSelect.value = res.items;
  } catch { /* 忽略 */ }
  finally { skuSelectLoading.value = false; }
};

// Tab 切换懒加载：只加载当前 Tab 需要的数据
// ⚠️ 必须在所有 loader 函数定义之后，否则 TDZ 报错
const TAB_LOADERS: Record<string, (() => void)[]> = {
  spu: [loadSpus],
  sku: [loadSkus],
  set: [loadSets],
  'sku-image': [loadSkusForSelect],
};

// 首次只加载全局基础字典（所有 Tab 共用），具体数据按需加载
onMounted(() => {
  loadSchema();
  loadTiers();
  loadTechDicts();
  loadStructureStandards();
  loadEffectTags();
  loadCategoryList();
  // 全量加载 SPU/SKU 列表（下拉框/多选用，不分页）
  loadSpusAll();
  loadSkusAll();
  // 默认激活 spu tab，加载其数据
  loadSpus();
});

// Tab 切换时只刷新当前 Tab 的数据
watch(activeTab, (tab) => {
  const loaders = TAB_LOADERS[tab];
  if (loaders) {
    loaders.forEach(fn => fn());
  }
});
</script>

<style scoped>
.products-page { padding: 16px; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; }
.tab-content { min-height: 300px; }

/* 图片类型筛选 */
.image-type-tabs { margin-bottom: 12px; }

/* 保存排序栏 */
.save-order-bar {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 批量上传提示 */
.batch-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}

/* 上传预览 */
.upload-preview {
  text-align: center;
  padding: 8px;
}
.upload-placeholder {
  text-align: center;
  padding: 20px;
}

/* 批量文件列表 */
.batch-file-list {
  margin-top: 12px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}
.batch-file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
}
.batch-file-item:last-child {
  border-bottom: none;
}

/* 输入框宽度修复 */
.el-dialog .el-input,
.el-dialog .el-select,
.el-dialog .el-date-editor { width: 100% !important; }
.el-dialog .el-input-number { width: 100% !important; }

/* 已选 SKU 列表明细 */
.selected-sku-section {
  margin: 0 0 16px 110px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  max-width: 590px;
}
.selected-sku-header {
  background: #f5f7fa;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  border-bottom: 1px solid #e8e8e8;
}
.selected-sku-list {
  max-height: 180px;
  overflow-y: auto;
}
.selected-sku-item {
  display: flex;
  align-items: center;
  padding: 6px 14px;
  font-size: 13px;
  border-bottom: 1px solid #f0f0f0;
}
.selected-sku-item:last-child {
  border-bottom: none;
}
.sku-code {
  width: 120px;
  color: #303133;
  font-family: monospace;
}
.sku-name {
  flex: 1;
  color: #606266;
  margin: 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sku-retail {
  color: #e6a23c;
  font-weight: 700;
  width: 80px;
  text-align: right;
}
.selected-sku-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: #fff7e6;
  font-size: 14px;
  color: #606266;
  font-weight: 600;
}
.total-price {
  font-size: 18px;
  font-weight: 700;
  color: #e6a23c;
}

/* 条码输入框宽度适配 */
.w-barcode :deep(.el-input) { max-width: 520px; }

/* SKU 展开行技术规格表 */
.tech-table {
  width: 100%;
  border-collapse: collapse;
}
.tech-table td {
  padding: 6px 8px;
  border: 1px solid #ebeef5;
  font-size: 13px;
}
.tech-table .tech-label {
  background: #f5f7fa;
  font-weight: 600;
  color: #606266;
  width: 90px;
  padding-left: 28px;
  white-space: nowrap;
}
.tech-table .tech-value {
  min-width: 140px;
  color: #303133;
}

/* 图片预览全屏层 */
.fullscreen-preview {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  z-index: 10000;
  background: rgba(0,0,0,0.85);
  display: flex; align-items: center; justify-content: center;
  cursor: zoom-out;
}
.fullscreen-preview img {
  max-width: 95vw; max-height: 95vh;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 4px 32px rgba(0,0,0,0.5);
  cursor: default;
  transition: transform 0.15s ease;
}
.preview-toolbar {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px;
  background: rgba(255,255,255,0.15); backdrop-filter: blur(12px);
  border-radius: 20px;
  z-index: 10001;
}
.preview-zoom {
  color: #fff; font-size: 13px; min-width: 48px; text-align: center;
}
</style>
