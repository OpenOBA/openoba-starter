import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import helmet from 'helmet'
import * as dotenv from 'dotenv'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'
import { join } from 'path'
import * as path from 'path'
import * as express from 'express'
import type { Request, Response } from 'express'

async function bootstrap() {
  // 强制切换工作目录到 backend 目录（确保元镜扫描等模块使用正确路径）
  const backendDir = path.resolve(__dirname, '..')
  process.chdir(backendDir)

  // 显式加载 .env 到 process.env（确保 onModuleInit 执行时 SKILL_VAULT_KEY 等已就绪）
  // ConfigModule.forRoot 的 dotenv.config() 可能在某些模块的 onModuleInit 之后才执行，
  // 导致依赖 process.env 的 onModuleInit（如 ModelRegistryService key 解密）读到 undefined
  dotenv.config({ path: path.join(backendDir, '.env') })

  // P1-2: JWT_SECRET 强度检查（生产环境必须更换默认密钥）
  const bootstrapLogger = new Logger('Bootstrap')
  const jwtSecret = process.env.JWT_SECRET || ''
  const customerSecret = process.env.CUSTOMER_JWT_SECRET || ''
  const weakSecrets: string[] = []
  if (jwtSecret.length < 16 || jwtSecret === 'temp' || jwtSecret.startsWith('change_me')) {
    weakSecrets.push('JWT_SECRET')
  }
  if (
    customerSecret &&
    (customerSecret.length < 16 || customerSecret === 'temp' || customerSecret.startsWith('change_me'))
  ) {
    weakSecrets.push('CUSTOMER_JWT_SECRET')
  }
  if (weakSecrets.length > 0) {
    const msg = `⚠️  检测到弱密钥: ${weakSecrets.join(', ')}。请立即修改 .env 文件中的对应值（至少 32 字符随机字符串）`
    if (process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production') {
      bootstrapLogger.error(msg)
      bootstrapLogger.error('生产环境拒绝以弱密钥启动，进程退出')
      process.exit(1)
    }
    bootstrapLogger.warn(msg)
  }

  // P1-4: 全局未捕获异常处理器 — 防止进程崩溃
  const errorLogger = new Logger('GlobalErrorHandler')
  process.on('unhandledRejection', (reason: unknown) => {
    const msg = reason instanceof Error ? reason.message : String(reason)
    const stack = reason instanceof Error ? reason.stack : undefined
    errorLogger.error(`Unhandled Rejection: ${msg}`, stack)
  })
  process.on('uncaughtException', (error: Error) => {
    errorLogger.error(`Uncaught Exception: ${error.message}`, error.stack)
    // 给进程时间写日志后退出（NestJS 自身也有优雅关闭）
    setTimeout(() => process.exit(1), 1000)
  })

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  })

  // 安全头
  app.use(helmet())

  // 全局前缀
  app.setGlobalPrefix('api')

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  })

  // 静态文件服务（附件上传目录）
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')))

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter())

  // 全局响应拦截器
  app.useGlobalInterceptors(new TransformInterceptor())

  // Swagger 文档（仅开发/测试环境）
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('OpenOBA API')
      .setDescription('OpenOBA 企业 AI 执行官 API 文档')
      .setVersion('1.5.0-alpha')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api', app, document)
  }

  // 健康检查
  app.use('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'OpenOBA',
      version: '1.5.0-alpha',
      timestamp: new Date().toISOString(),
    })
  })

  const port = process.env.APP_PORT || 3000
  await app.listen(port)

  const logger = new Logger('Bootstrap')
  logger.log(`🚀 OpenOBA 服务已启动`)
  logger.log(`📍 服务地址: http://localhost:${port}`)
  logger.log(`📚 API 文档: http://localhost:${port}/api`)
  logger.log(`💊 健康检查: http://localhost:${port}/health`)
}
bootstrap()
