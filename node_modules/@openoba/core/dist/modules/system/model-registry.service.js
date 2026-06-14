"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ModelRegistryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelRegistryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto_1 = require("crypto");
const https_1 = require("https");
const http_1 = require("http");
const model_provider_entity_1 = require("./model-provider.entity");
const model_registry_entity_1 = require("./model-registry.entity");
const model_key_entity_1 = require("./model-key.entity");
const model_key_models_entity_1 = require("./model-key-models.entity");
const token_usage_entity_1 = require("./token-usage.entity");
const model_connection_log_entity_1 = require("./model-connection-log.entity");
const uuid_1 = require("uuid");
const ALGO = 'aes-256-gcm';
let ModelRegistryService = ModelRegistryService_1 = class ModelRegistryService {
    constructor(providerRepo, registryRepo, keyRepo, keyModelsRepo, usageRepo, logRepo) {
        this.providerRepo = providerRepo;
        this.registryRepo = registryRepo;
        this.keyRepo = keyRepo;
        this.keyModelsRepo = keyModelsRepo;
        this.usageRepo = usageRepo;
        this.logRepo = logRepo;
        this.logger = new common_1.Logger(ModelRegistryService_1.name);
        this.vaultKey = null;
    }
    async onModuleInit() {
        try {
            const keys = await this.keyRepo.find({ where: { isEnabled: 1 } });
            for (const k of keys) {
                try {
                    const apiKey = this.decrypt(k.apiKeyEnc, k.iv, k.authTag);
                    if (apiKey) {
                        const envKey = this.getEnvKey(k.providerCode);
                        process.env[envKey] = apiKey;
                        this.logger.log(`Key loaded from DB: ${k.providerCode}`);
                    }
                }
                catch {
                    this.logger.warn(`Failed to decrypt key for ${k.providerCode}`);
                }
            }
            this.logger.log(`Model keys loaded: ${keys.length} from DB`);
        }
        catch (e) {
            this.logger.warn(`Key loading skipped: ${e.message}`);
        }
    }
    getEnvKey(providerCode) {
        const map = {
            deepseek: 'DEEPSEEK_API_KEY',
            qwen: 'DASHSCOPE_API_KEY',
            glm: 'GLM_API_KEY',
            minimax: 'MINIMAX_API_KEY',
            kimi: 'MOONSHOT_API_KEY',
        };
        return map[providerCode] || `${providerCode.toUpperCase()}_API_KEY`;
    }
    getVaultKey() {
        if (this.vaultKey)
            return this.vaultKey;
        const raw = process.env.SKILL_VAULT_KEY;
        if (!raw)
            throw new Error('SKILL_VAULT_KEY not set');
        this.vaultKey = (0, crypto_1.createHash)('sha256').update(raw).digest();
        return this.vaultKey;
    }
    encrypt(plaintext) {
        const key = this.getVaultKey();
        const iv = (0, crypto_1.randomBytes)(16);
        const cipher = (0, crypto_1.createCipheriv)(ALGO, key, iv);
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: cipher.getAuthTag().toString('hex'),
        };
    }
    decrypt(encrypted, ivHex, authTagHex) {
        const key = this.getVaultKey();
        const decipher = (0, crypto_1.createDecipheriv)(ALGO, key, Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    async getProviders() {
        return this.providerRepo.find({ where: { isEnabled: 1 }, order: { providerCode: 'ASC' } });
    }
    async getModels(providerCode, category) {
        const where = { isEnabled: 1 };
        if (providerCode)
            where.providerCode = providerCode;
        if (category)
            where.category = category;
        return this.registryRepo.find({ where, order: { providerCode: 'ASC', modelCode: 'ASC' } });
    }
    async saveOrUpdateKey(dto) {
        const { encrypted, iv, authTag } = this.encrypt(dto.apiKey);
        const agentCode = dto.agentCode || 'global';
        const existing = await this.keyRepo.findOne({
            where: { providerCode: dto.providerCode, agentCode },
        });
        if (existing) {
            existing.apiKeyEnc = encrypted;
            existing.iv = iv;
            existing.authTag = authTag;
            if (dto.label !== undefined)
                existing.label = dto.label;
            if (dto.baseUrl !== undefined)
                existing.baseUrl = dto.baseUrl;
            existing.isEnabled = 1;
            existing.updatedAt = new Date();
            const saved = await this.keyRepo.save(existing);
            await this.ensureModelsLinked(saved.id, dto.providerCode);
            return saved;
        }
        const id = (0, uuid_1.v4)();
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
        });
        const key = (await this.keyRepo.findOne({ where: { id } }));
        await this.ensureModelsLinked(key.id, dto.providerCode);
        return key;
    }
    async ensureModelsLinked(keyId, providerCode) {
        const models = await this.registryRepo.find({
            where: { providerCode, isEnabled: 1 },
        });
        for (const m of models) {
            await this.keyModelsRepo.save({
                keyId,
                registryId: m.id,
                isDefault: m.isDefault || 0,
            });
        }
    }
    async getProviderKeys() {
        const keys = await this.keyRepo.find({ where: { isEnabled: 1 } });
        const result = [];
        for (const k of keys) {
            const links = await this.keyModelsRepo.find({ where: { keyId: k.id } });
            const registryIds = links.map(l => l.registryId);
            const models = registryIds.length > 0
                ? await this.registryRepo.findBy({ id: (0, typeorm_2.In)(registryIds) })
                : [];
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
            });
        }
        return result;
    }
    async getKeyWithDecrypted(providerCode, agentCode) {
        const where = { providerCode, isEnabled: 1, agentCode: agentCode || 'global' };
        const key = await this.keyRepo.findOne({ where });
        if (!key || !key.apiKeyEnc)
            return null;
        try {
            const apiKey = this.decrypt(key.apiKeyEnc, key.iv, key.authTag);
            return { key, apiKey };
        }
        catch (e) {
            this.logger.warn(`Failed to decrypt key for ${providerCode}`);
            return null;
        }
    }
    async setDefaultModel(keyId, registryId) {
        await this.keyModelsRepo.update({ keyId }, { isDefault: 0 });
        await this.keyModelsRepo.update({ keyId, registryId }, { isDefault: 1 });
    }
    async deleteKey(id) {
        await this.keyRepo.update(id, { isEnabled: 0, updatedAt: new Date() });
        await this.keyModelsRepo.delete({ keyId: id });
    }
    async getEnabledProvidersWithModels() {
        const providers = await this.providerRepo.find({ where: { isEnabled: 1 }, order: { providerCode: 'ASC' } });
        if (providers.length === 0)
            return [];
        const pcodes = providers.map(p => p.providerCode);
        const models = await this.registryRepo.find({ where: { providerCode: (0, typeorm_2.In)(pcodes), isEnabled: 1 }, order: { providerCode: 'ASC', modelCode: 'ASC' } });
        const keys = await this.keyRepo.find({ where: { isEnabled: 1 } });
        const hasKeySet = new Set(keys.filter(k => k.apiKeyEnc?.length > 0).map(k => k.providerCode));
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
        }));
    }
    async testConnection(dto) {
        let apiKey = dto.apiKey;
        if (!apiKey) {
            const kd = await this.getKeyWithDecrypted(dto.providerCode);
            if (!kd)
                return { ok: false, latencyMs: 0, error: 'No key configured' };
            apiKey = kd.apiKey;
        }
        const provider = await this.providerRepo.findOne({ where: { providerCode: dto.providerCode } });
        const baseUrl = provider?.baseUrl || 'https://api.deepseek.com';
        const start = Date.now();
        return new Promise((resolve) => {
            const url = new URL(baseUrl + '/v1/models');
            const transport = url.protocol === 'https:' ? https_1.request : http_1.request;
            const req = transport(url, {
                method: 'GET',
                headers: { Authorization: `Bearer ${apiKey}` },
                timeout: 10000,
            }, (res) => {
                const latencyMs = Date.now() - start;
                let data = '';
                res.on('data', (c) => data += c.toString());
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve({ ok: true, latencyMs });
                    }
                    else {
                        resolve({ ok: false, latencyMs, error: `HTTP ${res.statusCode}` });
                    }
                });
            });
            req.on('error', (e) => resolve({ ok: false, latencyMs: Date.now() - start, error: e.message }));
            req.on('timeout', () => { req.destroy(); resolve({ ok: false, latencyMs: 10000, error: 'timeout' }); });
            req.end();
        });
    }
    async logUsage(dto) {
        try {
            await this.usageRepo.save({
                id: (0, uuid_1.v4)(),
                ...dto,
                totalTokens: dto.inputTokens + dto.outputTokens,
            });
        }
        catch (e) {
            this.logger.warn(`Failed to log usage: ${e.message}`);
        }
    }
};
exports.ModelRegistryService = ModelRegistryService;
exports.ModelRegistryService = ModelRegistryService = ModelRegistryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(model_provider_entity_1.ModelProvider)),
    __param(1, (0, typeorm_1.InjectRepository)(model_registry_entity_1.ModelRegistry)),
    __param(2, (0, typeorm_1.InjectRepository)(model_key_entity_1.ModelKey)),
    __param(3, (0, typeorm_1.InjectRepository)(model_key_models_entity_1.ModelKeyModels)),
    __param(4, (0, typeorm_1.InjectRepository)(token_usage_entity_1.TokenUsage)),
    __param(5, (0, typeorm_1.InjectRepository)(model_connection_log_entity_1.ModelConnectionLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ModelRegistryService);
//# sourceMappingURL=model-registry.service.js.map