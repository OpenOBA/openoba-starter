<template>
  <div class="toolbar">
    <el-input v-model="spuSearch.keyword" placeholder="搜索 SPU 名称/编码" clearable style="width: 240px" @keyup.enter="$emit('search')" />
    <el-select v-model="spuSearch.gender" placeholder="性别" clearable style="width: 100px">
      <el-option v-for="opt in genderOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
    </el-select>
    <el-select v-model="spuSearch.status" placeholder="状态" clearable style="width: 100px">
      <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
    </el-select>
    <el-select v-model="spuSearch.productTier" placeholder="级别" clearable style="width: 110px">
      <el-option v-for="t in tierList" :key="t.tier_code" :label="t.tier_name" :value="t.tier_code">
        <span>{{ t.tier_name }}</span>
        <span :style="{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: t.icon_color as string, marginLeft: '6px' }"></span>
      </el-option>
    </el-select>
    <el-button type="primary" @click="$emit('search')">搜索</el-button>
    <el-button type="success" @click="$emit('add')">新增 SPU</el-button>
    <el-button type="primary" :disabled="spuSelection.length===0" @click="$emit('edit')">编辑</el-button>
    <el-popconfirm title="确认批量删除所选SPU？" @confirm="$emit('batchDelete')" :disabled="spuSelection.length===0">
      <template #reference><el-button type="danger" :disabled="spuSelection.length===0">删除</el-button></template>
    </el-popconfirm>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  spuSearch: { keyword: string; gender: string; status: string; productTier: string }
  genderOptions: Record<string, unknown>[]
  statusOptions: Record<string, unknown>[]
  tierList: Record<string, unknown>[]
  spuSelection: Record<string, unknown>[]
}>()

defineEmits<{
  search: []
  add: []
  edit: []
  batchDelete: []
}>()
</script>
