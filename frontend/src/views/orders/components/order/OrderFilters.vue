<template>
  <el-form :inline="true" :model="query" class="filter-form">
    <el-form-item label="关键词">
      <el-input v-model="query.keyword" placeholder="订单号/客户名" clearable style="width: 160px" @keyup.enter="$emit('search')" />
    </el-form-item>
    <el-form-item label="状态">
      <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px" @change="$emit('search')">
        <el-option v-for="d in orderStatusItems" :key="d.code" :label="d.name" :value="d.code" />
      </el-select>
    </el-form-item>
    <el-form-item label="支付状态">
      <el-select v-model="query.paymentStatus" placeholder="全部" clearable style="width: 110px" @change="$emit('search')">
        <el-option v-for="d in paymentStatusItems" :key="d.code" :label="d.name" :value="d.code" />
      </el-select>
    </el-form-item>
    <el-form-item label="订单类型">
      <el-select v-model="query.orderType" placeholder="全部" clearable style="width: 110px" @change="$emit('search')">
        <el-option v-for="d in customerTypeItems" :key="d.code" :label="d.name" :value="d.code" />
      </el-select>
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="$emit('search')">查询</el-button>
      <el-button @click="$emit('reset')">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
defineProps<{
  query: { keyword: string; status: string; paymentStatus: string; orderType: string; page: number; pageSize: number }
  orderStatusItems: any[]
  paymentStatusItems: any[]
  customerTypeItems: any[]
}>()

defineEmits<{
  search: []
  reset: []
}>()
</script>
