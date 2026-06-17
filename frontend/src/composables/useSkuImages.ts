/**
 * useSkuImages.ts — SKU 图片管理
 *
 * SKU 图片 CRUD + 批量上传 + 排序 + 搜索
 */
import { ref, reactive, computed } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getSkuImages, createSkuImage, batchCreateSkuImages,
  updateSkuImage, deleteSkuImage, reorderSkuImages,
  uploadImage,
} from '@/api/product';
import type { SkuImage } from '@/types';

export function useSkuImages(skuListRef: ReturnType<typeof ref<any[]>>) {
  const skuImageList = ref<SkuImage[]>([]);
  const imageLoading = ref(false);
  const imageSearch = reactive({ skuId: '', imageType: '' });
  const imageDialogVisible = ref(false);
  const imageForm = reactive<any>({
    imageId: '', skuId: '', imageUrl: '', imageType: 'gallery',
    sortOrder: 0, isPrimary: false, isActive: true, altText: '',
    width: null, height: null,
  });
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
  const batchUploadProgress = ref('');

  // 排序相关
  const hasReordered = ref(false);
  const originalOrder = ref<SkuImage[]>([]);

  // 按 sortOrder 排序的列表
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
    } catch (e: unknown) {
      ElMessage.error(e.message);
    } finally {
      imageLoading.value = false;
    }
  };

  const openImageDialog = (row?: Record<string, unknown>) => {
    if (row) {
      imageForm.imageId = row.imageId || '';
      imageForm.skuId = row.skuId || '';
      imageForm.imageUrl = row.imageUrl || '';
      imageForm.imageType = row.imageType || 'gallery';
      imageForm.sortOrder = row.sortOrder ?? 0;
      imageForm.isPrimary = row.isPrimary ?? false;
      imageForm.isActive = row.isActive ?? true;
      imageForm.altText = row.altText || '';
      imageForm.width = row.width ?? null;
      imageForm.height = row.height ?? null;
    } else {
      imageForm.imageId = '';
      imageForm.skuId = imageSearch.skuId;
      imageForm.imageUrl = '';
      imageForm.imageType = 'gallery';
      imageForm.sortOrder = sortedImageList.value.length + 1;
      imageForm.isPrimary = sortedImageList.value.length === 0;
      imageForm.isActive = true;
      imageForm.altText = '';
      imageForm.width = null;
      imageForm.height = null;
    }
    imageDialogVisible.value = true;
  };

  const handleSaveImage = async () => {
    const payload: Record<string, unknown> = {
      skuId: imageForm.skuId,
      imageUrl: imageForm.imageUrl,
      imageType: imageForm.imageType,
      sortOrder: imageForm.sortOrder,
      isPrimary: imageForm.isPrimary,
      isActive: imageForm.isActive,
    };
    if (imageForm.altText) payload.altText = imageForm.altText;
    if (imageForm.width != null) payload.width = imageForm.width;
    if (imageForm.height != null) payload.height = imageForm.height;
    try {
      if (imageForm.imageId) {
        await updateSkuImage(imageForm.imageId, payload);
        ElMessage.success('图片已更新');
      } else {
        await createSkuImage(payload);
        ElMessage.success('图片已添加');
      }
      imageDialogVisible.value = false;
      loadSkuImages();
    } catch (e: unknown) {
      ElMessage.error(e.message);
    }
  };

  const handleDeleteSkuImage = async (id: string) => {
    try {
      await deleteSkuImage(id);
      ElMessage.success('已删除');
      loadSkuImages();
    } catch (e: unknown) {
      ElMessage.error(e.message);
    }
  };

  const handleImageUpload = async (options: { skuId?: string; files?: File[]; imageTypes?: string[] }) => {
    imageUploading.value = true;
    try {
      const formData = new FormData();
      formData.append('file', options.file);
      const res = await uploadImage(formData);
      const url = res?.url || res?.data?.url || res?.imageUrl || '';
      if (url) {
        imageForm.imageUrl = url;
        ElMessage.success('上传成功');
      } else {
        ElMessage.error('上传返回无 URL');
      }
    } catch (e: unknown) {
      ElMessage.error(e.message || '上传失败');
    } finally {
      imageUploading.value = false;
    }
  };

  const handleBatchImageUpload = async (options: { skuId?: string; files?: File[]; imageTypes?: string[] }) => {
    const file = options.file;
    if (!file) return;
    batchFileList.value.push({ name: file.name, file, status: 'pending' });
  };

  const handleBatchUrl = async () => {
    if (!batchText.value.trim()) return;
    const lines = batchText.value.trim().split('\n').filter(Boolean);
    if (lines.length === 0) return;
    batchUploading.value = true;
    batchUploadedCount.value = 0;
    batchUploadProgress.value = '';
    try {
      // 每行格式：URL | 类型 | 排序 | 主图(Y/N) | 替代文本
      const images = lines.map((line, idx) => {
        const parts = line.split('|').map(p => p.trim());
        return {
          imageUrl: parts[0],
          imageType: parts[1] || 'gallery',
          sortOrder: parseInt(parts[2]) || (idx + 1),
          isPrimary: parts[3]?.toUpperCase() === 'Y',
          altText: parts[4] || undefined,
        };
      });
      const payload = { skuId: imageSearch.skuId, images };
      const res: any = await batchCreateSkuImages(payload);
      batchUploadedCount.value = res?.created || lines.length;
      batchUploadProgress.value = `批量创建成功：${batchUploadedCount.value} 张`;
      ElMessage.success(`已创建 ${batchUploadedCount.value} 张图片`);
      batchText.value = '';
      batchDialogVisible.value = false;
      loadSkuImages();
    } catch (e: unknown) {
      ElMessage.error((e as any)?.message || '批量创建失败');
    } finally {
      batchUploading.value = false;
    }
  };

  const handleBatchUploadConfirm = async () => {
    const pendingFiles = batchFileList.value.filter((f: { status?: string }) => f.status === 'pending');
    if (pendingFiles.length === 0) {
      ElMessage.warning('没有待上传的文件');
      return;
    }
    batchUploading.value = true;
    batchUploadedCount.value = 0;
    batchUploadProgress.value = '';
    const uploadedImages: { imageUrl: string; fileSize?: number; width?: number; height?: number }[] = [];
    for (const item of pendingFiles) {
      try {
        const formData = new FormData();
        formData.append('file', item.file);
        const res: any = await uploadImage(formData);
        const result = res?.data || res;
        const url = result?.url || '';
        if (url) {
          uploadedImages.push({
            imageUrl: url,
            fileSize: result?.size,
            width: result?.width,
            height: result?.height,
          });
          batchUploadedCount.value++;
        }
        item.status = 'done';
      } catch (e) {
        console.warn('[useSkuImages] 单图上传失败:', e instanceof Error ? e.message : String(e))
        item.status = 'failed';
      }
    }
    if (uploadedImages.length > 0) {
      try {
        const images = uploadedImages.map((img, idx) => ({
          imageUrl: img.imageUrl,
          imageType: 'gallery',
          sortOrder: idx + 1,
          isPrimary: false,
          fileSize: img.fileSize,
          width: img.width,
          height: img.height,
        }));
        const payload = { skuId: imageSearch.skuId, images };
        await batchCreateSkuImages(payload);
        batchUploadProgress.value = `已上传 ${uploadedImages.length}/${pendingFiles.length} 张`;
        ElMessage.success(`批量完成：${uploadedImages.length}/${pendingFiles.length} 张`);
        loadSkuImages();
      } catch (e: unknown) {
        ElMessage.error(e.message || '批量创建失败');
      }
    }
    batchUploading.value = false;
  };

  const clearBatchFiles = () => {
    batchFileList.value = [];
  };

  const saveOrder = async () => {
    const reordered = sortedImageList.value.map((img, idx) => ({
      imageId: img.imageId,
      sortOrder: idx + 1,
    }));
    try {
      await reorderSkuImages(reordered);
      ElMessage.success('排序已保存');
      hasReordered.value = false;
      originalOrder.value = [...skuImageList.value];
    } catch (e: unknown) {
      ElMessage.error(e.message || '保存排序失败');
    }
  };

  const cancelReorder = () => {
    skuImageList.value = [...originalOrder.value];
    hasReordered.value = false;
  };

  const moveImage = (index: number, direction: number) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sortedImageList.value.length) return;
    const a = sortedImageList.value[index];
    const b = sortedImageList.value[newIndex];
    const tempSort = a.sortOrder;
    a.sortOrder = b.sortOrder;
    b.sortOrder = tempSort;
    skuImageList.value = [...skuImageList.value];
    hasReordered.value = true;
  };

  return {
    skuImageList,
    imageLoading,
    imageSearch,
    imageDialogVisible,
    imageForm,
    imageFileInput,
    imageUploading,
    batchDialogVisible,
    batchText,
    batchTab,
    batchFileInput,
    batchFileList,
    batchUploading,
    batchUploadedCount,
    batchUploadProgress,
    hasReordered,
    sortedImageList,
    loadSkuImages,
    openImageDialog,
    handleSaveImage,
    handleDeleteSkuImage,
    handleImageUpload,
    handleBatchImageUpload,
    handleBatchUrl,
    handleBatchUploadConfirm,
    clearBatchFiles,
    saveOrder,
    cancelReorder,
    moveImage,
  };
}
