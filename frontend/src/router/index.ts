import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录', requiresAuth: false },
  },
  {
    path: '/wizard',
    name: 'Wizard',
    component: () => import('@/views/Wizard.vue'),
    meta: { title: '初始化设置', requiresAuth: false },
  },

  // ═══ ERA-Chat 一级入口（不含侧边栏） ═══
  {
    path: '/chat',
    component: () => import('@/views/tasks/ChatShell.vue'),
    children: [
      { path: '', name: 'Chat', component: () => import('@/views/tasks/TaskDashboard.vue'), meta: { title: 'ERA-Chat' } },
      { path: 'agents', name: 'ChatAgents', component: () => import('@/components/AgentManagement.vue'), meta: { title: 'Agent 管理' } },
      { path: 'erdl', name: 'ChatErdl', component: () => import('@/views/erdl/ERDLManagement.vue'), meta: { title: 'ERDL' } },
      { path: 'playground', name: 'ChatPlayground', component: () => import('@/views/erdl/ERDLPlayground.vue'), meta: { title: '实验' } },
      { path: 'skills', name: 'ChatSkills', component: () => import('@/views/Skills.vue'), meta: { title: '技能' } },
      { path: 'deployment', name: 'ChatDeployment', component: () => import('@/views/Deployment.vue'), meta: { title: '交付' } },
      { path: 'settings', name: 'ChatSettings', component: () => import('@/views/tasks/Settings.vue'), meta: { title: '设置' } },
      { path: ':id', name: 'AgentChat', component: () => import('@/views/tasks/AgentChat.vue'), meta: { title: 'Agent 会话' } },
    ],
  },

  // ═══ ERP 骨架（含侧边栏布局） ═══
  {
    path: '/',
    component: () => import('@/components/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '工作台', icon: 'Monitor' },
      },
      {
        path: 'customers',
        name: 'Customers',
        component: () => import('@/views/Customers.vue'),
        meta: { title: '客户管理', icon: 'User' },
      },
      {
        path: 'products',
        name: 'Products',
        component: () => import('@/views/Products.vue'),
        meta: { title: '商品管理', icon: 'Goods' },
      },
      {
        path: 'dictionary',
        name: 'Dictionary',
        component: () => import('@/views/Dictionary.vue'),
        meta: { title: '字典管理', icon: 'Notebook' },
      },
      {
        path: 'structure',
        name: 'StructureStandard',
        component: () => import('@/views/StructureStandard.vue'),
        meta: { title: '结构标准库', icon: 'View' },
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/Orders.vue'),
        meta: { title: '订单管理', icon: 'ShoppingCart' },
      },
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('@/views/Inventory.vue'),
        meta: { title: '库存管理', icon: 'Box' },
      },
      {
        path: 'colors',
        name: 'Colors',
        component: () => import('@/views/Colors.vue'),
        meta: { title: '色彩标准库', icon: 'Brush' },
      },
      {
        path: 'after-sales',
        name: 'AfterSales',
        component: () => import('@/views/AfterSales.vue'),
        meta: { title: '售后管理', icon: 'Service' },
      },
      {
        path: 'reviews',
        name: 'Reviews',
        component: () => import('@/views/Reviews.vue'),
        meta: { title: '评价管理', icon: 'ChatDotRound' },
      },
      {
        path: 'draft-pool',
        name: 'DraftPool',
        component: () => import('@/views/DraftPool.vue'),
        meta: { title: '草稿池', icon: 'Collection' },
      },
      {
        path: 'pricing',
        name: 'Pricing',
        component: () => import('@/views/Pricing.vue'),
        meta: { title: '价格管理', icon: 'Money' },
      },
      {
        path: 'members',
        name: 'Members',
        component: () => import('@/views/Members.vue'),
        meta: { title: '会员管理', icon: 'Medal' },
      },
      {
        path: 'erdl',
        name: 'ERDL',
        component: () => import('@/views/erdl/ERDLManagement.vue'),
        meta: { title: 'ERDL 管理', icon: 'MagicStick' },
      },
      {
        path: 'erdl/playground',
        name: 'ERDLPlayground',
        component: () => import('@/views/erdl/ERDLPlayground.vue'),
        meta: { title: 'ERDL Playground', icon: 'Cpu' },
      },
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('@/views/Categories.vue'),
        meta: { title: '分类管理', icon: 'Collection' },
      },
      {
        path: 'tasks',
        name: 'Tasks',
        redirect: '/chat',
      },
      {
        path: 'tasks/:id',
        name: 'TaskDetail',
        component: () => import('@/views/tasks/TaskDetail.vue'),
        meta: { title: '任务详情', icon: 'List' },
      },
      {
        path: 'knowledge',
        name: 'Knowledge',
        component: () => import('@/views/KnowledgeCenter.vue'),
        meta: { title: '知识库', icon: 'Reading' },
      },
      {
        path: 'skills',
        name: 'Skills',
        component: () => import('@/views/Skills.vue'),
        meta: { title: '技能市场', icon: 'Connection' },
      },
      {
        path: 'deployment',
        name: 'Deployment',
        component: () => import('@/views/Deployment.vue'),
        meta: { title: '交付管理', icon: 'UploadFilled' },
      },
      {
        path: 'system',
        name: 'System',
        component: () => import('@/views/System.vue'),
        meta: { title: '系统管理', icon: 'Setting' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/chat',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (!payload.exp) return false
    return Date.now() >= payload.exp * 1000
  } catch (e) {
    console.warn('[Router] JWT解析失败:', e instanceof Error ? e.message : String(e))
    return true
  }
}

router.beforeEach((to, _from) => {
  const token = localStorage.getItem('access_token')
  if (to.meta.requiresAuth !== false && !token) {
    return '/login'
  }
  if (to.meta.requiresAuth !== false && token && isTokenExpired(token)) {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    return '/login'
  }
})

export default router
