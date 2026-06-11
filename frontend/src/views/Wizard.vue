<template>
  <div class="wizard-page">
    <!-- 顶部标题 -->
    <div class="wizard-header">
      <h1>🚀 OpenOBA Starter</h1>
      <p>AI 执行官 · 眼镜行业 ERP 系统初始化</p>
    </div>

    <!-- 4步横屏指示器 -->
    <div class="wizard-steps-bar">
      <div v-for="(step, idx) in steps" :key="idx" class="step-node" :class="{ done: step.status === 'done', active: step.status === 'active', failed: step.status === 'failed' }">
        <div class="step-dot">
          <span v-if="step.status === 'done'">✓</span>
          <span v-else-if="step.status === 'failed'">✗</span>
          <span v-else>{{ idx + 1 }}</span>
        </div>
        <div class="step-text">
          <div class="step-title">{{ step.title }}</div>
          <div class="step-status-text">
            <template v-if="step.status === 'done'">已完成</template>
            <template v-else-if="step.status === 'active'">进行中</template>
            <template v-else-if="step.status === 'failed'">失败</template>
            <template v-else>等待</template>
          </div>
        </div>
        <div v-if="idx < steps.length - 1" class="step-line" :class="{ done: step.status === 'done' }" />
      </div>
    </div>

    <!-- 步骤内容区域 -->
    <div class="wizard-body">
      <!-- Step 1: 数据库连接 -->
      <div v-if="currentStep === 0" class="step-panel">
        <h2>📋 步骤 1：数据库连接</h2>
        <p class="hint">连接你的 MySQL 数据库。如果还没安装，请先安装 MySQL 8.0+。</p>
        <el-form :model="db" label-width="100px" size="default">
          <el-form-item label="主机地址"><el-input v-model="db.host" placeholder="localhost" /></el-form-item>
          <el-form-item label="端口"><el-input-number v-model="db.port" :min="1" :max="65535" /></el-form-item>
          <el-form-item label="用户名"><el-input v-model="db.username" placeholder="root" /></el-form-item>
          <el-form-item label="密码"><el-input v-model="db.password" type="password" placeholder="输入 MySQL 密码" show-password /></el-form-item>
          <el-form-item label="数据库名"><el-input v-model="db.database" placeholder="openoba_starter" /></el-form-item>
          <el-form-item>
            <el-button type="primary" @click="testDb" :loading="testing">🔍 测试连接</el-button>
            <span v-if="dbResult" :class="dbResult.success ? 'ok' : 'fail'">{{ dbResult.success ? '✅' : '❌' }} {{ dbResult.message }}</span>
          </el-form-item>
        </el-form>
        <div class="step-actions">
          <el-button type="primary" size="large" @click="goStep(1)" :disabled="!dbConnected">下一步 →</el-button>
        </div>
      </div>

      <!-- Step 2: 建库建表 -->
      <div v-if="currentStep === 1" class="step-panel">
        <h2>📦 步骤 2：建库建表</h2>
        <p class="hint">在数据库中创建 {{ db.database }} 数据库和 128 张表。</p>
        <div v-if="!step2Done" class="init-area">
          <el-button type="primary" size="large" @click="createTables" :loading="creating" :disabled="creating">🏗️ 开始建表</el-button>
          <div v-if="creating" style="margin-top:16px">
            <el-progress :percentage="tableProgress" :stroke-width="12" :text-inside="true" />
            <p class="progress-text">{{ tableProgressText }}</p>
          </div>
        </div>
        <div v-else class="result ok">
          <p>✅ 建表完成！已创建 {{ tableCount }} 张表。</p>
        </div>
        <div class="step-actions">
          <el-button size="large" @click="goStep(0)">← 上一步</el-button>
          <el-button type="primary" size="large" @click="goStep(2)" :disabled="!step2Done">下一步 →</el-button>
        </div>
      </div>

      <!-- Step 3: 种子数据 -->
      <div v-if="currentStep === 2" class="step-panel">
        <h2>🌱 步骤 3：导入种子数据</h2>
        <p class="hint">创建管理员账号、角色、权限和菜单初始数据。</p>
        <div v-if="!step3Done" class="init-area">
          <el-button type="primary" size="large" @click="seedData" :loading="seeding" :disabled="seeding">🌱 导入种子数据</el-button>
          <div v-if="seeding" style="margin-top:16px">
            <el-progress :percentage="seedProgress" :stroke-width="12" :text-inside="true" />
            <p class="progress-text">{{ seedProgressText }}</p>
          </div>
        </div>
        <div v-else class="result ok">
          <p>✅ 种子数据导入成功！</p>
          <p class="hint">默认管理员：admin / admin123</p>
        </div>
        <div class="step-actions">
          <el-button size="large" @click="goStep(1)">← 上一步</el-button>
          <el-button type="primary" size="large" @click="goStep(3)" :disabled="!step3Done">下一步 →</el-button>
        </div>
      </div>

      <!-- Step 4: 完成 -->
      <div v-if="currentStep === 3" class="step-panel">
        <h2>🎉 初始化完成！</h2>
        <p class="hint">系统已就绪，可以登录使用。API Key 可在 ERA-Chat → 设置中配置。</p>
        <div class="done-box">
          <p><strong>登录地址：</strong><code>{{ loginUrl }}</code></p>
          <p><strong>用户名：</strong>admin</p>
          <p><strong>密码：</strong>admin123</p>
          <p class="warn">⚠️ 首次登录后请立即修改密码！</p>
          <p class="hint">💡 DeepSeek API Key 新用户免费送 500 万 token：<a href="https://platform.deepseek.com/api_keys" target="_blank">获取 Key</a></p>
        </div>
        <div class="step-actions">
          <el-button size="large" @click="goStep(2)">← 上一步</el-button>
          <el-button type="success" size="large" @click="goLogin">🚀 进入登录页面</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const API_BASE = '/api'

