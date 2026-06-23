<template>
  <div class="draft-pool-container">
    <!-- Header -->
    <div class="page-header">
      <h2>草稿池</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog = true">新建草稿</el-button>
        <el-button @click="fetchWaitlist">待审核 ({{ waitlist.draft }})</el-button>
      </div>
    </div>

    <!-- Tabs -->
    <el-tabs v-model="activeTab" @tab-click="onTabChange">
      <el-tab-pane label="草稿列表" name="drafts">
        <!-- Filters -->
        <el-form :inline="true" size="small" class="filter-bar">
          <el-form-item label="状态"><el-select v-model="filters.status" clearable placeholder="全部" @change="fetchDrafts" style="width:120px">
            <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value"/>
          </el-select></el-form-item>
          <el-form-item label="性别"><el-select v-model="filters.gender" clearable placeholder="全部" @change="fetchDrafts" style="width:100px">
            <el-option label="女款" value="female"/><el-option label="男款" value="male"/>
          </el-select></el-form-item>
          <el-form-item label="造型"><el-select v-model="filters.shapeCode" clearable placeholder="全部" @change="fetchDrafts" style="width:120px">
            <el-option v-for="s in dictLensShape" :key="s" :label="s" :value="s"/>
          </el-select></el-form-item>
          <el-form-item label="系列"><el-select v-model="filters.seriesCode" clearable placeholder="全部" @change="fetchDrafts" style="width:120px">
            <el-option v-for="s in dictLensSeries" :key="s" :label="s" :value="s"/>
          </el-select></el-form-item>
          <el-form-item label="来源"><el-select v-model="filters.source" clearable placeholder="全部" @change="fetchDrafts" style="width:100px">
            <el-option label="AI生成" value="ai"/><el-option label="手动" value="manual"/>
          </el-select></el-form-item>
          <el-form-item><el-button type="primary" size="small" @click="fetchDrafts">查询</el-button></el-form-item>
        </el-form>

        <!-- 批量操作栏 -->
        <div class="batch-actions" style="margin-bottom:8px;display:flex;align-items:center;gap:12px">
          <span style="color:#909399;font-size:13px">{{ selectedDrafts.length > 0 ? `已选 ${selectedDrafts.length} 项` : '勾选后可批量操作' }}</span>
          <el-button size="small" type="success" :disabled="!canApprove" @click="batchApprove">通过</el-button>
          <el-button size="small" type="warning" :disabled="!canReview" @click="batchPublish">发布</el-button>
          <el-button size="small" type="danger" :disabled="!canReject" @click="batchReject">驳回</el-button>
          <el-divider direction="vertical" />
          <el-button size="small" type="danger" plain :disabled="selectedDrafts.length === 0" @click="batchDelete">🗑 删除</el-button>
        </div>
        <el-table :data="draftList" v-loading="loading" stripe border size="small" @row-click="openDetail" @selection-change="onSelectionChange" ref="draftTable">
          <el-table-column type="selection" width="45" />
          <el-table-column prop="spuName" label="SPU名称" min-width="180"/>
          <el-table-column prop="shapeCode" label="造型" width="80">
            <template #default="{ row }">{{ shapeCnMap[row.shapeCode] || row.shapeCode }}</template>
          </el-table-column>
          <el-table-column prop="seriesCode" label="系列" width="80">
            <template #default="{ row }">{{ seriesCnMap[row.seriesCode] || row.seriesCode }}</template>
          </el-table-column>
          <el-table-column prop="gender" label="性别" width="60">
            <template #default="{ row }">{{ genderCnMap[row.gender] || row.gender }}</template>
          </el-table-column>
          <el-table-column prop="source" label="来源" width="70"/>
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><el-tag :type="statusTag(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="aestheticLevel" label="美学" width="80">
            <template #default="{ row }">
              <el-tag v-if="row.aestheticLevel==='pass'" type="success" size="small">✅{{ row.aestheticScore||'' }}</el-tag>
              <el-tag v-else-if="row.aestheticLevel==='warn'" type="warning" size="small">!</el-tag>
              <el-tag v-else-if="row.aestheticLevel==='block'" type="danger" size="small">×</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination v-if="total>0" :total="total" :page-size="20" layout="total,prev,pager,next" @current-change="(p: number) => {filters.page=p;fetchDrafts()}"/>
      </el-tab-pane>

      <el-tab-pane label="批次管理" name="batches">
        <el-button size="small" @click="showCreateBatch=true">新建批次</el-button>
        <el-table :data="batchList" stripe border size="small" class="mt-2">
          <el-table-column prop="batchName" label="批次名" min-width="150"/>
          <el-table-column prop="generationType" label="生成方式" width="100"/>
          <el-table-column prop="totalCount" label="总数" width="60"/>
          <el-table-column prop="approvedCount" label="通过" width="60"/>
          <el-table-column prop="publishedCount" label="发布" width="60"/>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}"><el-tag :type="row.status==='completed'?'success':'warning'" size="small">{{row.status}}</el-tag></template>
          </el-table-column>
          <el-table-column label="创建时间" width="160">
            <template #default="{row}">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{row}">
              <el-button v-if="row.status==='generating'" size="small" @click="finishBatch(row.batchId)">完成</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="发布记录" name="packages">
        <el-table :data="pkgList" stripe border size="small">
          <el-table-column prop="packageName" label="发布包" min-width="180"/>
          <el-table-column prop="draftCount" label="草稿数" width="80"/>
          <el-table-column prop="skuCount" label="SKU数" width="80"/>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}"><el-tag :type="pkgStatusTag(row.status)" size="small">{{row.status}}</el-tag></template>
          </el-table-column>
          <el-table-column prop="publishedBy" label="发布人" width="100"/>
          <el-table-column label="发布时间" width="160">
            <template #default="{row}">{{ formatTime(row.publishedAt) }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- Create Draft Dialog -->
    <el-dialog v-model="showCreateDialog" title="新建草稿 SPU" width="600px">
      <el-form :model="draftForm" label-width="120px" size="small">
        <el-form-item label="SPU名称" required><el-input v-model="draftForm.spuName"/></el-form-item>
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="性别" required><el-select v-model="draftForm.gender" style="width:100%">
            <el-option label="女款" value="female"/><el-option label="男款" value="male"/>
          </el-select></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="造型" required><el-select v-model="draftForm.shapeCode" style="width:100%">
            <el-option v-for="s in dictLensShape" :key="s" :label="s" :value="s"/>
          </el-select></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="系列" required><el-select v-model="draftForm.seriesCode" style="width:100%">
            <el-option v-for="s in dictLensSeries" :key="s" :label="s" :value="s"/>
          </el-select></el-form-item></el-col>
        </el-row>
        <el-form-item label="结构标准" required><el-input v-model="draftForm.structureStandardCode" placeholder="SL-001"/></el-form-item>
        <el-form-item label="SKU (JSON数组)"><el-input type="textarea" :rows="4" v-model="draftForm.skusJson" placeholder='[{"colorCode":"macaron_pink","skinToneEffect":"yellow_skin_whiten","faceShapeEffect":"round_face_slim"}]'/></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog=false">取消</el-button>
        <el-button type="primary" @click="submitDraft">创建</el-button>
      </template>
    </el-dialog>

    <!-- Create Batch Dialog -->
    <el-dialog v-model="showCreateBatch" title="新建批次" width="400px">
      <el-form :model="batchForm" label-width="100px">
        <el-form-item label="批次名称"><el-input v-model="batchForm.name"/></el-form-item>
        <el-form-item label="生成方式"><el-select v-model="batchForm.type">
          <el-option label="AI 生成" value="ai"/><el-option label="手动导入" value="manual"/>
        </el-select></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateBatch=false">取消</el-button>
        <el-button type="primary" @click="submitBatch">创建</el-button>
      </template>
    </el-dialog>

    <!-- Waitlist Dialog -->
    <el-dialog v-model="showWaitlist" title="待审核队列" width="700px">
      <span>草稿 {{ waitlist.draft }} 项 | 已审 {{ waitlist.reviewed }} 项</span>
      <el-table :data="draftList.filter(d=>d.status==='draft'||d.status==='reviewed')" stripe border size="small" class="mt-2">
        <el-table-column prop="spuName" label="名称"/><el-table-column prop="shapeCode" label="造型" width="70"/>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{row}">{{ statusLabel(row.status) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- Detail Drawer (可编辑) -->
    <el-drawer v-model="showDetail" title="草稿详情" size="600px">
      <template v-if="detailDraft">
        <el-form :model="editForm" label-width="100px" size="small">
          <el-form-item label="SPU名称">
            <el-input v-model="editForm.spuName" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input type="textarea" :rows="2" v-model="editForm.spuDescription" />
          </el-form-item>
          <el-row :gutter="12">
            <el-col :span="8">
              <el-form-item label="性别">
                <el-select v-model="editForm.gender" style="width:100%">
                  <el-option label="女款" value="female"/><el-option label="男款" value="male"/><el-option label="中性" value="unisex"/>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="造型">
                <el-select v-model="editForm.shapeCode" style="width:100%">
                  <el-option v-for="s in dictLensShape" :key="s" :label="s" :value="s"/>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="系列">
                <el-select v-model="editForm.seriesCode" style="width:100%">
                  <el-option v-for="s in dictLensSeries" :key="s" :label="s" :value="s"/>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="结构标准">
            <el-input v-model="editForm.structureStandardCode" />
          </el-form-item>
          <el-form-item label="展示名模板">
            <el-input v-model="editForm.displayNameTemplate" placeholder="如: {gender}{shape}-{series}" />
          </el-form-item>

          <el-divider content-position="left">SKU 列表 ({{ detailSkus.length }})</el-divider>
          <el-table :data="detailSkus" stripe border size="small">
            <el-table-column prop="colorCode" label="色彩" width="110">
              <template #default="{ $index }">
                <el-input v-model="detailSkus[$index].colorCode" size="small" />
              </template>
            </el-table-column>
            <el-table-column prop="colorName" label="色名" width="90">
              <template #default="{ $index }">
                <el-input v-model="detailSkus[$index].colorName" size="small" />
              </template>
            </el-table-column>
            <el-table-column prop="skinToneEffect" label="肤色效果" width="140">
              <template #default="{ $index }">
                <el-input v-model="detailSkus[$index].skinToneEffect" size="small" />
              </template>
            </el-table-column>
            <el-table-column prop="faceShapeEffect" label="脸型效果" width="140">
              <template #default="{ $index }">
                <el-input v-model="detailSkus[$index].faceShapeEffect" size="small" />
              </template>
            </el-table-column>
            <el-table-column prop="displayName" label="展示名" min-width="160">
              <template #default="{ $index }">
                <el-input v-model="detailSkus[$index].displayName" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">{{ row.skuStatus }}</template>
            </el-table-column>
          </el-table>
        </el-form>

        <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
          <el-button @click="showDetail=false">取消</el-button>
          <el-button type="primary" @click="saveDetail" :loading="saving">保存修改</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  queryDrafts, getDraftDetail, createDraftSpu, deleteDraft,
  reviewDraft as reviewDraftApi, publishDrafts, getWaitlistCount,
  getBatches, createBatch, completeBatch,
  getPackages, updateDraft,
} from '../api/draft-pool';

