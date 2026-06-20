import { Controller, Post, Get, Body, Logger, UseGuards, HttpCode } from '@nestjs/common'
import { request as httpsRequest } from 'https'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import {
  BUILTIN_LLM_PROVIDERS,
  getAvailableProviders,
  findProviderForModel,
} from '../erdl/llm/erdl-llm-providers'
import { validateFetchUrl } from '../../common/utils/url-validator'
import type { ERDLLLMProvider } from '../erdl/llm/erdl-llm-provider.interface'
import { ModelRegistryService } from './model-registry.service'

/**
 * LLM API Key 管理控制器 — V1.2 合并版
 *
 * POST /system/llm/config       — 保存 Provider API Key（AES加密写DB + 运行时写env）
 * GET  /system/llm/providers    — 获取可用 Provider 和模型列表（供前端下拉框）
 * GET  /system/llm/keys         — STARTER 兼容端点（V1.1 格式）
 * POST /system/llm/test         — 测试 LLM 连接
 * POST /system/license/activate — 激活 OpenOBA License Key
 */
@Controller('system')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class LlmConfigController {
  private readonly logger = new Logger(LlmConfigController.name)

  constructor(
    private readonly modelRegistry: ModelRegistryService,
  ) {}

  /**
   * V1.2：保存 Provider Key
   *
   * - 主路径：AES 加密写入 sys_model_key 表（重启不丢失）
   * - 后备路径：写入 process.env（供非核心模块直接读 env 的场景）
   */
  @Post('llm/config')
  async saveLlmConfig(@Body() body: { provider: string; apiKey: string; baseUrl?: string }) {
    const provider = body.provider || 'deepseek'

    // 🔑 主路径：AES 加密写入数据库
    try {
      await this.modelRegistry.saveOrUpdateKey({
        providerCode: provider,
        apiKey: body.apiKey,
        baseUrl: body.baseUrl,
      })
      this.logger.log(`LLM Key saved to DB: provider=${provider}`)
    } catch (e: unknown) {
      this.logger.error(`Failed to save LLM Key to DB: ${(e as Error).message}`)
      return { success: false, error: `数据库写入失败: ${(e as Error).message}` }
    }

    // 后备：写入 process.env 提供运行时兼容
    const providerDef = BUILTIN_LLM_PROVIDERS.find((p) => p.id === provider)
    if (providerDef && body.apiKey) {
      process.env[providerDef.apiKeyEnv] = body.apiKey
    }

    return { success: true, provider }
  }

  /**
   * 返回所有可用 Provider 和模型列表（供前端下拉框）
   */
  @Get('llm/providers')
  async getProviders() {
    const available = getAvailableProviders()
    const list = available.map((p) => ({
      id: p.id,
      name: p.name,
      models: p.models.map((m) => ({
        id: m.id,
        name: m.name,
        reasoning: m.reasoning || false,
      })),
    }))

    return {
      success: true,
      count: list.length,
      providers: list,
    }
  }

  /**
   * STARTER 兼容端点：返回 Provider Key 列表（V1.1 格式）
   */
  @Get('llm/keys')
  async getKeys() {
    const available = getAvailableProviders()
    const list = available.map((p) => ({
      id: p.id,
      providerCode: p.id,
      agentCode: 'tanghaoran',
      label: p.name,
      hasKey: true,
      baseUrl: p.baseUrl,
      models: p.models.map((m) => ({
        id: `${p.id}:${m.id}`,
        modelCode: m.id,
        modelName: m.name,
        category: m.reasoning ? 'reasoning' : 'chat',
        contextWindow: m.contextWindow,
        maxTokens: m.maxTokens,
        supportsReasoning: m.reasoning ? 1 : 0,
        isDefault: m.id === p.defaultModel ? 1 : 0,
      })),
    }))
    return list
  }

  /**
   * 测试 Provider 连接
   */
  @Post('llm/test')
  async testLlmConnection(@Body() body: { provider: string; apiKey: string; baseUrl?: string }) {
    const provider = BUILTIN_LLM_PROVIDERS.find((p) => p.id === body.provider)
    const apiKey = body.apiKey || (provider ? process.env[provider.apiKeyEnv] : '') || ''
    if (!apiKey) {
      return { success: false, error: 'API Key 未配置' }
    }

    const baseUrl = body.baseUrl || provider?.baseUrl || 'https://api.deepseek.com'

    // SSRF 防护：校验 baseUrl 不指向内网
    const validationError = validateFetchUrl(baseUrl)
    if (validationError) {
      return { success: false, error: validationError }
    }

    return new Promise((resolve) => {
      const url = `${baseUrl}/v1/models`
      const req = httpsRequest(
        url,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: 8000,
        },
        (res) => {
          let data = ''
          res.on('data', (chunk: Buffer) => (data += chunk.toString()))
          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve({ success: true, message: '连接成功' })
            } else {
              resolve({ success: false, error: `HTTP ${res.statusCode}: ${data.substring(0, 200)}` })
            }
          })
        },
      )
      req.on('error', (e) => resolve({ success: false, error: e.message }))
      req.on('timeout', () => {
        req.destroy()
        resolve({ success: false, error: '连接超时' })
      })
      req.end()
    })
  }

  @Post('license/activate')
  async activateLicense(@Body() body: { key: string }) {
    const key = (body.key || '').trim().toUpperCase()
    if (!key.startsWith('OBA-')) {
      return { success: false, error: '无效的 License Key 格式' }
    }
    return {
      success: true,
      quota: '100 万 Token / 月',
      seats: '2 席位（1 管理员 + 1 运营者）',
    }
  }
}