// Steps
const steps = reactive([
  { title: '数据库连接', status: 'active' as string },
  { title: '建库建表', status: 'pending' as string },
  { title: '种子数据', status: 'pending' as string },
  { title: '完成', status: 'pending' as string },
])
const currentStep = ref(0)

// Step 1: DB config
const db = reactive({ host: 'localhost', port: 3306, username: 'root', password: '', database: 'openoba_starter' })
const testing = ref(false)
const dbResult = ref<{ success: boolean; message: string } | null>(null)
const dbConnected = ref(false)

// Step 2: Create tables
const creating = ref(false)
const step2Done = ref(false)
const tableCount = ref(0)
const tableProgress = ref(0)
const tableProgressText = ref('')
const TABLE_COUNT = 128

// Step 3: Seed
const seeding = ref(false)
const step3Done = ref(false)
const seedProgress = ref(0)
const seedProgressText = ref('')

const loginUrl = computed(() => window.location.origin + '/login')

function updateSteps(activeIdx: number) {
  for (let i = 0; i < steps.length; i++) {
    if (i < activeIdx) steps[i].status = 'done'
    else if (i === activeIdx) steps[i].status = 'active'
    else steps[i].status = 'pending'
  }
}

function goStep(idx: number) {
  currentStep.value = idx
  updateSteps(idx)
}

async function testDb() {
  testing.value = true
  dbResult.value = null
  try {
    const res = await fetch(`${API_BASE}/wizard/test-db`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: db.host, port: db.port, username: db.username, password: db.password }),
    })
    const raw = await res.json()
    dbResult.value = raw.data || raw
    dbConnected.value = dbResult.value!.success
  } catch (e: any) {
    dbResult.value = { success: false, message: `网络错误：${e.message}` }
    dbConnected.value = false
  } finally { testing.value = false }
}

