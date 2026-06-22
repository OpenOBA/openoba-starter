import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'
import { join } from 'path'
import * as path from 'path'
import * as express from 'express'
import type { Request, Response } from 'express'

async function bootstrap() {
  // 强制切换工作目录到 backend 目录
  const backendDir = path.resolve(__dirname, '..')
  process.chdir(backendDir)

  // P0-4: 启动时检测弱密钥
  const bootstrapLogger = new Logger('Bootstrap')
  const jwtSecret = process.env.JWT_SECRET || ''
  const customerSecret = process.env.CUSTOMER_JWT_SECRET || ''
  const weakSecrets: string[] = []

  if (jwtSecret.length < 16 || jwtSecret === 'temp' || jwtSecret.startsWith('change_me')) {
    weakSecrets.push('JWT_SECRET')
  }
  if (customerSecret && (customerSecret.length < 16 || customerSecret === 'temp' || customerSecret.startsWith('change_me'))) {
    weakSecrets.push('CUSTOMER_JWT_SECRET')
  }

  if (weakSecrets.length > 0) {
    const msg = `⚠️  检测到弱密钥: ${weakSecrets.join(', ')}。请修改 .env 中对应值（至少 32 字符随机串）`
    if (process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production') {
      bootstrapLogger.error(msg)
      bootstrapLogger.error('生产环境拒绝以弱密钥启动，进程退出')
      process.exit(1)
    }
    bootstrapLogger.warn(msg)
  }

  // SKILL_VAULT_KEY / DEEPSEEK_API_KEY 占位符检查
  const defaultSecrets = ['change_me_to_random', 'change/me/to/random', 'sk-your-deepseek']
  const secretsToCheck: Record<string, string> = {
    SKILL_VAULT_KEY: 'Skill 密钥加密',
    DEEPSEEK_API_KEY: 'DeepSeek API',
  }
  for (const [key, label] of Object.entries(secretsToCheck)) {
    const val = process.env[key] || ''
    if (!val || defaultSecrets.some(ds => val.includes(ds))) {
      (new Logger('SecurityCheck')).warn(`WARNING: ${key} (${label}) 使用默认占位符，请替换为随机强密钥！`)
    }
  }

  // P1-4: 全局未捕获异常处理器 — 防止进程崩溃
  const errorLogger = new Logger('GlobalErrorHandler')
  process.on('unhandledRejection', (reason: unknown) => {
    errorLogger.error(`Unhandled Rejection: ${reason?.message || reason}`, reason?.stack)
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
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
        fontSrc: ["'self'"],
      },
    },
    frameguard: { action: 'deny' },
  }))

  // 全局前缀
  app.setGlobalPrefix('api')

  // CORS
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
  app.enableCors({
    origin: process.env.APP_ENV === 'production'
      ? corsOrigin
      : function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
          // Development: allow localhost origins only
          if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            callback(null, true)
          } else {
            callback(new Error('CORS: origin not allowed'), false)
          }
        },
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

  // Swagger 文档（仅非生产环境，通过 APP_ENV 判断）
  if (process.env.APP_ENV !== 'production' && process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('OpenOBA Core API')
      .setDescription('OpenOBA Core — AI 执行操作系统引擎层 API')
      .setVersion('1.0.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api', app, document)
    Logger.log('Swagger enabled at /api', 'Bootstrap')
  }

  // 健康检查
  app.use('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'OpenOBA Core',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    })
  })

  // 优雅关闭：必须在 app.listen() 之前启用
  app.enableShutdownHooks()

  const port = process.env.APP_PORT || 3400
  await app.listen(port)

  const logger = new Logger('Bootstrap')
  logger.log(`OpenOBA Core started on port ${port}`)
  logger.log(`Health: http://localhost:${port}/health`)
  if (process.env.APP_ENV !== 'production') {
    logger.log(`API docs: http://localhost:${port}/api`)
  }
}
bootstrap()
