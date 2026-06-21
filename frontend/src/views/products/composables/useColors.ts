import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getColorMappings, createColorMapping, updateColorMapping, deleteColorMapping,
  getColorPalettes, createColorPalette, updateColorPalette, deleteColorPalette,
  addPaletteItem, deletePaletteItem,
  getColorProjects, createColorProject, updateColorProject, deleteColorProject,
  getProjectColors, addProjectColor, deleteProjectColor,
  getDictLensMaterials, getDictSkuColors,
} from '@/api/color';
import { getColors, createColor, updateColor, deleteColor } from '@/api/product';

export function useColors() {
  // ===== 字典数据 =====
  const materials = ref<any[]>([]);
  const spuColors = ref<any[]>([]);

  const loadDicts = async () => {
    try { materials.value = await getDictLensMaterials(); } catch {}
    try { const r = await getDictSkuColors(); spuColors.value = r || []; } catch {}
  };

  // ===== Tab 1: 标准色盘 =====
  const activeTab = ref('standard');
  const colorList = ref<any[]>([]);
  const colorSearch = ref('');
  const colorLoading = ref(false);
  const selectedColors = ref<any[]>([]);
  const colorDialogVisible = ref(false);
  const colorForm = reactive<any>({ colorId: '', colorCode: '', colorName: '', colorNameEn: '', pinyinName: '', pinyinInitial: '', pantoneRef: '', hexValue: '', colorFamily: '', trendScore: 0, description: '' });

  const loadColors = async () => {
    colorLoading.value = true;
    try {
      const res = await getColors({ keyword: colorSearch.value || undefined });
      if (Array.isArray(res.items)) { colorList.value = res.items.filter((c: any) => c.colorId); }
    } catch (e: unknown) { ElMessage.error((e as Error).message); }
    finally { colorLoading.value = false; }
  };

  const openColorDialog = (row?: any) => {
    Object.assign(colorForm, row || { colorId: '', colorCode: '', colorName: '', colorNameEn: '', pinyinName: '', pinyinInitial: '', pantoneRef: '', hexValue: '', colorFamily: '', trendScore: 0, description: '' });
    colorDialogVisible.value = true;
  };

  const handleSaveColor = async () => {
    try {
      if (colorForm.colorId) await updateColor(colorForm.colorId, colorForm);
      else await createColor(colorForm);
      ElMessage.success('保存成功'); colorDialogVisible.value = false;
      selectedColors.value = [];
      loadColors();
      loadDicts();
    } catch (e: unknown) { ElMessage.error((e as Error).message); }
  };

  const handleDeleteColor = async (id: string) => {
    if (!id) { ElMessage.error('色彩 ID 为空，无法删除'); return; }
    try { await deleteColor(id); ElMessage.success('已删除'); loadColors(); loadDicts(); } catch (e: unknown) { ElMessage.error((e as Error).message); }
  };

  const batchDeleteColors = async () => {
    for (const row of selectedColors.value) {
      if (row.colorId) await handleDeleteColor(row.colorId);
    }
    selectedColors.value = [];
  };

  // ===== Tab 2: 材质-色彩映射 =====
  const mappingList = ref<any[]>([]);
  const mappingLoading = ref(false);
  const mappingTotal = ref(0);
  const mappingPage = ref(1);
  const mappingPageSize = 20;
  const mappingFilter = reactive({ materialCode: '', feasibility: '' });
  const mappingDialogVisible = ref(false);
  const selectedMappings = ref<any[]>([]);
  const mappingForm = reactive<any>({ materialCode: '', colorCode: '', feasibility: 'feasible', craftProcess: '', notes: '' });

  const loadMappings = async () => {
    mappingLoading.value = true;
    try {
      const res = await getColorMappings({ ...mappingFilter, page: mappingPage.value, pageSize: mappingPageSize } as any);
      mappingList.value = res.items || res;
      mappingTotal.value = res.total || 0;
    } catch (e: unknown) { ElMessage.error((e as Error).message); }
    finally { mappingLoading.value = false; }
  };

  const onMappingPageChange = (p: number) => { mappingPage.value = p; loadMappings(); };

  const openMappingDialog = (row?: any) => {
    Object.assign(mappingForm, row || { materialCode: '', colorCode: '', feasibility: 'feasible', craftProcess: '', notes: '' });
    mappingDialogVisible.value = true;
  };

  const handleSaveMapping = async () => {
    try {
      if (mappingForm.mappingId) await updateColorMapping(mappingForm.mappingId, mappingForm);
      else await createColorMapping(mappingForm);
      ElMessage.success('保存成功'); mappingDialogVisible.value = false;
      selectedMappings.value = [];
      loadMappings();
    } catch (e: unknown) { ElMessage.error((e as Error).message); }
  };

  const handleDeleteMapping = async (id: string) => {
    try { await deleteColorMapping(id); ElMessage.success('已删除'); loadMappings(); } catch (e: unknown) { ElMessage.error((e as Error).message); }
  };

  const batchDeleteMappings = async () => {
    for (const row of selectedMappings.value) {
      if (row.mappingId) await handleDeleteMapping(row.mappingId);
    }
    selectedMappings.value = [];
  };

  // ===== Tab 3: 季节色盘 =====
  const paletteList = ref<any[]>([]);
  const paletteLoading = ref(false);
  const paletteTotal = ref(0);
  const palettePage = ref(1);
  const palettePageSize = 20;
  const paletteFilter = reactive({ season: '', status: '' });
  const paletteDialogVisible = ref(false);
  const selectedPalettes = ref<any[]>([]);
  const paletteForm = reactive<any>({ season: 'SS26', paletteName: '', theme: '', targetAudience: '', scenario: '', trendSource: '', status: 'draft', notes: '' });

  const loadPalettes = async () => {
    paletteLoading.value = true;
    try {
      const res = await getColorPalettes({ ...paletteFilter, page: palettePage.value, pageSize: palettePageSize } as any);
      paletteList.value = res.items || res;
      paletteTotal.value = res.total || 0;
    } catch (e: unknown) { ElMessage.error((e as Error).message); }
    finally { paletteLoading.value = false; }
  };

  const onPalettePageChange = (p: number) => { palettePage.value = p; loadPalettes(); };

  const openPaletteDialog = (row?: any) => {
    Object.assign(paletteForm, row || { season: 'SS26', paletteName: '', theme: '', targetAudience: '', scenario: '', trendSource: '', status: 'draft', notes: '' });
    paletteDialogVisible.value = true;
  };

  const handleSavePalette = async () => {
    try {
      if (paletteForm.paletteId) await updateColorPalette(paletteForm.paletteId, paletteForm);
      else await createColorPalette(paletteForm);
      ElMessage.success('保存成功'); paletteDialogVisible.value = false;
      selectedPalettes.value = [];
      loadPalettes();
    } catch (e: unknown) { ElMessage.error((e as Error).message); }
  };

  const handleDeletePalette = async (id: string) => {
    try { await deleteColorPalette(id); ElMessage.success('已删除'); loadPalettes(); } catch (e: unknown) { ElMessage.error((e as Error).message); }
  };

  const batchDeletePalettes = async () => {
    for (const row of selectedPalettes.value) {
      if (row.paletteId) await handleDeletePalette(row.paletteId);
    }
    selectedPalettes.value = [];
  };

  // ===== 色盘颜色项 =====
  const paletteItemDialogVisible = ref(false);
  const currentPalette = ref<any>(null);
  const currentPaletteItems = ref<any[]>([]);
  const paletteItemFormVisible = ref(false);
  const paletteItemForm = reactive<any>({ paletteId: '', colorCode: '', roleInPalette: 'primary', sortOrder: 0, notes: '' });

  const openPaletteItemDialog = async (row: Record<string, unknown>) => {
    currentPalette.value = row;
    try {
      const res = await getColorPalettes({ page: 1, pageSize: 100 });
      const allPalettes = res.items;
      const found = allPalettes.find((p: Record<string, unknown>) => p.paletteId === row.paletteId);
      currentPaletteItems.value = (found?.items as Record<string, unknown>[]) || [];
    } catch { currentPaletteItems.value = []; }
    paletteItemDialogVisible.value = true;
    paletteItemFormVisible.value = false;
  };

  const openAddPaletteItem = () => {
    Object.assign(paletteItemForm, { paletteId: currentPalette.value.paletteId, colorCode: '', roleInPalette: 'primary', sortOrder: currentPaletteItems.value.length, notes: '' });
    paletteItemFormVisible.value = true;
  };

  const handleSavePaletteItem = async () => {
    try {
      await addPaletteItem(paletteItemForm);
      ElMessage.success('已添加'); paletteItemFormVisible.value = false;
      openPaletteItemDialog(currentPalette.value);
    } catch (e: unknown) { ElMessage.error((e as Error).message); }
  };

  const handleDeletePaletteItem = async (id: string) => {
    try { await deletePaletteItem(id); ElMessage.success('已删除'); openPaletteItemDialog(currentPalette.value); } catch (e: unknown) { ElMessage.error((e as Error).message); }
  };

  // ===== Tab 4: 设计项目 =====
  const projectList = ref<any[]>([]);
  const projectLoading = ref(false);
  const projectTotal = ref(0);
  const projectPage = ref(1);
  const projectPageSize = 20;
  const projectFilter = reactive({ status: '', priority: '' });
  const projectDialogVisible = ref(false);
  const selectedProjects = ref<any[]>([]);
  const projectForm = reactive<any>({
    projectCode: '', projectName: '', description: '', targetSeason: '',
    targetLaunchDate: '', assignedTo: '', status: 'draft', priority: 'normal',
    aiEvaluationScore: null, salesForecast: null, forecastConfidence: null, aiEvaluationNotes: '',
  });

  const PROJECT_STATUS_LABELS: Record<string, string> = { draft: '草稿', designing: '设计中', reviewing: '审核中', approved: '已审批', production: '生产中', archived: '归档' };
  const PROJECT_PRIORITY_LABELS: Record<string, string> = { low: '低', normal: '普通', high: '高', urgent: '紧急' };
  const projectStatusType = (s: string) => ({ draft: 'info', designing: '', reviewing: 'warning', approved: 'success', production: '', archived: 'info' }[s] || '');
  const projectStatusLabel = (s: string) => PROJECT_STATUS_LABELS[s] || s;
  const projectPriorityType = (p: string) => ({ low: 'info', normal: '', high: 'warning', urgent: 'danger' }[p] || '');
  const projectPriorityLabel = (p: string) => PROJECT_PRIORITY_LABELS[p] || p;

  const loadProjects = async () => {
    projectLoading.value = true;
    try {
      const res = await getColorProjects({ ...projectFilter, page: projectPage.value, pageSize: projectPageSize } as any);
      projectList.value = res.items || res;
      projectTotal.value = res.total || 0;
    } catch (e: unknown) { ElMessage.error((e as Error).message); }
    finally { projectLoading.value = false; }
  };

  const onProjectPageChange = (p: number) => { projectPage.value = p; loadProjects(); };

  const openProjectDialog = (row?: any) => {
    if (row) Object.assign(projectForm, row);
    else Object.assign(projectForm, { projectCode: '', projectName: '', description: '', targetSeason: '', targetLaunchDate: '', assignedTo: '', status: 'draft', priority: 'normal', aiEvaluationScore: null, salesForecast: null, forecastConfidence: null, aiEvaluationNotes: '' });
    projectDialogVisible.value = true;
  };

  const handleSaveProject = async () => {
    try {
      if (projectForm.projectId) await updateColorProject(projectForm.projectId, projectForm);
      else await createColorProject(projectForm);
      ElMessage.success('保存成功'); projectDialogVisible.value = false;
      selectedProjects.value = [];
      loadProjects();
    } catch (e: unknown) { ElMessage.error((e as Error).message); }
  };

  const handleDeleteProject = async (id: string) => {
    try { await deleteColorProject(id); ElMessage.success('已删除'); loadProjects(); } catch (e: unknown) { ElMessage.error((e as Error).message); }
  };

  const batchDeleteProjects = async () => {
    for (const row of selectedProjects.value) {
      if (row.projectId) await handleDeleteProject(row.projectId);
    }
    selectedProjects.value = [];
  };

  // ===== 项目颜色 =====
  const projectColorDialogVisible = ref(false);
  const currentProject = ref<any>(null);
  const currentProjectColors = ref<any[]>([]);
  const projectColorFormVisible = ref(false);
  const projectColorForm = reactive<any>({ projectId: '', colorCode: '', materialCode: '', isPrimary: false, sortOrder: 0, notes: '' });

  const openProjectColorDialog = async (row: Record<string, unknown>) => {
    currentProject.value = row;
    try { currentProjectColors.value = await getProjectColors(row.projectId as string); } catch { currentProjectColors.value = []; }
    projectColorDialogVisible.value = true;
    projectColorFormVisible.value = false;
  };

  const openAddProjectColor = () => {
    Object.assign(projectColorForm, { projectId: currentProject.value.projectId, colorCode: '', materialCode: '', isPrimary: false, sortOrder: currentProjectColors.value.length, notes: '' });
    projectColorFormVisible.value = true;
  };

  const handleSaveProjectColor = async () => {
    try {
      await addProjectColor(projectColorForm);
      ElMessage.success('已添加'); projectColorFormVisible.value = false;
      openProjectColorDialog(currentProject.value);
    } catch (e: unknown) { ElMessage.error((e as Error).message); }
  };

  const handleDeleteProjectColor = async (id: string) => {
    try { await deleteProjectColor(id); ElMessage.success('已删除'); openProjectColorDialog(currentProject.value); } catch (e: unknown) { ElMessage.error((e as Error).message); }
  };

  return {
    activeTab,
    materials, spuColors, loadDicts,
    colorList, colorSearch, colorLoading, selectedColors, colorDialogVisible, colorForm,
    loadColors, openColorDialog, handleSaveColor, batchDeleteColors,
    mappingList, mappingLoading, mappingTotal, mappingPage, mappingPageSize, mappingFilter, mappingDialogVisible, selectedMappings, mappingForm,
    loadMappings, onMappingPageChange, openMappingDialog, handleSaveMapping, batchDeleteMappings,
    paletteList, paletteLoading, paletteTotal, palettePage, palettePageSize, paletteFilter, paletteDialogVisible, selectedPalettes, paletteForm,
    loadPalettes, onPalettePageChange, openPaletteDialog, handleSavePalette, batchDeletePalettes,
    paletteItemDialogVisible, currentPalette, currentPaletteItems, paletteItemFormVisible, paletteItemForm,
    openPaletteItemDialog, openAddPaletteItem, handleSavePaletteItem, handleDeletePaletteItem,
    projectList, projectLoading, projectTotal, projectPage, projectPageSize, projectFilter, projectDialogVisible, selectedProjects, projectForm,
    PROJECT_STATUS_LABELS, PROJECT_PRIORITY_LABELS,
    projectStatusType, projectStatusLabel, projectPriorityType, projectPriorityLabel,
    loadProjects, onProjectPageChange, openProjectDialog, handleSaveProject, batchDeleteProjects,
    projectColorDialogVisible, currentProject, currentProjectColors, projectColorFormVisible, projectColorForm,
    openProjectColorDialog, openAddProjectColor, handleSaveProjectColor, handleDeleteProjectColor,
  };
}