async function createTables() {
  creating.value = true
  tableProgress.value = 0
  tableProgressText.value = '正在创建数据库...'
  try {
    const res = await fetch(`${API_BASE}/wizard/create-tables`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: db.host, port: db.port, username: db.username, password: db.password, database: db.database }),
    })
    // Simulate progress (SSE would be better, but polling progress is fine for wizard)
    const interval = setInterval(() => {
      if (tableProgress.value < 90) { const arr = new Uint32Array(1); crypto.getRandomValues(arr); tableProgress.value += (arr[0] % 15); tableProgressText.value = `正在创建表 (${Math.floor(tableProgress.value)}%)...` }
    }, 300)
    const raw = await res.json()
    clearInterval(interval)
    const data = raw.data || raw
    if (data.success) {
      tableProgress.value = 100
      tableProgressText.value = '建表完成！'
      tableCount.value = data.tableCount || TABLE_COUNT
      step2Done.value = true
      steps[1].status = 'done'
    } else {
      tableProgressText.value = '建表失败：' + (data.message || '')
      steps[1].status = 'failed'
    }
  } catch (e: any) {
    tableProgressText.value = '建表失败：' + e.message
    steps[1].status = 'failed'
  } finally { creating.value = false }
}

async function seedData() {
  seeding.value = true
  seedProgress.value = 0
  seedProgressText.value = '正在导入种子数据...'
  try {
    const interval = setInterval(() => { if (seedProgress.value < 90) { seedProgress.value += 20; seedProgressText.value = '正在导入...' } }, 400)
    const res = await fetch(`${API_BASE}/wizard/seed-db`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: db.host, port: db.port, username: db.username, password: db.password, database: db.database }),
    })
    clearInterval(interval)
    const raw = await res.json()
    const data = raw.data || raw
    if (data.success) {
      seedProgress.value = 100
      seedProgressText.value = '种子数据导入完成！'
      step3Done.value = true
      steps[2].status = 'done'
    } else {
      seedProgressText.value = '导入失败：' + (data.message || '')
      steps[2].status = 'failed'
    }
  } catch (e: any) {
    seedProgressText.value = '导入失败：' + e.message
    steps[2].status = 'failed'
  } finally { seeding.value = false }
}

function goLogin() {
  router.push('/login')
}
</script>

<style scoped>
.wizard-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
  padding: 40px 20px;
}
.wizard-header { text-align: center; color: #fff; margin-bottom: 32px; }
.wizard-header h1 { font-size: 28px; margin: 0; }
.wizard-header p { font-size: 14px; color: #94a3b8; margin-top: 4px; }

.wizard-steps-bar { display: flex; align-items: center; justify-content: center; width: 100%; max-width: 720px; margin-bottom: 32px; }
.step-node { display: flex; flex-direction: column; align-items: center; position: relative; flex: 1; }
.step-dot { width: 36px; height: 36px; border-radius: 50%; background: #334155; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; transition: all 0.3s; }
.step-dot span { font-size: 14px; }
.step-node.active .step-dot { background: #3b82f6; color: #fff; box-shadow: 0 0 12px rgba(59,130,246,0.5); }
.step-node.done .step-dot { background: #22c55e; color: #fff; }
.step-node.failed .step-dot { background: #ef4444; color: #fff; }
.step-text { text-align: center; margin-top: 8px; }
.step-title { font-size: 13px; color: #e2e8f0; font-weight: 500; }
.step-status-text { font-size: 11px; color: #64748b; }
.step-node.active .step-title { color: #60a5fa; }
.step-node.done .step-title { color: #4ade80; }
.step-line { position: absolute; top: 18px; left: calc(50% + 18px); width: calc(100% - 36px); height: 2px; background: #334155; }
.step-line.done { background: #22c55e; }

.wizard-body { width: 100%; max-width: 640px; background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 24px 80px rgba(0,0,0,0.3); }
.step-panel h2 { font-size: 20px; margin: 0 0 8px 0; color: #0f172a; }
.hint { font-size: 14px; color: #64748b; margin: 0 0 20px 0; line-height: 1.6; }
.hint a { color: #3b82f6; }
.ok { color: #166534; }
.fail { color: #991b1b; }
.result { padding: 12px 16px; border-radius: 8px; margin-top: 12px; font-size: 14px; }
.result.ok { background: #f0fdf4; border: 1px solid #bbf7d0; }
.init-area { padding: 20px 0; }
.progress-text { font-size: 13px; color: #64748b; margin-top: 8px; }
.done-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 16px 0; }
.done-box p { margin: 6px 0; font-size: 14px; }
.done-box code { background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 13px; }
.warn { color: #e6a23c; }
.step-actions { margin-top: 24px; display: flex; justify-content: flex-end; gap: 12px; }
</style>
