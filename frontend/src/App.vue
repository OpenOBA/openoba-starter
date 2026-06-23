<template>
  <el-config-provider :z-index="3000">
    <router-view v-if="$route.path === '/login'" />
    <div v-else class="app-shell">
      <header class="top-nav" :class="{ 'chat-mode': isChatActive }">
        <div class="nav-brand" @click="$router.push('/chat')">
          <img src="/logo.svg" alt="OpenOBA" class="brand-logo">
        </div>
        <nav class="nav-links">
          <router-link to="/chat" class="nav-item" :class="{ active: isChatActive }">
            ERA-Chat
          </router-link>
          <router-link to="/dashboard" class="nav-item" :class="{ active: isErpActive }">
            ERP 工作台
          </router-link>
        </nav>
        <div class="nav-right">
          <!-- 运行状态：双行紧凑 -->
          <div class="status-block" title="系统运行中">
            <svg class="status-dot" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="/lucide-sprite.svg#circle-check"/></svg>
            <span class="status-label">运行中</span>
          </div>

          <span v-if="isChatActive" class="menu-toggle" @click="menuOpen = !menuOpen">&#9776;</span>
          <el-button text size="small" @click="handleLogout" style="color:#909399">退出</el-button>

          <!-- 版本/升级信息：最右侧，低频低调 -->
          <el-popover
            placement="bottom-end"
            :width="280"
            trigger="click"
            @show="checkUpdate"
          >
            <template #reference>
              <span class="version-hint" :class="{ 'has-update': hasUpdate }" :title="hasUpdate ? `有新版本 v${latestVersion}` : `v${currentVersion}`">
                <span class="version-hint-text">v{{ currentVersion }}</span>
                <span v-if="hasUpdate" class="update-dot"></span>
              </span>
            </template>

            <div class="version-popover">
              <div class="vp-row">
                <span class="vp-label">当前版本</span>
                <span class="vp-value">{{ currentVersion }}</span>
              </div>
              <div class="vp-row" v-if="hasUpdate">
                <span class="vp-label">最新版本</span>
                <span class="vp-value vp-new">{{ latestVersion }}</span>
              </div>
              <div class="vp-row">
                <span class="vp-label">更新频道</span>
                <el-tag size="small" type="info">{{ updateChannel }}</el-tag>
              </div>
              <template v-if="hasUpdate && changelog">
                <div class="vp-divider"></div>
                <div class="vp-changelog">{{ changelog }}</div>
              </template>
              <template v-if="!hasUpdate && lastCheckTime">
                <div class="vp-divider"></div>
                <div class="vp-uptodate">✅ 已是最新版本</div>
                <div class="vp-check-time">上次检查：{{ lastCheckTime }}</div>
              </template>
              <template v-if="checkingUpdate">
                <div class="vp-divider"></div>
                <div class="vp-checking">⏳ 正在检查更新...</div>
              </template>
              <div class="vp-divider"></div>
              <div class="vp-actions">
                <el-button size="small" @click="checkUpdate" :loading="checkingUpdate">检查更新</el-button>
                <el-button v-if="hasUpdate" size="small" type="primary" @click="doUpgrade">立即升级</el-button>
              </div>
            </div>
          </el-popover>
        </div>
      </header>

      <!-- 子导航：仅 ERA-Chat 模式显示 -->
      <nav v-if="menuOpen && isChatActive" class="sub-nav chat-mode">
        <router-link to="/chat" class="sub-item" :class="{ active: $route.path === '/chat' }" @click="menuOpen = false">对话</router-link>
        <router-link to="/chat/agents" class="sub-item" :class="{ active: $route.path === '/chat/agents' }" @click="menuOpen = false">Agent</router-link>
        <router-link to="/chat/erdl" class="sub-item" :class="{ active: $route.path === '/chat/erdl' }" @click="menuOpen = false">ERDL</router-link>
        <router-link to="/chat/playground" class="sub-item" :class="{ active: $route.path === '/chat/playground' }" @click="menuOpen = false">实验</router-link>
        <router-link to="/chat/skills" class="sub-item" :class="{ active: $route.path === '/chat/skills' }" @click="menuOpen = false">技能</router-link>
        <router-link to="/chat/deployment" class="sub-item" :class="{ active: $route.path === '/chat/deployment' }" @click="menuOpen = false">交付</router-link>
        <router-link to="/chat/settings" class="sub-item" :class="{ active: $route.path === '/chat/settings' }" @click="menuOpen = false">设置</router-link>
      </nav>

      <main class="app-main">
        <router-view />
      </main>
    </div>
  </el-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '@/api/request'

const route = useRoute()
const router = useRouter()

const menuOpen = ref(false)

const isChatActive = computed(() => route.path.startsWith('/chat'))
const isErpActive = computed(() => !isChatActive.value && route.path !== '/login')

