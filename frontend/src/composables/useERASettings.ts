/**
 * useERASettings — ERA 工作区设置 composable
 *
 * 所有设置存储在 localStorage（key: era_settings）
 * 提供响应式读取 + 持久化写入 + 默认值
 */
import { reactive, watch } from 'vue'

export interface WorkspaceSettings {
  rootDir: string
  deliverablesDir: string
  draftsDir: string
  logsDir: string
  knowledgeDir: string
}

export interface AgentBehaviorSettings {
  workspacePath: string
  logRetentionDays: number
  autoArchiveLogs: boolean
  autoRefineMemory: boolean
  defaultModel: string
  maxRetries: number
  timeoutSeconds: number
  autoApprove: boolean
}

export interface DeliverableSettings {
  versionFormat: string
  autoCreateVersionDir: boolean
  autoGenerateManifest: boolean
  autoUpdateIndex: boolean
  autoWriteTimeline: boolean
}

export interface FileSettings {
  tempRetentionDays: number
  maxUploadSizeMB: number
  exportFormats: string[]
}

export interface NotificationSettings {
  taskComplete: boolean
  errorAlert: boolean
}

export interface AppearanceSettings {
  themeColor: string
  fontSize: string
  messageDensity: string
}

export interface NetworkSettings {
  httpProxy: string
  httpsProxy: string
}

export interface ERASettings {
  workspace: WorkspaceSettings
  agent: AgentBehaviorSettings
  deliverables: DeliverableSettings
  files: FileSettings
  notifications: NotificationSettings
  appearance: AppearanceSettings
  network: NetworkSettings
}

const STORAGE_KEY = 'era_settings'

const defaultWorkspace = () => {
  // 优先使用环境注入的工作区路径，否则使用浏览器当前页面的 origin 推断
  const cwd = (window as any).__ERA_WORKSPACE__ || ''
  if (cwd) return cwd
  // 默认指向当前项目所在的工作空间目录（openoba-starter 根）
  // 用户可在设置中自行修改
  return ''
}

function defaults(): ERASettings {
  const ws = defaultWorkspace()
  return {
    workspace: {
      rootDir: ws,
      deliverablesDir: `${ws}/deliverables`,
      draftsDir: `${ws}/drafts`,
      logsDir: `${ws}/logs`,
      knowledgeDir: `${ws}/knowledge`,
    },
    agent: {
      workspacePath: `${ws}/workspace`,
      logRetentionDays: 90,
      autoArchiveLogs: true,
      autoRefineMemory: true,
      defaultModel: 'qwen3.6-plus',
      maxRetries: 3,
      timeoutSeconds: 300,
      autoApprove: false,
    },
    deliverables: {
      versionFormat: 'V{n}',
      autoCreateVersionDir: true,
      autoGenerateManifest: true,
      autoUpdateIndex: true,
      autoWriteTimeline: true,
    },
    files: {
      tempRetentionDays: 30,
      maxUploadSizeMB: 20,
      exportFormats: ['markdown'],
    },
    notifications: {
      taskComplete: true,
      errorAlert: true,
    },
    appearance: {
      themeColor: '#409eff',
      fontSize: 'medium',
      messageDensity: 'comfortable',
    },
    network: {
      httpProxy: '',
      httpsProxy: '',
    },
  }
}

function load(): ERASettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // 深度合并默认值（确保新增字段有默认值）
      return deepMerge(defaults(), parsed)
    }
  } catch (e) { console.warn('[useERASettings] 解析配置失败:', e instanceof Error ? e.message : String(e)) }
  return defaults()
}

function deepMerge<T extends Record<string, any>>(base: T, override: Partial<T>): T {
  const result = { ...base } as Record<string, any>
  for (const key of Object.keys(base)) {
    if (override[key] !== undefined) {
      if (typeof base[key] === 'object' && !Array.isArray(base[key]) && typeof override[key] === 'object') {
        result[key] = deepMerge(base[key], override[key] as any)
      } else {
        result[key] = override[key]
      }
    }
  }
  return result as T
}

function save(settings: ERASettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

// ---- 单例 ----
const settings = reactive<ERASettings>(load())

// 自动持久化（debounce 600ms）
let saveTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => settings,
  () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => save({ ...settings }), 600)
  },
  { deep: true },
)

export function useERASettings() {
  function resetToDefaults() {
    const def = defaults()
    Object.assign(settings, def)
  }

  function resetSection<K extends keyof ERASettings>(section: K) {
    const def = defaults()
    Object.assign(settings[section], def[section])
  }

  return {
    settings,
    resetToDefaults,
    resetSection,
  }
}
