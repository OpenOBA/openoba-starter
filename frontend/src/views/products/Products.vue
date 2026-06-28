<template>
  <div class="products-page">
    <el-tabs v-model="activeTab" type="card">
      <!-- SPU -->
      <el-tab-pane label="SPU 管理" name="spu">
        <div class="tab-content">
          <ProductFilters
            :spu-search="spuSearch"
            :gender-options="genderOptions"
            :status-options="statusOptions"
            :tier-list="tierList"
            :spu-selection="spuSelection"
            @search="loadSpus"
            @add="openSpuDialog()"
            @edit="batchEditSpus"
            @batch-delete="batchDeleteSpus"
          />
          <el-table
            v-loading="spuLoading"
            :data="spuList"
            stripe
            @selection-change="spuSelection = $event"
            @row-dblclick="openSpuDialog"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column prop="spuCode" label="SPU 编码" width="160" />
            <el-table-column label="级别" width="100">
              <template #default="{ row }">
                <span
                  v-if="row.productTier"
                  :style="{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: getTierColor(row.productTier) + '18',
                    color: getTierColor(row.productTier),
                    fontSize: '12px',
                    fontWeight: '600',
                  }"
                >
                  <span
                    :style="{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: getTierColor(row.productTier),
                    }"
                  ></span>
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
                <el-tag :type="genderTagTypes[row.gender] || 'info'" size="small">
                  {{ genderLabels[row.gender] || row.gender || '-' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="场景" min-width="140">
              <template #default="{ row }">
                <template v-if="row.scene_tags && row.scene_tags.length">
                  <el-tag v-for="tag in row.scene_tags" :key="tag" size="small" style="margin-right: 4px">{{
                    tag
                  }}</el-tag>
                </template>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="适用季节" min-width="120">
              <template #default="{ row }">
                <template v-if="row.season_tags && row.season_tags.length">
                  <el-tag v-for="tag in row.season_tags" :key="tag" size="small" type="warning" style="margin-right: 4px">{{
                    tag
                  }}</el-tag>
                </template>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag
                  :type="row.status === 'on_sale' ? 'success' : row.status === 'draft' ? 'info' : 'danger'"
                  size="small"
                >
                  {{ statusOptions.find((o) => o.value === row.status)?.label || row.status || '-' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-if="spuTotal > spuPageSize"
            v-model:current-page="spuPage"
            v-model:page-size="spuPageSize"
            style="margin-top: 16px; justify-content: flex-end"
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
            <el-input
              v-model="skuSearch.keyword"
              placeholder="搜索 SKU 名称/编码"
              clearable
              style="width: 220px"
              @keyup.enter="loadSkus"
            />
            <el-select
              v-model="skuSearch.spuId"
              placeholder="按 SPU 筛选"
              clearable
              filterable
              style="width: 200px"
              @change="loadSkus"
            >
              <el-option
                v-for="s in spuListAll"
                :key="s.spuId"
                :label="`${s.spuCode} - ${s.spuName}`"
                :value="s.spuId"
              />
            </el-select>
            <el-select
              v-model="skuSearch.skinToneEffect"
              placeholder="肤色效果"
              clearable
              filterable
              style="width: 160px"
              @change="loadSkus"
            >
              <el-option
                v-for="t in skinEffectTags"
                :key="'skin-' + t.effectCode"
                :label="t.effectName"
                :value="t.effectName"
              />
            </el-select>
            <el-select
              v-model="skuSearch.faceShapeEffect"
              placeholder="脸型效果"
              clearable
              filterable
              style="width: 160px"
              @change="loadSkus"
            >
              <el-option
                v-for="t in faceEffectTags"
                :key="'face-' + t.effectCode"
                :label="t.effectName"
                :value="t.effectName"
              />
            </el-select>
            <el-button type="primary" @click="loadSkus">搜索</el-button>
            <el-button type="success" @click="openSkuDialog()">新增 SKU</el-button>
            <el-button type="primary" :disabled="skuSelection.length === 0" @click="batchEditSkus()">编辑</el-button>
            <el-popconfirm
              title="确认批量删除所选SKU？"
              :disabled="skuSelection.length === 0"
              @confirm="batchDeleteSkus"
            >
              <template #reference
                ><el-button type="danger" :disabled="skuSelection.length === 0">删除</el-button></template
              >
            </el-popconfirm>
          </div>
          <el-table
            v-loading="skuLoading"
            :data="skuList"
            stripe
            row-key="skuId"
            @selection-change="skuSelection = $event"
            @row-dblclick="openSkuDialog"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column type="expand">
              <template #default="{ row }">
                <div class="tech-spec-row" style="padding: 12px 24px; background: #fafafa">
                  <table class="tech-table">
                    <tbody>
                      <tr>
                        <td class="tech-label">尺寸标注</td>
                        <td class="tech-value">
                          {{ [row.lensWidth, row.bridgeWidth, row.templeLength].filter((v) => v).join('□') || '-' }}
                        </td>
                        <td class="tech-label">镜框材质</td>
                        <td class="tech-value">{{ getDictName('frameMaterials', row.frameMaterial) }}</td>
                      </tr>
                      <tr>
                        <td class="tech-label">镜框类型</td>
                        <td class="tech-value">{{ getDictName('frameTypes', row.frameType) }}</td>
                        <td class="tech-label">重量</td>
                        <td class="tech-value">{{ row.weightG != null ? row.weightG + 'g' : '-' }}</td>
                      </tr>
                      <tr>
                        <td class="tech-label">鼻托类型</td>
                        <td class="tech-value">{{ getDictName('nosePads', row.nosePadType) }}</td>
                        <td class="tech-label">铰链类型</td>
                        <td class="tech-value">{{ getDictName('hinges', row.hingeType) }}</td>
                      </tr>
                      <tr>
                        <td class="tech-label">镜框高度</td>
                        <td class="tech-value">{{ row.frameHeight != null ? row.frameHeight + 'mm' : '-' }}</td>
                        <td class="tech-label">表面处理</td>
                        <td class="tech-value">{{ getDictName('surfaceTreatments', row.surfaceTreatment) }}</td>
                      </tr>
                      <tr>
                        <td class="tech-label">适合脸型</td>
                        <td class="tech-value">
                          <template v-if="row.suitableFaceShapes && row.suitableFaceShapes.length">
                            <el-tag
                              v-for="f in row.suitableFaceShapes"
                              :key="f"
                              size="small"
                              style="margin-right: 4px"
                              >{{ getFaceShapeLabel(f) }}</el-tag
                            > </template
                          ><span v-else>-</span>
                        </td>
                        <td class="tech-label">功能</td>
                        <td class="tech-value">
                          <span v-if="row.hasBlueLightFilter" style="color: #409eff">防蓝光 </span>
                          <span v-if="row.hasPhotochromic" style="color: #67c23a">变色 </span>
                          <span v-if="row.hasPolarized" style="color: #e6a23c">偏光 </span>
                          <span v-if="row.uvProtection && row.uvProtection !== 'None'">{{ row.uvProtection }}</span>
                          <span
                            v-if="
                              !row.hasBlueLightFilter &&
                              !row.hasPhotochromic &&
                              !row.hasPolarized &&
                              (!row.uvProtection || row.uvProtection === 'None')
                            "
                            >-</span
                          >
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="skuCode" label="SKU 编码" width="170" />
            <el-table-column label="级别" width="100">
              <template #default="{ row }">
                <span
                  v-if="row.productTier || row.spu?.productTier"
                  :style="{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: getTierColor(row.productTier || row.spu?.productTier) + '18',
                    color: getTierColor(row.productTier || row.spu?.productTier),
                    fontSize: '12px',
                    fontWeight: '600',
                  }"
                >
                  <span
                    :style="{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: getTierColor(row.productTier || row.spu?.productTier),
                    }"
                  ></span>
                  {{ getTierName(row.productTier || row.spu?.productTier) }}
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="主图" width="80">
              <template #default="{ row }">
                <el-image
                  v-if="row.primaryImage"
                  :src="row.primaryImage.imageUrl"
                  fit="cover"
                  style="width: 40px; height: 40px; border-radius: 4px"
                />
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
            v-model:current-page="skuPage"
            v-model:page-size="skuPageSize"
            style="margin-top: 16px; justify-content: flex-end"
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
        <SkuImagePanel
          :sku-list-for-select="skuListForSelect"
          :sku-select-loading="skuSelectLoading"
          @refresh="loadSkusAll"
        />
      </el-tab-pane>

      <!-- 套装 -->
      <el-tab-pane label="套装管理" name="set">
        <div class="tab-content">
          <div class="toolbar">
            <el-button type="success" @click="openSetDialog()">新增套装</el-button>
            <el-button type="primary" :disabled="setSelection.length === 0" @click="batchEditSets()">编辑</el-button>
            <el-popconfirm
              title="确认批量删除所选套装？"
              :disabled="setSelection.length === 0"
              @confirm="batchDeleteSets"
            >
              <template #reference
                ><el-button type="danger" :disabled="setSelection.length === 0">删除</el-button></template
              >
            </el-popconfirm>
          </div>
          <el-table
            v-loading="setLoading"
            :data="setList"
            stripe
            @selection-change="setSelection = $event"
            @row-dblclick="openSetDialog"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column prop="setCode" label="编码" width="140" />
            <el-table-column prop="setName" label="名称" min-width="180" />
            <el-table-column label="SKU" width="50"
              ><template #default="{ row }">{{ row.skuList ? row.skuList.length : 0 }}</template></el-table-column
            >
            <el-table-column label="统一零售价" width="100"
              ><template #default="{ row }">¥{{ (Number(row.retailPrice) || 0).toFixed(2) }}</template></el-table-column
            >
            <el-table-column label="套装价" width="80"
              ><template #default="{ row }">¥{{ (Number(row.setPrice) || 0).toFixed(2) }}</template></el-table-column
            >
            <el-table-column label="折扣" width="60"
              ><template #default="{ row }">{{
                row.discountRate ? (row.discountRate * 10).toFixed(1) + '折' : '-'
              }}</template></el-table-column
            >
            <el-table-column prop="category?.categoryName" label="品类" width="80" />
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag
                  :type="row.status === 'on_sale' ? 'success' : row.status === 'draft' ? 'info' : 'danger'"
                  size="small"
                >
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
      :season-tags="seasonTagOptions"
      :gender-options="genderOptions"
      :status-options="statusOptions"
      :category-list="categoryList"
      @saved="onSpuDialogSaved"
    />

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
    <SetDialog
      :visible="setDialogVisible"
      :edit-row="setEditRow"
      :sku-list-for-select="skuListForSelect"
      :category-list="categoryList"
      @close="setDialogVisible = false"
      @saved="loadSets"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import SpuDialog from '@/components/SpuDialog.vue'
