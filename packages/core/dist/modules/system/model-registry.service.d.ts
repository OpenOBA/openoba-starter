import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ModelProvider } from './model-provider.entity';
import { ModelRegistry } from './model-registry.entity';
import { ModelKey } from './model-key.entity';
import { ModelKeyModels } from './model-key-models.entity';
import { TokenUsage } from './token-usage.entity';
import { ModelConnectionLog } from './model-connection-log.entity';
export declare class ModelRegistryService implements OnModuleInit {
    private readonly providerRepo;
    private readonly registryRepo;
    private readonly keyRepo;
    private readonly keyModelsRepo;
    private readonly usageRepo;
    private readonly logRepo;
    private readonly logger;
    private vaultKey;
    constructor(providerRepo: Repository<ModelProvider>, registryRepo: Repository<ModelRegistry>, keyRepo: Repository<ModelKey>, keyModelsRepo: Repository<ModelKeyModels>, usageRepo: Repository<TokenUsage>, logRepo: Repository<ModelConnectionLog>);
    onModuleInit(): Promise<void>;
    private getEnvKey;
    private getVaultKey;
    encrypt(plaintext: string): {
        encrypted: string;
        iv: string;
        authTag: string;
    };
    decrypt(encrypted: string, ivHex: string, authTagHex: string): string;
    getProviders(): Promise<ModelProvider[]>;
    getModels(providerCode?: string, category?: string): Promise<ModelRegistry[]>;
    saveOrUpdateKey(dto: {
        providerCode: string;
        apiKey: string;
        label?: string;
        baseUrl?: string;
        agentCode?: string;
    }): Promise<ModelKey>;
    private ensureModelsLinked;
    getProviderKeys(): Promise<any[]>;
    getKeyWithDecrypted(providerCode: string, agentCode?: string): Promise<{
        key: ModelKey;
        apiKey: string;
    } | null>;
    setDefaultModel(keyId: string, registryId: string): Promise<{
        isDefault: boolean;
    }>;
    deleteKey(id: string): Promise<void>;
    deleteModel(id: string): Promise<void>;
    getEnabledProvidersWithModels(): Promise<{
        providerCode: string;
        providerName: string;
        baseUrl: string;
        isBuiltin: boolean;
        hasKey: boolean;
        models: {
            id: string;
            modelCode: string;
            modelName: string;
            category: string;
            contextWindow: number;
            maxTokens: number;
            supportsReasoning: number;
            costInput: number;
            costOutput: number;
            isDefault: boolean;
        }[];
    }[]>;
    testConnection(dto: {
        providerCode: string;
        apiKey?: string;
        baseUrl?: string;
    }): Promise<{
        ok: boolean;
        latencyMs: number;
        error?: string;
    }>;
    logUsage(dto: {
        agentCode: string;
        modelCode: string;
        providerCode: string;
        inputTokens: number;
        outputTokens: number;
        taskId?: string;
        chatSessionId?: string;
    }): Promise<void>;
}
