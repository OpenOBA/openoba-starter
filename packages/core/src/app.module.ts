import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { RequestIdMiddleware } from './common/middleware/request-id.middleware'
import { RateLimiterModule } from './common/rate-limiter'
import { AuthModule } from './modules/auth/auth.module'
import { SystemModule } from './modules/system/system.module'
import { HealthModule } from './modules/health/health.module'
import { ERDLModule } from './modules/erdl/erdl.module'
import { ChatModule } from './modules/eros/chat/chat.module'
import { ErosTaskModule } from './modules/eros/task/eros-task.module'
import { MetaMirrorModule } from './modules/meta-mirror/meta-mirror.module'
import { SkillModule } from './modules/eros/skill/skill.module'
import { ToolRegistryModule } from './modules/tool-registry/tool-registry.module'
import { SoulModule } from './modules/soul/soul.module'

/**
 * OpenOBA Core — 引擎层
 *
 * 只包含翻译(ERDL)、导航(元镜)、记录仪(审计日志)、
 * 司机(ERA-Chat)、技能系统、认证、系统管理。
 *
 * 不含任何行业业务模块。
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    ScheduleModule.forRoot(),

    // V1.4-b EXT-06: 限流模块（Memory/Redis 双模式）
    RateLimiterModule,

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
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: configService.get('APP_ENV') === 'development',
        charset: 'utf8mb4',
        extra: {
          connectionLimit: 50,
          connectTimeout: 10000,
          waitForConnections: true,
          queueLimit: 0,
        },
      }),
    }),

    // ═══════════════════════════
    // OpenOBA 核心引擎模块
    // ═══════════════════════════
    AuthModule,           // 认证
    SystemModule,         // 系统管理（用户/角色/权限/菜单/版本）
    HealthModule,         // 健康检查

    ERDLModule,           // 🧭 翻译 — 动态语义数据协议
    ErosTaskModule,       // 🚀 Agent 执行引擎
    ChatModule,           // 💬 WebSocket + SSE 通信
    MetaMirrorModule,     // 🗺️ 导航 — 系统自省引擎
    SkillModule,          // 🔧 技能系统
    ToolRegistryModule,   // 🔌 工具注册中心
    SoulModule,           // 🎭 Agent 统一人格
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*')
  }
}