const activeTab = ref('drafts');
const loading = ref(false);
const draftList = ref<Record<string, unknown>[]>([]);
const total = ref(0);

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '已审', value: 'reviewed' },
  { label: '已发布', value: 'published' },
  { label: '已驳回', value: 'rejected' },
];
const filters = ref<Record<string, unknown>>({ page: 1, pageSize: 20 });
const waitlist = ref({ draft: 0, reviewed: 0 });
const showCreateDialog = ref(false);
const showCreateBatch = ref(false);
const showDetail = ref(false);
const showWaitlist = ref(false);

// 多选删除
const selectedDrafts = ref<Record<string, unknown>[]>([]);

function onSelectionChange(rows: Record<string, unknown>[]) {
  selectedDrafts.value = rows;
}

// ── 批量操作状态计算 ──
const canApprove = computed(() => selectedDrafts.value.length > 0 && selectedDrafts.value.every((d: Record<string, unknown>) => d.status === 'draft'))
const canReject = computed(() => selectedDrafts.value.length > 0 && selectedDrafts.value.every((d: Record<string, unknown>) => d.status === 'draft'))
const canReview = computed(() => selectedDrafts.value.length > 0 && selectedDrafts.value.every((d: Record<string, unknown>) => d.status === 'reviewed'))

async function batchApprove() {
  if (!canApprove.value) { ElMessage.warning('仅可对「草稿」状态的项执行通过'); return }
  try { await ElMessageBox.confirm(`确定通过选中的 ${selectedDrafts.value.length} 个草稿？`, '批量通过', { type: 'info' }) } catch { return }
  let ok = 0;
  for (const d of selectedDrafts.value) { try { await doReview(d, 'approve'); ok++ } catch { /* ignore */ } }
  ElMessage.success(`完成: ${ok}/${selectedDrafts.value.length}`)
  selectedDrafts.value = []; fetchDrafts();
}

