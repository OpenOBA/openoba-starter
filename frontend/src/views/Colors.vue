<template>
  <div class="colors-page">
    <el-tabs v-model="activeTab" type="card">
      <!-- Tab 1: 标准色盘（第一位） -->
      <el-tab-pane label="标准色盘" name="standard">
        <div class="tab-content">
          <div class="toolbar">
            <el-input v-model="colorSearch" placeholder="搜索名称/拼音/HEX" clearable style="width: 200px" @input="loadColors" />
            <el-button type="success" @click="openColorDialog()">新增色彩</el-button>
            <el-button type="primary" :disabled="!selectedColors.length" @click="openColorDialog(selectedColors[0])">编辑</el-button>
            <el-popconfirm title="确认删除选中色彩？" @confirm="batchDeleteColors">
              <template #reference>
                <el-button type="danger" :disabled="!selectedColors.length">删除</el-button>
              </template>
            </el-popconfirm>
          </div>
          <el-table
            :data="colorList"
            v-loading="colorLoading"
            stripe
            @selection-change="(rows: any[]) => selectedColors = rows"
            @row-dblclick="(row: any) => openColorDialog(row)"
            highlight-current-row
          >
            <el-table-column type="selection" width="45" />
            <el-table-column prop="colorCode" label="编码" width="130" />
            <el-table-column label="色值" width="90">
              <template #default="{ row }">
                <span v-if="row.hexValue" :style="{ display: 'inline-block', width: '16px', height: '16px', background: row.hexValue, borderRadius: '2px', verticalAlign: 'middle', marginRight: '6px' }"></span>
                {{ row.hexValue || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="colorName" label="名称" width="100" />
            <el-table-column prop="colorNameEn" label="英文" width="120" show-overflow-tooltip />
            <el-table-column prop="pinyinName" label="拼音" width="120" show-overflow-tooltip />
            <el-table-column prop="pinyinInitial" label="首字母" width="80" />
            <el-table-column prop="pantoneRef" label="Pantone" width="170" show-overflow-tooltip />
            <el-table-column prop="colorFamily" label="色系" width="80" />
            <el-table-column prop="trendScore" label="趋势分" width="80" />
            <el-table-column label="状态" width="70">
              <template #default="{ row }">
                <el-tag :type="row.isActive !== false ? 'success' : 'info'" size="small">{{ row.isActive !== false ? '启用' : '禁用' }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- Tab 2: 材质-色彩映射 -->
      <el-tab-pane label="材质-色彩映射" name="mapping">
        <div class="tab-content">
          <div class="toolbar">
            <el-select v-model="mappingFilter.materialCode" placeholder="筛选材质" clearable style="width: 140px" @change="loadMappings">
              <el-option v-for="m in materials" :key="m.materialCode" :label="m.materialName" :value="m.materialCode" />
            </el-select>
            <el-select v-model="mappingFilter.feasibility" placeholder="筛选可行性" clearable style="width: 140px" @change="loadMappings">
              <el-option label="可行" value="feasible" />
              <el-option label="不可行" value="not_feasible" />
              <el-option label="条件可行" value="conditional" />
            </el-select>
            <el-button type="primary" @click="loadMappings">刷新</el-button>
            <el-button type="success" @click="openMappingDialog()">新增映射</el-button>
            <el-button type="primary" :disabled="!selectedMappings.length" @click="openMappingDialog(selectedMappings[0])">编辑</el-button>
            <el-popconfirm title="确认删除选中映射？" @confirm="batchDeleteMappings">
              <template #reference>
                <el-button type="danger" :disabled="!selectedMappings.length">删除</el-button>
              </template>
            </el-popconfirm>
          </div>
          <el-table
            :data="mappingList"
            v-loading="mappingLoading"
            stripe
            @selection-change="(rows: any[]) => selectedMappings = rows"
            @row-dblclick="(row: any) => openMappingDialog(row)"
            highlight-current-row
          >
            <el-table-column type="selection" width="45" />
            <el-table-column prop="materialCode" label="材质" width="120">
              <template #default="{ row }">
                <el-tag size="small" type="info">{{ row.materialCode }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="colorCode" label="颜色" width="140">
              <template #default="{ row }">
                <el-tag size="small">{{ row.colorCode }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="可行性" width="100">
              <template #default="{ row }">
                <el-tag :type="row.feasibility === 'feasible' ? 'success' : row.feasibility === 'not_feasible' ? 'danger' : 'warning'" size="small">
                  {{ ({ feasible: '可行', not_feasible: '不可行', conditional: '条件可行' } as Record<string, string>)[row.feasibility] || row.feasibility }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="craftProcess" label="推荐工艺" width="130" />
            <el-table-column prop="notes" label="备注" min-width="200" show-overflow-tooltip />
            <el-table-column label="状态" width="70">
              <template #default="{ row }">
                <el-tag :type="row.isActive ? 'success' : 'info'" size="small">{{ row.isActive ? '启用' : '禁用' }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-if="mappingTotal > 0"
            :current-page="mappingPage"
            :page-size="mappingPageSize"
            :total="mappingTotal"
            layout="total, prev, pager"
            style="margin-top: 16px; justify-content: flex-end"
            @current-change="onMappingPageChange"
          />
        </div>
      </el-tab-pane>

      <!-- Tab 3: 季节色盘 -->
      <el-tab-pane label="季节色盘" name="palette">
        <div class="tab-content">
          <div class="toolbar">
            <el-select v-model="paletteFilter.season" placeholder="筛选季节" clearable style="width: 120px" @change="loadPalettes">
              <el-option label="SS26" value="SS26" />
              <el-option label="AW26" value="AW26" />
              <el-option label="SS27" value="SS27" />
            </el-select>
            <el-select v-model="paletteFilter.status" placeholder="筛选状态" clearable style="width: 120px" @change="loadPalettes">
              <el-option label="草稿" value="draft" />
              <el-option label="启用" value="active" />
              <el-option label="归档" value="archived" />
            </el-select>
            <el-button type="primary" @click="loadPalettes">刷新</el-button>
            <el-button type="success" @click="openPaletteDialog()">新增色盘</el-button>
            <el-button type="primary" :disabled="!selectedPalettes.length" @click="openPaletteDialog(selectedPalettes[0])">编辑</el-button>
            <el-button type="info" :disabled="!selectedPalettes.length" @click="openPaletteItemDialog(selectedPalettes[0])">管理颜色</el-button>
            <el-popconfirm title="确认删除选中的色盘？" @confirm="batchDeletePalettes">
              <template #reference>
                <el-button type="danger" :disabled="!selectedPalettes.length">删除</el-button>
              </template>
            </el-popconfirm>
          </div>
          <el-table
            :data="paletteList"
            v-loading="paletteLoading"
            stripe
            @selection-change="(rows: any[]) => selectedPalettes = rows"
            @row-dblclick="(row: any) => openPaletteDialog(row)"
            highlight-current-row
          >
            <el-table-column type="selection" width="45" />
            <el-table-column prop="season" label="季节" width="80" />
            <el-table-column prop="paletteName" label="色盘名称" width="170" />
            <el-table-column prop="theme" label="主题" min-width="200" show-overflow-tooltip />
            <el-table-column prop="targetAudience" label="目标人群" width="140" show-overflow-tooltip />
            <el-table-column prop="trendSource" label="趋势来源" width="140" show-overflow-tooltip />
            <el-table-column label="颜色数" width="80">
              <template #default="{ row }">
                <el-tag size="small">{{ row.items ? row.items.length : '-' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : row.status === 'draft' ? 'info' : ''" size="small">
                  {{ ({ draft: '草稿', active: '启用', archived: '归档' } as Record<string, string>)[row.status] || row.status }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-if="paletteTotal > 0"
            :current-page="palettePage"
            :page-size="palettePageSize"
            :total="paletteTotal"
            layout="total, prev, pager"
            style="margin-top: 16px; justify-content: flex-end"
            @current-change="onPalettePageChange"
          />
        </div>
      </el-tab-pane>

      <!-- Tab 4: 设计项目 -->
      <el-tab-pane label="设计项目" name="project">
        <div class="tab-content">
          <div class="toolbar">
            <el-select v-model="projectFilter.status" placeholder="筛选状态" clearable style="width: 120px" @change="loadProjects">
              <el-option v-for="(label, code) in PROJECT_STATUS_LABELS" :key="code" :label="label" :value="code" />
            </el-select>
            <el-select v-model="projectFilter.priority" placeholder="筛选优先级" clearable style="width: 120px" @change="loadProjects">
              <el-option v-for="(label, code) in PROJECT_PRIORITY_LABELS" :key="code" :label="label" :value="code" />
            </el-select>
            <el-button type="primary" @click="loadProjects">刷新</el-button>
            <el-button type="success" @click="openProjectDialog()">新增项目</el-button>
            <el-button type="primary" :disabled="!selectedProjects.length" @click="openProjectDialog(selectedProjects[0])">编辑</el-button>
            <el-button type="info" :disabled="!selectedProjects.length" @click="openProjectColorDialog(selectedProjects[0])">管理颜色</el-button>
            <el-popconfirm title="确认删除选中的项目？" @confirm="batchDeleteProjects">
              <template #reference>
                <el-button type="danger" :disabled="!selectedProjects.length">删除</el-button>
              </template>
            </el-popconfirm>
          </div>
          <el-table
            :data="projectList"
            v-loading="projectLoading"
            stripe
            @selection-change="(rows: any[]) => selectedProjects = rows"
            @row-dblclick="(row: any) => openProjectDialog(row)"
            highlight-current-row
          >
            <el-table-column type="selection" width="45" />
            <el-table-column prop="projectCode" label="项目编号" width="150" />
            <el-table-column prop="projectName" label="项目名称" min-width="180" />
            <el-table-column prop="targetSeason" label="目标季节" width="100" />
            <el-table-column prop="assignedTo" label="负责人" width="100" />
            <el-table-column label="AI 评分" width="90">
              <template #default="{ row }">
                <span v-if="row.aiEvaluationScore" :style="{ color: row.aiEvaluationScore >= 8 ? '#67c23a' : row.aiEvaluationScore >= 6 ? '#e6a23c' : '#f56c6c' }">
                  {{ row.aiEvaluationScore }}
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="salesForecast" label="预估销量" width="100" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="projectStatusType(row.status)" size="small">
                  {{ projectStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="优先级" width="80">
              <template #default="{ row }">
                <el-tag :type="projectPriorityType(row.priority)" size="small">
                  {{ projectPriorityLabel(row.priority) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-if="projectTotal > 0"
            :current-page="projectPage"
            :page-size="projectPageSize"
            :total="projectTotal"
            layout="total, prev, pager"
            style="margin-top: 16px; justify-content: flex-end"
            @current-change="onProjectPageChange"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 标准色盘 Dialog -->
    <el-dialog v-model="colorDialogVisible" :title="colorForm.colorId ? '编辑色彩' : '新增色彩'" width="600px">
      <el-form :model="colorForm" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12" class="w-short"><el-form-item label="色彩编码"><el-input v-model="colorForm.colorCode" :disabled="!!colorForm.colorId" placeholder="自动生成" /></el-form-item></el-col>
          <el-col :span="12" class="w-short"><el-form-item label="拼音首字母"><el-input v-model="colorForm.pinyinInitial" placeholder="如：mkf" maxlength="10" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="色彩名称"><el-input v-model="colorForm.colorName" placeholder="如：马卡龙粉" /></el-form-item>
        <el-form-item label="英文名"><el-input v-model="colorForm.colorNameEn" placeholder="如：Macaron Pink" /></el-form-item>
        <el-form-item label="拼音名称"><el-input v-model="colorForm.pinyinName" placeholder="如：ma ka long fen" /></el-form-item>
        <el-row :gutter="16">
          <el-col :span="16"><el-form-item label="Pantone"><el-input v-model="colorForm.pantoneRef" placeholder="如：PANTONE 13-1520 TCX" /></el-form-item></el-col>
          <el-col :span="8" class="w-short"><el-form-item label="色系"><el-input v-model="colorForm.colorFamily" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="色值"><el-input v-model="colorForm.hexValue" placeholder="如：#FFB6C1" />
              <div v-if="colorForm.hexValue" :style="{ width: '24px', height: '24px', borderRadius: '4px', background: colorForm.hexValue, border: '1px solid #ddd', marginTop: '4px' }"></div>
            </el-form-item>
          </el-col>
          <el-col :span="12" class="w-short"><el-form-item label="趋势分"><el-input-number v-model="colorForm.trendScore" :min="0" :max="100" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="描述"><el-input v-model="colorForm.description" type="textarea" :rows="2" placeholder="色彩特征/适合场景" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="colorDialogVisible = false">取消</el-button><el-button type="primary" @click="handleSaveColor">保存</el-button></template>
    </el-dialog>

    <!-- 映射 Dialog -->
    <el-dialog v-model="mappingDialogVisible" :title="mappingForm.mappingId ? '编辑映射' : '新增映射'" width="500px">
      <el-form :model="mappingForm" label-width="100px">
        <el-form-item label="材质">
          <el-select v-model="mappingForm.materialCode" placeholder="选择材质" filterable>
            <el-option v-for="m in materials" :key="m.materialCode" :label="`${m.materialCode} - ${m.materialName}`" :value="m.materialCode" />
          </el-select>
        </el-form-item>
        <el-form-item label="颜色">
          <el-select v-model="mappingForm.colorCode" placeholder="选择颜色" filterable>
            <el-option v-for="c in spuColors" :key="c.colorCode" :label="`${c.colorCode} - ${c.colorName}`" :value="c.colorCode" />
          </el-select>
        </el-form-item>
        <el-form-item label="可行性">
          <el-select v-model="mappingForm.feasibility">
            <el-option label="可行" value="feasible" />
            <el-option label="不可行" value="not_feasible" />
            <el-option label="条件可行" value="conditional" />
          </el-select>
        </el-form-item>
        <el-form-item label="推荐工艺"><el-input v-model="mappingForm.craftProcess" placeholder="如：注塑/喷涂/电镀" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="mappingForm.notes" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="mappingDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveMapping">保存</el-button>
      </template>
    </el-dialog>

    <!-- 色盘 Dialog -->
    <el-dialog v-model="paletteDialogVisible" :title="paletteForm.paletteId ? '编辑色盘' : '新增色盘'" width="560px">
      <el-form :model="paletteForm" label-width="100px">
        <el-form-item label="季节">
          <el-select v-model="paletteForm.season">
            <el-option label="SS26 春夏" value="SS26" />
            <el-option label="AW26 秋冬" value="AW26" />
            <el-option label="SS27 春夏" value="SS27" />
          </el-select>
        </el-form-item>
        <el-form-item label="色盘名称"><el-input v-model="paletteForm.paletteName" placeholder="如：春日樱花" /></el-form-item>
        <el-form-item label="主题"><el-input v-model="paletteForm.theme" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="目标人群"><el-input v-model="paletteForm.targetAudience" /></el-form-item>
        <el-form-item label="适用场景"><el-input v-model="paletteForm.scenario" /></el-form-item>
        <el-form-item label="趋势来源"><el-input v-model="paletteForm.trendSource" placeholder="如 Pantone/小红书" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="paletteForm.status">
            <el-option label="草稿" value="draft" />
            <el-option label="启用" value="active" />
            <el-option label="归档" value="archived" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="paletteForm.notes" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paletteDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSavePalette">保存</el-button>
      </template>
    </el-dialog>

    <!-- 色盘颜色项 Dialog -->
    <el-dialog v-model="paletteItemDialogVisible" :title="`色盘颜色 — ${currentPalette?.paletteName || ''}`" width="560px">
      <div class="palette-item-header">
        <el-button type="success" size="small" @click="openAddPaletteItem()">+ 添加颜色</el-button>
      </div>
      <el-table :data="currentPaletteItems" stripe size="small">
        <el-table-column prop="colorCode" label="颜色编码" width="140" />
        <el-table-column prop="roleInPalette" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.roleInPalette === 'primary' ? 'primary' : row.roleInPalette === 'secondary' ? 'warning' : 'info'" size="small">
              {{ ({ primary: '主色', secondary: '辅色', accent: '点缀' } as Record<string, string>)[row.roleInPalette] || row.roleInPalette }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="60" />
        <el-table-column prop="notes" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-popconfirm title="确认删除？" @confirm="handleDeletePaletteItem(row.itemId)">
              <template #reference><el-button link type="danger" size="small">删除</el-button></template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      <el-form v-if="paletteItemFormVisible" :model="paletteItemForm" label-width="80px" style="margin-top: 12px; padding: 12px; background: #f5f7fa; border-radius: 4px;">
        <el-form-item label="颜色">
          <el-select v-model="paletteItemForm.colorCode" placeholder="选择颜色" filterable>
            <el-option v-for="c in spuColors" :key="c.colorCode" :label="`${c.colorCode} - ${c.colorName}`" :value="c.colorCode" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="paletteItemForm.roleInPalette">
            <el-option label="主色" value="primary" />
            <el-option label="辅色" value="secondary" />
            <el-option label="点缀" value="accent" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序"><el-input-number v-model="paletteItemForm.sortOrder" :min="0" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="paletteItemForm.notes" /></el-form-item>
        <el-form-item>
          <el-button type="primary" size="small" @click="handleSavePaletteItem">确认添加</el-button>
          <el-button size="small" @click="paletteItemFormVisible = false">取消</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>

    <!-- 设计项目 Dialog -->
    <el-dialog v-model="projectDialogVisible" :title="projectForm.projectId ? '编辑项目' : '新增项目'" width="600px">
      <el-form :model="projectForm" label-width="110px">
        <el-form-item label="项目编号"><el-input v-model="projectForm.projectCode" :disabled="!!projectForm.projectId" placeholder="如 CP-2026-004" /></el-form-item>
        <el-form-item label="项目名称"><el-input v-model="projectForm.projectName" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="projectForm.description" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="目标季节">
          <el-select v-model="projectForm.targetSeason" clearable>
            <el-option label="SS26 春夏" value="SS26" />
            <el-option label="AW26 秋冬" value="AW26" />
            <el-option label="SS27 春夏" value="SS27" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标上市"><el-date-picker v-model="projectForm.targetLaunchDate" type="date" format="YYYY-MM-DD" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="负责人"><el-input v-model="projectForm.assignedTo" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="projectForm.status">
            <el-option v-for="(label, code) in PROJECT_STATUS_LABELS" :key="code" :label="label" :value="code" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="projectForm.priority">
            <el-option v-for="(label, code) in PROJECT_PRIORITY_LABELS" :key="code" :label="label" :value="code" />
          </el-select>
        </el-form-item>
        <el-form-item label="AI 评分"><el-input-number v-model="projectForm.aiEvaluationScore" :min="0" :max="10" :precision="1" /></el-form-item>
        <el-form-item label="预估销量"><el-input-number v-model="projectForm.salesForecast" :min="0" /></el-form-item>
        <el-form-item label="预估置信度"><el-input-number v-model="projectForm.forecastConfidence" :min="0" :max="10" :precision="1" /></el-form-item>
        <el-form-item label="AI 评估备注"><el-input v-model="projectForm.aiEvaluationNotes" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="projectDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveProject">保存</el-button>
      </template>
    </el-dialog>

    <!-- 项目颜色 Dialog -->
    <el-dialog v-model="projectColorDialogVisible" :title="`项目颜色 — ${currentProject?.projectName || ''}`" width="560px">
      <div class="palette-item-header">
        <el-button type="success" size="small" @click="openAddProjectColor()">+ 添加颜色</el-button>
      </div>
      <el-table :data="currentProjectColors" stripe size="small">
        <el-table-column prop="colorCode" label="颜色编码" width="140" />
        <el-table-column prop="materialCode" label="材质" width="100" />
        <el-table-column label="是否主色" width="80">
          <template #default="{ row }">{{ row.isPrimary ? '是' : '否' }}</template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="60" />
        <el-table-column prop="notes" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-popconfirm title="确认删除？" @confirm="handleDeleteProjectColor(row.projectColorId)">
              <template #reference><el-button link type="danger" size="small">删除</el-button></template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      <el-form v-if="projectColorFormVisible" :model="projectColorForm" label-width="80px" style="margin-top: 12px; padding: 12px; background: #f5f7fa; border-radius: 4px;">
        <el-form-item label="颜色">
          <el-select v-model="projectColorForm.colorCode" placeholder="选择颜色" filterable>
            <el-option v-for="c in spuColors" :key="c.colorCode" :label="`${c.colorCode} - ${c.colorName}`" :value="c.colorCode" />
          </el-select>
        </el-form-item>
        <el-form-item label="材质">
          <el-select v-model="projectColorForm.materialCode" placeholder="选择材质" filterable clearable>
            <el-option v-for="m in materials" :key="m.materialCode" :label="`${m.materialCode} - ${m.materialName}`" :value="m.materialCode" />
          </el-select>
        </el-form-item>
        <el-form-item label="主色"><el-switch v-model="projectColorForm.isPrimary" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="projectColorForm.sortOrder" :min="0" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="projectColorForm.notes" /></el-form-item>
        <el-form-item>
          <el-button type="primary" size="small" @click="handleSaveProjectColor">确认添加</el-button>
          <el-button size="small" @click="projectColorFormVisible = false">取消</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useColors } from './products/composables/useColors';

const {
  activeTab, materials, spuColors,
  colorList, colorSearch, colorLoading, selectedColors, colorDialogVisible, colorForm,
  loadColors, openColorDialog, handleSaveColor,
  mappingList, mappingLoading, mappingTotal, mappingPage, mappingPageSize, mappingFilter, mappingDialogVisible, selectedMappings, mappingForm,
  loadMappings, onMappingPageChange, openMappingDialog, handleSaveMapping,
  paletteList, paletteLoading, paletteTotal, palettePage, palettePageSize, paletteFilter, paletteDialogVisible, selectedPalettes, paletteForm,
  loadPalettes, onPalettePageChange, openPaletteDialog, handleSavePalette,
  paletteItemDialogVisible, currentPalette, currentPaletteItems, paletteItemFormVisible, paletteItemForm,
  openPaletteItemDialog, openAddPaletteItem, handleSavePaletteItem, handleDeletePaletteItem,
  projectList, projectLoading, projectTotal, projectPage, projectPageSize, projectFilter, projectDialogVisible, selectedProjects, projectForm,
  PROJECT_STATUS_LABELS, PROJECT_PRIORITY_LABELS,
  projectStatusType, projectStatusLabel, projectPriorityType, projectPriorityLabel,
  loadProjects, onProjectPageChange, openProjectDialog, handleSaveProject,
  projectColorDialogVisible, currentProject, currentProjectColors, projectColorFormVisible, projectColorForm,
  openProjectColorDialog, openAddProjectColor, handleSaveProjectColor, handleDeleteProjectColor,
  batchDeleteColors, batchDeleteMappings, batchDeletePalettes, batchDeleteProjects,
} = useColors();
</script>

<style scoped>
.colors-page { padding: 16px; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.tab-content { min-height: 300px; }
.palette-item-header { margin-bottom: 8px; }

/* 输入框宽度修复 */
.el-dialog .el-input,
.el-dialog .el-select,
.el-dialog .el-date-editor { width: 100% !important; }
.el-dialog .el-input-number { width: 100% !important; }
</style>
