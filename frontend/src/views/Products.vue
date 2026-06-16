<template>
  <div class="products-page">
    <el-tabs v-model="activeTab" type="card">
      <!-- SPU -->
      <el-tab-pane label="SPU 绠＄悊" name="spu">
        <div class="tab-content">
          <div class="toolbar">
            <el-input v-model="spuSearch.keyword" placeholder="鎼滅储 SPU 鍚嶇О/缂栫爜" clearable style="width: 240px" @keyup.enter="loadSpus" />
            <el-select v-model="spuSearch.gender" placeholder="鎬у埆" clearable style="width: 100px">
              <el-option v-for="opt in genderOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
            <el-select v-model="spuSearch.status" placeholder="鐘舵€? clearable style="width: 100px">
              <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
            <el-select v-model="spuSearch.productTier" placeholder="绾у埆" clearable style="width: 110px">
              <el-option v-for="t in tierList" :key="t.tier_code" :label="t.tier_name" :value="t.tier_code">
                <span>{{ t.tier_name }}</span>
                <span :style="{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: t.icon_color, marginLeft: '6px' }"></span>
              </el-option>
            </el-select>
            <el-button type="primary" @click="loadSpus">鎼滅储</el-button>
            <el-button type="success" @click="openSpuDialog()">鏂板 SPU</el-button>
            <el-button type="primary" :disabled="spuSelection.length===0" @click="batchEditSpus()">缂栬緫</el-button>
            <el-popconfirm title="纭鎵归噺鍒犻櫎鎵€閫塖PU锛? @confirm="batchDeleteSpus" :disabled="spuSelection.length===0">
              <template #reference><el-button type="danger" :disabled="spuSelection.length===0">鍒犻櫎</el-button></template>
            </el-popconfirm>
          </div>
          <el-table :data="spuList" v-loading="spuLoading" stripe @selection-change="spuSelection=$event" @row-dblclick="openSpuDialog">
            <el-table-column type="selection" width="50" />
            <el-table-column prop="spuCode" label="SPU 缂栫爜" width="160" />
            <el-table-column label="绾у埆" width="100">
              <template #default="{ row }">
                <span v-if="row.productTier" :style="{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: getTierColor(row.productTier) + '18', color: getTierColor(row.productTier), fontSize: '12px', fontWeight: '600' }">
                  <span :style="{ width: '6px', height: '6px', borderRadius: '50%', background: getTierColor(row.productTier) }"></span>
                  {{ getTierName(row.productTier) }}
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="spuName" label="鍚嶇О" min-width="180" />
            <el-table-column label="鍒嗙被" width="120">
              <template #default="{ row }">{{ row.category?.categoryName || '-' }}</template>
            </el-table-column>
            <el-table-column label="鎬у埆" width="80">
              <template #default="{ row }">
                <el-tag :type="{ female: 'danger', male: 'primary', unisex: 'info', limited: 'warning' }[row.gender] || 'info'" size="small">
                  {{ { female: '濂虫', male: '鐢锋', unisex: '閫氱敤', limited: '闄愰噺' }[row.gender] || row.gender || '-' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="鍦烘櫙" min-width="140">
              <template #default="{ row }">
                <template v-if="row.scene_tags && row.scene_tags.length">
                  <el-tag v-for="tag in row.scene_tags" :key="tag" size="small" style="margin-right: 4px">{{ tag }}</el-tag>
                </template>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="鐘舵€? width="80">
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
      <el-tab-pane label="SKU 绠＄悊" name="sku">
        <div class="tab-content">
          <div class="toolbar">
            <el-input v-model="skuSearch.keyword" placeholder="鎼滅储 SKU 鍚嶇О/缂栫爜" clearable style="width: 220px" @keyup.enter="loadSkus" />
            <el-select v-model="skuSearch.spuId" placeholder="鎸?SPU 绛涢€? clearable filterable style="width: 200px" @change="loadSkus">
              <el-option v-for="s in spuListAll" :key="s.spuId" :label="`${s.spuCode} - ${s.spuName}`" :value="s.spuId" />
            </el-select>
            <el-select v-model="skuSearch.skinToneEffect" placeholder="鑲よ壊鏁堟灉" clearable filterable style="width: 160px" @change="loadSkus">
              <el-option v-for="t in skinEffectTags" :key="'skin-'+t.effectCode" :label="t.effectName" :value="t.effectName" />
            </el-select>
            <el-select v-model="skuSearch.faceShapeEffect" placeholder="鑴稿瀷鏁堟灉" clearable filterable style="width: 160px" @change="loadSkus">
              <el-option v-for="t in faceEffectTags" :key="'face-'+t.effectCode" :label="t.effectName" :value="t.effectName" />
            </el-select>
            <el-button type="primary" @click="loadSkus">鎼滅储</el-button>
            <el-button type="success" @click="openSkuDialog()">鏂板 SKU</el-button>
            <el-button type="primary" :disabled="skuSelection.length===0" @click="batchEditSkus()">缂栬緫</el-button>
            <el-popconfirm title="纭鎵归噺鍒犻櫎鎵€閫塖KU锛? @confirm="batchDeleteSkus" :disabled="skuSelection.length===0">
              <template #reference><el-button type="danger" :disabled="skuSelection.length===0">鍒犻櫎</el-button></template>
            </el-popconfirm>
          </div>
          <el-table :data="skuList" v-loading="skuLoading" stripe row-key="skuId" @selection-change="skuSelection=$event" @row-dblclick="openSkuDialog">
            <el-table-column type="selection" width="50" />
            <el-table-column type="expand">
              <template #default="{ row }">
                <div class="tech-spec-row" style="padding: 12px 24px; background: #fafafa">
                  <table class="tech-table">
                    <tbody>
                    <tr><td class="tech-label">灏哄鏍囨敞</td><td class="tech-value">{{ [row.lensWidth, row.bridgeWidth, row.templeLength].filter(v => v).join('鈻?) || '-' }}</td><td class="tech-label">闀滄鏉愯川</td><td class="tech-value">{{ getDictName('frameMaterials', row.frameMaterial) }}</td></tr>
                    <tr><td class="tech-label">闀滄绫诲瀷</td><td class="tech-value">{{ getDictName('frameTypes', row.frameType) }}</td><td class="tech-label">閲嶉噺</td><td class="tech-value">{{ row.weightG != null ? row.weightG + 'g' : '-' }}</td></tr>
                    <tr><td class="tech-label">榧绘墭绫诲瀷</td><td class="tech-value">{{ getDictName('nosePads', row.nosePadType) }}</td><td class="tech-label">閾伴摼绫诲瀷</td><td class="tech-value">{{ getDictName('hinges', row.hingeType) }}</td></tr>
                    <tr><td class="tech-label">闀滄楂樺害</td><td class="tech-value">{{ row.frameHeight != null ? row.frameHeight + 'mm' : '-' }}</td><td class="tech-label">琛ㄩ潰澶勭悊</td><td class="tech-value">{{ getDictName('surfaceTreatments', row.surfaceTreatment) }}</td></tr>
                    <tr><td class="tech-label">閫傚悎鑴稿瀷</td><td class="tech-value">
                      <template v-if="row.suitableFaceShapes && row.suitableFaceShapes.length">
                        <el-tag v-for="f in row.suitableFaceShapes" :key="f" size="small" style="margin-right: 4px">{{ getFaceShapeLabel(f) }}</el-tag>
                      </template><span v-else>-</span>
                    </td><td class="tech-label">鍔熻兘</td><td class="tech-value">
                      <span v-if="row.hasBlueLightFilter" style="color: #409eff">闃茶摑鍏?</span>
                      <span v-if="row.hasPhotochromic" style="color: #67c23a">鍙樿壊 </span>
                      <span v-if="row.hasPolarized" style="color: #e6a23c">鍋忓厜 </span>
                      <span v-if="row.uvProtection && row.uvProtection !== 'None'">{{ row.uvProtection }}</span>
                      <span v-if="!row.hasBlueLightFilter && !row.hasPhotochromic && !row.hasPolarized && (!row.uvProtection || row.uvProtection === 'None')">-</span>
                    </td></tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="skuCode" label="SKU 缂栫爜" width="170" />
            <el-table-column label="绾у埆" width="100">
              <template #default="{ row }">
                <span v-if="row.productTier || row.spu?.productTier" :style="{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: getTierColor(row.productTier || row.spu?.productTier) + '18', color: getTierColor(row.productTier || row.spu?.productTier), fontSize: '12px', fontWeight: '600' }">
                  <span :style="{ width: '6px', height: '6px', borderRadius: '50%', background: getTierColor(row.productTier || row.spu?.productTier) }"></span>
                  {{ getTierName(row.productTier || row.spu?.productTier) }}
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="涓诲浘" width="80">
              <template #default="{ row }">
                <el-image v-if="row.primaryImage" :src="row.primaryImage.imageUrl" fit="cover" style="width: 40px; height: 40px; border-radius: 4px" />
              </template>
            </el-table-column>
            <el-table-column prop="skuName" label="鍚嶇О" min-width="120" />
            <el-table-column label="鍏宠仈 SPU" width="140">
              <template #default="{ row }">{{ row.spu?.spuCode || '-' }}</template>
            </el-table-column>
            <el-table-column prop="skuBarcode" label="鍐呴儴鏉＄爜" min-width="200" show-overflow-tooltip />
            <el-table-column prop="ean13" label="EAN-13" width="130" />
            <el-table-column prop="retailPrice" label="缁熶竴闆跺敭浠? width="100" />
            <el-table-column prop="stockQuantity" label="搴撳瓨" width="80" />
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

      <!-- SKU 鍥剧墖 鈫?P1-3c 鐙珛缁勪欢 -->
      <el-tab-pane label="SKU 鍥剧墖" name="sku-image">
        <SkuImagePanel
          :sku-list-for-select="skuListForSelect"
          :sku-select-loading="skuSelectLoading"
          @refresh="loadSkusAll"
        />
      </el-tab-pane>
<!-- 濂楄 -->
      <el-tab-pane label="濂楄绠＄悊" name="set">
        <div class="tab-content">
          <div class="toolbar">
            <el-button type="success" @click="openSetDialog()">鏂板濂楄</el-button>
            <el-button type="primary" :disabled="setSelection.length===0" @click="batchEditSets()">缂栬緫</el-button>
            <el-popconfirm title="纭鎵归噺鍒犻櫎鎵€閫夊瑁咃紵" @confirm="batchDeleteSets" :disabled="setSelection.length===0">
              <template #reference><el-button type="danger" :disabled="setSelection.length===0">鍒犻櫎</el-button></template>
            </el-popconfirm>
          </div>
          <el-table :data="setList" v-loading="setLoading" stripe @selection-change="setSelection=$event" @row-dblclick="openSetDialog">
            <el-table-column type="selection" width="50" />
            <el-table-column prop="setCode" label="缂栫爜" width="140" />
            <el-table-column prop="setName" label="鍚嶇О" min-width="180" />
            <el-table-column label="SKU" width="50"><template #default="{ row }">{{ row.skuList ? row.skuList.length : 0 }}</template></el-table-column>
            <el-table-column label="缁熶竴闆跺敭浠? width="100"><template #default="{ row }">楼{{ (Number(row.retailPrice)||0).toFixed(2) }}</template></el-table-column>
            <el-table-column label="濂楄浠? width="80"><template #default="{ row }">楼{{ (Number(row.setPrice)||0).toFixed(2) }}</template></el-table-column>
            <el-table-column label="鎶樻墸" width="60"><template #default="{ row }">{{ row.discountRate ? (row.discountRate*10).toFixed(1)+"鎶? : "-" }}</template></el-table-column>
            <el-table-column prop="category?.categoryName" label="鍝佺被" width="80" />
            <el-table-column label="鐘舵€? width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'on_sale' ? 'success' : row.status === 'draft' ? 'info' : 'danger'" size="small">
                  {{ row.status === 'on_sale' ? '鍦ㄥ敭' : row.status === 'off_sale' ? '涓嬫灦' : '鑽夌' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- S-SKU 鍓搧绠＄悊 -->
      <el-tab-pane label="S-SKU 鍓搧" name="sub-sku">
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
    <!-- Set Dialog 鈫?P1-3c 鐙珛缁勪欢 -->
    <SetDialog
      :visible="setDialogVisible"
      :edit-row="setEditRow"
      :sku-list-for-select="skuListForSelect"
      :category-list="categoryList"
      @close="setDialogVisible = false"
      @saved="loadSets"
    />
    <!-- 鎵归噺涓婁紶 Dialog -->
    <el-dialog v-model="batchDialogVisible" title="鎵归噺涓婁紶鍥剧墖" width="640px">
      <el-tabs v-model="batchTab">
        <!-- Tab 1: URL 鎵归噺 -->
        <el-tab-pane label="URL 杈撳叆" name="url">
          <el-alert title="姣忚涓€涓浘鐗?URL锛屾牸寮忥細URL | 绫诲瀷 | 鎺掑簭 | 涓诲浘(Y/N) | 鏇夸唬鏂囨湰" type="info" :closable="false" style="margin-bottom: 12px" />
          <el-input v-model="batchText" type="textarea" :rows="10" placeholder="绀轰緥锛?
https://cdn.example.com/img1.jpg | main | 0 | Y | 椹崱榫欑矇涓诲浘
https://cdn.example.com/img2.jpg | gallery | 1 | N | 渚ч潰灞曠ず" />
          <div class="batch-hint">
            <p>绫诲瀷鍙€夛細main / gallery / detail / lifestyle / 360view / website_banner</p>
          </div>
        </el-tab-pane>
        <!-- Tab 2: 鏈湴鏂囦欢鎵归噺涓婁紶 -->
        <el-tab-pane label="鏈湴涓婁紶" name="local">
          <input type="file" ref="batchFileInput" accept="image/*" multiple style="display: none" @change="onBatchFileSelect" />
          <div style="margin-bottom: 12px">
            <el-button @click="triggerBatchFileSelect">閫夋嫨澶氬紶鍥剧墖</el-button>
            <span v-if="batchUploading" style="color: #409eff; margin-left: 12px">涓婁紶涓?.. {{ batchUploadedCount }}/{{ batchFileList.length }}</span>
            <span v-else-if="batchUploadedCount > 0" style="color: #67c23a; margin-left: 12px">宸蹭笂浼?{{ batchUploadedCount }} 寮?/span>
          </div>
          <div v-if="batchFileList.length > 0" class="batch-file-list">
            <div v-for="(f, i) in batchFileList" :key="i" class="batch-file-item">
              <span>{{ i + 1 }}. {{ f.name }}</span>
              <el-tag v-if="f.status === 'uploading'" type="warning" size="small">涓婁紶涓?/el-tag>
              <el-tag v-else-if="f.status === 'success'" type="success" size="small">鎴愬姛</el-tag>
              <el-tag v-else-if="f.status === 'error'" type="danger" size="small">澶辫触</el-tag>
            </div>
          </div>
          <div class="batch-hint">
            <p>鉁?涓婁紶鍚庡皢鑷姩鍒涘缓鍥鹃泦锛坓allery锛夌被鍨嬪浘鐗囷紝鍙湪琛ㄦ牸涓皟鏁撮『搴忓拰绫诲瀷</p>
          </div>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="batchDialogVisible = false">鍙栨秷</el-button>
        <el-button v-if="batchTab === 'url'" type="primary" @click="handleBatchUpload">馃摛 寮€濮嬩笂浼?/el-button>
        <el-button v-if="batchTab === 'local' && batchFileList.length > 0 && !batchUploading" type="primary" @click="startBatchFileUpload">馃摛 寮€濮嬩笂浼?({{ batchFileList.length }} 寮?</el-button>
      </template>
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
import SpuDialog from '@/components/SpuDialog.vue'
import SetDialog from '@/components/SetDialog.vue';
import SkuDialog from '@/components/SkuDialog.vue';
import SubSkuTab from './products/SubSkuTab.vue';

// 浜у搧绾у埆鏄犲皠
const TIER_MAP: Record<string, { name: string; color: string }> = {
  color: { name: '鑹插僵绾?, color: '#4CAF50' },
  style: { name: '椋庢牸绾?, color: '#2196F3' },
  texture: { name: '璐ㄦ劅绾?, color: '#FF9800' },
  'light-luxury': { name: '杞诲ア绾?, color: '#E91E63' },
  smart: { name: '鏅鸿兘绾?, color: '#9C27B0' },
  luxury: { name: '濂㈠崕绾?, color: '#1a1a1a' },
};
function getTierName(code: string): string {
  return activeTierMap.value[code]?.name || code || '-';
}
function getTierColor(code: string): string {
  return activeTierMap.value[code]?.color || '#999';
}
// ===== AI-BOS V2.0: Schema 椹卞姩鏁版嵁 =====
const schemaData = ref<IndustrySchema | null>(null);
const schemaLoading = ref(false);
const loadSchema = async () => { try { const [fullSchema] = await Promise.all([getSchema("eyewear")]); schemaData.value = fullSchema; } catch (e) { console.warn("[AI-BOS] Schema 鍔犺浇澶辫触", e); } finally { schemaLoading.value = false; } };
const schemaConfig = computed(() => schemaData.value?.config);
const sceneTagOptions = computed(() => schemaConfig.value?.sceneTags || ["閫氬嫟","鑱屽満","绾︿細","鎷嶇収","杩愬姩","鏃呰","浼戦棽","娲惧"]);
const genderOptions = computed(() => schemaConfig.value?.genderOptions || [{ value:"female",label:"濂虫"},{ value:"male",label:"鐢锋"},{ value:"unisex",label:"涓€?},{ value:"limited",label:"闄愰噺" }]);
const statusOptions = computed(() => schemaConfig.value?.statusOptions || [{ value:"on_sale",label:"鍦ㄥ敭"},{ value:"draft",label:"鑽夌"},{ value:"off_sale",label:"涓嬫灦" }]);
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

// ===== 瀛楀吀涓枃鏄犲皠 =====
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
    round: '鍦嗚劯', oval: '妞渾鑴?, square: '鏂硅劯',
    diamond: '鑿卞舰鑴?, heart: '蹇冨舰鑴?, oblong: '闀胯劯',
  };
  return map[code] || code;
}

const activeTab = ref('spu');

// ===== 浜у搧绾у埆瀛楀吀 =====
const tierList = ref<any[]>([]);
const loadTiers = async () => {
  try {
    const res: any = await getTierPricings();
    const raw = res.data || res.items || res || [];
    // 瑙勮寖鍖栦负妯℃澘鎵€闇€鐨?snake_case 鏍煎紡
    tierList.value = raw.map((t: any) => ({
      tier_code: t.tierCode || t.tier_code,
      tier_name: t.tierName || t.tier_name,
      icon_color: TIER_MAP[t.tierCode || t.tier_code]?.color || '#999',
      ...t,
    }));
  }
  catch (e: unknown) { console.warn('Failed to load tiers', e); }
};

// ===== Phase 8B: 鎶€鏈弬鏁板瓧鍏?=====
const frameMaterials = ref<any[]>([]);
const frameTypes = ref<any[]>([]);
const nosePads = ref<any[]>([]);
const hinges = ref<any[]>([]);
const surfaceTreatments = ref<any[]>([]);
const faceShapeOptions = [
  { label: '鍦嗚劯', value: 'round' },
  { label: '妞渾鑴?, value: 'oval' },
  { label: '鏂硅劯', value: 'square' },
  { label: '鑿卞舰鑴?, value: 'diamond' },
  { label: '蹇冨舰鑴?, value: 'heart' },
  { label: '闀胯劯', value: 'oblong' },
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
const spuListAll = ref<any[]>([]);  // 鍏ㄩ噺 SPU 鍒楄〃锛堜笅鎷夋鐢紝涓嶅垎椤碉級
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
  } catch (e: unknown) { ElMessage.error((e as any)?.message || '鍔犺浇澶辫触'); }
  finally { spuLoading.value = false; }
};
// 鍏ㄩ噺鍔犺浇 SPU锛堜笅鎷夋鐢紝涓嶄紶鍒嗛〉鍙傛暟锛?
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
const batchEditSpus = () => { if(spuSelection.value.length===1) openSpuDialog(spuSelection.value[0]); else if(spuSelection.value.length>1) ElMessage.warning('鏆備粎鏀寔鍗曟潯缂栬緫'); };
const batchDeleteSpus = async () => { try { for(const r of spuSelection.value) await deleteSpu(r.spuId); ElMessage.success(spuSelection.value.length+' 鏉″凡鍒犻櫎'); spuSelection.value=[]; loadSpus(); } catch { ElMessage.error('鍒犻櫎澶辫触'); } };
const handleDeleteSpu = async (id: string) => {
  try { await deleteSpu(id); ElMessage.success('宸插垹闄?); loadSpus(); } catch (e: unknown) { ElMessage.error((e as any)?.message || '鍒犻櫎澶辫触'); }
};

// ===== SKU =====
const skuList = ref<any[]>([]);
const skuSelection = ref<any[]>([]);
const skuLoading = ref(false);
const skuPage = ref(1);
const skuPageSize = ref(20);
const skuTotal = ref(0);
const skuSearch = reactive({ keyword: '', spuId: '', skinToneEffect: '', faceShapeEffect: '' });
const skuDialogVisible = ref(false);// suitableFaceShapes 鐢ㄧ嫭绔?ref锛堥伩鍏?reactive 宓屽鏁扮粍鍝嶅簲寮忔柇瑁傦級

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
  } catch (e: unknown) { ElMessage.error((e as any)?.message || '鍔犺浇澶辫触'); }
  finally { skuLoading.value = false; }
};
const openSkuDialog = (row?: any) => {
  skuEditRow.value = row || null;
  skuDialogVisible.value = true;
};

const batchEditSkus = () => { if(skuSelection.value.length===1) openSkuDialog(skuSelection.value[0]); else if(skuSelection.value.length>1) ElMessage.warning('鏆備粎鏀寔鍗曟潯缂栬緫'); };
const batchDeleteSkus = async () => { try { for(const r of skuSelection.value) await deleteSku(r.skuId); ElMessage.success(skuSelection.value.length+' 鏉″凡鍒犻櫎'); skuSelection.value=[]; loadSkus(); } catch { ElMessage.error('鍒犻櫎澶辫触'); } };
const handleDeleteSku = async (id: string) => {
  try {
    await deleteSku(id)
    ElMessage.success('SKU 宸插垹闄?)
    loadSkus()
    skuEditRow.value = null
  } catch (e: unknown) {
    ElMessage.error((e as any)?.message || '鍒犻櫎澶辫触')
  }
};

// ===== 缁撴瀯鏍囧噯 =====
const structureStandardList = ref<any[]>([]);
const loadStructureStandards = async () => {
  try {
    const res = await getStructureList({ page: 1, pageSize: 500 })
    // request.ts 鎷︽埅鍣ㄥ凡缁忚В鍖?
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

// ===== Category (渚?SPU/SKU/Set 琛ㄥ崟涓嬫媺閫夋嫨) =====
const categoryList = ref<any[]>([]);
const loadCategoryList = async () => {
  try { categoryList.value = await getCategoriesFlat(); }
  catch { categoryList.value = []; }
};


// ===== Set (P1-3c: 寮圭獥閫昏緫宸茶縼绉昏嚦 SetDialog.vue) =====
const setList = ref<any[]>([]);
const setLoading = ref(false);
const setDialogVisible = ref(false);
const setEditRow = ref<Record<string, unknown> | null>(null);

const loadSets = async () => {
  setLoading.value = true;
  try { const res = await getSets({}); setList.value = Array.isArray(res.items) ? res.items : (res.data?.items || []); }
  catch { setList.value = []; }
  finally { setLoading.value = false; }
};

const openSetDialog = (row?: any) => {
  setEditRow.value = row || null;
  setDialogVisible.value = true;
};

const batchEditSets = () => { if (setSelection.value.length === 1) openSetDialog(setSelection.value[0]); else ElMessage.warning("璇峰彧鍕鹃€変竴涓瑁呰繘琛岀紪杈?); };
const batchDeleteSets = async () => { try { for (const r of setSelection.value) await deleteSet(r.setId); ElMessage.success("宸插垹闄?); setSelection.value=[]; loadSets(); } catch(e:unknown){ ElMessage.error((e as any)?.message || "鎵归噺鍒犻櫎澶辫触"); } };
const handleDeleteSet = async (id: string) => {
  try { await deleteSet(id); ElMessage.success("宸插垹闄?); loadSets(); } catch (e: unknown) { ElMessage.error((e as any)?.message || "鍒犻櫎澶辫触"); }
};


// ===== SKU 鍒楄〃锛堜緵 SkuImagePanel + SetDialog 浣跨敤锛?====
const skuListForSelect = ref<any[]>([]);
const skuSelectLoading = ref(false);

// 鍏ㄩ噺鍔犺浇 SKU锛堝瑁呭閫?鍥剧墖涓嬫媺妗嗙敤锛?
const loadSkusAll = async () => {
  try {
    const res = await getSkus({ pageSize: 9999 });
    skuListForSelect.value = Array.isArray(res) ? res : (res as any)?.items || [];
  } catch { /* ignore */ }
}

const TAB_LOADERS: Record<string, (() => void)[]> = {
  spu: [loadSpus],
  sku: [loadSkus],
  set: [loadSets],
  'sku-image': [loadSkusAll],
};

// 棣栨鍙姞杞藉叏灞€鍩虹瀛楀吀锛堟墍鏈?Tab 鍏辩敤锛夛紝鍏蜂綋鏁版嵁鎸夐渶鍔犺浇
onMounted(() => {
  loadSchema();
  loadTiers();
  loadTechDicts();
  loadStructureStandards();
  loadEffectTags();
  loadCategoryList();
  // 鍏ㄩ噺鍔犺浇 SPU/SKU 鍒楄〃锛堜笅鎷夋/澶氶€夌敤锛屼笉鍒嗛〉锛?
  loadSpusAll();
  loadSkusAll();
  // 榛樿婵€娲?spu tab锛屽姞杞藉叾鏁版嵁
  loadSpus();
});

// Tab 鍒囨崲鏃跺彧鍒锋柊褰撳墠 Tab 鐨勬暟鎹?
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

/* 鍥剧墖绫诲瀷绛涢€?*/
.image-type-tabs { margin-bottom: 12px; }

/* 淇濆瓨鎺掑簭鏍?*/
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

/* 鎵归噺涓婁紶鎻愮ず */
.batch-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}

/* 涓婁紶棰勮 */
.upload-preview {
  text-align: center;
  padding: 8px;
}
.upload-placeholder {
  text-align: center;
  padding: 20px;
}

/* 鎵归噺鏂囦欢鍒楄〃 */
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

/* 杈撳叆妗嗗搴︿慨澶?*/
.el-dialog .el-input,
.el-dialog .el-select,
.el-dialog .el-date-editor { width: 100% !important; }
.el-dialog .el-input-number { width: 100% !important; }

/* 宸查€?SKU 鍒楄〃鏄庣粏 */
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

/* 鏉＄爜杈撳叆妗嗗搴﹂€傞厤 */
.w-barcode :deep(.el-input) { max-width: 520px; }

/* SKU 灞曞紑琛屾妧鏈鏍艰〃 */
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

/* 鍥剧墖棰勮鍏ㄥ睆灞?*/
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