async function batchPublish() {
  if (!canReview.value) { ElMessage.warning('仅可对「已审」状态的项执行发布'); return }
  try { await ElMessageBox.confirm(`确定发布选中的 ${selectedDrafts.value.length} 个草稿？`, '批量发布', { type: 'info' }) } catch { return }
  const ids = selectedDrafts.value.map(d => d.draftId as string);
  try { await publishDrafts({ draftIds: ids }); ElMessage.success(`已发布 ${ids.length} 项`); selectedDrafts.value = []; fetchDrafts(); }
  catch (e: unknown) { const err = e instanceof Error ? e.message : String(e); ElMessage.error('发布失败: ' + (err || '')) }
}

async function batchReject() {
  if (!canReject.value) { ElMessage.warning('仅可对「草稿」状态的项执行驳回'); return }
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', '批量驳回', { type: 'warning', confirmButtonText: '确认驳回', inputType: 'textarea' })
    let ok = 0;
    for (const d of selectedDrafts.value) {
      try { await doReview(d, 'reject', value); ok++ } catch { /* ignore */ }
    }
    ElMessage.success(`完成: ${ok}/${selectedDrafts.value.length}`)
    selectedDrafts.value = []; fetchDrafts();
  } catch { /* 用户取消 */ }
}

const detailDraft = ref<Record<string, unknown> | null>(null);
const detailSkus = ref<Record<string, unknown>[]>([]);
const editForm = ref<Record<string, unknown>>({});
const saving = ref(false);

