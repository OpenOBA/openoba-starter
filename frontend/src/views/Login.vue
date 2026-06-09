<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="login-header">
          <h2>开源ERP参考实现</h2>
          <p>眼镜制造/零售行业</p>
          <p class="login-subtitle">人机共创，想改就改</p>
        </div>
      </template>

      <el-form :model="form" :rules="rules" ref="formRef" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" size="large" prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" style="width: 100%" :loading="loading" @click="handleLogin">
            登 录
          </el-button>
          <div class="login-hint">
            <p>默认管理员账号：<code>admin</code> 密码：<code>admin123</code></p>
          </div>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { login } from '@/api/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const result = await login(form)
    userStore.setToken(result.accessToken)
    userStore.setInfo(result.user)
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (e: unknown) {
    // 401 错误已在拦截器处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-card {
  width: 420px;
}
.login-header {
  text-align: center;
}
.login-header h2 {
  margin: 0;
  color: #303133;
  font-size: 20px;
}
.login-header p {
  margin: 4px 0 0;
  color: #909399;
  font-size: 12px;
}
.login-subtitle {
  margin: 8px 0 0 !important;
  color: #c0c4cc !important;
  font-size: 11px !important;
}
.login-hint {
  text-align: center;
  margin-top: 12px;
  color: #a8abb2;
  font-size: 12px;
}
.login-hint code {
  background: #f4f4f5;
  padding: 1px 6px;
  border-radius: 3px;
  font-family: monospace;
  color: #606266;
}
</style>
