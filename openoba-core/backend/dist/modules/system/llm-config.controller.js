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
var LlmConfigController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmConfigController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const model_registry_service_1 = require("./model-registry.service");
let LlmConfigController = LlmConfigController_1 = class LlmConfigController {
    constructor(modelRegistry) {
        this.modelRegistry = modelRegistry;
        this.logger = new common_1.Logger(LlmConfigController_1.name);
    }
    async getKeys() {
        return this.modelRegistry.getProviderKeys();
    }
    async getModels() {
        return this.modelRegistry.getModels();
    }
    async saveLlmConfig(body) {
        const saved = await this.modelRegistry.saveOrUpdateKey(body);
        if (body.apiKey) {
            if (body.providerCode === 'deepseek')
                process.env.DEEPSEEK_API_KEY = body.apiKey;
            if (body.providerCode === 'qwen')
                process.env.DASHSCOPE_API_KEY = body.apiKey;
            if (body.providerCode === 'openai')
                process.env.OPENAI_API_KEY = body.apiKey;
        }
        return { success: true, id: saved.id, providerCode: saved.providerCode };
    }
    async testLlmConnection(body) {
        const result = await this.modelRegistry.testConnection(body);
        return {
            success: result.ok,
            message: result.ok ? `连接成功 · ${result.latencyMs}ms` : (result.error || '连接失败'),
            latencyMs: result.latencyMs,
        };
    }
    async setDefaultModel(body) {
        await this.modelRegistry.setDefaultModel(body.keyId, body.registryId);
        return { success: true };
    }
    async deleteLlmConfig(id) {
        await this.modelRegistry.deleteKey(id);
        return { success: true };
    }
    async deleteLlmModel(id) {
        await this.modelRegistry.deleteModel(id);
        return { success: true };
    }
    async activateLicense(body) {
        const key = (body.key || '').trim().toUpperCase();
        if (!key.startsWith('OBA-'))
            return { success: false, error: '无效格式' };
        return { success: true, quota: '100 万 Token / 月', seats: '2 席位' };
    }
};
exports.LlmConfigController = LlmConfigController;
__decorate([
    (0, common_1.Get)('llm/keys'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LlmConfigController.prototype, "getKeys", null);
__decorate([
    (0, common_1.Get)('llm/models'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LlmConfigController.prototype, "getModels", null);
__decorate([
    (0, common_1.Post)('llm/config'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LlmConfigController.prototype, "saveLlmConfig", null);
__decorate([
    (0, common_1.Post)('llm/test'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LlmConfigController.prototype, "testLlmConnection", null);
__decorate([
    (0, common_1.Put)('llm/models/default'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LlmConfigController.prototype, "setDefaultModel", null);
__decorate([
    (0, common_1.Delete)('llm/config/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LlmConfigController.prototype, "deleteLlmConfig", null);
__decorate([
    (0, common_1.Delete)('llm/models/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LlmConfigController.prototype, "deleteLlmModel", null);
__decorate([
    (0, common_1.Post)('license/activate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LlmConfigController.prototype, "activateLicense", null);
exports.LlmConfigController = LlmConfigController = LlmConfigController_1 = __decorate([
    (0, common_1.Controller)('system'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('super_admin'),
    __metadata("design:paramtypes", [model_registry_service_1.ModelRegistryService])
], LlmConfigController);
//# sourceMappingURL=llm-config.controller.js.map