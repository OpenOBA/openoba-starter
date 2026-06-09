import { Controller, Post, Get, Body, Logger, UseGuards } from '@nestjs/common'
import { request as httpsRequest } from 'https'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { ModelRegistryService } from '@openoba/core/dist/modules/system/model-registry.service'
import {
  BUILTIN_LLM_PROVIDERS,
  getAvailableProviders,
} from '@openoba/core/dist/modules/erdl/llm/erdl-llm-providers'

@Controller('system')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class LlmConfigController {
  private readonly logger = new Logger(LlmConfigController.name)

  constructor(private readonly modelRegistry: ModelRegistryService) {}

  @Post('llm/config')
  async saveLlmConfig(@Body() body: { provider: string; apiKey: string; baseUrl?: string }) {
    const provider = body.provider || 'deepseek'

    // 主路径：AES 加密写入数据库
    try {
      await this.modelRegistry.saveOrUpdateKey({
        providerCode: provider,
        apiKey: body.apiKey,
        baseUrl: body.baseUrl,
      })
      this.logger.log(`LLM Key saved to DB: provider=${provider}`)
    } catch (e: unknown) {
      this.logger.warn(`DB write failed (Key still in memory): ${(e as Error).message}`)
    }

    // 后备：写入 process.env 提供运行时兼容
    const providerDef = BUILTIN_LLM_PROVIDERS.find((p: any) => p.id === provider)
    if (providerDef && body.apiKey) {
      process.env[providerDef.apiKeyEnv] = body.apiKey
    }

    this.logger.log(`LLM config saved: provider=${provider}`)
    return { success: true, provider }
  }

  @Get('llm/providers')
  async getProviders() {
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

  @Get('llm/keys')
  async getKeys() {
    const available = getAvailableProviders()
    const list = available.map((p: any) => ({
      id: p.id,
      providerCode: p.id,
      agentCode: 'tanghaoran',
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

  @Post('llm/test')
  async testLlmConnection(@Body() body: { provider: string; apiKey: string; baseUrl?: string }) {
    const providerDef = BUILTIN_LLM_PROVIDERS.find((p: any) => p.id === body.provider)
    const apiKey = body.apiKey || (providerDef ? process.env[providerDef.apiKeyEnv] : '') || ''
    if (!apiKey) return { success: false, error: 'API Key 未配置' }
    const baseUrl = body.baseUrl || providerDef?.baseUrl || 'https://api.deepseek.com'
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

  @Post('license/activate')
  async activateLicense(@Body() body: { key: string }) {
    const key = (body.key || '').trim().toUpperCase()
    if (!key.startsWith('OBA-')) return { success: false, error: '无效的 License Key 格式' }
    return { success: true, quota: '100 万 Token / 月', seats: '2 席位（1 管理员 + 1 运营者）' }
  }
}