const draftForm = ref<Record<string, unknown>>({ gender: 'female', shapeCode: '', seriesCode: '', structureStandardCode: 'SL-001', spuName: '', skusJson: '' });
const batchForm = ref<Record<string, unknown>>({ name: '', type: 'ai' });
const batchList = ref<Record<string, unknown>[]>([]);
const pkgList = ref<Record<string, unknown>[]>([]);

// Dicts
const dictLensShape = ref<string[]>(['RND','SQR','OVL','CAT','PLT','RCT','BRW','GEO','HSH','BTF']);
const dictLensSeries = ref<string[]>(['FSH','CLS','BUS','SPT','VNT']);
const shapeCnMap: Record<string,string> = { RND:'圆形', SQR:'方形', OVL:'椭圆', CAT:'猫眼', PLT:'飞行员', RCT:'矩形', BRW:'眉线', GEO:'几何', HSH:'透明', BTF:'蝴蝶' };
const seriesCnMap: Record<string,string> = { FSH:'时尚', CLS:'经典', BUS:'商务', SPT:'运动', VNT:'复古' };
const genderCnMap: Record<string,string> = { female:'女款', male:'男款', unisex:'通用', limited:'限量' };

function statusLabel(s: string) {
  const STATUS_LABEL_MAP: Record<string, string> = { draft:'草稿', reviewed:'已审', approved:'通过', published:'已发布', rejected:'已驳回' };
  return STATUS_LABEL_MAP[s] || s;
}
function statusTag(s: string) {
  const STATUS_TAG_MAP: Record<string, string> = { draft:'info', reviewed:'warning', approved:'success', published:'success', rejected:'danger' };
  return STATUS_TAG_MAP[s] || 'info';
}
function pkgStatusTag(s: string) {
  const PKG_STATUS_MAP: Record<string, string> = { processing:'warning', completed:'success', failed:'danger' };
  return PKG_STATUS_MAP[s] || 'info';
}
function formatTime(d: string) { return d ? new Date(d).toLocaleString('zh-CN') : ''; }

async function fetchDrafts() {
  loading.value = true;
  try {
    const r = await queryDrafts(filters.value as Parameters<typeof queryDrafts>[0]);
    draftList.value = r.items as unknown as Record<string, unknown>[];
    total.value = r.total as number;
  } catch (e: unknown) { const err = e instanceof Error ? e.message : String(e); ElMessage.error('加载失败: ' + (err||'')); }
  finally { loading.value = false; }
}
async function fetchWaitlist() { try { waitlist.value = await getWaitlistCount(); showWaitlist.value = true; } catch { /* ignore */ } }
async function fetchBatches() { try { batchList.value = await getBatches() as unknown as Record<string, unknown>[]; } catch { /* ignore */ } }
async function fetchPackages() { try { pkgList.value = await getPackages() as unknown as Record<string, unknown>[]; } catch { /* ignore */ } }

