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

interface ColorForm { colorId: string; colorCode: string; colorName: string; colorNameEn: string; pinyinName: string; pinyinInitial: string; pantoneRef: string; hexValue: string; colorFamily: string; trendScore: number; description: string }
interface MappingForm { mappingId?: string; materialCode: string; colorCode: string; feasibility: string; craftProcess: string; notes: string }
interface PaletteForm { paletteId?: string; season: string; paletteName: string; theme: string; targetAudience: string; scenario: string; trendSource: string; status: string; notes: string; items?: Record<string, unknown>[] }
interface PaletteItemForm { paletteId: string; colorCode: string; roleInPalette: string; sortOrder: number; notes: string }
interface ProjectForm { projectId?: string; projectCode: string; projectName: string; description: string; targetSeason: string; targetLaunchDate: string; assignedTo: string; status: string; priority: string; aiEvaluationScore: number | null; salesForecast: number | null; forecastConfidence: number | null; aiEvaluationNotes: string }
interface ProjectColorForm { projectId: string; colorCode: string; materialCode: string; isPrimary: boolean; sortOrder: number; notes: string }

export function useColors() {
  // ===== 字典数据 =====
  const materials = ref<Record<string, unknown>[]>([]);
  const spuColors = ref<Record<string, unknown>[]>([]);

  const loadDicts = async () => {
    try { materials.value = await getDictLensMaterials(); } catch { /* ignore */ }
    try { const r = await getDictSkuColors(); spuColors.value = r || []; } catch { /* ignore */ }
  };

  // ===== Tab 1: 标准色盘 =====
  const activeTab = ref('standard');
  const colorList = ref<Record<string, unknown>[]>([]);
  const colorSearch = ref('');
  const colorLoading = ref(false);
  const selectedColors = ref<Record<string, unknown>[]>([]);
  const colorDialogVisible = ref(false);
  const colorForm = reactive<ColorForm>({ colorId: '', colorCode: '', colorName: '', colorNameEn: '', pinyinName: '', pinyinInitial: '', pantoneRef: '', hexValue: '', colorFamily: '', trendScore: 0, description: '' });

  const loadColors = async () => {
    colorLoading.value = true;
    try {
      const res = await getColors({ keyword: colorSearch.value || undefined });
      if (Array.isArray(res.items)) { colorList.value = res.items.filter((c) => c.colorId); }
    } catch (e: unknown) { ElMessage.error((e as Error).message); }
    finally { colorLoading.value = false; }
  };

  const COLOR_DEFAULTS: ColorForm = { colorId: '', colorCode: '', colorName: '', colorNameEn: '', pinyinName: '', pinyinInitial: '', pantoneRef: '', hexValue: '', colorFamily: '', trendScore: 0, description: '' }
  const openColorDialog = (row?: Record<string, unknown>) => {
    Object.assign(colorForm, (row as unknown as ColorForm) || COLOR_DEFAULTS);
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
      if (row.colorId) await handleDeleteColor(row.colorId as string);
    }
    selectedColors.value = [];
  };

  // ===== Tab 2: 材质-色彩映射 =====
  const mappingList = ref<Record<string, unknown>[]>([]);
  const mappingLoading = ref(false);
  const mappingTotal = ref(0);
  const mappingPage = ref(1);
  const mappingPageSize = 20;
  const mappingFilter = reactive({ materialCode: '', feasibility: '' });
  const mappingDialogVisible = ref(false);
  const selectedMappings = ref<Record<string, unknown>[]>([]);
  const mappingForm = reactive<MappingForm>({ materialCode: '', colorCode: '', feasibility: 'feasible', craftProcess: '', notes: '' });

  const loadMappings = async () => {
    mappingLoading.value = true;
    try {
      const res = await getColorMappings({ ...mappingFilter, page: mappingPage.value, pageSize: mappingPageSize });
      mappingList.value = res.items || res;
      mappingTotal.value = res.total || 0;
    } catch (e: unknown) { ElMessage.error((e as Error).message); }
    finally { mappingLoading.value = false; }
  };

  const onMappingPageChange = (p: number) => { mappingPage.value = p; loadMappings(); };

  const MAPPING_DEFAULTS: MappingForm = { materialCode: '', colorCode: '', feasibility: 'feasible', craftProcess: '', notes: '' }
  const openMappingDialog = (row?: Record<string, unknown>) => {
    Object.assign(mappingForm, (row as unknown as MappingForm) || MAPPING_DEFAULTS);
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
      if (row.mappingId) await handleDeleteMapping(row.mappingId as string);
    }
    selectedMappings.value = [];
  };

  // ===== Tab 3: 季节色盘 =====
  const paletteList = ref<Record<string, unknown>[]>([]);
  const paletteLoading = ref(false);
  const paletteTotal = ref(0);
  const palettePage = ref(1);
  const palettePageSize = 20;
  const paletteFilter = reactive({ season: '', status: '' });
  const paletteDialogVisible = ref(false);
  const selectedPalettes = ref<Record<string, unknown>[]>([]);
  const paletteForm = reactive<PaletteForm>({ season: 'SS26', paletteName: '', theme: '', targetAudience: '', scenario: '', trendSource: '', status: 'draft', notes: '' });

  const loadPalettes = async () => {
    paletteLoading.value = true;
    try {
      const res = await getColorPalettes({ ...paletteFilter, page: palettePage.value, pageSize: palettePageSize });
      paletteList.value = res.items || res;
      paletteTotal.value = res.total || 0;
    } catch (e: unknown) { ElMessage.error((e as Error).message); }
    finally { paletteLoading.value = false; }
  };

  const onPalettePageChange = (p: number) => { palettePage.value = p; loadPalettes(); };

  const PALETTE_DEFAULTS: PaletteForm = { season: 'SS26', paletteName: '', theme: '', targetAudience: '', scenario: '', trendSource: '', status: 'draft', notes: '' }
  const openPaletteDialog = (row?: Record<string, unknown>) => {
    Object.assign(paletteForm, (row as unknown as PaletteForm) || PALETTE_DEFAULTS);
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
      if (row.paletteId) await handleDeletePalette(row.paletteId as string);
    }
    selectedPalettes.value = [];
  };

  // ===== 色盘颜色项 =====
  const paletteItemDialogVisible = ref(false);
  const currentPalette = ref<Record<string, unknown> | null>(null);
  const currentPaletteItems = ref<Record<string, unknown>[]>([]);
  const paletteItemFormVisible = ref(false);
  const paletteItemForm = reactive<PaletteItemForm>({ paletteId: '', colorCode: '', roleInPalette: 'primary', sortOrder: 0, notes: '' });

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
    if (!currentPalette.value) return
    Object.assign(paletteItemForm, { paletteId: currentPalette.value.paletteId as string, colorCode: '', roleInPalette: 'primary', sortOrder: currentPaletteItems.value.length, notes: '' });
    paletteItemFormVisible.value = true;
  };

  const handleSavePaletteItem = async () => {
    if (!currentPalette.value) return
    try {
      await addPaletteItem(paletteItemForm);
      ElMessage.success('已添加'); paletteItemFormVisible.value = false;
      openPaletteItemDialog(currentPalette.value);
    } catch (e: unknown) { ElMessage.error((e as Error).message); }
  };

  const handleDeletePaletteItem = async (id: string) => {
    if (!currentPalette.value) return
    try { await deletePaletteItem(id); ElMessage.success('已删除'); openPaletteItemDialog(currentPalette.value); } catch (e: unknown) { ElMessage.error((e as Error).message); }
  };

  // ===== Tab 4: 设计项目 =====
  const projectList = ref<Record<string, unknown>[]>([]);
  const projectLoading = ref(false);
  const projectTotal = ref(0);
  const projectPage = ref(1);
  const projectPageSize = 20;
  const projectFilter = reactive({ status: '', priority: '' });
  const projectDialogVisible = ref(false);
  const selectedProjects = ref<Record<string, unknown>[]>([]);
  const projectForm = reactive<ProjectForm>({
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
      const res = await getColorProjects({ ...projectFilter, page: projectPage.value, pageSize: projectPageSize });
      projectList.value = res.items || res;
      projectTotal.value = res.total || 0;
    } catch (e: unknown) { ElMessage.error((e as Error).message); }
    finally { projectLoading.value = false; }
  };

  const onProjectPageChange = (p: number) => { projectPage.value = p; loadProjects(); };

  const openProjectDialog = (row?: Record<string, unknown>) => {
    const PROJECT_DEFAULTS: ProjectForm = { projectCode: '', projectName: '', description: '', targetSeason: '', targetLaunchDate: '', assignedTo: '', status: 'draft', priority: 'normal', aiEvaluationScore: null, salesForecast: null, forecastConfidence: null, aiEvaluationNotes: '' }
    Object.assign(projectForm, (row as unknown as ProjectForm) || PROJECT_DEFAULTS);
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
      if (row.projectId) await handleDeleteProject(row.projectId as string);
    }
    selectedProjects.value = [];
  };

  // ===== 项目颜色 =====
  const projectColorDialogVisible = ref(false);
  const currentProject = ref<Record<string, unknown> | null>(null);
  const currentProjectColors = ref<Record<string, unknown>[]>([]);
  const projectColorFormVisible = ref(false);
  const projectColorForm = reactive<ProjectColorForm>({ projectId: '', colorCode: '', materialCode: '', isPrimary: false, sortOrder: 0, notes: '' });

  const openProjectColorDialog = async (row: Record<string, unknown>) => {
    currentProject.value = row;
    try { currentProjectColors.value = await getProjectColors(row.projectId as string); } catch { currentProjectColors.value = []; }
    projectColorDialogVisible.value = true;
    projectColorFormVisible.value = false;
  };

  const openAddProjectColor = () => {
    if (!currentProject.value) return
    Object.assign(projectColorForm, { projectId: currentProject.value.projectId as string, colorCode: '', materialCode: '', isPrimary: false, sortOrder: currentProjectColors.value.length, notes: '' });
    projectColorFormVisible.value = true;
  };

  const handleSaveProjectColor = async () => {
    if (!currentProject.value) return
    try {
      await addProjectColor(projectColorForm);
      ElMessage.success('已添加'); projectColorFormVisible.value = false;
      openProjectColorDialog(currentProject.value);
    } catch (e: unknown) { ElMessage.error((e as Error).message); }
  };

  const handleDeleteProjectColor = async (id: string) => {
    if (!currentProject.value) return
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
