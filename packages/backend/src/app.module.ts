import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { RateLimiterModule } from './common/rate-limiter'
import { SchemaModule } from './schemas/schema.module'
import { AuthModule } from './modules/auth/auth.module'
import { SystemModule } from './modules/system/system.module'
import { DictionaryModule } from './modules/dictionary/dictionary.module'
import { HealthModule } from './modules/health/health.module'
import { StructureModule } from './modules/structure/structure.module'
import { CustomerModule } from './modules/customer/customer.module'
import { ProductModule } from './modules/product/product.module'
import { CategoryModule } from './modules/category/category.module'
import { OrderModule } from './modules/order/order.module'
import { ColorModule } from './modules/color/color.module'
import { CustomerAuthModule } from './modules/customer-auth/customer-auth.module'
import { SubSkuModule } from './modules/sub-sku/sub-sku.module'
import { SmsModule } from './modules/sms/sms.module'
import { InventoryModule } from './modules/inventory/inventory.module'
import { AfterSalesModule } from './modules/after-sales/after-sales.module'
import { WebsiteModule } from './modules/website/website.module'
import { ReviewModule } from './modules/review/review.module'
import { UploadModule } from './modules/upload/upload.module'
import { AestheticsModule } from './modules/aesthetics/aesthetics.module'
import { DraftPoolModule } from './modules/draft-pool/draft-pool.module'
import { DictConstantsModule } from './common/dict-constants.module'
// ===== Core 闭源引擎（通过 @openoba/core npm 包引用） =====
// Entity 显式注册（确保 TypeORM 识别 Core 模块的数据表）
// V1.4-b M2: 统一从 barrel 出口导入
import {
  ERDLRuleRecord,
  ERDLSnapshot,
  ERDLProposal,
  ERDLProposalVote,
  CognitiveLog,
  AgentTask,
  AgentRegistry,
  KnowledgeEntry,
  SkillRegistry,
  SkillKeyVault,
  DraftSpu,
  DeliverableManifest,
  ReportTarget,
  ModelKey,
  ModelKeyModels,
  ModelRegistry,
  ModelProvider,
  TokenUsage,
  ModelConnectionLog,
} from '@openoba/core/index'
// Core 模块（按需导入，barrel 不导出模块）
import { ERDLModule } from '@openoba/core/dist/modules/erdl/erdl.module'
import { ChatModule } from '@openoba/core/dist/modules/eros/chat/chat.module'
import { ErosTaskModule } from '@openoba/core/dist/modules/eros/task/eros-task.module'
import { MetaMirrorModule } from '@openoba/core/dist/modules/meta-mirror/meta-mirror.module'
import { SkillModule } from '@openoba/core/dist/modules/eros/skill/skill.module'
import { ToolRegistryModule } from '@openoba/core/dist/modules/tool-registry/tool-registry.module'
import { SoulModule } from '@openoba/core/dist/modules/soul/soul.module'

@Module({
  imports: [
    // 环境变量
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // V1.4-b #15: 限流模块（Redis/Memory 双模式，全局可用）
    RateLimiterModule,

    // TypeORM 数据库连接
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.getOrThrow('DB_USERNAME'),
        password: configService.getOrThrow('DB_PASSWORD'),
        database: configService.getOrThrow('DB_DATABASE'),
        entities: [
          // ERP 自身的 entity（glob 扫描）
          __dirname + '/**/*.entity{.ts,.js}',
          // Core 闭源引擎的 entity（显式类引用，不依赖 glob + 不依赖绝对路径）
          ERDLRuleRecord,
          ERDLSnapshot,
          ERDLProposal,
          ERDLProposalVote,
          CognitiveLog,
          AgentTask,
          AgentRegistry,
          KnowledgeEntry,
          SkillRegistry,
          SkillKeyVault,
          DraftSpu,
          DeliverableManifest,
          ReportTarget,
          ModelKey,
          ModelKeyModels,
          ModelRegistry,
          ModelProvider,
          TokenUsage,
          ModelConnectionLog,
        ],
        synchronize: false,
        logging: configService.get('APP_ENV') === 'development',
        charset: 'utf8mb4',
        // 生产连接池配置
        extra: {
          connectionLimit: 50,
          connectTimeout: 10000,
          waitForConnections: true,
          queueLimit: 0,
        },
      }),
    }),

    // 业务模块
    AuthModule,
    SystemModule,
    DictionaryModule,
    HealthModule,
    StructureModule,
    CustomerModule,
    ProductModule,
    CategoryModule,
    OrderModule,
    ColorModule,
    CustomerAuthModule,
    SubSkuModule,
    SmsModule,
    InventoryModule,
    AfterSalesModule,
    WebsiteModule,
    ReviewModule,
    UploadModule,

    // AI-BOS 基础模块
    SchemaModule,

    AestheticsModule,
    DraftPoolModule,

    // 字典常量缓存（启动时加载所有字典表到内存）
    DictConstantsModule,

    // ERDL 核心模块
    ERDLModule,

    // ER-OS 任务工作流引擎
    ErosTaskModule,

    // ER-OS Chat WebSocket 通信
    ChatModule,

    // 元镜（Meta-Mirror）— 系统自省引擎
    MetaMirrorModule,

    // SKILL 系统
    SkillModule,

    // ToolRegistry — AI 能力注册中心（@Global）
    ToolRegistryModule,

    // SOUL — Agent 统一人格系统（@Global）
    SoulModule,
  ],
})
export class AppModule {}
