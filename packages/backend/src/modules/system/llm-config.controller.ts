import { Controller, Post, Get, Delete, Body, Param, Logger, UseGuards } from '@nestjs/common'
import { request as httpsRequest } from 'https'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { ModelRegistryService } from '@openoba/core/dist/modules/system/model-registry.service'
import {
  BUILTIN_LLM_PROVIDERS,
  getAvailableProviders,
} from '@openoba/core/dist/modules/erdl/llm/erdl-llm-providers'
import { validateFetchUrl } from '@openoba/core/dist/common/utils/url-validator'

@Controller('system')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class LlmConfigController {
  private readonly logger = new Logger(LlmConfigController.name)

  constructor(private readonly modelRegistry: ModelRegistryService) {}

  // ============================================================
  //  P1-1: 数据库优先 — Provider 列表（ERA-Chat 下拉框 + Settings 列表共用）
  // ============================================================

  @Get('llm/providers')
  async getProviders() {
    try {
      const dbProviders = await this.modelRegistry.getEnabledProvidersWithModels()
      if (dbProviders && dbProviders.length > 0) {
        this.logger.log(`Providers from DB: ${dbProviders.length}`)
        return { success: true, count: dbProviders.length, providers: dbProviders }
      }
    } catch (e: unknown) {
      this.logger.warn(`DB Provider 读取失败，降级为硬编码: ${(e as Error).message}`)
    }

    // 兜底：硬编码（首次启动无 DB 数据时）
    const available = getAvailableProviders()
    const list = available.map((p: any) => ({
      id: p.id,
      name: p.name,
      models: p.models.map((m: any) => ({
        id: m.id,
        name: m.name,
        reasoning: m.reasoning || false,
      })),
    }))
    return { success: true, count: list.length, providers: list }
  }

  // ============================================================
  //  P1-1: 已配置 Key 列表（Settings 列表展示用）
  // ============================================================

  @Get('llm/keys')
  async getKeys() {
    try {
      const dbKeys = await this.modelRegistry.getProviderKeys()
      if (dbKeys && dbKeys.length > 0) {
        this.logger.log(`Keys from DB: ${dbKeys.length}`)
        return dbKeys
      }
    } catch (e: unknown) {
      this.logger.warn(`DB Keys 读取失败: ${(e as Error).message}`)
    }

    // 兜底：硬编码
    const available = getAvailableProviders()
    const list = available.map((p: any) => ({
      id: p.id,
      providerCode: p.id,
      agentCode: 'global',
      label: p.name,
      hasKey: true,
      baseUrl: p.baseUrl || null,
      models: p.models.map((m: any) => ({
        id: p.id + ':' + m.id,
        modelCode: m.id,
        modelName: m.name,
        category: m.reasoning ? 'reasoning' : 'chat',
        contextWindow: m.contextWindow || 0,
        maxTokens: m.maxTokens || 0,
        supportsReasoning: m.reasoning ? 1 : 0,
        isDefault: m.id === p.defaultModel ? 1 : 0,
      })),
    }))
    return list
  }

  // ============================================================
  //  P1-1: 保存/更新 Key（支持自定义 Provider）
  // ============================================================

  @Post('llm/config')
  async saveLlmConfig(
    @Body()
    body: {
      provider: string
      apiKey: string
      baseUrl?: string
      modelCode?: string
      label?: string
      providerName?: string
      customProviderCode?: string
    },
  ) {
    const provider = body.provider || 'deepseek'

    // 自定义 Provider：写入 sys_model_provider + sys_model_registry
    if (body.customProviderCode && body.providerName) {
      try {
        await this.modelRegistry.saveOrUpdateKey({
          providerCode: body.customProviderCode,
          apiKey: body.apiKey || '',
          baseUrl: body.baseUrl,
          label: body.label,
        })
        this.logger.log(`Custom Provider Key saved: ${body.customProviderCode}`)
        if (body.apiKey && body.modelCode) {
          try {
            const kd = await this.modelRegistry.getKeyWithDecrypted(body.customProviderCode)
            if (kd) {
              const models = await (this.modelRegistry as any).registryRepo?.find({
                where: { providerCode: body.customProviderCode, modelCode: body.modelCode },
              })
              if (models?.length) {
                await this.modelRegistry.setDefaultModel(kd.key.id, models[0].id)
              }
            }
          } catch { /* model linking best-effort */ }
        }
        return { success: true, provider: body.customProviderCode, custom: true }
      } catch (e: unknown) {
        this.logger.warn(`Custom Provider save failed: ${(e as Error).message}`)
        return { success: false, error: (e as Error).message }
      }
    }

    // 标准 Provider：AES 加密写入 DB
    try {
      await this.modelRegistry.saveOrUpdateKey({
        providerCode: provider,
        apiKey: body.apiKey,
        baseUrl: body.baseUrl,
        label: body.label,
      })
      this.logger.log(`LLM Key saved to DB: provider=${provider}`)
    } catch (e: unknown) {
      this.logger.warn(`DB write failed (Key still in memory): ${(e as Error).message}`)
    }

    // 同步 process.env（运行时兼容 erdl-llm-bridge）
    const providerDef = BUILTIN_LLM_PROVIDERS.find((p: any) => p.id === provider)
    if (providerDef && body.apiKey) {
      process.env[providerDef.apiKeyEnv] = body.apiKey
    }

    // 设置默认模型（如果指定了 modelCode）
    if (body.modelCode && body.apiKey) {
      try {
        const kd = await this.modelRegistry.getKeyWithDecrypted(provider)
        if (kd) {
          const models = await this.modelRegistry.getModels(provider)
          const matched = models?.find((m) => m.modelCode === body.modelCode)
          if (matched) {
            await this.modelRegistry.setDefaultModel(kd.key.id, matched.id)
            this.logger.log(`Default model sync: ${provider}/${body.modelCode}`)
          }
        }
      } catch { /* no-op */ }
    }

    this.logger.log(`LLM config saved: provider=${provider}`)
    return { success: true, provider }
  }

  // ============================================================
  //  P1-1: 测试连接（DB 优先）
  // ============================================================

  @Post('llm/test')
  async testLlmConnection(@Body() body: { provider: string; apiKey: string; baseUrl?: string }) {
    // 主路径：使用 ModelRegistryService
    try {
      const result = await this.modelRegistry.testConnection({
        providerCode: body.provider,
        apiKey: body.apiKey || undefined,
        baseUrl: body.baseUrl || undefined,
      })
      return {
        success: result.ok,
        message: result.ok ? '连接成功' : (result.error || '连接失败'),
        latencyMs: result.latencyMs,
      }
    } catch {
      // fall through to fallback
    }

    // 兜底：硬编码 Provider
    const providerDef = BUILTIN_LLM_PROVIDERS.find((p: any) => p.id === body.provider)
    const apiKey = body.apiKey || (providerDef ? process.env[providerDef.apiKeyEnv] : '') || ''
    if (!apiKey) return { success: false, error: 'API Key 未配置' }
    const baseUrl = body.baseUrl || providerDef?.baseUrl || 'https://api.deepseek.com'

    // SSRF 防护
    const validationError = validateFetchUrl(baseUrl)
    if (validationError) return { success: false, error: validationError }

    return new Promise((resolve) => {
      const req = httpsRequest(
        baseUrl + '/v1/models',
        {
          method: 'GET',
          headers: { Authorization: 'Bearer ' + apiKey },
          timeout: 8000,
        },
        (res: any) => {
          let d = ''
          res.on('data', (c: any) => (d += c))
          res.on('end', () =>
            resolve(
              res.statusCode === 200
                ? { success: true, message: '连接成功' }
                : { success: false, error: 'HTTP ' + res.statusCode },
            ),
          )
        },
      )
      req.on('error', (e: any) => resolve({ success: false, error: e.message }))
      req.on('timeout', () => {
        req.destroy()
        resolve({ success: false, error: '连接超时' })
      })
      req.end()
    })
  }

  // ============================================================
  //  P1-1: 设置默认模型
  // ============================================================

  @Post('llm/config/set-default')
  async setDefaultModel(@Body() body: { provider: string; modelCode: string }) {
    try {
      // 获取该 provider 的 key（已被 onModuleInit 解密导入 process.env）
      const kd = await this.modelRegistry.getKeyWithDecrypted(body.provider)
      if (!kd) return { success: false, error: '请先配置该 Provider 的 API Key' }
      // 找到对应的 model registry 记录
      const models = await this.modelRegistry.getModels(body.provider)
      const matched = models?.find((m) => m.modelCode === body.modelCode)
      if (!matched) return { success: false, error: 'Model not found' }
      const result = await this.modelRegistry.setDefaultModel(kd.key.id, matched.id)
      this.logger.log(`Default model ${result.isDefault ? 'set' : 'unset'}: ${body.provider}/${body.modelCode}`)
      return { success: true, isDefault: result.isDefault }
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message }
    }
  }

  // ============================================================
  //  P1-1: 删除 Key
  // ============================================================

  @Delete('llm/config/:id')
  async deleteLlmConfig(@Param('id') id: string) {
    try {
      await this.modelRegistry.deleteKey(id)
      this.logger.log(`LLM Key deleted: ${id}`)
      return { success: true }
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message }
    }
  }

  // ============================================================
  //  删除单个模型记录（从 provider 的 models 列表中移除）
  // ============================================================

  @Delete('llm/models/:id')
  async deleteLlmModel(@Param('id') id: string) {
    try {
      await this.modelRegistry.deleteModel(id)
      this.logger.log(`LLM Model deleted: ${id}`)
      return { success: true }
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message }
    }
  }

  // ============================================================
  //  License 激活（占位）
  // ============================================================

  @Post('license/activate')
  async activateLicense(@Body() body: { key: string }) {
    const key = (body.key || '').trim().toUpperCase()
    if (!key.startsWith('OBA-')) return { success: false, error: '无效的 License Key 格式' }
    return { success: true, quota: '100 万 Token / 月', seats: '2 席位（1 管理员 + 1 运营者）' }
  }
}
