<template>
  <el-card>
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center">
        <span>字典管理</span>
        <div v-if="selectedDict">
          <el-button type="success" size="small" @click="openAdd">新增</el-button>
          <el-button type="primary" size="small" :disabled="dictSelection.length === 0" @click="onBatchEdit"
            >编辑</el-button
          >
          <el-popconfirm title="确认批量删除所选数据？" :disabled="dictSelection.length === 0" @confirm="onBatchDelete">
            <template #reference
              ><el-button type="danger" size="small" :disabled="dictSelection.length === 0">删除</el-button></template
            >
          </el-popconfirm>
        </div>
      </div>
    </template>

    <el-row :gutter="16">
      <!-- 左侧：字典表列表 -->
      <el-col :span="8">
        <el-table
          v-loading="loading"
          :data="dictList"
          stripe
          border
          highlight-current-row
          style="cursor: pointer"
          @current-change="onSelectDict"
        >
          <el-table-column prop="index" label="#" width="50" />
          <el-table-column prop="displayName" label="字典名称" />
          <el-table-column prop="tableName" label="表名" show-overflow-tooltip />
        </el-table>
      </el-col>

      <!-- 右侧：字典数据 -->
      <el-col :span="16">
        <div v-if="!selectedDict" class="empty-hint">
          <el-empty description="点击左侧字典表查看数据" />
        </div>
        <div v-else>
          <h4>
            {{ selectedDict.displayName }} <el-tag size="small">{{ selectedDict.tableName }}</el-tag>
          </h4>
          <el-table
            v-loading="dataLoading"
            :data="dictData"
            stripe
            border
            size="small"
            max-height="450"
            @selection-change="dictSelection = $event"
            @row-dblclick="openEdit"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column
              v-for="col in dictColumns"
              :key="col.prop"
              :prop="col.prop"
              :label="col.label"
              :min-width="col.width || 120"
              show-overflow-tooltip
            />
          </el-table>
          <div v-if="dictData.length === 0 && !dataLoading" class="empty-hint">
            <el-empty description="暂无数据" :image-size="80" />
          </div>
        </div>
      </el-col>
    </el-row>
  </el-card>

  <!-- 新增/编辑对话框 -->
  <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px">
    <el-form :model="form" label-width="100px" label-position="right">
      <el-form-item v-for="field in formFields" :key="field.key" :label="field.label" :required="field.required">
        <el-input
          v-if="field.type === 'input'"
          v-model="form[field.key]"
          :placeholder="field.placeholder"
          :disabled="field.disabled && !(editMode === 'add' && field.key === 'code')"
        />
        <el-input-number v-else-if="field.type === 'number'" v-model="form[field.key]" :min="0" :max="9999" />
        <el-switch v-else-if="field.type === 'switch'" v-model="form[field.key]" active-text="是" inactive-text="否" />
        <el-select v-else-if="field.type === 'select'" v-model="form[field.key]" style="width: 100%">
          <el-option v-for="opt in field.options" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-input v-else-if="field.type === 'textarea'" v-model="form[field.key]" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { useDictionary } from './tasks/composables/useDictionary'

const {
  loading,
  dataLoading,
  dictList,
  selectedDict,
  dictData,
  dictSelection,
  dictColumns,
  dialogVisible,
  dialogTitle,
  form,
  formFields,
  saving,
  editMode,
  onSelectDict,
  openAdd,
  openEdit,
  onSave,
  onBatchEdit,
  onBatchDelete,
} = useDictionary()
</script>

<style scoped>
.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}
h4 {
  margin: 0 0 12px;
  font-size: 16px;
  color: #303133;
}
</style>