import SetDialog from '@/components/SetDialog.vue'
import SkuDialog from '@/components/SkuDialog.vue'
import SkuImagePanel from '@/components/SkuImagePanel.vue'
import SubSkuTab from '../products/SubSkuTab.vue'
import ProductFilters from './components/product/ProductFilters.vue'
import { useProducts } from './composables/useProducts'

const products = useProducts()

// Destructure all needed refs/reactives from composable
const {
  schemaData,
  genderOptions,
  statusOptions,
  tierList,
  genderTagTypes,
  genderLabels,
  getTierName,
  getTierColor,
  getDictName,
  getFaceShapeLabel,
  skinEffectTags,
  faceEffectTags,
  seasonTagOptions,
  spuList,
  spuSelection,
  spuListAll,
  spuLoading,
  spuPage,
  spuPageSize,
  spuTotal,
  spuSearch,
  spuDialogVisible,
  spuEditRow,
  loadSpus,
  openSpuDialog,
  onSpuDialogSaved,
  batchEditSpus,
  batchDeleteSpus,
  skuList,
  skuSelection,
  skuLoading,
  skuPage,
  skuPageSize,
  skuTotal,
  skuSearch,
  skuDialogVisible,
  skuEditRow,
  loadSkus,
  openSkuDialog,
  onSkuDialogSaved,
  batchEditSkus,
  batchDeleteSkus,
  setSelection,
  setList,
  setLoading,
  setDialogVisible,
  setEditRow,
  loadSets,
  openSetDialog,
  batchEditSets,
  batchDeleteSets,
  skuListForSelect,
  skuSelectLoading,
  loadSkusAll,
  structureStandardList,
  computedSeriesList,
  sceneTagOptions,
  categoryList,
  techDictsData,
  activeTab,
  init,
} = products

onMounted(() => {
  init()
})
</script>

<style scoped>
.products-page {
  padding: 16px;
}
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  align-items: center;
}
.tab-content {
  min-height: 300px;
}
.el-dialog .el-input,
.el-dialog .el-select,
.el-dialog .el-date-editor {
  width: 100% !important;
}
.el-dialog .el-input-number {
  width: 100% !important;
}
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
</style>