// ============================================
// 版本 / 升级信息
// ============================================
const currentVersion = ref('1.4.0-alpha9')
const latestVersion = ref('')
const hasUpdate = ref(false)
const updateChannel = ref('stable')
const changelog = ref('')
const lastCheckTime = ref('')
const checkingUpdate = ref(false)

async function checkUpdate() {
  checkingUpdate.value = true
  try {
    const res = await request.get('/system/version/check', {
      params: { current: currentVersion.value, channel: updateChannel.value }
    }) as Record<string, unknown>
    if (res.hasUpdate) {
      latestVersion.value = res.latestVersion as string
      hasUpdate.value = true
      changelog.value = (res.changelog as string) || ''
    } else {
      latestVersion.value = ''
      hasUpdate.value = false
      changelog.value = ''
    }
    lastCheckTime.value = new Date().toLocaleString('zh-CN')
  } catch {
    // 后端不可用时静默降级，保留当前版本号
    hasUpdate.value = false
    lastCheckTime.value = new Date().toLocaleString('zh-CN')
  } finally {
    checkingUpdate.value = false
  }
}

function doUpgrade() {
  window.open(`https://openoba.com/download?version=${latestVersion.value}`, '_blank')
}

function handleLogout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  router.push('/login')
}

// 点击菜单外部任意位置 → 收回菜单
function onDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (menuOpen.value && !target.closest('.sub-nav') && !target.closest('.menu-toggle')) {
    menuOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html, body, #app {
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}
</style>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f7fa;
}

.top-nav {
  height: 48px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  padding: 0 20px;
  flex-shrink: 0;
  z-index: 110;
}

.top-nav.chat-mode .nav-brand { position: absolute; left: 208px; }
.top-nav.chat-mode .nav-links { padding-left: 200px; }
.top-nav.chat-mode .nav-right { right: 20px; }

.nav-brand { cursor: pointer; z-index: 10; }
.brand-logo { height: 48px; width: auto; }
.nav-links { display: flex; justify-content: center; flex: 1; }
.nav-item {
  padding: 6px 24px; font-size: 13px; color: #606266;
  text-decoration: none; font-weight: 500;
  border-bottom: 2px solid transparent;
  cursor: pointer; display: inline-flex; align-items: center; gap: 4px;
  user-select: none;
}
.nav-item:hover { color: #303133; }
.nav-item.active { color: #409eff; border-bottom-color: #409eff; }
.nav-right { position: absolute; right: 20px; display: flex; align-items: center; gap: 8px; }

/* 运行状态：双行紧凑 */
.status-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  cursor: default;
  padding: 2px 6px;
  border-radius: 4px;
}
.status-block:hover { background: #f0f2f5; }
.status-dot { width: 14px; height: 14px; color: #67c23a; }
.status-label { font-size: 10px; color: #909399; line-height: 1; }

/* 版本号：最右外侧，极简低调 */
.version-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.15s;
  user-select: none;
}
.version-hint:hover { background: #f0f2f5; }
.version-hint-text { font-size: 10px; color: #c0c4cc; }
.version-hint.has-update .version-hint-text { color: #e6a23c; }
.update-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: #e6a23c;
  animation: pulse-dot 2s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* 版本 Popover 内容 */
.version-popover { font-size: 13px; }
.vp-row { display: flex; justify-content: space-between; align-items: center; padding: 2px 0; }
.vp-label { color: #909399; }
.vp-value { font-weight: 600; }
.vp-new { color: #e6a23c; }
.vp-divider { height: 1px; background: #ebeef5; margin: 8px 0; }
.vp-changelog { font-size: 12px; color: #606266; line-height: 1.6; white-space: pre-wrap; max-height: 160px; overflow-y: auto; }
.vp-uptodate { color: #67c23a; font-size: 12px; }
.vp-check-time { font-size: 11px; color: #c0c4cc; margin-top: 2px; }
.vp-checking { font-size: 12px; color: #909399; }
.vp-actions { display: flex; gap: 8px; justify-content: flex-end; }

/* 三横菜单按钮 */
.menu-toggle {
  font-size: 18px;
  color: #606266;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1;
  user-select: none;
}
.menu-toggle:hover { background: #f0f2f5; color: #303133; }

/* 子导航：右侧横向展开 — fixed + 最高层级，确保不被任何页面内元素遮挡 */
.sub-nav {
  position: fixed;
  top: 56px;
  right: 90px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
  padding: 6px 12px;
  z-index: 10000;
  display: flex;
  flex-direction: row;
  gap: 2px;
}
.sub-item {
  padding: 6px 14px;
  font-size: 12px;
  color: #606266;
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.12s;
  white-space: nowrap;
}
.sub-item:hover { color: #303133; background: #f5f7fa; }
.sub-item.active { color: #409eff; background: #ecf5ff; }

.app-main { flex: 1; overflow: hidden; }

.el-popper { z-index: 3000 !important; }
</style>
