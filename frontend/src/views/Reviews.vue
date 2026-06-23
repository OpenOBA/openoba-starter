<template>
  <div class="reviews-page">
    <div class="toolbar">
      <el-input v-model="filters.keyword" placeholder="搜索评价内容/客户名" clearable style="width: 200px" @keyup.enter="loadReviews" />
      <!-- ✅ F3-6: 状态筛选器改为字典动态渲染 -->
      <el-select v-model="filters.status" placeholder="状态" clearable style="width: 120px" @change="loadReviews">
        <el-option v-for="d in reviewStatusItems" :key="d.code" :label="d.name" :value="d.code" />
      </el-select>
      <el-select v-model="filters.minScore" placeholder="最低评分" clearable style="width: 120px" @change="loadReviews">
        <el-option label="1星以上" :value="1" />
        <el-option label="⭐2星以上" :value="2" />
        <el-option label="⭐⭐3星以上" :value="3" />
        <el-option label="⭐⭐⭐4星以上" :value="4" />
        <el-option label="⭐⭐⭐⭐5星" :value="5" />
      </el-select>
      <el-button type="primary" @click="loadReviews">搜索</el-button>
      <el-button type="info" @click="loadReviews">刷新</el-button>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" style="margin-bottom: 16px">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">待审核</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.approved }}</div>
          <div class="stat-label">已通过</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.avgScore }}</div>
          <div class="stat-label">平均评分</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.todayCount }}</div>
          <div class="stat-label">今日新增</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 评价列表 -->
    <el-table :data="reviewList" v-loading="loading" stripe>
      <el-table-column label="评分" width="100">
        <template #default="{ row }">
          <div class="score-cell">
            <span class="score-num" :style="{ color: row.overallScore >= 4 ? '#67c23a' : row.overallScore >= 3 ? '#e6a23c' : '#f56c6c' }">
              {{ row.overallScore }}
            </span>
            <span class="score-stars">{{ '⭐'.repeat(row.overallScore) }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="customerName" label="客户" width="120" />
      <el-table-column label="内容" min-width="250" show-overflow-tooltip>
        <template #default="{ row }">
          <span>{{ row.content || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="标签" width="200">
        <template #default="{ row }">
          <el-tag v-for="tag in (row.tags || [])" :key="tag" size="small" style="margin: 2px">{{ tag }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="图片" width="80">
        <template #default="{ row }">
          <span v-if="row.images?.length">{{ row.images.length }} 张</span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="维度评分" width="160">
        <template #default="{ row }">
          <div class="dim-scores">
            <span v-if="row.qualityScore">质 {{ row.qualityScore }}</span>
            <span v-if="row.comfortScore">舒 {{ row.comfortScore }}</span>
            <span v-if="row.styleScore">型 {{ row.styleScore }}</span>
            <span v-if="row.valueScore">值 {{ row.valueScore }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="时间" width="160" />
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetailDialog(row)">详情</el-button>
          <el-button v-if="row.status === REVIEW_STATUS.pending" link type="success" @click="handleApprove(row)">通过</el-button>
          <el-button v-if="row.status === REVIEW_STATUS.pending" link type="warning" @click="handleReject(row)">拒绝</el-button>
          <el-button link type="info" @click="openReplyDialog(row)">回复</el-button>
          <el-popconfirm title="确认删除？" @confirm="handleDelete(row.reviewId)">
            <template #reference><el-button link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > 0"
      :current-page="page"
      :page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      style="margin-top: 16px; justify-content: flex-end"
      @current-change="onPageChange"
    />

    <!-- 详情 Dialog -->
    <el-dialog v-model="detailVisible" title="评价详情" width="600px">
      <div v-if="currentReview" class="review-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="客户">{{ currentReview.customerName }}</el-descriptions-item>
          <el-descriptions-item label="总评分">
            <span :style="{ color: currentReview.overallScore >= 4 ? '#67c23a' : '#f56c6c' }">{{ currentReview.overallScore }} / 5</span>
          </el-descriptions-item>
          <el-descriptions-item label="质量分">{{ currentReview.qualityScore || '-' }}</el-descriptions-item>
          <el-descriptions-item label="舒适分">{{ currentReview.comfortScore || '-' }}</el-descriptions-item>
          <el-descriptions-item label="风格分">{{ currentReview.styleScore || '-' }}</el-descriptions-item>
          <el-descriptions-item label="价值分">{{ currentReview.valueScore || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态"><el-tag :type="statusType(currentReview.status)" size="small">{{ statusLabel(currentReview.status) }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="时间">{{ currentReview.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="内容" :span="2">{{ currentReview.content || '-' }}</el-descriptions-item>
          <el-descriptions-item label="标签" :span="2">
            <el-tag v-for="tag in (currentReview.tags || [])" :key="tag" size="small" style="margin: 2px">{{ tag }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentReview.replyContent" label="商家回复" :span="2">
            <div class="reply-box">
              <div>{{ currentReview.replyContent }}</div>
              <div class="reply-time" v-if="currentReview.replyAt">{{ currentReview.replyAt }}</div>
            </div>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- 回复 Dialog -->
    <el-dialog v-model="replyVisible" title="回复评价" width="500px">
      <el-form label-width="80px">
        <el-form-item label="回复内容">
          <el-input v-model="replyForm.content" type="textarea" :rows="4" placeholder="请输入回复内容..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="replyVisible = false">取消</el-button>
        <el-button type="primary" @click="handleReply">发送回复</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { getReviews, reviewAction, replyReview, deleteReview } from '@/api/review';
import { useDict } from '@/composables/useDict';

const reviewStatusDict = useDict('dict_review_status');
const reviewStatusItems = computed(() => reviewStatusDict.items.value);
const REVIEW_STATUS = { pending: 'pending', approved: 'approved', rejected: 'rejected' } as const;

const reviewList = ref<Record<string, unknown>[]>([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const filters = reactive({ keyword: '', status: '', minScore: null });

const stats = reactive({ pending: 0, approved: 0, avgScore: '-', todayCount: 0 });

const loadReviews = async () => {
  loading.value = true;
  try {
    const res = await getReviews({ ...filters, page: page.value, pageSize } as Record<string, string | number | null | undefined>);
    // request.ts 拦截器已经解包
    if (Array.isArray(res)) {
      reviewList.value = res
      total.value = res.length
    } else if (res && typeof res === 'object') {
      reviewList.value = Array.isArray(res.items) ? res.items : []
      total.value = res.total || 0
    } else {
      reviewList.value = []
      total.value = 0
    }
    updateStats();
  } catch (e: unknown) { const err = e instanceof Error ? e.message : String(e); ElMessage.error(err); }
  finally { loading.value = false; }
};

const updateStats = () => {
  stats.pending = reviewList.value.filter((r: Record<string, unknown>) => r.status === 'pending').length;
  stats.approved = reviewList.value.filter((r: Record<string, unknown>) => r.status === 'approved').length;
  const approved = reviewList.value.filter((r: Record<string, unknown>) => r.status === 'approved' && r.overallScore);
  stats.avgScore = approved.length > 0 ? (approved.reduce((s: number, r: Record<string, unknown>) => s + (r.overallScore as number), 0) / approved.length).toFixed(1) : '-';
  const today = new Date().toISOString().slice(0, 10);
  stats.todayCount = reviewList.value.filter((r: Record<string, unknown>) => String(r.createdAt ?? '').startsWith(today)).length;
};

const onPageChange = (p: number) => { page.value = p; loadReviews(); };

const statusType = (s: string) => ({ pending: 'warning', approved: 'success', rejected: 'danger' }[s] || '');
// ✅ F2-9: 评价状态中文 fallback 映射 — 优先字典，fallback 本地中文
const statusLabel = (s: string) => reviewStatusDict.labels.value[s] || { pending: '待审核', approved: '已通过', rejected: '已拒绝' }[s] || s;

// 详情
const detailVisible = ref(false);
const currentReview = ref<Record<string, unknown> | null>(null);
const openDetailDialog = (row: Record<string, unknown>) => { currentReview.value = row; detailVisible.value = true; };

// 通过/拒绝
const handleApprove = async (row: Record<string, unknown>) => {
  try { await reviewAction(String(row.reviewId ?? ''), { action: 'approve' }); ElMessage.success('已通过'); loadReviews(); }
  catch (e: unknown) { const err = e instanceof Error ? e.message : String(e); ElMessage.error(err); }
};
const handleReject = async (row: Record<string, unknown>) => {
  try { await reviewAction(String(row.reviewId ?? ''), { action: 'reject' }); ElMessage.success('已拒绝'); loadReviews(); }
  catch (e: unknown) { const err = e instanceof Error ? e.message : String(e); ElMessage.error(err); }
};

// 回复
const replyVisible = ref(false);
const replyForm = reactive({ reviewId: '', content: '' });
const openReplyDialog = (row: Record<string, unknown>) => { replyForm.reviewId = String(row.reviewId ?? ''); replyForm.content = ''; replyVisible.value = true; };
const handleReply = async () => {
  if (!replyForm.content.trim()) { ElMessage.warning('请输入回复内容'); return; }
  try { await replyReview(replyForm.reviewId, { content: replyForm.content, replyBy: 'admin' }); ElMessage.success('回复成功'); replyVisible.value = false; loadReviews(); }
  catch (e: unknown) { const err = e instanceof Error ? e.message : String(e); ElMessage.error(err); }
};

// 删除
const handleDelete = async (id: string) => {
  try { await deleteReview(id); ElMessage.success('已删除'); loadReviews(); }
  catch (e: unknown) { const err = e instanceof Error ? e.message : String(e); ElMessage.error(err); }
};

onMounted(() => { loadReviews(); });
</script>

<style scoped>
.reviews-page { padding: 16px; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; }

.stat-card { text-align: center; padding: 8px 0; }
.stat-value { font-size: 28px; font-weight: bold; color: #409eff; }
.stat-label { font-size: 13px; color: #909399; margin-top: 4px; }

.score-cell { display: flex; align-items: center; gap: 6px; }
.score-num { font-size: 18px; font-weight: bold; }
.score-stars { font-size: 12px; }

.dim-scores { font-size: 12px; color: #606266; display: flex; flex-direction: column; gap: 2px; }

.reply-box { background: #f5f7fa; padding: 10px 14px; border-radius: 6px; }
.reply-time { font-size: 12px; color: #909399; margin-top: 6px; }

.el-dialog .el-input,
.el-dialog .el-select,
.el-dialog .el-date-editor { width: 100% !important; }
.el-dialog .el-input-number { width: 100% !important; }
</style>
