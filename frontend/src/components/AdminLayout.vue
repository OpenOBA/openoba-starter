<template>
  <el-container class="admin-layout">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="sidebar">
      <div class="logo">
        <span v-show="!isCollapse">开源ERP参考实现</span>
        <div v-show="!isCollapse" class="logo-hint">让 ERA-Chat 改成你想要的名字</div>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        router
        teleported
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><Monitor /></el-icon>
          <template #title>工作台</template>
        </el-menu-item>
        <el-menu-item index="/customers">
          <el-icon><User /></el-icon>
          <template #title>客户管理</template>
        </el-menu-item>
        <el-menu-item index="/products">
          <el-icon><Goods /></el-icon>
          <template #title>商品管理</template>
        </el-menu-item>
        <el-menu-item index="/dictionary">
          <el-icon><Notebook /></el-icon>
          <template #title>字典管理</template>
        </el-menu-item>
        <el-menu-item index="/structure">
          <el-icon><View /></el-icon>
          <template #title>结构标准库</template>
        </el-menu-item>
        <el-menu-item index="/knowledge">
          <el-icon><Reading /></el-icon>
          <template #title>知识库</template>
        </el-menu-item>
        <el-menu-item index="/draft-pool">
          <el-icon><Collection /></el-icon>
          <template #title>草稿池</template>
        </el-menu-item>
        <el-menu-item index="/orders">
          <el-icon><ShoppingCart /></el-icon>
          <template #title>订单管理</template>
        </el-menu-item>
        <el-menu-item index="/colors">
          <el-icon><Brush /></el-icon>
          <template #title>色彩标准库</template>
        </el-menu-item>
        <el-menu-item index="/inventory">
          <el-icon><Box /></el-icon>
          <template #title>库存管理</template>
        </el-menu-item>
        <el-menu-item index="/after-sales">
          <el-icon><Service /></el-icon>
          <template #title>售后管理</template>
        </el-menu-item>
        <el-menu-item index="/reviews">
          <el-icon><ChatDotRound /></el-icon>
          <template #title>评价管理</template>
        </el-menu-item>
        <el-menu-item index="/pricing">
          <el-icon><Money /></el-icon>
          <template #title>价格管理</template>
        </el-menu-item>
        <el-menu-item index="/members">
          <el-icon><Medal /></el-icon>
          <template #title>会员管理</template>
        </el-menu-item>
        <el-menu-item index="/categories">
          <el-icon><Collection /></el-icon>
          <template #title>分类管理</template>
        </el-menu-item>
        <el-menu-item index="/system">
          <el-icon><Setting /></el-icon>
          <template #title>系统管理</template>
        </el-menu-item>
        <el-menu-item index="/meta-mirror">
          <el-icon><Monitor /></el-icon>
          <template #title>元镜引擎</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <el-header class="header">
        <el-icon class="collapse-btn" @click="isCollapse = !isCollapse">
          <Fold v-if="!isCollapse" />
          <Expand v-else />
        </el-icon>
        <div class="header-right">
          <span class="username">{{ userStore.userInfo?.realName || '管理员' }}</span>
          <el-button type="danger" text size="small" @click="handleLogout">退出</el-button>
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Monitor,
  User,
  Goods,
  Notebook,
  Fold,
  Expand,
  View,
  ShoppingCart,
  Brush,
  Box,
  Service,
  ChatDotRound,
  Money,
  Collection,
  Setting,
  Reading,
  Medal,
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const isCollapse = ref(false)

const activeMenu = computed(() => route.path)

function handleLogout() {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.admin-layout {
  height: 100%;
}
.sidebar {
  background-color: #304156;
  transition: width 0.3s;
  overflow: visible;
}
.logo {
  height: auto;
  padding: 14px 20px 10px;
  display: flex;
  flex-direction: column;
  color: #fff;
  font-size: 15px;
  font-weight: bold;
  background-color: #263445;
  letter-spacing: 0.5px;
}
.logo span {
  line-height: 1.4;
}
.logo-hint {
  font-size: 10px;
  font-weight: 400;
  color: #8492a6;
  letter-spacing: 0;
  margin-top: 2px;
  line-height: 1.3;
}
.el-menu {
  border-right: none;
}
.sidebar .el-menu {
  height: calc(100% - 72px);
  overflow-y: auto;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  padding: 0 20px;
}
.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #606266;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.username {
  color: #606266;
  font-size: 14px;
}
.main-content {
  background: #f0f2f5;
}
</style>
