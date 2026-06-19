import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'
import { request as httpsRequest } from 'https'
import { request as httpRequest } from 'http'
import { ModelProvider } from './model-provider.entity'
import { ModelRegistry } from './model-registry.entity'
import { ModelKey } from './model-key.entity'
import { ModelKeyModels } from './model-key-models.entity'
import { TokenUsage } from './token-usage.entity'
import { ModelConnectionLog } from './model-connection-log.entity'
import { v4 as uuidv4 } from 'uuid'

const ALGO = 'aes-256-gcm'

@Injectable()
export class ModelRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ModelRegistryService.name)
  private vaultKey: Buffer | null = null

  constructor(
    @InjectRepository(ModelProvider)
    private readonly providerRepo: Repository<ModelProvider>,
    @InjectRepository(ModelRegistry)
    private readonly registryRepo: Repository<ModelRegistry>,
    @InjectRepository(ModelKey)
    private readonly keyRepo: Repository<ModelKey>,
    @InjectRepository(ModelKeyModels)
    private readonly keyModelsRepo: Repository<ModelKeyModels>,
    @InjectRepository(TokenUsage)
    private readonly usageRepo: Repository<TokenUsage>,
    @InjectRepository(ModelConnectionLog)
    private readonly logRepo: Repository<ModelConnectionLog>,
  ) {}

  async onModuleInit() {
    // DB 连接可能尚未就绪，最多重试 3 次（间隔 2s）
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.reloadKeysFromDB()
        return
      } catch (e: unknown) {
        const msg = (e as Error).message
        if (attempt < 3) {
          this.logger.warn(`Key loading attempt ${attempt}/3 failed: ${msg}, retrying in 2s...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        } else {
          this.logger.error(`Key loading FAILED after 3 attempts: ${msg}`)
        }
      }
    }
  }

  /**
   * 从 DB 加载所有启用的 API Key 到 process.env。
   * 公共方法——可供 onModuleInit 和运行时 fallback 调用。
   */
  async reloadKeysFromDB(): Promise<number> {
    const keys = await this.keyRepo.find({ where: { isEnabled: 1 } })
    let loaded = 0
    for (const k of keys) {
      try {
        const apiKey = this.decrypt(k.apiKeyEnc, k.iv, k.authTag)
        if (apiKey) {
          const envKey = this.getEnvKey(k.providerCode)
          process.env[envKey] = apiKey
          loaded++
          this.logger.log(`Key loaded from DB: ${k.providerCode} -> ${envKey} (len=${apiKey.length})`)
        }
      } catch (e: unknown) {
        this.logger.error(`Failed to decrypt key for ${k.providerCode}: ${(e as Error).message}`)
      }
    }
    this.logger.log(`Model keys loaded: ${loaded}/${keys.length} from DB`)
    if (loaded === 0 && keys.length > 0) {
      this.logger.error('!! All DB keys failed to decrypt — check SKILL_VAULT_KEY matches the value used during encryption')
    }
    if (keys.length === 0) {
      this.logger.warn('No enabled keys found in DB — LLM calls will fail until a key is configured via Settings')
    }
    return loaded
  }

  private getEnvKey(providerCode: string): string {
    const map: Record<string, string> = {
      deepseek: 'DEEPSEEK_API_KEY',
      qwen: 'DASHSCOPE_API_KEY',
      glm: 'GLM_API_KEY',
      minimax: 'MINIMAX_API_KEY',
      kimi: 'MOONSHOT_API_KEY',
    }
    return map[providerCode] || `${providerCode.toUpperCase()}_API_KEY`
  }

  // ============== 加密 ==============

  private getVaultKey(): Buffer {
    if (this.vaultKey) return this.vaultKey
    const raw = process.env.SKILL_VAULT_KEY
    if (!raw) throw new Error('SKILL_VAULT_KEY not set')
    this.vaultKey = createHash('sha256').update(raw).digest()
    return this.vaultKey
  }

  encrypt(plaintext: string): { encrypted: string; iv: string; authTag: string } {
    const key = this.getVaultKey()
    const iv = randomBytes(16)
    const cipher = createCipheriv(ALGO, key, iv)
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
    }
  }

  decrypt(encrypted: string, ivHex: string, authTagHex: string): string {
    const key = this.getVaultKey()
    const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  // ============== Provider ==============

  async getProviders(): Promise<ModelProvider[]> {
    return this.providerRepo.find({ where: { isEnabled: 1 }, order: { providerCode: 'ASC' } })
  }

  // ============== Registry (纯元数据) ==============

  async getModels(providerCode?: string, category?: string): Promise<ModelRegistry[]> {
    const where: any = { isEnabled: 1 }
    if (providerCode) where.providerCode = providerCode
    if (category) where.category = category
    return this.registryRepo.find({ where, order: { providerCode: 'ASC', modelCode: 'ASC' } })
  }

  // ============== Key 管理 ==============

  async saveOrUpdateKey(dto: {
    providerCode: string
    apiKey: string
    label?: string
    baseUrl?: string
    agentCode?: string
  }): Promise<ModelKey> {
    const { encrypted, iv, authTag } = this.encrypt(dto.apiKey)
    const agentCode = dto.agentCode || 'global'

    const existing = await this.keyRepo.findOne({
      where: { providerCode: dto.providerCode, agentCode },
    })

    if (existing) {
      existing.apiKeyEnc = encrypted
      existing.iv = iv
      existing.authTag = authTag
      if (dto.label !== undefined) existing.label = dto.label
      if (dto.baseUrl !== undefined) existing.baseUrl = dto.baseUrl
      existing.isEnabled = 1
      existing.updatedAt = new Date()
      const saved = await this.keyRepo.save(existing)

      // 自动关联该 provider 下所有模型到 Key
      await this.ensureModelsLinked(saved.id, dto.providerCode)
      return saved
    }

    const id = uuidv4()
    await this.keyRepo.insert({
      id,
      providerCode: dto.providerCode,
      agentCode,
      label: dto.label || undefined,
      apiKeyEnc: encrypted,
      iv,
      authTag,
      baseUrl: dto.baseUrl || undefined,
      isEnabled: 1,
    })
    const key = (await this.keyRepo.findOne({ where: { id } }))!

    // 自动关联模型
    await this.ensureModelsLinked(key.id, dto.providerCode)
    return key
  }

  private async ensureModelsLinked(keyId: string, providerCode: string): Promise<void> {
    const models = await this.registryRepo.find({
      where: { providerCode, isEnabled: 1 },
    })
    for (const m of models) {
      await this.keyModelsRepo.save({
        keyId,
        registryId: m.id,
        isDefault: m.isDefault || 0,
      })
    }
  }

  async getProviderKeys(): Promise<any[]> {
    const keys = await this.keyRepo.find({ where: { isEnabled: 1 } })
    const result: any[] = []
    for (const k of keys) {
      const links = await this.keyModelsRepo.find({ where: { keyId: k.id } })
      const registryIds = links.map(l => l.registryId)
      const models = registryIds.length > 0
        ? await this.registryRepo.findBy({ id: In(registryIds) })
        : []
      result.push({
        id: k.id,
        providerCode: k.providerCode,
        agentCode: k.agentCode,
        label: k.label,
        hasKey: k.apiKeyEnc.length > 0,
        baseUrl: k.baseUrl,
        models: models.map(m => ({
          id: m.id,
          modelCode: m.modelCode,
          modelName: m.modelName,
          category: m.category,
          contextWindow: m.contextWindow,
          maxTokens: m.maxTokens,
          supportsReasoning: m.supportsReasoning,
          isDefault: links.find(l => l.registryId === m.id)?.isDefault || 0,
        })),
      })
    }
    return result
  }

  async getKeyWithDecrypted(providerCode: string, agentCode?: string): Promise<{ key: ModelKey; apiKey: string } | null> {
    const where: any = { providerCode, isEnabled: 1, agentCode: agentCode || 'global' }
    const key = await this.keyRepo.findOne({ where })
    if (!key || !key.apiKeyEnc) return null
    try {
      const apiKey = this.decrypt(key.apiKeyEnc, key.iv, key.authTag)
      return { key, apiKey }
    } catch (e) {
      this.logger.warn(`Failed to decrypt key for ${providerCode}`)
      return null
    }
  }

  /**
   * Toggle 默认模型：对指定 key+model 翻转 is_default。
   *
   * 数据一致性规则：
   *  - 同一个 keyId 下最多只允许一条 is_default=1（设新默认前先清旧默认）
   *  - 仅写 sys_model_key_models（Key 级默认），不污染 sys_model_registry（Provider 级默认）
   *  - 复合主键 (key_id, registry_id) 必须用原生 SQL 更新（TypeORM Repository.update 不支持复合主键）
   */
  async setDefaultModel(keyId: string, registryId: string): Promise<{ isDefault: boolean }> {
    const existing = await this.keyModelsRepo.findOne({ where: { keyId, registryId } })
    if (existing) {
      // 已存在记录 → 翻转（复合主键必须用原生 SQL 更新）
      const newVal = existing.isDefault ? 0 : 1
      if (newVal === 1) {
        // 设为默认前，先清除同 key 下其他记录的默认标记，保证唯一性
        await this.keyModelsRepo.query(
          'UPDATE sys_model_key_models SET is_default = 0 WHERE key_id = ? AND registry_id <> ?',
          [keyId, registryId],
        )
      }
      await this.keyModelsRepo.query(
        'UPDATE sys_model_key_models SET is_default = ? WHERE key_id = ? AND registry_id = ?',
        [newVal, keyId, registryId],
      )
      return { isDefault: newVal === 1 }
    }
    // 首次关联 → 先清该 key 下旧默认，再插入新默认
    await this.keyModelsRepo.query(
      'UPDATE sys_model_key_models SET is_default = 0 WHERE key_id = ?',
      [keyId],
    )
    await this.keyModelsRepo.insert({ keyId, registryId, isDefault: 1 })
    return { isDefault: true }
  }

  async deleteKey(id: string): Promise<void> {
    await this.keyRepo.update(id, { isEnabled: 0, updatedAt: new Date() })
    await this.keyModelsRepo.delete({ keyId: id })
  }

  async deleteModel(id: string): Promise<void> {
    await this.registryRepo.update(id, { isEnabled: 0, updatedAt: new Date() })
  }

  // ============== P1-1: 获取已启用 Provider 及模型列表 ==============

  async getEnabledProvidersWithModels() {
    const providers = await this.providerRepo.find({ where: { isEnabled: 1 }, order: { providerCode: 'ASC' } })
    if (providers.length === 0) return []
    const pcodes = providers.map(p => p.providerCode)
    const models = await this.registryRepo.find({ where: { providerCode: In(pcodes), isEnabled: 1 }, order: { providerCode: 'ASC', modelCode: 'ASC' } })
    const keys = await this.keyRepo.find({ where: { isEnabled: 1 } })
    const hasKeySet = new Set(keys.filter(k => k.apiKeyEnc?.length > 0).map(k => k.providerCode))
    return providers.map(p => ({
      providerCode: p.providerCode,
      providerName: p.providerName,
      baseUrl: p.baseUrl,
      isBuiltin: p.isBuiltin === 1,
      hasKey: hasKeySet.has(p.providerCode),
      models: models
        .filter(m => m.providerCode === p.providerCode)
        .map(m => ({
          id: m.id,
          modelCode: m.modelCode,
          modelName: m.modelName,
          category: m.category,
          contextWindow: m.contextWindow,
          maxTokens: m.maxTokens,
          supportsReasoning: m.supportsReasoning,
          costInput: m.costInput,
          costOutput: m.costOutput,
          isDefault: m.isDefault === 1,
        })),
    }))
  }

  // ============== 测试连接 ==============

  async testConnection(dto: {
    providerCode: string
    apiKey?: string
    baseUrl?: string
  }): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    let apiKey = dto.apiKey
    if (!apiKey) {
      const kd = await this.getKeyWithDecrypted(dto.providerCode)
      if (!kd) return { ok: false, latencyMs: 0, error: 'No key configured' }
      apiKey = kd.apiKey
    }

    const provider = await this.providerRepo.findOne({ where: { providerCode: dto.providerCode } })
    const baseUrl = provider?.baseUrl || 'https://api.deepseek.com'

    const start = Date.now()
    return new Promise((resolve) => {
      const url = new URL(baseUrl + '/v1/models')
      const transport = url.protocol === 'https:' ? httpsRequest : httpRequest
      const req = transport(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 10000,
      }, (res) => {
        const latencyMs = Date.now() - start
        let data = ''
        res.on('data', (c: Buffer) => data += c.toString())
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve({ ok: true, latencyMs })
          } else {
            resolve({ ok: false, latencyMs, error: `HTTP ${res.statusCode}` })
          }
        })
      })
      req.on('error', (e) => resolve({ ok: false, latencyMs: Date.now() - start, error: e.message }))
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, latencyMs: 10000, error: 'timeout' }) })
      req.end()
    })
  }

  // ============== Token 用量 ==============

  async logUsage(dto: {
    agentCode: string
    modelCode: string
    providerCode: string
    inputTokens: number
    outputTokens: number
    taskId?: string
    chatSessionId?: string
  }): Promise<void> {
    try {
      await this.usageRepo.save({
        id: uuidv4(),
        ...dto,
        totalTokens: dto.inputTokens + dto.outputTokens,
      })
    } catch (e) {
      this.logger.warn(`Failed to log usage: ${(e as Error).message}`)
    }
  }
}
