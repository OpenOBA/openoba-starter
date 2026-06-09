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
                  {{ { feasible: '可行', not_feasible: '不可行', conditional: '条件可行' }[row.feasibility] || row.feasibility }}
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
                  {{ { draft: '草稿', active: '启用', archived: '归档' }[row.status] || row.status }}
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
              {{ { primary: '主色', secondary: '辅色', accent: '点缀' }[row.roleInPalette] || row.roleInPalette }}
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
import { ref, reactive, onMounted } from 'vue';
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

const activeTab = ref('standard');

// ===== 字典数据 =====
const materials = ref<any[]>([]);
const spuColors = ref<any[]>([]);

const loadDicts = async () => {
  try { materials.value = await getDictLensMaterials(); } catch {}
  try { const r = await getDictSkuColors(); spuColors.value = r.items || r; } catch {}
};

// ===== Tab 1: 标准色盘（第一位） =====
const colorList = ref<any[]>([]);
const colorSearch = ref('');
const colorLoading = ref(false);
const selectedColors = ref<any[]>([]);
const colorDialogVisible = ref(false);
const colorForm = reactive<any>({ colorId: '', colorCode: '', colorName: '', colorNameEn: '', pinyinName: '', pinyinInitial: '', pantoneRef: '', hexValue: '', colorFamily: '', trendScore: 0, description: '' });

const loadColors = async () => {
  colorLoading.value = true;
  try {
    const res = await getColors({ keyword: colorSearch.value || undefined } as any);
    if (Array.isArray(res)) { colorList.value = res.filter((c: Record<string, unknown>) => c.colorId); }
    else if (res?.items) { colorList.value = res.items.filter((c: Record<string, unknown>) => c.colorId); }
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
    loadDicts(); // 刷新颜色选择器数据
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
    const res = await getColorPalettes({ page: 1, pageSize: 100 } as any);
    const allPalettes = res.items || res;
    const found = allPalettes.find((p: any) => p.paletteId === row.paletteId);
    currentPaletteItems.value = found?.items || [];
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

onMounted(() => {
  loadDicts();
  loadColors();
  loadMappings();
  loadPalettes();
  loadProjects();
});
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