function onTabChange(tab: { props?: { name?: string } }) {
  if (tab.props?.name === 'batches') fetchBatches();
  if (tab.props?.name === 'packages') fetchPackages();
}

async function submitDraft() {
  try {
    let skus = [];
    if (draftForm.value.skusJson) skus = JSON.parse(draftForm.value.skusJson as string);
    await createDraftSpu({ ...(draftForm.value as unknown as Record<string, unknown>), skus });
    ElMessage.success('草稿创建成功');
    showCreateDialog.value = false;
    fetchDrafts();
  } catch (e: unknown) { const err = e instanceof Error ? e.message : String(e); ElMessage.error('创建失败: ' + (err||'')); }
}

async function submitBatch() {
  try {
    await createBatch(batchForm.value.name as string, batchForm.value.type as string);
    ElMessage.success('批次已创建');
    showCreateBatch.value = false;
    fetchBatches();
  } catch (e: unknown) { const err = e instanceof Error ? e.message : String(e); ElMessage.error((err||'')); }
}

async function finishBatch(id: string) {
  try { await completeBatch(id); ElMessage.success('已完成'); fetchBatches(); } catch { /* ignore */ }
}

async function doReview(row: Record<string, unknown>, action: string, reason?: string) {
  try {
    const payload = { action, rejectedReason: reason } as const;
    await reviewDraftApi(row.draftId as string, { ...payload, skuIds: undefined });
    ElMessage.success(statusLabel(row.status as string) + (action === 'reject' ? '→ 已驳回' : '→ 已审'));
    fetchDrafts();
  } catch (e: unknown) { const err = e instanceof Error ? e.message : String(e); ElMessage.error(err); }
}

// batchApprove / batchPublish / batchReject / batchDelete 在上面已定义

async function openDetail(row: Record<string, unknown>) {
  try {
    const r = await getDraftDetail(String(row.draftId ?? '')) as unknown as { draft: Record<string, unknown>; skus: Record<string, unknown>[] };
    detailDraft.value = r.draft;
    detailSkus.value = JSON.parse(JSON.stringify(r.skus || [])) as Record<string, unknown>[];
    editForm.value = {
      spuName: r.draft.spuName,
      spuDescription: r.draft.spuDescription || '',
      gender: r.draft.gender,
      shapeCode: r.draft.shapeCode,
      seriesCode: r.draft.seriesCode,
      structureStandardCode: r.draft.structureStandardCode,
      displayNameTemplate: r.draft.displayNameTemplate || '',
    };
    showDetail.value = true;
  } catch (e: unknown) { const err = e instanceof Error ? e.message : String(e);
    ElMessage.error('加载详情失败: ' + (err || ''));
  }
}

async function saveDetail() {
  if (!detailDraft.value) return;
  saving.value = true;

  const skus = detailSkus.value.map((s: Record<string, unknown>) => ({
    draftSkuId: s.draftSkuId,
    colorCode: s.colorCode,
    colorName: s.colorName || '',
    skinToneEffect: s.skinToneEffect || '',
    faceShapeEffect: s.faceShapeEffect || '',
    displayName: s.displayName || '',
  }));

  try {
    await updateDraft(detailDraft.value.draftId as string, {
      ...editForm.value,
      skus,
    });
    ElMessage.success('草稿已更新');
    showDetail.value = false;
    fetchDrafts();
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    ElMessage.error('保存失败: ' + err);
  } finally {
    saving.value = false;
  }
}

// ── 批量删除 ──
async function batchDelete() {
  if (selectedDrafts.value.length === 0) {
    ElMessage.warning('请先勾选要删除的草稿');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${selectedDrafts.value.length} 个草稿？此操作不可恢复。`,
      '批量删除确认',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
    );
  } catch {
    return; // 用户取消
  }

  let successCount = 0;
  let failCount = 0;
  for (const d of selectedDrafts.value) {
    try {
      await deleteDraft(d.draftId as string);
      successCount++;
    } catch {
      failCount++;
    }
  }
  ElMessage.success(`批量删除完成: ${successCount} 成功, ${failCount} 失败`);
  selectedDrafts.value = [];
  fetchDrafts();
}

onMounted(() => { fetchDrafts(); });
</script>

<style scoped>
.draft-pool-container { padding: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.filter-bar { margin-bottom: 12px; }
.header-actions { display: flex; gap: 8px; }
.mt-2 { margin-top: 10px; }
</style>
